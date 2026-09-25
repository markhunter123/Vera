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

import { generateText, streamText } from 'ai';
import type { RuntimeExecutionConnection } from '@vera/core/llm-connections';
import { getAIModel } from './model-factory.js';
import {
  classifyConnectionEffectStatus,
  ConnectionEffectHttpError,
  type ConnectionEffectError,
} from './connection-effect-outcome.js';

/**
 * One-shot completion effect: a single prompt in, a single text out, no
 * tools and no history — the connection-effect sibling of a connection
 * test, for host-side utilities that borrow the user's default provider
 * (prompt optimization) without ever exposing the stored secret.
 */

/** ponytail: rewrite 输出上界;WeKnora 用 150(检索 query),这里输入是整段任务描述,放宽到 2048。 */
const PROMPT_RUN_MAX_OUTPUT_TOKENS = 2_048;
/**
 * 120s, not the probe-style 15–30s: this is a full generation through
 * whatever provider the user made default — relay and reasoning models
 * regularly take a minute before the first token lands.
 */
const PROMPT_RUN_TIMEOUT_MS = 120_000;

export type PromptRunEffectOutcome =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: ConnectionEffectError };

export async function runPromptCompletionEffect(
  connection: RuntimeExecutionConnection,
  apiKey: string,
  modelId: string,
  input: { readonly system: string; readonly prompt: string },
  options: { readonly fetch: typeof globalThis.fetch },
): Promise<PromptRunEffectOutcome> {
  try {
    const model = getAIModel({
      connection,
      apiKey,
      modelId,
      fetch: options.fetch,
    });
    const request = {
      model,
      system: input.system,
      prompt: input.prompt,
      temperature: 0.3,
      maxOutputTokens: PROMPT_RUN_MAX_OUTPUT_TOKENS,
      // One deadline for the whole effect: a first attempt plus any fallback
      // share the same two minutes.
      abortSignal: AbortSignal.timeout(PROMPT_RUN_TIMEOUT_MS),
    };
    // Streaming first: the chat path already streams through this same
    // provider, and a non-streamed generation trips the 30–60s caps many
    // relay gateways put on whole-body requests.
    const streamed = streamText(request);
    const streamedText = (await streamed.text).trim();
    if (streamedText.length > 0) return { ok: true, text: streamedText };
    // An empty stream with no error is not a dead provider: relay gateways
    // that ignore `stream: true` hand back one whole JSON body, which an SSE
    // reader sees as zero deltas. Ask again without streaming; the same
    // model call either answers or fails loudly.
    console.warn(
      `[prompt-run] empty streamed rewrite (finishReason=${await streamed.finishReason}, model=${modelId}); retrying non-streamed`,
    );
    const whole = await generateText(request);
    const wholeText = whole.text.trim();
    if (wholeText.length > 0) return { ok: true, text: wholeText };
    console.warn(
      `[prompt-run] empty non-streamed rewrite (finishReason=${whole.finishReason}, model=${modelId})`,
    );
    return { ok: false, error: { kind: 'invalid_response' } };
  } catch (error) {
    return { ok: false, error: classifyPromptRunError(error) };
  }
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || isTimeoutError(error.cause))
  );
}

function classifyPromptRunError(error: unknown): ConnectionEffectError {
  if (error instanceof ConnectionEffectHttpError) {
    return classifyConnectionEffectStatus(error.status);
  }
  // The AI SDK surfaces HTTP failures as APICallError carrying statusCode.
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  if (typeof statusCode === 'number') return classifyConnectionEffectStatus(statusCode);
  // The SDK wraps transport failures, so the TimeoutError reason from
  // AbortSignal.timeout may sit one or more `cause` hops down.
  if (isTimeoutError(error)) return { kind: 'timeout' };
  return { kind: 'unknown' };
}
