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

# Runtime v2 架构演进

> 归档于 2026-07-13。本提案记录的是通往当前 runtime 的路径，不是当前架构的权威说明。请从 `ARCHITECTURE.md` 开始。

本文档为 Vera 的 agent runtime 提出一条长期演进路径。它面向需要理解以下问题的开发者：为什么 runtime 需要再做一次架构调整、哪些部分应当保持稳定，以及代码库如何在不进行大爆炸式重写的情况下迁移到那里。

目标不是替换 Vercel AI SDK。目标是让 Vera 拥有自己的 runtime 语义，同时继续使用 AI SDK 作为主要的模型/工具步进引擎。

## 执行摘要

Vera 已经有一个可用的本地编码 agent runtime：

- Electron 桌面入口
- session JSONL 存储
- 通过 AI SDK 的模型流式输出
- 工具执行与权限提示
- 中止处理
- bot 与 OpenGateway 入口
- 工具工件与用量遥测
- 一个内部的 `AgentRun` 账本

当前架构优于最初的单体路径，但 runtime 仍然缺少一个稳定的重心。同一次运行目前通过几个相关但彼此分离的结构来表示：

- session JSONL 中的 `StoredMessage`
- 面向 renderer 的 `SessionEvent`
- 运行账本中的 `AgentRunEvent`
- 尽力而为的 `RunTraceEvent`
- 遥测记录

这种拆分让系统难以演进，也让一些重要问题变得比应有的更难回答：

- 哪些事实是 runtime 的真正真相？
- 哪些对象只是 UI 投影？
- 哪些事件应该被重放进下一次模型请求？
- 哪些事件仅用于诊断？
- permission、tool、recovery 与 telemetry 语义应该放在哪里？

Runtime v2 应该引入一条规范的调用/事件主轴：

```text
RuntimeRunner
  -> InvocationContext
  -> AgentFlow
      -> AiSdkFlow
          -> AI SDK streamText
          -> ToolRuntime
  -> RuntimeEvent ledger
  -> projections
```

关键的转变是：

```text
Today:
  SessionManager + StoredMessage/SessionEvent are close to the runtime center.

Target:
  Invocation + RuntimeEvent + AgentFlow are the runtime center.
  StoredMessage, renderer SessionEvent, AgentRunStore, RunTrace, and telemetry
  become projections or ledgers derived from canonical runtime facts.
```

## 设计输入

本提案基于 Vera 当前实现，以及 Google ADK Go 阅读材料中记录的 runtime 结构。从 ADK 学到的有用一课不是照搬类型名，而是分层方式：

```text
Runner -> Agent -> Flow -> Model/Tool -> Event -> Session
```

在该模型中：

- `Runner` 拥有调用外壳与持久化边界。
- `Agent` 拥有生命周期与路由。
- `Flow` 拥有模型/工具循环。
- `Event` 是共享的 runtime 事实语言。
- `Session` 存储持久历史与作用域状态。
- tool、callback、plugin、instruction、workflow、entrypoint 与 telemetry 层围绕这条主轴挂载，而不会自己变成主轴。

Vera 有不同的产品约束，因此演进应当做适配：

- 长期以 AI SDK 作为主 flow 实现；
- 保留 Electron 与现有用户可见的 session 行为；
- 保留现有 JSONL 兼容性；
- 复用 `ToolRuntime`、`AgentRunStore` 与 `RunTrace`；
- 避免一个所有存储与 UI 投影一次性变更的切换日（flag day）。

## 当前 runtime 路径

今天，一个用户 turn 大致是这样的流程：

```text
renderer / bot / gateway
  -> desktop main / entrypoint code
     -> ensureSessionCanSend(...)
     -> SessionManager.sendMessage(sessionId, input)
        -> new AgentRun(...)
        -> AgentRun.execute()
           -> append user StoredMessage
           -> append turn_state=running
           -> lock connection snapshot
           -> ensureActive() / build AiSdkBackend
           -> register active run
           -> AiSdkBackend.send()
              -> PermissionEngine.beginTurn()
              -> RunTrace
              -> ModelAdapter.resolveModel()
              -> build AI SDK tool map
              -> materialize prior StoredMessage[] into AI SDK messages
              -> AI SDK streamText({ tools, stopWhen: stepCountIs(maxSteps) })
                 -> AI SDK owns model -> tool -> model stepping
                 -> tool.execute(...) calls ToolRuntime
              -> pump fullStream into SessionEvent queue
              -> append assistant StoredMessage
              -> append token_usage StoredMessage
              -> queue complete/error/abort
           -> AgentRun updates SessionHeader / turn_state / AgentRunStore
           -> cleanup active run
```

这种拆分有一些好的性质：

- `SessionManager.sendMessage()` 不再拥有整个热路径。
- `AgentRun` 提供持久化的运行生命周期记录。
- `ToolRuntime` 是工具权限、执行、工件与工具遥测的真实边界。
- `ModelAdapter` 隔离 provider/AI SDK 流与错误归一化。

但它也有结构性局限：

- Vera 没有自己的显式 `Flow.Run`；模型/工具循环隐式存在于 `AiSdkBackend.send()` 与 AI SDK 内部。
- 跨 turn 的模型历史由选定的 `StoredMessage` 类型构建，而不是来自规范的 runtime 事件历史。
- 工具调用与工具结果为了 UI/历史而持久化，但它们在未来模型上下文中的角色是 `materializePriorMessages()` 内部的隐式策略。
- permission 与 tool 事件分散在 `StoredMessage`、`SessionEvent`、`RunTraceEvent` 与遥测中，而不是一个规范事实。
- 入口仍拥有部分 runtime 就绪语义，例如连接就绪/重绑检查。

## 目标架构

目标架构继续以 AI SDK 作为主要的模型/工具步进引擎，但用 Vera 自有的调用与事件语义包裹它。

```text
┌────────────────────────────────────────────────────────────────────┐
│                        Entrypoint Adapters                         │
│                                                                    │
│  Desktop IPC             Bot Gateway             OpenGateway       │
│  - parse input           - parse input           - parse HTTP      │
│  - validate shape        - auth/rate limit       - SSE/JSON        │
│  - broadcast output      - send bot reply        - gateway output  │
│                                                                    │
│  Entrypoints are protocol adapters. They do not own runtime loop,   │
│  readiness, recovery, or model/tool policy.                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ RuntimeRequest
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                          RuntimeRunner                            │
│                                                                    │
│  - RuntimeGate preflight                                           │
│  - create invocation/run context                                   │
│  - append user RuntimeEvent                                        │
│  - resolve active agent/flow policy                                │
│  - run AgentFlow                                                   │
│  - persist canonical events                                        │
│  - drive projections                                               │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ InvocationContext
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         AgentFlow Interface                        │
│                                                                    │
│  interface AgentFlow {                                             │
│    run(ctx, input): AsyncIterable<RuntimeEvent>                    │
│  }                                                                 │
│                                                                    │
│  AiSdkFlow is the default long-term implementation:                 │
│                                                                    │
│    - build AI SDK messages from runtime history projection          │
│    - build AI SDK tool map                                          │
│    - call streamText({ tools, stopWhen: stepCountIs(...) })         │
│    - map text/thinking/tool/usage/finish/error to RuntimeEvent      │
│    - delegate tool execution to ToolRuntime                         │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ tool.execute seam
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                           ToolRuntime                              │
│                                                                    │
│  - declaration/schema/registry                                      │
│  - permission evaluation and parked decisions                       │
│  - tool implementation execution                                    │
│  - output deltas and artifacts                                      │
│  - tool telemetry                                                   │
│  - RuntimeEvent(tool_call/tool_result/permission/artifact)          │
│  - returns result to AI SDK so streamText can continue stepping      │
└────────────────────────────────────────────────────────────────────┘
```

共享服务位于这条路径旁边：

```text
RuntimeEventLedger
  canonical invocation facts

ProjectionManager
  RuntimeEvent -> StoredMessage JSONL
  RuntimeEvent -> renderer SessionEvent stream
  RuntimeEvent -> TurnRecord / SessionHeader
  RuntimeEvent -> AgentRunStore / RunTrace
  RuntimeEvent -> TelemetryRepo

SessionService
  event history + scoped state
  legacy JSONL compatibility

RuntimeGate
  readiness / rebind / blocked/running/waiting guards

Plugin / Callback / Instruction
  prompt injection / audit / retry-reflect / telemetry hooks
```

## 规范 RuntimeEvent

Runtime v2 需要一个单一的内部事实模型。草图：

```ts
type RuntimeEvent = {
  id: string;
  invocationId: string;
  runId: string;
  sessionId: string;
  turnId: string;
  ts: number;

  author: 'user' | 'agent' | 'tool' | 'system';
  role: 'user' | 'model' | 'tool' | 'system';
  branch?: string;
  partial: boolean;

  content?: {
    text?: string;
    thinking?: string;
    functionCall?: {
      id: string;
      name: string;
      args: unknown;
    };
    functionResponse?: {
      id: string;
      name: string;
      result: unknown;
      isError?: boolean;
    };
    error?: {
      code?: string;
      reason?: string;
      message: string;
    };
  };

  actions?: {
    stateDelta?: Record<string, unknown>;
    artifactDelta?: Record<string, string | number>;
    permissionRequest?: PermissionRequest;
    permissionDecision?: PermissionDecision;
    transferToAgent?: string;
    endInvocation?: boolean;
    tokenUsage?: TokenUsage;
  };

  refs?: {
    storedMessageId?: string;
    traceEventId?: string;
    toolCallId?: string;
    providerEventId?: string;
  };
};
```

这个事件不是 UI 事件，也不是 trace 事件。它是内部 runtime 事实。其他记录要么由它写出，要么显式链接到它。

## 消费路径

### 桌面端用户消息

```text
Renderer
  -> preload IPC
  -> main IPC handler
     -> normalize input
     -> validate attachment shape
  -> RuntimeRunner.run({ source: 'desktop', sessionId, text, attachments })
     -> RuntimeGate.preflight()
     -> create invocation
     -> append RuntimeEvent(user)
     -> ProjectionManager writes user StoredMessage and renderer append event
     -> AiSdkFlow.run(ctx)
        -> build AI SDK messages from runtime history projection
        -> streamText(...)
        -> partial model chunks -> RuntimeEvent(partial model text)
        -> final model output -> RuntimeEvent(final model text)
        -> tool calls go through ToolRuntime
     -> ProjectionManager writes:
        -> assistant StoredMessage
        -> TurnRecord
        -> SessionHeader
        -> AgentRun ledger status
        -> telemetry usage/tool records
  -> main process streams projected SessionEvents back to renderer
```

renderer 消费的是投影流，不直接消费 runtime 核心。

### 工具调用与权限

```text
AiSdkFlow
  -> AI SDK asks tool.execute({ args, toolCallId })
  -> ToolRuntime.executeTool()
     -> RuntimeEvent(tool_call)
        -> StoredMessage tool_call
        -> renderer tool_start
     -> PermissionEngine.evaluate()
        ├─ allow
        │   -> run tool.impl
        │   -> RuntimeEvent(tool_result)
        │   -> return result to AI SDK
        │
        ├─ block
        │   -> RuntimeEvent(tool_result isError synthetic)
        │   -> return synthetic error result to AI SDK
        │
        └─ prompt
            -> RuntimeEvent(permission_request)
            -> renderer permission modal
            -> session waiting_for_user projection
            -> park tool execution
            -> respondPermission(...)
            -> RuntimeEvent(permission_decision)
            -> allow/deny branch
```

Permission 是 runtime 动作，而不只是 UI 事件。它应该用 `RuntimeEvent.actions` 表示。

### 模型历史构建

今天，模型历史由已存储消息构建，并跳过若干 runtime 消息类型。Runtime v2 应该把它做成显式投影：

```text
RuntimeEvent history
  -> ModelHistoryProjector
     include:
       user text events
       model final text events
       selected system/instruction events
       function call events when required by the provider protocol
       tool function response events
     exclude:
       partial chunks
       token usage
       trace diagnostics
       UI-only system notes
       permission ack unless deliberately exposed to the model
  -> AI SDK messages
```

这让「下一次模型调用会看到什么？」这一策略可审查、可测试。

### 启动恢复

```text
App startup
  -> RuntimeRecovery.scan()
     -> read invocation/run ledger
     -> classify non-terminal invocations by latest RuntimeEvent:
        - model stream started with no terminal event -> failed app_restarted
        - tool started with no result -> failed interrupted_tool
        - permission_request pending -> waiting_for_user or failed by policy
        - final model event persisted but run header not completed -> complete it
     -> append recovery RuntimeEvent
     -> ProjectionManager repairs:
        - TurnRecord
        - SessionHeader
        - StoredMessage system note if needed
        - AgentRun terminal status
```

恢复应该首先依据规范调用事实推理，然后修复投影。除非在处理旧数据，否则它不应从多个存储独立猜测。

### Bot 与 OpenGateway

```text
Bot / OpenGateway
  -> normalize external protocol
  -> RuntimeRunner.run({ source: 'bot' | 'gateway', ... })
  -> same RuntimeGate
  -> same AiSdkFlow
  -> same ToolRuntime
  -> projected output:
     bot: collect final response and send bot reply
     gateway: format JSON/SSE response
     desktop: optional fan-out when the same session is visible
```

runtime 不应该为 desktop、bot 与 gateway 存在三条微妙不同的发送路径。

## 事实源边界

预期的边界是：

```text
RuntimeEventLedger
  runtime fact

StoredMessage JSONL
  user-visible conversation projection and legacy read model

renderer SessionEvent
  transport projection for UI streaming

AgentRunStore
  invocation/run lifecycle ledger, eventually closely linked with RuntimeEvent

RunTrace
  diagnostic-only projection; failures must not affect execution

TelemetryRepo
  economic and operational projection
```

这个边界是做这项工作的主要原因。没有它，添加更多功能会不断增加需要对同一次运行达成一致的场所数量。

## 建议的模块形态

一种可能的文件布局：

```text
vera-runtime/src/
  runtime-event.ts
  runtime-event-projection.ts
  invocation-context.ts
  runtime-runner.ts
  runtime-gate.ts
  runtime-recovery.ts

  flows/
    agent-flow.ts
    ai-sdk-flow.ts

  model/
    model-adapter.ts
    model-history.ts

  tools/
    tool-runtime.ts
    tool-registry.ts
    permission-events.ts

  projections/
    stored-message-projection.ts
    session-event-projection.ts
    turn-record-projection.ts
    telemetry-projection.ts

  session-manager.ts
```

这不是必须的最终文件布局。重要的是方向：`SessionManager` 变成门面与 session CRUD 所有者，而不是 runtime 大脑。

## 迁移计划

### 阶段 1：RuntimeEvent RFC 与适配器

在不改变运行路径的前提下加入规范事件类型与适配器。

交付物：

- `RuntimeEvent` 与 `RuntimeEventActions`
- 当前 `StoredMessage`、`SessionEvent`、`AgentRunEvent` 与 `RunTraceEvent` 的映射测试
- 哪些事件是事实、哪些是投影的文档

理由：

这让团队在改变控制流之前拥有共同语言。

### 阶段 2：RuntimeRunner 外壳

引入 `RuntimeRunner.run()`，让 `SessionManager.sendMessage()` 委托给它，同时仍使用当前 `AgentRun.execute()`。

交付物：

- `RuntimeRunner`
- `InvocationContext`
- readiness 策略的 `RuntimeGate` 占位
- 向后兼容的 `SessionManager` 门面
- 证明当前 UI 可见行为保持稳定的测试

理由：

这在不一次性改动 AI SDK 或存储路径的前提下，把调用所有权移出 `SessionManager`。

### 阶段 3：AgentRunStore 到调用账本

升级运行账本，使其携带调用/事件关联。

交付物：

- 关联到 `invocationId` 的运行头
- 尽可能关联到规范 runtime 事件 id 的运行事件
- 依据调用事实推理并修复投影的恢复测试

理由：

当前运行账本已经有用。它应该成为 runtime 主轴的一部分，而不是并行的诊断存储。

### 阶段 4：AiSdkFlow 正式化

把当前 `AiSdkBackend.send()` 循环抽取/正式化为 `AiSdkFlow`。

交付物：

- `AgentFlow` 接口
- `AiSdkFlow` 实现
- `ModelHistoryProjector`
- `AiSdkFlow` 发出规范 `RuntimeEvent`
- `AiSdkBackend` 变成配置/工厂外壳，而不是 runtime 循环所有者

理由：

AI SDK 仍是主引擎，但 Vera 获得了显式的 flow 输入/输出语义。

### 阶段 5：ToolRuntime 事件动作

让工具调用、工具结果、权限请求、权限决定、状态增量与工件增量成为第一等的 runtime 事件动作。

交付物：

- `tool_call` / `tool_result` runtime 事件
- 权限请求/决定 runtime 动作
- 工件增量关联
- 经规范事件的 allow/block/prompt/deny/abort 路径测试

理由：

工具是模型意图变成本地副作用的地方。该边界必须可审计、可重放。

### 阶段 6：入口清理

把 readiness 与重绑策略从 desktop main 移到 runtime 门。

交付物：

- `RuntimeGate` 拥有连接 readiness/rebind/session blocked/running 守卫
- desktop/bot/gateway 入口调用相同的 runner API
- 证明同一 session 状态在 desktop、bot 与 gateway 路径下行为相同的合同测试

理由：

入口应该翻译协议；它们不应拥有 runtime 策略。

### 阶段 7：模型历史正确性

从 runtime 事件历史投影构建未来的模型提示。

交付物：

- 哪些 runtime 事件进入模型历史的显式策略
- 工具结果重放进下一次模型调用的测试
- 排除 partial chunk、telemetry、trace 与仅 UI 说明的测试
- 围绕 AI SDK 消息形态的 provider 兼容性测试

理由：

下一次模型调用必须出于正确的原因看到正确的历史。这应该是经过测试的 runtime 策略，而不是偶然的已存储消息过滤。

## 不要做什么

避免以下失败模式：

- 不要从头重写所有 provider 流式逻辑。
- 不要移除作为主 flow 引擎的 AI SDK。
- 不要删除 session JSONL 兼容性。
- 不要把 UI 关注点移进 `RuntimeEvent`。
- 不要让 `RunTrace` 成为成功/失败的事实源。
- 不要让 desktop main 继续拥有 readiness/rebind runtime 策略。
- 不要在现有 `ToolRuntime` 旁边引入第二个工具 runtime；把它演进为事件/动作模型。

## 成功标准

当以下陈述为真时，Runtime v2 就算成功：

- 开发者可以通过阅读一个调用/事件账本回答「这一轮发生了什么？」。
- UI 消息、turn 记录、运行记录、trace 行与遥测都能追溯到规范 runtime 事件 id。
- desktop、bot 与 gateway 入口共享相同的 runtime readiness 与执行语义。
- 模型历史构建是从 runtime 事件派生的显式、经测试的投影。
- 工具权限与工具结果行为作为 runtime 动作可见，而不是零散的副作用。
- `SessionManager` 主要是 session CRUD 加向后兼容的门面方法。
- AI SDK 通过 `AiSdkFlow` 仍是受支持的第一等 flow 实现。

## 开放问题

- 规范 `RuntimeEvent` 应该立即作为独立 JSONL 存储，还是先镜像进 `AgentRunStore` 事件？
- `StoredMessage` 投影应该与事件追加同步，还是投影失败应当可恢复/可重放？
- 当前 `RunTrace` 中有多少应该并入 `RuntimeEvent` refs，而不是保留为仅诊断行？
- 权限提示应该是模型可见事件、仅 UI 事件，还是可由 flow 策略配置？
- 在 Vera 拥有完整多 agent 树之前，branch/agent transfer 应该如何表示？
- 对没有 runtime 事件账本的旧 session，兼容策略是什么？

这些问题应在实现开始前在 RFC 中回答。
