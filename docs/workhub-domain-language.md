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

# WorkHub 领域语言

WorkHub 给用户一个持久的会话位置，用于提问、澄清、继续、创建与检查工作。每个 Runtime Host 由一条稳定的协调会话（Coordination Session）支撑，而具体执行在普通会话（ordinary Session）中保持权威。

本文档命名已批准的目标架构。每个 Runtime Host 现在都配置并复用下文描述的稳定协调会话角色。当前 R2.4 路由行为仍然是一个过渡性的确定性基线或目标解析器；它不定义 WorkHub 最终的协调语义。决策与权威边界记录在 [WorkHub 协调会话 ADR](./architecture/workhub-coordination-session-adr.md) 中。

## 术语

**会话（Session）**：现有的转写（transcript）、执行边界、权限、交互与恢复基座。一个 Session 只拥有被接纳进该 Session 的对话或执行。

**协调会话（Coordination Session）**：每个 Runtime Host 独立拥有的稳定特殊 Session 角色，用于其 WorkHub 对话。它拥有 WorkHub 用户消息、普通问答、澄清、协调决策、有界委托引用与协调摘要，但不拥有任何普通 Session 执行或生命周期事实。它不是独立的数据库、事件存储、转写基座或生命周期权威。它对普通 Session 列表隐藏，并被排除在所有路由候选集之外，因此它绝不路由到自身。跨 Host 协调在第一个里程碑中不受支持。

**普通会话（ordinary Session）**：拥有具体工作执行的 Session，包括其项目/文件系统范围、模型与权限、根回合接纳、工具、制品、恢复、生命周期与权威执行转写。

**工作（Work）**：围绕一个目标的用户面对连续性。Work 与 Session 是 1:1、1:N 还是一个独立的持久实体，刻意留作未决。

**WorkHub**：由活动 Runtime Host 的协调会话支撑的统一对话入口与协调表面。它可以在本地回答、澄清、委托给现有普通会话，或创建新的普通会话。

**投影（projection）**：由协调会话与普通会话事实推导的可重建只读视图。WorkHub 卡片、过滤器、状态摘要与导航辅助都是投影；它们不拥有任何持久事实，可以丢弃而不丢失工作。

**处置（disposition）**：对一个 WorkHub 输入提出的单一协调结果：`answer_here` 在协调会话中回答；`delegate_existing` 指向一个有界、有效的普通会话；`create_new` 在委托前创建一个普通会话；`clarify` 在协调会话中继续，不猜测也不创建。

**委托（delegation）**：从协调回合到某个目标普通会话与回合的有界引用，只包含其身份、处置与协调拥有的链接状态（`active` 或 `superseded`）。委托链接各自独立的权威转写；它不把目标的完整执行转写复制进 WorkHub。目标的接受、运行中、等待、完成、失败、中止与恢复状态仍是普通会话事实，在 WorkHub 中只以只读投影出现。

**动作门禁（Action Gate）**：在任何写入之前验证拟议处置与操作的确定性 Runtime 边界，包括目标/Host 有效性、归档与等待状态、自路由、显式创建、预期回合 Stop 归属、确认、工具与权限。所有模型与路由输出都是建议性的，不能授权写入。

**路由纠正（Route correction）**：用户判定某条输入属于另一个现有会话。R2.4 只为以后的目标解析保留有界推断记忆。纠正优先级遵循用户提交顺序，而非异步完成顺序，并且它绝不取代任一 Session 的转写权威。

**R2.4**：确定性的上下文连续性路由基线。它作为实验基线或 WorkHub 协调层背后的目标解析器仍然有用；它不是 WorkHub 的最终架构或权威边界。

_避免_：复制执行转写、自路由、第二套 Session/WorkHub 存储基座，或把模型/路由输出当作执行权威。
