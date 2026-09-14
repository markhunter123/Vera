---
name: vera-architecture-docs
description: Draft, restructure, translate, or review bilingual Chinese-English architecture documentation for the Vera Agent backend. Use when Codex works on Vera technical narratives, component or mechanism explanations, architecture decisions, system flows, engineering guides, or documentation quality checks and needs blog-like clarity without losing architectural precision. Do not use it to impose a fixed topic list or information architecture unless the user asks for one.
---
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

# Vera 架构文档

编写易于进入、技术上严谨、且中英双语都可维护的架构文档。把用户选择的主题与文档组织视为约束；本技能治理的是写作质量、证据、双语一致性与审阅。

## 选择任务模式

- **起草（Draft）**：从代码、设计笔记、访谈或用户简报创建新文档。
- **重写（Rewrite）**：改进现有文档，同时保留其技术含义。
- **翻译（Translate）**：产出目标语言的天然对应物，而非逐句转写。
- **审阅（Review）**：识别清晰度、证据、正确性或双语一致性方面的具体缺口。
- **标准化（Standardize）**：让多份文档在术语、元数据、状态标签与结构上对齐，而不强迫它们变成相同的叙事。

从请求中确认预期的模式。安全时自行推断；只有当不同的解读会实质改变输出时才询问。

## 遵循工作流

1. **确立文章契约。** 陈述一个核心问题、预期读者、预期阅读深度、源语言与声称的实现状态。不要发明主题，也不要替换用户的大纲。
2. **收集证据。** 在把实现细节当作事实呈现之前，检查相关的代码路径、测试、schema、配置、ADR 与现有文档。把已验证的行为与计划和解读区分开。
3. **构建叙事。** 从问题与直觉推进到具体场景，然后是机制、边界、失败与权衡。只包含有助于回答核心问题的章节。
4. **添加技术锚点。** 把主张连接到真实的组件、状态转换、不变量、接口、可观测性信号或代码位置（视情况而定）。
5. **创建双语对应物。** 保留概念、状态、示例、图表与章节身份，同时为目标语言自然重写。
6. **运行质量门禁。** 对照 `references/quality-gate.md` 审阅两个语言版本。在把文档称为完成之前修复失败的必需检查。

在起草、重写或标准化架构内容时，请阅读 `references/writing-standard.md`。在创建或审阅两种语言时，请阅读 `references/bilingual-standard.md`。仅当 `assets/article-template.md` 适合所选主题时，才把它作为起始脚手架；删除无关章节，而不是机械地填充它们。

## 应用不可协商的规则

- 从读者问题或工程问题开始，而不是组件清单。
- 区分 **Current**（当前）、**Planned**（计划）、**Exploratory**（探索）、**Deprecated**（弃用）与 **Historical**（历史）声明。
- 绝不把未经验证的设计假设呈现为当前实现。
- 通过直觉、场景、机制与边界解释重要机制。
- 覆盖有意义的失败路径与权衡，而不只是 happy path。
- 在切实可行的范围内让图表有目的性且语言中立；解释每个图表包含什么、省略什么。
- 使用稳定术语。当同义词代表同一个 Vera 概念时，不要为了多样化而交替使用。
- 优先使用共享资产的、独立完整的中文与英文文档，而非逐段交错翻译。
- 保留不确定性。翻译不得加强或削弱主张。
- 为渐进深度优化：读者不读完整篇文章也能从开篇摘要中获益。

## 处理审阅

以按影响排序的可操作发现开头。尽可能引用确切章节或行号。按顺序检查：

1. 事实正确性与状态混淆；
2. 缺失的边界、不变量或失败行为；
3. 断裂的叙事或未解释的概念；
4. 双语语义漂移与术语不一致；
5. 可维护性问题，如重复图表或不稳定的代码引用；
6. 风格打磨。

如果没有实质性发现，就说明这一点，并指出任何验证限制。

## 交付制品

创建文件时，遵循仓库现有的文档布局。如果不存在惯例，建议而非静默建立新的仓库级结构。让语言对应物位于匹配的相对路径，或给它们稳定的共享文档 ID。报告哪些技术主张已验证、哪些仍是计划中或不确定的。
