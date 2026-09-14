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

# Vera 架构写作标准

## 目的

使用本标准让每篇文章像一篇优秀的技术博客那样易于接近，同时保留架构记录所需的精确性。它定义的是文章级质量，而非强制性的主题清单或仓库目录。

## 文章契约

起草之前，先确定：

- **核心问题：** 文章必须回答的单一问题。
- **受众：** 新手、活跃开发者、技术负责人、外部集成方，或刻意组合。
- **阅读深度：** 概览（orientation）、工作理解（working understanding），或实现/调试深度。
- **范围：** 文章涵盖什么、明确不涵盖什么。
- **证据基础：** 代码、测试、schema、运行时观察、已接受的决策或提案。
- **生命周期状态：** Current（当前）、Planned（计划）、Exploratory（探索）、Deprecated（弃用）或 Historical（历史）。

一份文档可以通过渐进式披露服务于多种深度，但它必须明确其首要受众。

## 叙事模型

在符合主题时优先采用以下推进方式：

1. **问题：** 是什么读者或系统问题让该主题变得重要。
2. **直觉：** 最简单且正确的心智模型。
3. **具体场景：** 一个可以在整篇文章中延续的代表性示例。
4. **机制：** 涉及的组件、序列、数据与状态。
5. **边界：** 职责、非职责与接口。
6. **失败行为：** 预期失败、恢复、部分成功与不可恢复的情况。
7. **权衡：** 收益、代价、替代方案与重新评估条件。
8. **技术锚点：** 代码地图、schema、API、测试、遥测或运维信号。

当另一种叙事能更清晰地回答核心问题时，不要强行套用这个顺序。除非文档的问题专门关于清单或归属，否则不要以一份扁平的服务列表开头。

## 四层解释

对于文章中每一个核心概念，提供足够的以下层级以防止误解：

1. **直觉：** 用通俗语言说它是什么意思。
2. **场景：** 系统为什么需要它。
3. **机制：** 它内部如何工作。
4. **边界：** 它不代表或不拥有什么。

在依赖某个术语之前先定义它。优先使用一个稳定的术语，而不是风格化的同义词变换。

## 精确性规则

### 区分生命周期状态

- **Current（当前）：** 在当前系统中已得到验证。
- **Planned（计划）：** 已达成一致但尚未完全实现的方向。
- **Exploratory（探索）：** 正在讨论的选项，不隐含任何承诺。
- **Deprecated（弃用）：** 仍然存在但正在被移除或替换。
- **Historical（历史）：** 仅为了解释过去的抉择或迁移背景而保留。

在声明或小节层面标记混合状态的章节。当当前行为与未来设计同时出现时，仅文档级状态是不够的。

### 用证据支撑主张

使用可获得的最强证据：

1. 运行时行为或通过的测试；
2. 实现与 schema；
3. 已接受的 ADR 或规范；
4. 设计讨论或路线图；
5. 作者推断。

把推断明确标注为推断。如果代码与散文不一致，报告这一差异，而不是默默选择更方便的说法。

### 描述状态与不变量

当行为依赖生命周期或并发时，点名：

- 状态与合法转换；
- 每个转换的归属；
- 持久状态与临时状态；
- 必须保持为真的不变量；
- 幂等性或顺序预期；
- 中断、重试、超时与取消行为。

### 解释决策

对于有意义的抉择，记录：

- 背景与约束；
- 选定的方案；
- 可信的替代方案；
- 选择的理由；
- 收益与代价；
- 应触发重新评估的条件。

当仓库使用 ADR 时，把长期存在、影响深远的抉择移入 ADR。文章可以摘要并链接到该决策。

## 示例与图表

当一个具体示例能实质性降低抽象度时，使用它。在多个章节中沿用同一个示例，除非第二个示例能揭示一个不同的边界。

根据被解释的关系选择图表：

- 系统边界的上下文图（context diagram）；
- 职责与依赖的组件图（component diagram）；
- 随时间交互的时序图（sequence diagram）；
- 生命周期与恢复的状态图（state diagram）；
- 信息流动的数据流图（data-flow diagram）；
- 运行时放置与基础设施的部署图（deployment diagram）。

每个图表都必须有目的陈述。说明其阅读入口点与有意义的省略。命名要与散文和代码一致。双语文档优先使用共享的、语言中立的图表源。

## 渐进深度

在适当的地方为三种阅读遍数设计：

- **开篇：** 读者理解结论及其重要性。
- **主体叙事：** 读者理解端到端机制与边界。
- **深度章节：** 读者能够实现、扩展或调试该行为。

把核心意义放在散文中。表格、图表与代码片段应澄清散文，而不是承载未解释的结论。

## 可维护性

- 在已提交文档中，优先使用稳定的包、模块、类型与接口链接，而不是脆弱的行号引用。
- 当仓库支持元数据时，记录文档所有者与验证日期。
- 在语言之间共享图表与生成的 API/schema 材料。
- 链接而非复制归属另一文档的细节。
- 让未来方向保持足够分离，使当前行为始终明确无误。
- 当实现变更使主张失效时，更新或标记过时文档。
