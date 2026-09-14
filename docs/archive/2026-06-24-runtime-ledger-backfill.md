<!--
  Licensed to the Apache Software Foundation (ASF) under one
  or more contributor license agreements.  See the NOTICE file
  distributed with this work for additional information
  regarding copyright ownership.  The ASF licenses this file
  to you under the Apache License, Version 2.0 (the
  "License"); you may not use this file except in compliance
  with the License.  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing,
  software distributed under the License is distributed on an
  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, either express or implied.  See the License for the
  specific language governing permissions and limitations
  under the License.
-->

# Runtime 账本回填实施方案

> 已归档：实现已于 PR #188 落地。本方案仅作为历史执行背景保留。

> **致 agentic workers（智能工作代理）：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实施本方案。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 当已完成的最顶层 run 的 RuntimeEvent 账本为空时，通过仅从旧版 StoredMessage 行重建低风险 RuntimeEvent，让 Agent runtime 的读取和后续 turn 得以继续。

**架构：** 添加一个聚焦的 runtime 辅助函数，从同 turn 的 StoredMessage 行合成内存中的 RuntimeEvent，并为每个恢复的事件标记 `actions.stateDelta.veraRuntimeRecovery`。仅当 `RuntimeEventStore.readRuntimeEvents()` 对终态 run 返回空数组时，才将该辅助函数接入 `RuntimeReadModel.getSessionView()` 和 `AgentRun.buildPriorRuntimeContext()`。此第一版不把恢复的事件写回 `RuntimeEventStore`，因为该存储只暴露单事件追加；部分修复写入可能使账本变得更糟。

**技术栈：** TypeScript、Node 测试运行器、`@vera/core` 的 RuntimeEvent 和 StoredMessage 类型、`@vera/runtime` 的读取模型和 AgentRun 路径。

---

## 范围

本方案仅修复存在安全旧版 StoredMessage 证据时、顶层 Agent run 的终态空 RuntimeEvent 账本。

它不修复缺少终态 RuntimeEvent 的非空账本。它不重建流式部分块、provider 事件 ID、权限请求、artifact 增量、agent 转移事件或分支元数据。这些字段风险很高，因为旧版 StoredMessage 行没有携带足够的证据，无法在不猜测的情况下重建它们。

## 文件结构

- 创建：`vera-runtime/src/runtime-event-backfill.ts`
  - 纯辅助函数，将低风险的旧版 StoredMessage 行转换为带标记的 RuntimeEvent。
  - 无 UI 导入、无 SessionManager 依赖、不写 RuntimeEventStore。
- 创建：`vera-runtime/src/__tests__/runtime-event-backfill.test.ts`
  - 低风险转换、恢复标记和跳过高风险行的单元测试。
- 修改：`vera-runtime/src/runtime-read-model.ts`
  - 当终态 run 的 RuntimeEvent 账本为空时，从 `projectionCache` 读取旧版行；若恢复的内存事件包含终态事件则使用它们。
- 修改：`vera-runtime/src/agent-run.ts`
  - 构建先前模型上下文时，若之前的终态 run 账本为空，从 `input.store` 读取旧版行；若恢复的内存事件包含终态事件则使用它们。
- 修改：`vera-runtime/src/__tests__/session-manager.test.ts`
  - 将当前硬失败（hard-fail）的读取模型测试改为恢复测试。
  - 添加一个第二 turn 测试，证明 `AgentRun` 可以从恢复的事件构建模型上下文。

## 低风险回填规则

仅回填 RuntimeEvent 形态可由 StoredMessage 直接佐证的行：

- `user` -> `role: 'user'`, `author: 'user'`, `content.kind: 'text'`，保留 attachments。
- `assistant` -> `role: 'model'`, `author: 'agent'`, `content.kind: 'text'`。
- `assistant.thinking` -> 单独的 `content.kind: 'thinking'` 事件，保留 signature。
- `tool_call` -> `content.kind: 'function_call'`，保留 id、name、args、displayName、intent。
- `tool_result` -> 仅当存在同 turn 更早的、具有相同 id 的 `tool_call` 时，转换为 `content.kind: 'function_response'`。
- `permission_decision` -> 仅当存在同 turn 更早的、具有相同 id 的 `tool_call` 时，转换为 `actions.permissionDecision`。
- `token_usage` -> `actions.tokenUsage`，逐字段精确复制。
- 终态事件 -> `status` 加 `actions.endInvocation`，仅当可以安全映射时：
  - `completed` 是安全的。
  - 仅当存在 `AgentRunHeader.failureClass` 时 `failed` 才安全。
  - 仅当存在旧版 `TurnStateMessage.abortSource` 时 `aborted` / `cancelled` 才安全。

每个恢复的事件必须携带：

```ts
actions: {
  stateDelta: {
    veraRuntimeRecovery: {
      kind: 'runtime_event_backfill',
      source: 'legacy_stored_message',
      reason: 'missing_runtime_event_ledger',
      sourceMessageId: 'legacy-message-id',
      sourceMessageType: 'assistant',
      confidence: 'lossless',
      generatedAt: 1710000000000,
      version: 1,
    },
  },
}
```

对于合成的终态事件，`sourceMessageId` 和 `sourceMessageType` 应指向同 turn 最新的 `turn_state` 行（如存在）。

### 任务 1：回填辅助函数单元测试

**文件：**
- 创建：`vera-runtime/src/__tests__/runtime-event-backfill.test.ts`

- [ ] **步骤 1：编写失败的辅助函数测试**

创建包含以下内容的 `vera-runtime/src/__tests__/runtime-event-backfill.test.ts`：

```ts
import { describe, test } from 'node:test';
import type { AgentRunHeader } from '@vera/core/agent-run';
import type { RuntimeEvent } from '@vera/core/runtime-event';
import type { StoredMessage } from '@vera/core/session';
import { expect } from '../test-helpers.js';
import {
  RUNTIME_EVENT_BACKFILL_STATE_KEY,
  backfillRuntimeEventsFromStoredMessages,
} from '../runtime-event-backfill.js';

const run: AgentRunHeader = {
  runId: 'run-1',
  sessionId: 'session-1',
  turnId: 'turn-1',
  status: 'completed',
  backendKind: 'fake',
  llmConnectionSlug: 'fake',
  modelId: 'fake-model',
  cwd: '/tmp/cwd',
  permissionMode: 'ask',
  createdAt: 100,
  updatedAt: 180,
  completedAt: 180,
};

function nextIds(): () => string {
  let index = 0;
  return () => {
    index += 1;
    return `rt-backfill-${index}`;
  };
}

function recoveryMarker(event: RuntimeEvent): Record<string, unknown> | undefined {
  return event.actions?.stateDelta?.[RUNTIME_EVENT_BACKFILL_STATE_KEY] as Record<string, unknown> | undefined;
}

describe('runtime event backfill', () => {
  test('backfills only low-risk RuntimeEvents from legacy StoredMessage rows', () => {
    const messages: StoredMessage[] = [
      {
        type: 'user',
        id: 'legacy-user',
        turnId: 'turn-1',
        ts: 101,
        text: 'hello',
        attachments: [{
          kind: 'txt',
          name: 'note.txt',
          mimeType: 'text/plain',
          bytes: 12,
          ref: { kind: 'session_file', sessionId: 'session-1', relativePath: 'attachments/note.txt' },
        }],
      },
      {
        type: 'assistant',
        id: 'legacy-assistant',
        turnId: 'turn-1',
        ts: 110,
        text: 'answer',
        modelId: 'fake-model',
        thinking: { text: 'reasoning', signature: 'sig-1' },
      },
      {
        type: 'tool_call',
        id: 'tool-1',
        turnId: 'turn-1',
        ts: 120,
        toolName: 'Read',
        displayName: 'Read file',
        intent: 'inspect',
        args: { path: 'README.md' },
      },
      {
        type: 'tool_result',
        id: 'legacy-tool-result',
        turnId: 'turn-1',
        ts: 130,
        toolUseId: 'tool-1',
        isError: false,
        content: { kind: 'text', text: 'file body' },
        durationMs: 42,
      },
      {
        type: 'permission_decision',
        id: 'perm-1',
        turnId: 'turn-1',
        ts: 140,
        toolUseId: 'tool-1',
        toolName: 'Read',
        decision: 'allow',
        rememberForTurn: true,
      },
      {
        type: 'token_usage',
        id: 'usage-1',
        turnId: 'turn-1',
        ts: 150,
        input: 10,
        output: 5,
        total: 15,
      },
      {
        type: 'turn_state',
        id: 'legacy-state',
        turnId: 'turn-1',
        ts: 180,
        status: 'completed',
        partialOutputRetained: true,
      },
    ];

    const result = backfillRuntimeEventsFromStoredMessages({
      run,
      messages,
      newId: nextIds(),
      now: () => 999,
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.events.map((event) => event.id)).toEqual([
      'rt-backfill-1',
      'rt-backfill-2',
      'rt-backfill-3',
      'rt-backfill-4',
      'rt-backfill-5',
      'rt-backfill-6',
      'rt-backfill-7',
      'rt-backfill-8',
    ]);
    expect(result.events.map((event) => event.invocationId)).toEqual(Array(8).fill('backfill-run-1'));
    expect(result.events.map((event) => event.partial)).toEqual(Array(8).fill(false));
    expect(result.events[0]?.content).toEqual({
      kind: 'text',
      text: 'hello',
      attachments: [{
        kind: 'txt',
        name: 'note.txt',
        mimeType: 'text/plain',
        bytes: 12,
        ref: { kind: 'session_file', sessionId: 'session-1', relativePath: 'attachments/note.txt' },
      }],
    });
    expect(result.events[1]?.content).toEqual({ kind: 'text', text: 'answer' });
    expect(result.events[2]?.content).toEqual({ kind: 'thinking', text: 'reasoning', signature: 'sig-1' });
    expect(result.events[3]?.content).toEqual({ kind: 'function_call', id: 'tool-1', name: 'Read', args: { path: 'README.md' } });
    expect(result.events[3]?.actions?.stateDelta?.displayName).toBe('Read file');
    expect(result.events[3]?.actions?.stateDelta?.intent).toBe('inspect');
    expect(result.events[4]?.content).toEqual({ kind: 'function_response', id: 'tool-1', name: 'Read', result: { kind: 'text', text: 'file body' }, isError: false });
    expect(result.events[4]?.actions?.stateDelta?.durationMs).toBe(42);
    expect(result.events[5]?.actions?.permissionDecision).toEqual({ requestId: 'perm-1', decision: 'allow', rememberForTurn: true });
    expect(result.events[5]?.refs).toEqual({ storedMessageId: 'perm-1', toolCallId: 'tool-1' });
    expect(result.events[6]?.actions?.tokenUsage).toEqual({ input: 10, output: 5, total: 15 });
    expect(result.events[7]?.status).toBe('completed');
    expect(result.events[7]?.actions?.endInvocation).toBe(true);
    expect(result.events[7]?.refs).toEqual({ storedMessageId: 'legacy-state' });

    for (const event of result.events) {
      expect(recoveryMarker(event)).toMatchObject({
        kind: 'runtime_event_backfill',
        source: 'legacy_stored_message',
        reason: 'missing_runtime_event_ledger',
        confidence: 'lossless',
        generatedAt: 999,
        version: 1,
      });
    }
  });

  test('skips high-risk legacy rows that cannot be reconstructed safely', () => {
    const messages: StoredMessage[] = [
      {
        type: 'tool_result',
        id: 'orphan-result',
        turnId: 'turn-1',
        ts: 120,
        toolUseId: 'missing-tool',
        isError: false,
        content: { kind: 'text', text: 'orphan' },
      },
      {
        type: 'permission_decision',
        id: 'orphan-permission',
        turnId: 'turn-1',
        ts: 130,
        toolUseId: 'missing-tool',
        toolName: 'Write',
        decision: 'deny',
      },
      {
        type: 'system_note',
        id: 'session-note',
        ts: 140,
        kind: 'session_resume',
      },
      {
        type: 'turn_state',
        id: 'legacy-state',
        turnId: 'turn-1',
        ts: 180,
        status: 'completed',
        partialOutputRetained: false,
      },
    ];

    const result = backfillRuntimeEventsFromStoredMessages({
      run,
      messages,
      newId: nextIds(),
      now: () => 999,
    });

    expect(result.events.map((event) => event.status)).toEqual(['completed']);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'skipped_unmatched_tool_result',
      'skipped_unmatched_permission_decision',
      'skipped_high_risk_message',
    ]);
  });
});
```

- [ ] **步骤 2：运行 typecheck，验证实现前测试失败**

运行：

```bash
npm --workspace @vera/runtime run typecheck
```

预期：失败，错误类似：

```text
Cannot find module '../runtime-event-backfill.js'
```

- [ ] **步骤 3：提交失败的测试**

运行：

```bash
git add vera-runtime/src/__tests__/runtime-event-backfill.test.ts
git commit -m "test: cover runtime ledger backfill rules"
```

### 任务 2：RuntimeEvent 回填辅助函数

**文件：**
- 创建：`vera-runtime/src/runtime-event-backfill.ts`
- 测试：`vera-runtime/src/__tests__/runtime-event-backfill.test.ts`

- [ ] **步骤 1：实现辅助函数**

创建包含以下内容的 `vera-runtime/src/runtime-event-backfill.ts`：

```ts
import type {
  RuntimeEvent,
  RuntimeEventStatus,
} from '@vera/core/runtime-event';
import { createRuntimeEventId } from '@vera/core/runtime-event';
import type { AgentRunHeader } from '@vera/core/agent-run';
import type {
  PermissionDecisionMessage,
  StoredMessage,
  TokenUsageMessage,
  ToolCallMessage,
  ToolResultMessage,
  TurnStateMessage,
} from '@vera/core/session';

export const RUNTIME_EVENT_BACKFILL_STATE_KEY = 'veraRuntimeRecovery';

export type RuntimeEventBackfillDiagnosticCode =
  | 'skipped_high_risk_message'
  | 'skipped_unmatched_tool_result'
  | 'skipped_unmatched_permission_decision'
  | 'skipped_unsafe_terminal_state';

export interface RuntimeEventBackfillDiagnostic {
  code: RuntimeEventBackfillDiagnosticCode;
  message: string;
  detail?: unknown;
}

export interface RuntimeEventBackfillInput {
  run: AgentRunHeader;
  messages: readonly StoredMessage[];
  invocationId?: string;
  now?: () => number;
  newId?: () => string;
}

export interface RuntimeEventBackfillResult {
  events: RuntimeEvent[];
  diagnostics: RuntimeEventBackfillDiagnostic[];
}

interface RuntimeEventBackfillRecoveryState {
  kind: 'runtime_event_backfill';
  source: 'legacy_stored_message';
  reason: 'missing_runtime_event_ledger';
  sourceMessageId?: string;
  sourceMessageType?: StoredMessage['type'];
  confidence: 'lossless';
  generatedAt: number;
  version: 1;
}

export function backfillRuntimeEventsFromStoredMessages(input: RuntimeEventBackfillInput): RuntimeEventBackfillResult {
  const newId = input.newId ?? (() => createRuntimeEventId('rt-backfill'));
  const now = input.now ?? (() => Date.now());
  const invocationId = input.invocationId ?? `backfill-${input.run.runId}`;
  const diagnostics: RuntimeEventBackfillDiagnostic[] = [];
  const events: RuntimeEvent[] = [];
  const turnMessages = input.messages
    .filter((message) => messageTurnId(message) === input.run.turnId)
    .slice()
    .sort((a, b) => a.ts - b.ts || messageId(a).localeCompare(messageId(b)));
  const toolCalls = new Map<string, ToolCallMessage>();

  for (const message of turnMessages) {
    if (message.type === 'tool_call') {
      toolCalls.set(message.id, message);
    }
  }

  for (const message of turnMessages) {
    const base = {
      invocationId,
      runId: input.run.runId,
      sessionId: input.run.sessionId,
      turnId: input.run.turnId,
      ts: message.ts,
      partial: false,
    } as const;

    switch (message.type) {
      case 'user':
        events.push({
          ...base,
          id: newId(),
          role: 'user',
          author: 'user',
          content: {
            kind: 'text',
            text: message.text,
            ...(message.attachments !== undefined && message.attachments.length > 0
              ? { attachments: message.attachments }
              : {}),
          },
          actions: { stateDelta: recoveryState(now, message) },
          refs: { storedMessageId: message.id },
        });
        break;

      case 'assistant':
        events.push({
          ...base,
          id: newId(),
          role: 'model',
          author: 'agent',
          content: { kind: 'text', text: message.text },
          actions: { stateDelta: recoveryState(now, message) },
          refs: { storedMessageId: message.id },
        });
        if (message.thinking && message.thinking.text.length > 0) {
          events.push({
            ...base,
            id: newId(),
            role: 'model',
            author: 'agent',
            content: {
              kind: 'thinking',
              text: message.thinking.text,
              ...(message.thinking.signature !== undefined ? { signature: message.thinking.signature } : {}),
            },
            actions: { stateDelta: recoveryState(now, message) },
            refs: { storedMessageId: message.id },
          });
        }
        break;

      case 'tool_call':
        events.push({
          ...base,
          id: newId(),
          role: 'model',
          author: 'agent',
          content: {
            kind: 'function_call',
            id: message.id,
            name: message.toolName,
            args: message.args,
          },
          actions: {
            stateDelta: {
              ...recoveryState(now, message),
              ...(message.displayName !== undefined ? { displayName: message.displayName } : {}),
              ...(message.intent !== undefined ? { intent: message.intent } : {}),
            },
          },
          refs: { storedMessageId: message.id, toolCallId: message.id },
        });
        break;

      case 'tool_result': {
        const call = safePriorToolCall(toolCalls, message);
        if (!call) {
          diagnostics.push({
            code: 'skipped_unmatched_tool_result',
            message: 'tool_result requires an earlier same-turn tool_call to recover RuntimeEvent function_response',
            detail: { messageId: message.id, toolUseId: message.toolUseId, runId: input.run.runId, turnId: input.run.turnId },
          });
          break;
        }
        events.push({
          ...base,
          id: newId(),
          role: 'tool',
          author: 'tool',
          content: {
            kind: 'function_response',
            id: message.toolUseId,
            name: call.toolName,
            result: message.content,
            ...(message.isError ? { isError: true } : {}),
          },
          actions: {
            stateDelta: {
              ...recoveryState(now, message),
              ...(message.durationMs !== undefined ? { durationMs: message.durationMs } : {}),
            },
          },
          refs: { storedMessageId: message.id, toolCallId: message.toolUseId },
        });
        break;
      }

      case 'permission_decision': {
        const call = safePriorToolCall(toolCalls, message);
        if (!call) {
          diagnostics.push({
            code: 'skipped_unmatched_permission_decision',
            message: 'permission_decision requires an earlier same-turn tool_call to recover RuntimeEvent permissionDecision',
            detail: { messageId: message.id, toolUseId: message.toolUseId, runId: input.run.runId, turnId: input.run.turnId },
          });
          break;
        }
        events.push({
          ...base,
          id: newId(),
          role: 'system',
          author: 'system',
          actions: {
            stateDelta: recoveryState(now, message),
            permissionDecision: {
              requestId: message.id,
              decision: message.decision,
              ...(message.rememberForTurn !== undefined ? { rememberForTurn: message.rememberForTurn } : {}),
            },
          },
          refs: { storedMessageId: message.id, toolCallId: call.id },
        });
        break;
      }

      case 'token_usage':
        events.push({
          ...base,
          id: newId(),
          role: 'system',
          author: 'system',
          actions: {
            stateDelta: recoveryState(now, message),
            tokenUsage: tokenUsageFromMessage(message),
          },
          refs: { storedMessageId: message.id },
        });
        break;

      case 'turn_state':
        break;

      case 'system_note':
        diagnostics.push({
          code: 'skipped_high_risk_message',
          message: 'system_note is not recovered into a run ledger because session-level notes may not belong to this run',
          detail: { messageId: message.id, kind: message.kind, runId: input.run.runId, turnId: input.run.turnId },
        });
        break;
    }
  }

  const terminal = terminalRuntimeEvent({ run: input.run, turnMessages, invocationId, newId, now });
  if (terminal.event) {
    events.push(terminal.event);
  } else if (terminal.diagnostic) {
    diagnostics.push(terminal.diagnostic);
  }

  return { events, diagnostics };
}

function recoveryState(now: () => number, message: StoredMessage): Record<string, unknown> {
  const state: RuntimeEventBackfillRecoveryState = {
    kind: 'runtime_event_backfill',
    source: 'legacy_stored_message',
    reason: 'missing_runtime_event_ledger',
    sourceMessageId: messageId(message),
    sourceMessageType: message.type,
    confidence: 'lossless',
    generatedAt: now(),
    version: 1,
  };
  return { [RUNTIME_EVENT_BACKFILL_STATE_KEY]: state };
}

function terminalRecoveryState(now: () => number, message: TurnStateMessage | undefined): Record<string, unknown> {
  const state: RuntimeEventBackfillRecoveryState = {
    kind: 'runtime_event_backfill',
    source: 'legacy_stored_message',
    reason: 'missing_runtime_event_ledger',
    ...(message ? { sourceMessageId: message.id, sourceMessageType: message.type } : {}),
    confidence: 'lossless',
    generatedAt: now(),
    version: 1,
  };
  return { [RUNTIME_EVENT_BACKFILL_STATE_KEY]: state };
}

function terminalRuntimeEvent(input: {
  run: AgentRunHeader;
  turnMessages: readonly StoredMessage[];
  invocationId: string;
  newId: () => string;
  now: () => number;
}): { event?: RuntimeEvent; diagnostic?: RuntimeEventBackfillDiagnostic } {
  const turnState = latestTurnState(input.turnMessages);
  const status = terminalStatus(input.run, turnState);
  if (!status) {
    return {
      diagnostic: {
        code: 'skipped_unsafe_terminal_state',
        message: 'terminal RuntimeEvent was not recovered because legacy terminal evidence is incomplete',
        detail: { runId: input.run.runId, turnId: input.run.turnId, runStatus: input.run.status, turnStatus: turnState?.status },
      },
    };
  }
  const ts = turnState?.ts ?? input.run.completedAt ?? input.run.updatedAt;
  return {
    event: {
      id: input.newId(),
      invocationId: input.invocationId,
      runId: input.run.runId,
      sessionId: input.run.sessionId,
      turnId: input.run.turnId,
      ts,
      partial: false,
      role: 'system',
      author: 'system',
      status,
      actions: {
        endInvocation: true,
        stateDelta: {
          ...terminalRecoveryState(input.now, turnState),
          ...(turnState?.abortSource !== undefined ? { abortSource: turnState.abortSource } : {}),
        },
      },
      ...(turnState ? { refs: { storedMessageId: turnState.id } } : {}),
    },
  };
}

function terminalStatus(run: AgentRunHeader, turnState: TurnStateMessage | undefined): RuntimeEventStatus | undefined {
  const legacyStatus = turnState?.status;
  if (legacyStatus === 'completed' || run.status === 'completed') return 'completed';
  if ((legacyStatus === 'failed' || run.status === 'failed') && run.failureClass) return 'failed';
  if ((legacyStatus === 'aborted' || run.status === 'cancelled') && turnState?.abortSource) return 'aborted';
  return undefined;
}

function latestTurnState(messages: readonly StoredMessage[]): TurnStateMessage | undefined {
  return messages
    .filter((message): message is TurnStateMessage => message.type === 'turn_state')
    .at(-1);
}

function safePriorToolCall(
  toolCalls: ReadonlyMap<string, ToolCallMessage>,
  message: ToolResultMessage | PermissionDecisionMessage,
): ToolCallMessage | undefined {
  const call = toolCalls.get(message.toolUseId);
  if (!call) return undefined;
  return call.ts <= message.ts ? call : undefined;
}

function tokenUsageFromMessage(message: TokenUsageMessage): NonNullable<RuntimeEvent['actions']>['tokenUsage'] {
  return {
    input: message.input,
    output: message.output,
    ...(message.cacheHitInput !== undefined ? { cacheHitInput: message.cacheHitInput } : {}),
    ...(message.cacheMissInput !== undefined ? { cacheMissInput: message.cacheMissInput } : {}),
    ...(message.cacheWriteInput !== undefined ? { cacheWriteInput: message.cacheWriteInput } : {}),
    ...(message.cacheMissInputSource !== undefined ? { cacheMissInputSource: message.cacheMissInputSource } : {}),
    ...(message.reasoning !== undefined ? { reasoning: message.reasoning } : {}),
    ...(message.total !== undefined ? { total: message.total } : {}),
    ...(message.rawFinishReason !== undefined ? { rawFinishReason: message.rawFinishReason } : {}),
    ...(message.cacheRead !== undefined ? { cacheRead: message.cacheRead } : {}),
    ...(message.cacheCreation !== undefined ? { cacheCreation: message.cacheCreation } : {}),
    ...(message.costUsd !== undefined ? { costUsd: message.costUsd } : {}),
    ...(message.systemPromptHash !== undefined ? { systemPromptHash: message.systemPromptHash } : {}),
    ...(message.prefixHash !== undefined ? { prefixHash: message.prefixHash } : {}),
    ...(message.prefixChangeReason !== undefined ? { prefixChangeReason: message.prefixChangeReason } : {}),
    ...(message.requestShapeHash !== undefined ? { requestShapeHash: message.requestShapeHash } : {}),
    ...(message.requestShapeChangeReason !== undefined ? { requestShapeChangeReason: message.requestShapeChangeReason } : {}),
    ...(message.promptSegments !== undefined ? { promptSegments: message.promptSegments } : {}),
    ...(message.contextBudget !== undefined ? { contextBudget: message.contextBudget } : {}),
  };
}

function messageTurnId(message: StoredMessage): string | undefined {
  return 'turnId' in message && typeof message.turnId === 'string' ? message.turnId : undefined;
}

function messageId(message: StoredMessage): string {
  return 'id' in message && typeof message.id === 'string' ? message.id : '';
}
```

- [ ] **步骤 2：运行 typecheck**

运行：

```bash
npm --workspace @vera/runtime run typecheck
```

预期：通过。

- [ ] **步骤 3：运行 runtime 测试**

运行：

```bash
npm --workspace @vera/runtime run test
```

预期：通过，包括 `runtime-event-backfill.test.js`。

- [ ] **步骤 4：提交辅助函数**

运行：

```bash
git add vera-runtime/src/runtime-event-backfill.ts vera-runtime/src/__tests__/runtime-event-backfill.test.ts
git commit -m "feat: add in-memory runtime ledger backfill"
```

### 任务 3：RuntimeReadModel 空账本回退

**文件：**
- 修改：`vera-runtime/src/runtime-read-model.ts`
- 修改：`vera-runtime/src/__tests__/session-manager.test.ts`
- 测试：`vera-runtime/src/__tests__/session-manager.test.ts`

- [ ] **步骤 1：更新现有硬失败测试以预期恢复**

在 `vera-runtime/src/__tests__/session-manager.test.ts` 中，将名为 `getMessages rejects when a terminal run has no runtime ledger` 的测试替换为：

```ts
  test('getMessages backfills low-risk legacy rows when a terminal run has no runtime ledger', async () => {
    const store = new MemorySessionStore();
    const runStore = new MemoryAgentRunStore();
    const manager = makeManagerForReadCutover(store, runStore);
    const session = await manager.createSession(makeInput());
    const legacyMessages: StoredMessage[] = [
      { type: 'user', id: 'legacy-user', turnId: 'turn-1', ts: 101, text: 'legacy only' },
      { type: 'assistant', id: 'legacy-assistant', turnId: 'turn-1', ts: 102, text: 'legacy answer', modelId: 'fake-model' },
      { type: 'tool_call', id: 'tool-1', turnId: 'turn-1', ts: 103, toolName: 'Read', args: { path: 'README.md' } },
      { type: 'tool_result', id: 'legacy-tool-result', turnId: 'turn-1', ts: 104, toolUseId: 'tool-1', isError: false, content: { kind: 'text', text: 'file body' } },
      { type: 'token_usage', id: 'legacy-usage', turnId: 'turn-1', ts: 105, input: 10, output: 5 },
      { type: 'turn_state', id: 'legacy-state', turnId: 'turn-1', ts: 106, status: 'completed', partialOutputRetained: true },
    ];
    await store.appendMessages(session.id, legacyMessages);
    await runStore.createRun(makeRunHeader({
      sessionId: session.id,
      runId: 'run-1',
      turnId: 'turn-1',
      status: 'completed',
      completedAt: 106,
    }));

    const messages = await manager.getMessages(session.id);
    const runtimeEvents = await runStore.readRuntimeEvents(session.id, 'run-1');

    expect(messages.map((message) => message.type)).toEqual([
      'user',
      'assistant',
      'tool_call',
      'tool_result',
      'token_usage',
      'turn_state',
    ]);
    expect(messages.map((message) => message.id)).toEqual([
      'legacy-user',
      'legacy-assistant',
      'tool-1',
      'legacy-tool-result',
      'legacy-usage',
      'legacy-state',
    ]);
    expect(runtimeEvents).toEqual([]);
  });
```

- [ ] **步骤 2：运行测试，验证接线前失败**

运行：

```bash
npm --workspace @vera/runtime run test
```

预期：失败，错误为：

```text
RuntimeEvent ledger is missing for a terminal run
```

- [ ] **步骤 3：将回退接入 RuntimeReadModel**

在 `vera-runtime/src/runtime-read-model.ts` 中，在其他本地导入附近添加此导入：

```ts
import { backfillRuntimeEventsFromStoredMessages } from './runtime-event-backfill.js';
```

然后替换 `getSessionView()` 中的空账本分支：

```ts
      if (runEvents.length === 0) {
        throw new RuntimeReadModelError('RuntimeEvent ledger is missing for a terminal run', [
          readModelDiagnostic('incomplete_event', 'terminal run has no readable RuntimeEvent ledger', {
            runId: run.runId,
            turnId: run.turnId,
          }),
        ]);
      }
```

为：

```ts
      if (runEvents.length === 0) {
        const recovered = await this.backfillMissingRuntimeEvents(sessionId, run);
        if (recovered.length === 0 || !recovered.some(isTerminalRuntimeEvent)) {
          throw new RuntimeReadModelError('RuntimeEvent ledger is missing for a terminal run', [
            readModelDiagnostic('incomplete_event', 'terminal run has no readable RuntimeEvent ledger', {
              runId: run.runId,
              turnId: run.turnId,
            }),
          ]);
        }
        runEvents = recovered;
      }
```

在 `RuntimeReadModel` 内部、`buildView()` 之前添加此私有方法：

```ts
  private async backfillMissingRuntimeEvents(sessionId: string, run: AgentRunHeader): Promise<RuntimeEvent[]> {
    if (!this.deps.projectionCache) return [];
    let messages: StoredMessage[];
    try {
      messages = await this.deps.projectionCache.readMessages(sessionId);
    } catch {
      return [];
    }
    return backfillRuntimeEventsFromStoredMessages({ run, messages }).events;
  }
```

- [ ] **步骤 4：运行测试**

运行：

```bash
npm --workspace @vera/runtime run test
```

预期：更新后的读取模型恢复测试通过。

- [ ] **步骤 5：提交读取模型回退**

运行：

```bash
git add vera-runtime/src/runtime-read-model.ts vera-runtime/src/__tests__/session-manager.test.ts
git commit -m "fix: backfill empty runtime ledger in read model"
```

### 任务 4：AgentRun 先前上下文回退

**文件：**
- 修改：`vera-runtime/src/agent-run.ts`
- 修改：`vera-runtime/src/__tests__/session-manager.test.ts`
- 测试：`vera-runtime/src/__tests__/session-manager.test.ts`

- [ ] **步骤 1：添加一个失败的第二 turn 上下文测试**

在 `vera-runtime/src/__tests__/session-manager.test.ts` 中，在 `runtime event ledger write failure does not fail sendMessage` 之后添加此测试：

```ts
  test('sendMessage backfills an empty prior runtime ledger for model context', async () => {
    const store = new MemorySessionStore();
    const runStore = new MemoryAgentRunStore();
    const backends = new BackendRegistry();
    let backend: TestBackend | undefined;
    backends.register('fake', (ctx) => {
      backend = new TestBackend(ctx);
      return backend;
    });
    const manager = new SessionManager({
      store,
      runStore,
      runtimeEventStore: runStore,
      backends,
      newId: nextId(),
      now: nextNow(7_000),
      runtimeSource: 'test',
    });
    const session = await manager.createSession(makeInput());
    await store.appendMessages(session.id, [
      { type: 'user', id: 'legacy-user', turnId: 'turn-1', ts: 101, text: 'prior question' },
      { type: 'assistant', id: 'legacy-assistant', turnId: 'turn-1', ts: 102, text: 'prior answer', modelId: 'fake-model' },
      { type: 'turn_state', id: 'legacy-state', turnId: 'turn-1', ts: 103, status: 'completed', partialOutputRetained: true },
    ]);
    await runStore.createRun(makeRunHeader({
      sessionId: session.id,
      runId: 'run-1',
      turnId: 'turn-1',
      status: 'completed',
      createdAt: 100,
      updatedAt: 103,
      completedAt: 103,
    }));

    const sessionEvents = await collectSessionEvents(
      manager.sendMessage(session.id, { turnId: 'turn-2', text: 'follow up' }),
    );

    expect(sessionEvents.map((event) => event.type)).toEqual(['text_delta', 'complete']);
    expect(backend?.sendInputs[0]?.context.map((message) => message.type)).toEqual(['user', 'assistant', 'turn_state']);
    expect(backend?.sendInputs[0]?.context.map((message) => 'text' in message ? message.text : message.type)).toEqual([
      'prior question',
      'prior answer',
      'turn_state',
    ]);
    expect(backend?.sendInputs[0]?.runtimeContext?.map((event) => event.runId)).toEqual(['run-1', 'run-1', 'run-1']);
    expect(await runStore.readRuntimeEvents(session.id, 'run-1')).toEqual([]);
  });
```

- [ ] **步骤 2：运行测试，验证接线前失败**

运行：

```bash
npm --workspace @vera/runtime run test
```

预期：失败，错误为：

```text
Cannot build model context: RuntimeEvent ledger is missing for prior run run-1
```

- [ ] **步骤 3：将回退接入 AgentRun**

在 `vera-runtime/src/agent-run.ts` 中，在其他本地导入附近添加此导入：

```ts
import { backfillRuntimeEventsFromStoredMessages } from './runtime-event-backfill.js';
```

然后替换 `buildPriorRuntimeContext()` 中的此段：

```ts
      const events = await this.input.runtimeEventStore.readRuntimeEvents(this.sessionId, run.runId);
      if (events.length === 0) {
        throw new Error(`Cannot build model context: RuntimeEvent ledger is missing for prior run ${run.runId}`);
      }
      if (!events.some(isTerminalRuntimeEvent)) {
        throw new Error(`Cannot build model context: RuntimeEvent ledger has no terminal fact for prior run ${run.runId}`);
      }
```

为：

```ts
      let events = await this.input.runtimeEventStore.readRuntimeEvents(this.sessionId, run.runId);
      if (events.length === 0) {
        const recovered = await this.backfillMissingPriorRuntimeEvents(run);
        if (recovered.length === 0 || !recovered.some(isTerminalRuntimeEvent)) {
          throw new Error(`Cannot build model context: RuntimeEvent ledger is missing for prior run ${run.runId}`);
        }
        events = recovered;
      }
      if (!events.some(isTerminalRuntimeEvent)) {
        throw new Error(`Cannot build model context: RuntimeEvent ledger has no terminal fact for prior run ${run.runId}`);
      }
```

在 `AgentRun` 内部、`buildPriorRuntimeContext()` 之前添加此私有方法：

```ts
  private async backfillMissingPriorRuntimeEvents(run: AgentRunHeader): Promise<RuntimeEvent[]> {
    let messages: StoredMessage[];
    try {
      messages = await this.input.store.readMessages(this.sessionId);
    } catch {
      return [];
    }
    return backfillRuntimeEventsFromStoredMessages({ run, messages }).events;
  }
```

- [ ] **步骤 4：运行测试**

运行：

```bash
npm --workspace @vera/runtime run test
```

预期：新的第二 turn 上下文测试通过。

- [ ] **步骤 5：提交 AgentRun 回退**

运行：

```bash
git add vera-runtime/src/agent-run.ts vera-runtime/src/__tests__/session-manager.test.ts
git commit -m "fix: backfill empty runtime ledger for prior context"
```

### 任务 5：最终验证

**文件：**
- 验证：`vera-runtime/src/runtime-event-backfill.ts`
- 验证：`vera-runtime/src/runtime-read-model.ts`
- 验证：`vera-runtime/src/agent-run.ts`
- 验证：`vera-runtime/src/__tests__/runtime-event-backfill.test.ts`
- 验证：`vera-runtime/src/__tests__/session-manager.test.ts`

- [ ] **步骤 1：运行 runtime typecheck**

运行：

```bash
npm --workspace @vera/runtime run typecheck
```

预期：通过。

- [ ] **步骤 2：运行 runtime 测试**

运行：

```bash
npm --workspace @vera/runtime run test
```

预期：通过。

- [ ] **步骤 3：运行仓库 typecheck**

运行：

```bash
npm run typecheck
```

预期：定义 `typecheck` 的工作区全部通过。

- [ ] **步骤 4：检查最终 diff**

运行：

```bash
git diff --stat
git diff -- vera-runtime/src/runtime-event-backfill.ts vera-runtime/src/runtime-read-model.ts vera-runtime/src/agent-run.ts vera-runtime/src/__tests__/runtime-event-backfill.test.ts vera-runtime/src/__tests__/session-manager.test.ts
```

预期：diff 仅涉及 runtime Agent 代码和 runtime 测试。

- [ ] **步骤 5：如有必要，提交最终验证调整**

仅当任务 4 之后的最终验证需要小幅修复时才运行：

```bash
git add vera-runtime/src/runtime-event-backfill.ts vera-runtime/src/runtime-read-model.ts vera-runtime/src/agent-run.ts vera-runtime/src/__tests__/runtime-event-backfill.test.ts vera-runtime/src/__tests__/session-manager.test.ts
git commit -m "test: verify runtime ledger backfill"
```

## 自审

- 规格覆盖：本方案涵盖恢复标记、仅低风险回填、无 UI 改动、读取模型恢复以及下一 turn 的 AgentRun 上下文恢复。
- 占位符扫描：本方案不含未完成的占位符标记，没有泛泛的测试指示，每个改动代码的步骤都包含具体代码。
- 类型一致性：本方案使用的 `RuntimeEvent`、`StoredMessage`、`AgentRunHeader`、`RuntimeReadModel`、`AgentRun` 和 `RuntimeEventStore` 名称均存在于当前代码库中。
- 范围检查：本方案有意将非空的损坏账本留待日后修复，因为安全地修复它们可能需要账本隔离（ledger quarantine）或批量修复接口。
