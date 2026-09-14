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

# Runtime Kernel 抽取

> 归档于 2026-07-13。这是某个时间点的抽取记录，不是当前架构的权威。请从 `ARCHITECTURE.md` 开始。

本文档解释本变更集中 runtime-kernel 的工作：改了什么、为什么需要、什么保持稳定、以及如何验证。

## 摘要

Vera 已经具备本地桌面编码 agent 的各部分：会话、模型流、工具调用、权限提示、中止处理、用量遥测、bot 与 gateway 入口点，以及持久化的会话消息。问题在于核心执行职责仍集中在少数几条大型 runtime 路径上，尤其是 `AiSdkBackend` 与 `SessionManager.sendMessage()`。

本变更集保持产品表面稳定，但引入了更清晰的内部 runtime 边界：

```text
SessionManager
  -> AgentRun
      -> AiSdkBackend
          -> ModelAdapter
          -> ToolRuntime
      -> RunTrace
      -> AgentRunStore
```

意图不是重写 runtime 或替换 Vercel AI SDK。目标是让现有 runtime 更易于推理、更易于在中断后恢复、更易于用未来的后端或工作流集成来扩展。

## 改了什么

### ToolRuntime

`ToolRuntime` 现在是模型请求的工具生命周期的内部边界。被抽取出的 runtime 拥有原本交错在 AI SDK 后端内部的工作：

- 执行前校验工具输入
- 评估权限策略
- 等待挂起的权限决策，带超时行为
- 在工具执行期间暂停与恢复流看门狗（watchdog）
- 将中止信号传播进工具
- 对工具失败进行分类
- 记录工具遥测与制品
- 发出工具与权限 trace 事件

`AiSdkBackend` 仍然桥接模型流行为，但不再需要拥有工具执行的每个细节。

### ModelAdapter

`ModelAdapter` 是面向 provider 的流与错误归一化层。它把 AI SDK 特定的流块、provider 设置、用量归一化与 provider 错误映射隔离在更上层的后端编排壳之外。

这使得边界显式化：

```text
provider / AI SDK details
  -> ModelAdapter
  -> Vera runtime events and usage records
```

这种分离很重要，因为未来的 provider 不应需要复制权限、工具、run 或会话状态行为。

### RunTrace

`RunTrace` 是 runtime 事件的内部尽力而为（best-effort）trace 路径。它记录诸如以下里程碑：

- 回合开始
- 模型解析 / 流开始 / 流完成 / 流失败
- 工具开始 / 完成 / 失败
- 权限请求 / 决策 / 失败
- 用量已记录
- 已请求中止

trace 记录器失败故意不致命。失败的 trace 写入不得改变模型或工具执行。

### AgentRun 类型与存储

core 包现在定义内部 AgentRun 契约：

- `AgentRunHeader`
- `AgentRunEvent`
- `AgentRunStatus`
- `AgentRunStore`

storage 包新增一个文件后端 run 存储：

```text
sessions/<sessionId>/runs/<runId>/run.json
sessions/<sessionId>/runs/<runId>/events.jsonl
```

该存储提供：

- 原子 `run.json` 写入
- 只追加的 run 事件 JSONL
- 同 run 写入串行化
- 会话 run 列表
- 通过 `event_corrupt` 恢复损坏的已提交事件行
- 容忍格式错误、未终止的尾部

该台账（ledger）与现有会话消息 JSONL 分离，因此 runtime 诊断与恢复状态不会污染用户可见的对话历史。

### AgentRun 执行

`SessionManager.sendMessage()` 现在把繁重的回合生命周期委托给内部 `AgentRun.execute()`。

`AgentRun` 拥有：

- 生成并记录 run 身份
- 追加用户消息
- 写入初始回合状态
- 为 run 锁定连接快照
- 确保活动后端存在
- 驱动后端流事件
- 投影会话状态变更
- 写入回合完成、失败、中止或权限等待状态
- 记录 run 开始/完成/失败/取消状态
- 将 `RunTrace` 事件路由进持久化的 run 台账
- 保留诸如 `renderer.stop_button` 的中止来源诊断

`SessionManager` 仍然是公开 runtime API，并继续拥有会话 CRUD、后端注册编排、活动 run 查找与旧版恢复入口点。

### 活动 Run 注册表

旧的活跃流计数器与回合 id 旁路映射被替换为：

```ts
activeRuns: Map<string, AgentRun>
turnToRunId: Map<string, string>
```

这使重叠 run 行为显式化。它也避免用防御性计数器钳位掩盖活跃流计数 bug。

### 启动恢复

`recoverInterruptedSessions()` 现在在存在 run 行时优先使用 AgentRun 台账。它扫描持久化的 run 头与事件，对陈旧的未终止 run 分类，修复它们，然后收敛现有会话/回合投影。

恢复的情形包括：

- 陈旧的 `created` 或 `running` run
- 最后事件为 `run_started` 或 `model_stream_started` 的 run
- `tool_started` 之后陈旧的工具尾部
- `permission_requested` 之后陈旧的权限等待
- 没有终止 run 事件的 `model_stream_completed`
- 以 `event_corrupt` 表示的损坏 run 事件行

没有 run 台账行的旧版会话仍使用先前的消息与回合状态恢复路径。

## 什么保持稳定

本工作有意不改变：

- `window.vera.*` preload API
- Electron IPC 频道名
- renderer 可见的 `SessionEvent` 行为
- 用户可见的权限模式
- 会话消息 JSONL 兼容性
- 内置工具名或公开工具行为
- 模型 provider 设置 UI
- bot 与 OpenGateway 公开入口点
- Rive 工作流集成语义

runtime kernel 是内部的。公开行为应保持兼容，同时内部变得更加显式与可恢复。

## 为什么需要

在本工作之前，单次回合执行分散在会话管理、后端流处理、工具包装、权限策略、遥测与中止逻辑中。这使得失败后难以回答若干问题：

- 模型流开始了吗？
- 该回合用了哪个后端/模型/连接？
- run 是否在等待权限？
- app 退出时正在运行哪个工具？
- 用户按了停止吗？
- 用量被记录了吗？
- 陈旧的会话状态反映的是真实活动 run 还是崩溃的进程？

AgentRun 台账为这些答案提供了持久的实况记录。ToolRuntime 与 ModelAdapter 随后减少了必须一次性理解的模型/工具/provider 逻辑量。

## 恢复模型

新的恢复路径是保守的。它不重放模型流或工具。相反，它把陈旧状态修复为确定的终止状态，使 app 不会在会话永久卡在 `running` 或 `waiting_for_user` 时重新打开。

当陈旧的非终止 run 被恢复时，runtime：

1. 将 AgentRun 头更新为终止状态。
2. 追加诸如 `run_failed` 或 `run_completed` 的持久恢复事件。
3. 写入现有会话 `turn_state` 投影。
4. 将会话头移出活动 running/waiting 状态。

app 重启恢复的失败类别记录为 `app_restarted`。诊断限于小型原因码字段，如 `recovered`、`failureClass`、`recoveryReason`、`lastEventType` 与 `eventCorrupt`；原始用户文本与原始事件 payload 不会被复制进恢复诊断。

## 新增文件

- `vera-runtime/src/tool-runtime.ts`
- `vera-runtime/src/model-adapter.ts`
- `vera-runtime/src/run-trace.ts`
- `vera-core/src/agent-run.ts`
- `vera-storage/src/agent-run-store.ts`
- `vera-runtime/src/agent-run.ts`
- `vera-runtime/src/agent-run-recovery.ts`

## 新增或扩展的测试

runtime 测试套件现在覆盖：

- ToolRuntime 权限允许/阻止/提示/超时路径
- 工具周围的看门狗暂停/恢复行为
- 工具中止与失败分类行为
- 工具遥测与制品记录行为
- ModelAdapter 流、用量与 provider 错误归一化
- RunTrace 记录与尽力而为失败行为
- 重叠的 AgentRuns
- 用户消息追加后的后端构建失败
- 权限交接不卡住 run 状态
- 停止按钮中止来源保留
- 停止后迟到的完成不覆盖中止状态
- 持久 trace 脱敏
- AgentRunStore 创建/读取/更新/列表行为
- 同 run AgentRun 事件追加串行化
- 损坏的 AgentRun 事件 JSONL 恢复
- 从陈旧 AgentRun 台账状态启动恢复
- 旧版启动恢复回退
- 终止 AgentRun 恢复幂等性

## 验证

这些变更通过以下方式验证：

```sh
npm --workspace @vera/core run typecheck
npm --workspace @vera/storage run test
npm --workspace @vera/runtime run typecheck
npm --workspace @vera/runtime run test
npm --workspace @vera/desktop run build:main
git diff --check
```

AgentRun 恢复工作之后，最终 runtime 套件包含 315 个通过的测试。

## 后续工作

本 PR 确立了内部 runtime-kernel 形态，但没有完成每一项可能的清理。好的后续切片有：

- 更紧密地把用量与成本核算合并进 run 台账
- 暴露内部 run 检查/调试读模型
- 减少 `AgentRun` 使用的剩余 `SessionManager` 钩子表面
- 考虑通过同一 run 策略层统一 Gateway/Bot 策略
- 只有在出现产品需求后才考虑 Rive 工作流/run 映射
