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

# ADR：每个 Runtime Host 一个 WorkHub 协调会话（Coordination Session）

- 状态：已接受
- 日期：2026-08-25
- 范围：WorkHub 架构
- 决策来源：[讨论 #3286](https://github.com/vera-ai/vera/discussions/3286#discussioncomment-18135855)
- 交付跟踪：[Issue #3492](https://github.com/vera-ai/vera/issues/3492)

## 背景

WorkHub 旨在成为用户可提问普通问题、澄清意图、继续现有工作或创建新工作的唯一持久对话场所。R2.4 是确定性的路由与上下文连续性基线，未来也可能作为目标解析器。它不提供持久的 WorkHub 对话，也不是 WorkHub 的最终定义或权威边界。

持久协调器需要耐久的对话连续性，同时不在 Session 之外创建第二个 WorkHub 数据库、事件存储、转录底座或生命周期权威。

## 决策

每个 Runtime Host 独立拥有一个稳定的 WorkHub **协调会话（Coordination Session）**。协调会话是现有 Session 的一个特殊角色，不是新的持久实体类型或存储系统。它复用现有的 Session、Turn、转录、模型、恢复与事件基础设施。Session 仍是唯一持久的对话与执行底座。

该角色在 WorkHub 首次需要时懒加载供给，并在 Runtime Host 或应用重启后解析到同一个 Session。Session 角色表示、查找、恢复与每 Host UI 解析强制这一生命周期契约。协调转录与处置（disposition）语义仍是后续独立工作。

按 Host 划分边界是刻意的。协调会话只协调属于同一 Runtime Host 的普通 Session。切换 Runtime Host 会选中另一个 Host 的协调会话；第一个里程碑不支持跨 Host 协调或全局协调会话。

协调会话对普通 Session 列表隐藏，并被排除在每一个路由候选集之外。Action Gate 的自路由拒绝仍是纵深防御；它不能替代把协调会话挡在普通导航与目标发现之外。

## 持久权威边界

| 关注点 | 持久权威 |
| --- | --- |
| 在 WorkHub 中发送的用户消息、普通问答、澄清、协调决策、有界的委托引用与协调摘要 | 活动 Runtime Host 的协调会话 |
| 具体执行、项目与文件系统范围、模型与权限模式、根 Turn 准入、工具、产物、恢复、归档/删除，以及权威执行转录 | 目标普通 Session |
| 聚合的 WorkHub 卡片、过滤器、状态摘要与导航辅助 | 无持久权威；这些是 Session 事实的可重建投影 |

协调会话只对协调对话具有权威。它绝不获得对普通 Session 执行或生命周期的权威。

## 处置与动作准入

每个 WorkHub 输入都解析为恰好一个建议的**处置（disposition）**：

- `answer_here`：在协调会话中回答。
- `delegate_existing`：把具体工作委托给一个有界、有效的普通 Session。
- `create_new`：创建普通 Session，然后把具体工作委托给它。
- `clarify`：在协调会话中继续澄清，不猜测目标或创建 Session。

所有模型与路由输出都是建议性的。在任何写入之前，确定性的**动作闸门（Action Gate）**准入或拒绝建议的处置与操作。闸门强制执行 Runtime Host 与目标有效性、归档与等待状态、自路由排除、显式 `create_new`，以及现有的工具与权限上限。替换、取代与 Stop 所有权仍延后。模型与路由策略都不能直接授权写入或扩大执行权威。

## 委托用链接而非复制转录

一次委托只在协调转录与执行转录之间持久化一个有界的链接，例如：

```text
delegationId
coordinationTurnId
targetSessionId
targetTurnId
disposition
```

初始指派链接不镜像目标 Turn 的执行生命周期。目标接受、运行、等待、完成、失败、中止与恢复状态仍是普通 Session 的事实。WorkHub 将这些状态推导为只读投影，不把它们作为独立的协调会话真相持久化。未来的替换支持可以添加协调会话拥有的 `active` / `superseded` 链接，而不会把目标执行状态变成 WorkHub 拥有的状态。

普通 Session 记录被委托的请求、工具、副作用与权威结果。WorkHub 可以显示有界的投影或记录协调摘要，但它不把普通 Session 的完整转录复制进协调会话。

委托链接在现有协调会话转录中使用一条封闭、类型化的 `delegation_assigned` 记录。在协调会话与目标 Session 的准入权威之下，一个 `runtime.sqlite` 事务将该记录与目标待处理消息准入一起提交。对于 `create_new`，目标 Session 元数据在同一事务中创建。记录携带确切的用户文本、解析后的目标与目标 Message/Turn 身份、创建上下文和稳定显示名。其动作指纹拒绝动作身份的冲突复用。

事务是用户可见的指派边界。提交前两个 Session 都观察不到该工作；提交后 WorkHub 链接与目标输入同时存在。唤醒或继续内存中执行器只在提交之后发生。提交与唤醒之间的 Host 崩溃由普通的待处理消息恢复处理，因此 WorkHub 不拥有第二个恢复状态机或补偿链。`delegation_assigned` 记录本身投影出可见的 WorkHub 轮次；renderer 不追加第二条摘要。

renderer 在确认之前只持久化一个 Host 作用域的动作 id。Composer 草稿文本使用独立的存储键与生命周期。因此重载保留幂等性，既不会冻结旧文本，也不会把草稿编辑耦合到 Host 权威。`waiting_for_user` 仍是本地可重试的结果，因为还没有指派被提交。

## 影响、代价与重新评估

- WorkHub 获得持久的对话连续性，而无需增加另一个持久权威、数据库、事件存储、生命周期或转录副本。
- 协调与执行在共享的 Session 底座内保持各自独立权威。
- 按 Host 划分的边界在用户切换 Runtime Host 时割裂 WorkHub 连续性：每个 Host 都有独立的协调转录，无法协调另一个 Host 的 Session。
- 特殊 Session 角色增加了供给、查找、恢复、留存与 UI 义务，尽管它刻意复用现有的 Session 底座。
- 每个被委托的协调轮次都会增加一条类型化指派记录，它也是该轮次的可见时间线来源。
- Work 与 Session 是 1:1、跨 Session 1:N，还是独立的持久实体，仍未定案。
- 跨 Runtime Host 协调仍延后。
- 协调会话角色表示、懒创建、持久查找、恢复、每 Host UI 解析、持久转录、封闭处置与 Action Gate 已实现。持久委托链接编码在该转录中；目标生命周期投影、链接修正与破坏性替换/Stop 恢复仍是后续工作。

如果受支持的工作流需要一个 WorkHub 对话来协调多个 Runtime Host 上的普通 Session，或者 Host 切换造成了可重建投影无法解决的、用户可见的连续性损失，则重新评估按 Host 划分的决策。如果实现该角色生命周期需要第二个持久权威或普通 Session 底座无法安全强制执行的例外，则重新评估特殊 Session 角色。

## 被否决的备选方案

- 第二个 WorkHub 数据库、事件存储、转录底座或生命周期权威。
- 跨 Runtime Host 的单一全局协调会话。
- 把普通 Session 的完整转录复制进 WorkHub。
- 允许模型或路由输出在缺少确定性 Action Gate 的情况下授权写入。
