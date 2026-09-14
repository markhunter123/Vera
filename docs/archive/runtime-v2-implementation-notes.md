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

# Runtime v2 实现笔记

> 归档于 2026-07-13。这些笔记描述最初的阶段 1–4 骨架；后端架构章节与当前源码现在描述的是活动的 runtime。

状态：阶段 1–4 骨架已落地（可编译、已测试）。生产 `SessionManager.sendMessage` 热路径**不变**；v2 接缝平行存在，以便未来工作可以增量迁移到它之上。

源码计划：`docs/archive/runtime-v2-architecture-evolution.md`。

## 什么已落地

### 核心契约（`@vera/core`）

- `vera-core/src/runtime-event.ts` —— 规范的 `RuntimeEvent` 事实模型（role / author / status 枚举、内容判别联合、actions、refs、纯辅助 `isTerminalRuntimeEvent` / `runtimeEventHasModelVisibleContent` / `createRuntimeEventId`）。
- `vera-core/src/__tests__/runtime-event.test.ts` —— 聚焦的契约测试。
- 新增子路径导出 `@vera/core/runtime-event`。后来的公开 API 清理移除了包根 barrel，因此该子路径现在是唯一的公开通路。

### Runtime v2 接缝（`@vera/runtime`）

五个新模块，每个都可以通过其规范子路径导入，并从 runtime barrel（选择性）再导出：

| 模块 | 子路径 | 职责 |
|---|---|---|
| `model-history.ts` | `@vera/runtime/model-history` | 策略驱动的 `buildModelHistoryFromRuntimeEvents()`，取代临时性的 `StoredMessage` 过滤。 |
| `invocation-context.ts` | `@vera/runtime/invocation-context` | `InvocationRequest` / `InvocationContext` 主干，可注入的 `newId`/`now` provider，`InvocationResult` 信封。 |
| `runtime-runner.ts` | `@vera/runtime/runtime-runner` | `RuntimeRunner.run()` 收集外壳：预检门禁 → 上下文 → 用户事件 → 流派发 → 终止收集。 |
| `agent-flow.ts` | `@vera/runtime/agent-flow` | 正式的 `AgentFlow` / `AgentFlowControl` / `FlowInput` 接缝。 |
| `ai-sdk-flow.ts` | `@vera/runtime/ai-sdk-flow` | `AiSdkFlow` 包装一个 `AgentBackend`；`mapSessionEventToRuntimeEvent()` 占位映射。 |

每个模块都随附同址测试，用于初始迁移接缝。

### 由 steward 合并的导出

- `vera-core/package.json` —— 添加 `"./runtime-event"`。
- `vera-runtime/package.json` —— 添加 runtime-v2 子路径导出。
- 后来的公开 API 清理移除了两个包根 barrel，改用显式的领域子路径。

## 已对齐：单一 `InvocationContext` 类型

`InvocationContext` 现在由 `invocation-context.ts` 拥有，并被正式流接缝复用：

- `invocation-context.ts` —— 规范的 runner/流主干（必需的 `source`、`startedAt`、`request`、`newId`、`now`）。
- `agent-flow.ts` —— 为 `AgentFlow.run(ctx, input)` 契约导入并再导出该规范类型。

runtime barrel 从 `invocation-context.ts` 再导出规范的 `InvocationContext`；先前的重复流本地上下文被移除，因此 runner 与流代码共享同一身份/provider 主干。

## 剩下的工作（按阶段）

- **阶段 5 —— 工具事件动作：** 把 `tool_output_delta` / `tool_progress` `SessionEvent` 提升为专用的工具进度 runtime 动作（当前为部分工具 role 心跳）。细化 `mapSessionEventToRuntimeEvent` 的 role/author 策略。
- **阶段 6 —— RuntimeGate：** 在 `RuntimeGate` 背后实现真正的预检（连接就绪/重绑、blocked/running/waiting 守卫），并注入桌面端 + bot/gateway 入口点。
- **阶段 7 —— 投影：** 从 `InvocationResult.events` 驱动 `StoredMessage` / `TurnRecord` / `SessionHeader` / `AgentRunStore` / `RunTrace` / `TelemetryRepo` 写入。把 `buildModelHistoryFromRuntimeEvents()` 接入活动的 `AiSdkBackend.materializePriorMessages` 路径。
- **SessionManager 委托：** 在功能标志背后用 `RuntimeRunner.run(...)` 替换 `SessionManager.sendMessage` 的函数体，把 `InvocationResult.events` 映射到现有 `SessionEvent` 投影。如果 renderer 需要实时 delta，届时可以添加流式 `async *stream()` 变体。今天 `RuntimeRunner.run()` 是**收集式**的（返回 `Promise<InvocationResult>`），不是流式的。
- **`abort` + `complete` 合并：** `AiSdkFlow` 是忠实的翻译器（后端发出 `abort` 后跟一个尾部 `complete`，流两者都发出）。合并成单个终止事件是 runner/投影的关注点。
- **Flow 可运行表面：** `RuntimeRunner` 依赖集中拥有的 `RunnableAgentFlow`（`Pick<AgentFlow, 'run'>`），因此它在共享正式 `AgentFlow.run` 签名的同时，与流元数据（`kind`、`sessionId`）保持解耦。

## 验证快照

所有命令都从仓库根目录（`$RIVE_WORKSPACE`）运行：

```
npm run build                                    # all workspaces — clean
npm run typecheck                                # all workspaces — clean
npm --workspace @vera/core   run test            # 613 pass / 0 fail
npm --workspace @vera/runtime run test           # 384 pass / 0 fail
git diff --check                                 # clean
```

没有生产源码（`session-manager.ts`、`ai-sdk-backend.ts`、`agent-run.ts`、`materializer.ts`）被修改。v2 接缝纯粹是追加式的。
