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

# Runtime 恢复阶段 1 安全边界契约

阶段 1 在阶段 0 的 `RuntimeEvent` 重放投影之上增加一条显式、fail-closed 的续接路径。只有当已提交的源边界完整且 host 提供每一项必需的外部安全事实时，它才能创建新的 Run 与 Invocation。

规划与执行仍是分离的操作。host 仅在 `VERA_RUNTIME_SAFE_BOUNDARY_RESUME=1` 时暴露它们：桌面端在中断回合横幅上提供 **Safe resume** 动作，CLI/TUI 提供 `/resume`，桌面端可以在其启动修复过程之后自动继续一条合格的被中断会话。缺少该标志时，普通回合不运行续接安全检查，并保留阶段 1 之前的 happy path。

## 续接单元

续接绝不复活旧的 provider 流、JavaScript 堆栈、Promise 或操作系统进程。它创建全新的执行身份：

```text
source Session / Invocation / Run / Turn
  -> validated committed RuntimeEvent high-water
  -> new Invocation / Run / Turn
  -> continuation-start RuntimeEvent
  -> provider replay without a duplicate user message
```

新的 Run 记录 `parentRunId` 与 `parentTurnId`。其第一个规范事件是一个系统拥有的 continuation-start 事实，引用：

- 源 Invocation、Run 与 Turn ID；
- 源 RuntimeEvent high-water；
- 新的执行身份。

continuation-start 事件必须在调用 provider 之前持久化。

## 规划器门禁

`RuntimeContinuationPlanner` 读取源 AgentRun 与 RuntimeEvent 台账。只有以下所有条件都成立时，计划才是 `continue`：

- 源 run 与 RuntimeEvent 台账可读；
- run 头恰好有一个匹配的、非部分（partial）的终止 RuntimeEvent；
- 每个 RuntimeEvent 都属于一个源 Session、Invocation、Run 与 Turn；
- 阶段 0 投影是 `safe_replay`；
- 每个被接受的工具调用都有已提交的匹配响应；
- 没有仍未解决的权限请求；
- 没有后台或子操作被报告为未落定（unsettled）；
- 平台归一化后源与当前 cwd 值匹配；
- 源与当前 workspace 身份匹配；
- 边界所需的每个历史工具都可用；
- provider 可见历史以用户或工具边界结束；
- 续接使用全新的 Invocation、Run 与 Turn ID；
- 可选的 workspace 检查点有 ref、已被恢复，并覆盖同一 RuntimeEvent high-water。

任何缺失或矛盾的事实都会产生一个稳定的 `park` 原因。阶段 1 不会把不确定性转换成重试。

## 执行再验证

规划不是执行租约。在开始新 Run 之前，Runtime 立即重新读取持久状态，并在以下情况拒绝续接：

- 同一本地 Runtime 中已有另一个 Run 活动；
- 源 run 身份、终止状态、cwd 或 RuntimeEvent high-water 在规划后发生变化；
- 源重放投影不再等于规划的重放上下文；
- 目标 Run ID 已经存在。

源边界同时也是一份幂等声明。续接 Run 在调用 provider 之前把 `continuationSource` 持久化到其头中。重复规划以 `continuation_already_exists` 停驻（park）；陈旧的或并发的计划在 provider 执行前被拒绝。创建该持久声明失败即 fail-closed。

这是单进程归属，不是分布式 fencing。存储唯一性仍是防止重复创建目标 Run 的最终防线。

## Provider 历史

普通回合合成一个初始用户 RuntimeEvent，并把当前用户消息追加到 provider 请求。续接两者都不做。provider 直接接收已验证的已提交重放上下文，而系统 prompt 与当前工具配置则正常重建。

这避免了重复原始请求，并防止一个已完成的工具调用仅仅因为创建了新模型回合就被再次执行。

## 失败行为

如果 continuation-start 持久化失败：

1. provider 不会被调用；
2. 没有终止 RuntimeEvent 时不会提交终止 AgentRun 头；
3. 不完整的目标 Run 保持可恢复；
4. 现有的启动恢复稍后写入一个 recovered 终止 RuntimeEvent，然后提交匹配的失败 run 头。

源台账绝不被续接执行变更。

## 当前存储边界

阶段 1 继续读写现有的 RuntimeEvent 与 AgentRun 存储。它不会让 JSONL 在工具效果与事件之间成为事务性的。因此，只有每个工具结果都已提交的边界才能续接。

SQLite 规范存储、Tool Journal T1/T2 事务、操作 ID、对账与幂等重执行仍是后续阶段。阶段 1 不新增哈希策略、租约、fencing 令牌或分布式调度器归属。

## Host 职责

workspace 身份、后台操作落定、当前工具目录与可选检查点恢复，在本阶段都是受信任的 host 事实。host 必须能够从权威的本地状态产生这些事实之后，才能暴露续接执行。Runtime 仍在执行前立即再验证持久源台账与 cwd。

本地检查器（inspector）用 `realpath` 规范化会话 cwd，并记录一个由设备、inode 与规范路径推导的文件系统身份。它还检查 ShellRun 与子 run 状态，并重建当前工具目录。计划把这些事实捕获进安全快照，执行时再验证它们。

## Host 入口点与可观测性

- 桌面端中断回合横幅动作：**Safe resume**；
- 桌面端 main IPC：`sessions:resumeLatest`；
- CLI TUI 命令：`/resume`；
- 桌面端启动自动续接：仅由同一功能标志启用，且仅在中断 run 修复之后；
- 结构化运维事件：`plan_approved`、`plan_parked`、`execution_started`、`execution_completed` 与 `execution_failed`。

生命周期事件只包含身份、拒绝码与错误类别；它们不记录 prompt、工具参数、工具结果或机密。遥测是尽力而为的，不能改变恢复行为。

## 验证

Linux 与 macOS 是本契约的主要支持目标。可移植测试使用 POSIX workspace fixture，不得依赖 Windows 盘符，也不得写入固定的 host 路径。Windows 行为是尽力而为的，除非某个测试明确限定在仅 Windows 适配器上。

阶段 1 测试表面覆盖：

- 安全与停驻的规划器决策；
- 终止头/台账不一致；
- 缺失权限决策与未解决的工具调用；
- workspace、cwd、检查点、工具目录与后台操作门禁；
- 全新血统与 continuation-start 持久化；
- provider 重放不重复用户消息；
- 规划与执行之间的源变更；
- continuation-start 写失败与随后的启动恢复；
- provider 执行前持久声明创建失败；
- 重复、陈旧与并发的续接声明；
- 在 run 已创建、continuation-start 已提交、终止事件已提交与终止头已提交等边界处的真实子进程 SIGKILL；
- 桌面端 IPC/preload/renderer/启动路由契约；
- CLI `/resume` 路由且不重复 prompt；
- 完整的阶段 0 P0-P11 SIGKILL 前缀 harness（由主单元测试任务经 `test:dist` 包覆盖）。
