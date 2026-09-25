/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useCallback, useRef, useState } from 'react';

export type PromptOptimizeFailureReason = 'no_connection' | 'not_configured' | 'failed';

export type PromptOptimizeState = 'idle' | 'optimizing';

export interface PromptOptimizeError {
  reason: PromptOptimizeFailureReason;
  /** Provider failure class reported by the host, when there was one. */
  errorClass?: string;
  statusCode?: number;
  message?: string;
}

export interface UsePromptOptimizerOptions {
  /** Reads the live composer draft. */
  getText(): string;
  /** Receives the optimized text (already trimmed, non-empty). */
  onText(text: string): void;
  onError(error: PromptOptimizeError): void;
}

/**
 * 改写提示词移植自 WeKnora 的查询改写模板(D:\project\WeKnora
 * `config/prompt_templates/rewrite.yaml` 的 standard_rewrite,辅以
 * default_rewrite 的 Query Understanding 规则)。Vera composer 的草稿是
 * 给 agent 的任务描述而非知识库检索词,故去掉意图分类与 KB 专属条目,
 * 保留消解指代、补全省略、保留意图/约束/语言的核心规则。输出语言跟随
 * 草稿本身,与 UI locale 无关,所以这段提示词不参与 i18n。
 */
const OPTIMIZE_SYSTEM_PROMPT = [
  'You are a professional prompt rewriting assistant. Rewrite the user\'s draft into a clear, self-contained prompt that an AI agent can execute without any conversation context.',
  '',
  'Rewriting Rules:',
  '1. Resolve pronoun references (such as "it", "this", "they") to explicit subjects.',
  '2. Complete omitted subjects, objects, and key information so the prompt is semantically complete.',
  '3. Preserve the core intent of the original prompt and its request type: a question stays a question, an instruction stays an instruction.',
  '4. Preserve specific entities, names, technical terms, source restrictions, constraints, and requested output formats.',
  '5. Do not add requirements that are not present in the original prompt.',
  '6. The rewritten prompt MUST be in the same language as the draft.',
  '',
  'Output only the rewritten prompt, nothing else.',
].join('\n');

/**
 * 优化提示词: take the composer draft, rewrite it once via the default
 * provider (host-side `connection.prompt.run`), and hand the text back
 * for a setText round-trip. Mirrors useVoiceInput's shape — the hook owns
 * the state machine, the host owns the call and the secret.
 */
export function usePromptOptimizer(options: UsePromptOptimizerOptions): {
  state: PromptOptimizeState;
  optimize(): void;
} {
  const [state, setState] = useState<PromptOptimizeState>('idle');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  // Session flag for the async chain: an unmount mid-flight drops the
  // result instead of touching state (same contract as useVoiceInput).
  const activeRef = useRef(false);

  const optimize = useCallback(() => {
    if (activeRef.current) return;
    const text = optionsRef.current.getText().trim();
    if (text.length === 0) return;
    activeRef.current = true;
    setState('optimizing');
    void (async () => {
      try {
        const outcome = await window.vera.runtimeHost.command('connection.prompt.run', {
          system: OPTIMIZE_SYSTEM_PROMPT,
          prompt: text,
        });
        if (!activeRef.current) return;
        if (outcome.kind === 'ok') {
          const optimized = outcome.text.trim();
          if (optimized.length === 0) {
            optionsRef.current.onError({ reason: 'failed' });
            return;
          }
          optionsRef.current.onText(optimized);
          return;
        }
        if (outcome.kind === 'rejected') {
          optionsRef.current.onError({
            reason: outcome.reason === 'no_connection'
              ? 'no_connection'
              : outcome.reason === 'credential_not_configured'
              ? 'not_configured'
              : 'failed',
          });
          return;
        }
        optionsRef.current.onError({
          reason: 'failed',
          errorClass: outcome.errorClass,
          ...(outcome.statusCode === undefined ? {} : { statusCode: outcome.statusCode }),
        });
      } catch (error) {
        if (activeRef.current) {
          optionsRef.current.onError({
            reason: 'failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (activeRef.current) setState('idle');
        activeRef.current = false;
      }
    })();
  }, []);

  return { state, optimize };
}

/** Toast copy for the optimize flow (zh/en), kept next to the hook so the
 *  reason → wording mapping cannot drift between them. */
export function getPromptOptimizeCopy(locale: 'zh' | 'en'): {
  failedTitle: string;
  errorText(error: PromptOptimizeError): string;
} {
  if (locale === 'zh') {
    return {
      failedTitle: '提示词优化失败',
      errorText: (error) => {
        switch (error.reason) {
          case 'no_connection':
            return '还没有可用的模型供应商，先在 设置 → 模型 里添加一个连接。';
          case 'not_configured':
            return '默认模型供应商缺少密钥，到 设置 → 模型 补全后重试。';
          case 'failed':
            if (error.errorClass === 'timeout') {
              return '默认模型供应商响应超时（超过 2 分钟）。稍后重试，或在 设置 → 模型 里换一个更快的默认模型。';
            }
            if (error.errorClass === 'invalid_response') {
              return '模型没有返回改写内容（响应为空，可能被供应商截断）。稍后重试，或在 设置 → 模型 里换一个默认模型。';
            }
            return error.errorClass === undefined
              ? error.message ?? '改写请求失败，请重试。'
              : `改写请求失败：${error.errorClass}${
                  error.statusCode === undefined ? '' : `（HTTP ${error.statusCode}）`
                }。`;
        }
      },
    };
  }
  return {
    failedTitle: 'Prompt optimization failed',
    errorText: (error) => {
      switch (error.reason) {
        case 'no_connection':
          return 'No model provider is configured yet. Add a connection in Settings → Models first.';
        case 'not_configured':
          return 'The default model provider is missing its key. Complete it in Settings → Models and retry.';
        case 'failed':
          if (error.errorClass === 'timeout') {
            return 'The default provider timed out (over 2 minutes). Retry later, or pick a faster default model in Settings → Models.';
          }
          if (error.errorClass === 'invalid_response') {
            return 'The model returned no rewrite (empty response, possibly truncated by the provider). Retry later, or pick another default model in Settings → Models.';
          }
          return error.errorClass === undefined
            ? error.message ?? 'The rewrite request failed. Try again.'
            : `The rewrite request failed: ${error.errorClass}${
                error.statusCode === undefined ? '' : ` (HTTP ${error.statusCode})`
              }.`;
      }
    },
  };
}
