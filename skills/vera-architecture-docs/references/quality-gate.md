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

# 架构文档质量门禁

在将草稿或评审标记为完成之前使用本清单。将标记为**必需（Required）**的条目视为适用的发布阻塞项。

## 目的与叙述

- [ ] **必需：** 开头说明核心问题及其重要性。
- [ ] **必需：** 无需通读全文即可推断出目标读者与范围。
- [ ] 文档在多种阅读深度上提供有用的答案。
- [ ] 核心概念在需要时通过直觉、场景、机制和边界加以解释。
- [ ] 当抽象会妨碍理解时，使用具体示例。
- [ ] 各章节推进核心问题，而不是变成组件清单。

## 技术完整性

- [ ] **必需：** 当前实现与 Planned（计划中）、Exploratory（探索中）、Deprecated（已弃用）和 Historical（历史）材料分开。
- [ ] **必需：** 重要的实现主张已对照适当的证据验证，或明确标记为未验证。
- [ ] **必需：** 职责与非职责清晰。
- [ ] **必需：** 覆盖有意义的失败路径、中断和恢复行为。
- [ ] 陈述相关的状态、转换、不变式、排序和幂等规则。
- [ ] 重要的设计选择包含替代方案、成本和复审条件。
- [ ] 以文章承诺的深度提供代码、接口、模式、测试或可观测性锚点。

## 图表与示例

- [ ] 每个图表回答一个具体问题。
- [ ] 图表术语与正文和实现术语一致。
- [ ] 解释阅读方向和重要的省略。
- [ ] 示例不得暗示系统不提供的保证。

## 双语对等

- [ ] **必需：** 两个版本都保留范围、生命周期状态、确定性、保证和限制。
- [ ] **必需：** 规范术语和代码标识符一致。
- [ ] 数字、限制、状态、排序、示例和失败行为一致。
- [ ] 每个版本用其语言读起来自然。
- [ ] 共享图表和链接在两个版本中都可用。
- [ ] 使用对应版本元数据或翻译状态时准确。

## 可维护性

- [ ] 文档遵循现有仓库布局和元数据约定。
- [ ] 在支持时记录所有者和验证日期。
- [ ] 避免脆弱的重复和不稳定的行号引用。
- [ ] 由其它地方拥有的细节用链接而非复制。
- [ ] 已知的不确定性或过时区域对未来的维护者可见。

## 完成报告

移交文档时，说明：

- 创建或更改的文件；
- 用于验证当前行为的证据；
- 仍存在的计划中或不确定的主张；
- 两种语言是否通过语义对等评审；
- 任何有意留空的清单条目及其原因。
