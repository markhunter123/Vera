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


# Agent 蜂群（Agent Swarm）

Agent 蜂群是一种编排模式，不是工具。当 Session 以蜂群模式运行时，主 Agent 被指示：每当请求拆分为独立工作时优先使用持久的异步 Agent Graph，并以异步方式监督该图，而不是阻塞等待它。

不存在 `agent_swarm` 工具。同名的同步扇出工具一直存在到 #2384，该 PR 移除了它，转而采用对图的异步监督。`agent_swarm` 只作为历史记录上的工具结果类型存续。

蜂群模式不增加自己的执行机制。只有一个调度器、一个账本和一个控制平面，而且它们都属于图：

- 条目是普通子 Session 及其 `AgentRun`，作为图工作调度；
- 持久调度、准入与唤醒状态存储在 SQLite 图控制平面中；
- `agent_swarm_status` 是同一图快照上的紧凑投影 — 其 `swarmId` 就是 `graphId`；
- 不存在 `SwarmRun`、第二个事件账本或后台属主。

该模式真正增加的，是作用于那套机制的监督策略：保证哪些工具、Agent 被要求用它们做什么、该模式为何被授权，以及何时值得为检查点唤醒 Agent。这四点在下面描述。

底层机制参见 [图是调度，不是第二个 Runtime](./architecture/agent-graph-stream-scheduling-draft.md)。

## 启用该模式

`/swarm` 由 `vera-core/src/swarm-command.ts` 中的 `parseSwarmCommand` 解析：

| 输入 | 效果 |
| --- | --- |
| `/swarm on` | 将 Session 编排模式设为 `swarm` |
| `/swarm off` | 将 Session 编排模式恢复为 `default` |
| `/swarm` 或 `/swarm status` | 报告当前模式 |
| `/swarm <task>` | 以蜂群模式运行一个任务，不改变 Session 模式 |

`ORCHESTRATION_MODES` 为 `['default', 'swarm', 'graph']`。

## 该模式改变什么

蜂群模式主要是指令，但不仅仅是指令。由此产生四件事：

1. **系统 prompt。** `AiSdkBackend` 追加 `renderSwarmModePrompt()`。
2. **保证的工具。** 该模式强制把 `agent_list`、`update_agent_graph`、`yield_agent_graph`、`agent_swarm_status` 和 `agent_output` 放入轮次的工具目录。图模式要求同一集合外加 `view_agent_graph`；蜂群模式刻意省略它，与"读取紧凑状态而非整张图"的指令一致。
3. **持久授权。** `agentSwarmAuthorization` 记录在 `AgentRun` 头部，值为 `session_mode`（Session 处于蜂群模式）、`turn_override`（单个 `/swarm <task>` 轮次）或 `none`。它记录蜂群模式为何被授权，而不仅仅是被授权。
4. **唤醒策略。** 唤醒*状态*由图控制平面存储，与任何其他图唤醒一样，但*触发器*是模式特定的：当蜂群首次达到 `settled`，或 `blocked` / `failed` / `aborted` / `cancelled` 条目集合发生变化时，`isSwarmCheckpointTransition` 唤醒监督者。

## prompt 指示什么

`vera-runtime/src/swarm-mode.ts` 就是整个功能：一个返回 `<orchestration_mode>` 块的函数。它要求主 Agent：

1. 先判断并行委托是否会实质性改善速度、质量、覆盖率或独立验证，并在请求很小、偏对话、对延迟敏感或不可拆分时直接继续；
2. 保持轻量探索，并让每个条目有界、自包含，带明确的 scope、预期输出和约束；
3. 避免重叠写入，除非有隔离的工作区，否则优先只读调查；
4. 调用 `agent_list`，然后用 `update_agent_graph` 一次性调度所有独立条目，使用 `target_kind=new_preset` 和经用户批准的 `subagent_id`；
5. 调用 `yield_agent_graph`，**不要**轮询、睡眠、查看子进程日志或同步等待 — 宿主只在工作需要注意或整个蜂群已静置时唤醒 Agent；
6. 唤醒后，读取 `agent_swarm_status` 获取紧凑状态，并且只在需要已完成最终结果或对失败条目做窄范围诊断时才取用 `agent_output view=result`；
7. 用 `update_agent_graph` 配合 `replaces=<failed work id>` 和 `replacement_mode=replace` 替换失败的工作，使失败条目不再把蜂群卡在 `needs_attention`；
8. 在有用工作静置后完成图，然后去重、验证并进行语义综合。

prompt 还明确陈述了限度：不要仅仅因为蜂群模式已启用就制造并行或制造重复的忙碌工作。

## 选择执行模型

| 需求 | 优先选择 | 原因 |
| --- | --- | --- |
| 单个小任务或紧耦合推理 | 主 Agent 直接 | 委托开销会超过有用的并行度。 |
| 单个专家结果，或下一个任务依赖前一个 | `agent_spawn` | 依赖是显式的，每个结果都可以精化下一个 prompt。 |
| 若干独立条目加一个最终综合 | 蜂群模式 | Agent 把它们作为图工作调度并异步监督。 |
| 从根对话监督的动态依赖 Agent 工作 | 直接使用 Agent Graph | 同一套机制；使用图工具但不带蜂群 prompt。 |
| 显式工作流步骤、任意工作流恢复或分布式执行 | Rive | 工作流状态与恢复需要专门的工作流权威。 |

蜂群模式与图模式只在指令上不同，机制相同。蜂群模式让 Agent 对每个新请求倾向于扇出；图模式把决定留给 Agent。

## 状态投影

`agent_swarm_status` 不接受参数，返回一个有界快照（`vera-runtime/src/agent-swarm-status-tool.ts`）：

```ts
interface AgentSwarmStatusResult {
  kind: 'agent_swarm_status';
  swarmId: string;                                   // the graphId
  status: 'running' | 'needs_attention' | 'settled';
  counts: Record<AgentSwarmItemStatus, number>;
  items: AgentSwarmStatusItem[];
}

interface AgentSwarmStatusItem {
  workId: string;
  status: AgentSwarmItemStatus;
  operatorId?: string;
  childSessionId?: string;
  runId?: string;
  failurePhase?: 'schedule' | 'topology' | 'stop' | 'render' | 'dispatch';
  failureReason?: string;
}
```

条目状态为 `queued`、`running`、`blocked`、`completed`、`failed`、`aborted`、`cancelled`、`stopped`、`superseded` 之一。终止集合是除 `queued`、`running` 和 `blocked` 之外的一切。

三个蜂群级数值是推导的，不是存储的：

- `running` — 仍有工作，且没有需要监督者处理的事项；
- `needs_attention` — 至少一个条目处于 `blocked`、`failed`、`aborted` 或 `cancelled`；
- `settled` — 每个条目都达到终止状态。

`settled` 是对当前条目的陈述，不是对用户任务的陈述。关闭图仍是监督者显式的 `finish` 决定。

结果携带身份而非载荷：`childSessionId` 和 `runId` 是指向权威 Runtime 读取路径的引用。子进程输出只在真正需要时才用 `agent_output` 读取，这正是大型扇出不消耗主 Agent 上下文的原因。

## 示例

```text
User:    /swarm on
User:    Review the three packages and report concrete evidence.

Agent:   agent_list
         update_agent_graph  target_kind=new_preset  subagent_id=reviewer  (x3)
         yield_agent_graph

         ... host wakes the Agent ...

Agent:   agent_swarm_status
         -> status=needs_attention, 2 completed, 1 failed
         agent_output view=result   (failed item only)
         update_agent_graph  replaces=<failed work id>  replacement_mode=replace
         yield_agent_graph

         ... host wakes the Agent ...

Agent:   agent_swarm_status
         -> status=settled, 3 completed
         agent_output view=result   (each completed item)
         finish, deduplicate, verify, synthesize
```
