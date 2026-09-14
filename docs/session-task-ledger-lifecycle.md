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

# 会话任务账本生命周期

本文档定义附加于交互式会话的任务账本的生命周期与持久化契约。该账本在 Runtime Host Session 内跟踪模型可见的工作项；它不是 Eval 实验或单元格账本。

## 范围

Vera 拥有会话作用域的任务账本，包含 `task_create`、`task_update`、`task_list`、`task_get`、`task-events.jsonl`、`tasks.json` 和轮次尾部 prompt 注入。实现将生命周期验证、事件重放、存储投影、工具访问和恢复分类统一在一个契约上。

非目标：

- 无工作流引擎；
- 无 cron 或自动化调度；
- 无项目管理编辑、依赖图、拖拽或批量调度 UI；
- 不取代 `AgentRun`、`RuntimeEvent`、文件系统、git、测试或工具证据。

任务状态是建议性的控制状态。它绝不能覆盖真实的文件系统、git、测试、验证器、评分器或工具证据。

## 身份与层级

每个当前任务都有两个标识符：

- `id` 是持久的 UUID 主键，永不被重写。
- `key` 是会话本地的短引用（`T1`、`T1.1` 及更深形式），用于 prompt、工具和 UI。

读与更新操作都接受任一形式。key 在每会话的串行化写入队列内分配。子任务将其父任务的 UUID 存于 `parentId`；其短 key 在父任务的 key 之下分配。子任务不能创建于终止状态的父任务之下，且只要存在任何非终止的后代，父任务就不能变为 `completed`。父子边必须使短 key 恰好推进一个段（`T1` -> `T1.1`）；跳级边（如直接的 `T1` -> `T1.1.1`）会使投影失效并故障关闭。

缺少 `key` 或 `endedAt` 的旧 `tasks.json` 快照和 JSONL 事件仍可读取。投影按首次见到的创建事件顺序分配稳定 key（仅在事件顺序不可用时回退到时间戳），并从 `updatedAt` 推导缺失的终止时间戳。首次后续变更会在新变更之前追加兼容事件，使推导字段在不改变 UUID 的情况下持久化。

## 任务状态

任务状态包括：

- `pending`：已声明但未开始。
- `in_progress`：正在积极处理中。
- `blocked`：在外部输入、依赖、权限或前置条件修复到位之前无法继续。
- `completed`：凭证据完成。
- `failed`：已尝试但未成功结束，附有原因。
- `cancelled`：有意停止，不应自动恢复。

允许的转换：

```text
pending -> in_progress
pending -> cancelled

in_progress -> blocked
in_progress -> completed
in_progress -> failed
in_progress -> cancelled

blocked -> in_progress
blocked -> cancelled
blocked -> failed

failed -> pending
failed -> cancelled

completed -> in_progress   only with explicitReopen: true
cancelled -> pending       only with explicitReopen: true
```

## 证据

进入这些状态的新更新需要证据：

- `blocked` 需要 `blockedReason`。
- `failed` 需要 `failureReason`。
- `completed` 需要 `completionEvidence`。

证据是紧凑文本。后续工作可以用一等公民的 run、工具调用、artifact、验证器或评分器引用替换或补充它。

早于本契约的旧版已完成或已取消任务仍可从 `tasks.json` 读取。新更新必须满足证据规则。

## 恢复信任

源码支撑的类型包含一个保守的 `resumeTrust` 分类器：

- `trusted`：持久证据完好。
- `needs_revalidation`：状态可能仍然正确，但相关的外部事实应再次核查。
- `stale`：会话或运行被中断时任务处于活动状态。
- `repaired`：恢复逻辑改变了投影状态。
- `untrusted`：账本、引用或状态损坏或缺失。

该类型与纯分类器由源码支撑。`resumeTrust` 是系统诊断信息，在恢复逻辑取得该值的所有权之前不会注入模型可见的任务账本。

恢复/读取模型分类使用保守分类器：

- `in_progress` 任务为 `stale`。
- 缺少必需证据的任务为 `needs_revalidation`。
- 损坏的账本、无效的投影或缺失的引用为 `untrusted`。
- 已修复的投影为 `repaired`。

## 工具表面

面向模型的工具包括：

- `task_create`
- `task_update`
- `task_list`
- `task_get`

四个账本工具只变更/读取本地会话状态；它们自身不分发工作。`task_create.tasks[].parent_id`、所有任务引用输入和 `agent_spawn.task_id` 接受 UUID 或短 key。`task_list` 支持精确的 `status`、`include_terminal` 和 `include_archived` 过滤器；其无参行为保持与原有全列表行为兼容。

### Runtime Host 权威

非服务型 Runtime Host 组合在其 Storage 根属主租约下打开交互式任务账本写入器。一个每会话协调器实现 Runtime `TaskLedgerStore` 端口，并服务于只读的 `task.ledger.query` Client 操作。通过该端口调用的读取、变更、认领和子任务结果因此共享同一个 Session 准入边界，而不是创建第二个任务账本权威。

Host 将该端口绑定进真实模型任务与子 agent 工具组合。Desktop 和 CLI 消费同一个 Client 投影，不打开交互式任务账本写入器。

Client 查询以条目与字节受限的分页返回规范、清洗后的投影。每次遍历都由一个内容修订号钉住；从旧投影继续的请求返回 `revision_changed`，而不是跨 Host 纪元混合快照。该权威保留现有的 `task-events.jsonl`、`tasks.json`、旧版读取和回填行为。生产环境激活后，Runtime Host 是唯一的交互式写入者。

## 子 Agent 归属

`agent_spawn(task_id=...)` 在当前会话中解析该任务，并且只在 runtime 分配了真实子轮次之后才认领它。认领将任务置为 `in_progress` 并记录 `child_agent` 属主。子任务静置后，属主会被充实为真实的 run 与轮次引用。

成功的子任务不会完成任务。父 agent 必须验证结果并提供 `completionEvidence`。失败或取消的子任务记录真实的任务结果；等待权限的子任务使任务保持 `blocked`。已被另一个子轮次拥有的活动任务不能被抢占。

## Prompt 预算与归档

当前轮次的任务尾部上限为 8,000 字符（约 2,000 token）。它渲染短 key 而非 UUID，并优先 `in_progress`、`pending` 和 `blocked` 分支。被包含的活动任务的祖先会被保留，使层级保持可理解。预算允许时最多加入三个最近的终止任务。当任务被省略时，尾部报告省略数量并指引模型使用 `task_list` / `task_get`。

终止任务获得 `endedAt`。七天后它们被逻辑归档：存储保持追加写入且不删除任何任务，而 prompt 与 UI 读取排除已归档的终止任务。显式工具读取可以选择重新纳入它们。

机密脱敏、任务账本标签剥离、证据验证，以及排除 `resumeTrust=untrusted` 任务，均在模型可见渲染之前应用。

## Goal 完成门

普通交互轮次永远不会因任务未完成而触发额外的模型调用。轮次尾部仅具建议性。

当自主 Goal 处于活动状态时，其外部评估器仍然先做决定。如果评估器判定已达成或不可能，该终止性决定胜出。如果 Goal 继续且仍有 pending 或 in_progress 任务 key，延续文本按 Goal id 各包含一条任务提醒。`blocked`、`failed`、`cancelled` 和 `completed` 任务不触发提醒。提醒仅在最终空闲检查和同步轮次注入之后被消耗，因此并发的用户轮次不能在不显示提醒的情况下消耗它。后续延续允许不再附带任务专项提醒。每次注入的决定都被记录为带 Goal id、决定和任务 key 的 `task_gate_decided` AgentRun 事件。当迭代、无进展或 token 上限停止一个 Goal 时，停止事件同样记录剩余可操作的任务 key。

## 调试与 Desktop 读取模型

模型可见的任务账本保持紧凑并省略 `resumeTrust`，包括轮次尾部注入与 `task_list` / `task_get` 工具结果。调试、导出和 trace/读取模型表面可以包含带 `resumeTrust`、原因、证据和引用的任务摘要。

Desktop 通过 `tasks:list` 读取同一个 `Task[]` 投影。存储变更发出仅含信号的 `tasks:changed` 事件；renderer 重新加载，而不是把事件载荷合并进第二个投影。在跨越 IPC 之前，每个结构化 Task DTO 都使用与模型可见文本相同的机密与任务标签脱敏规则进行清洗。聊天工作区显示一个全宽、可折叠、只读的任务栏，包含活动层级、短 key、状态、属主、原因/证据摘要和三个最近的终止任务。会话切换清除旧快照，修订号防护丢弃迟到的 IPC 响应。该面板提供加载、空态、错误和重试状态，但没有工作流编辑控件。

这个交互式任务账本与以下内容保持分离：

- Eval 实验、单元格与尝试；
- Goal 状态，它拥有有界的自主延续；
- ScheduledTask，它拥有调度执行；
- `AgentRun` / `RuntimeEvent`，它们拥有实际 runtime 与证据历史。
