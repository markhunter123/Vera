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

# Vera 双语文档标准

## 默认发布模型

维护各自独立、完整的简体中文与英文文档。为对应版本（counterpart）提供一致的相对路径、文件名或共享的稳定 `doc_id`。复用图表、代码片段、模式（schema）及其它与语言无关的资源。

除非用户明确需要并排对照的产物，否则应避免逐段交错排版。交错排版会让两个版本都更难阅读和维护。

## 源版本与对应版本

每个编辑周期选择一种源语言。先起草并做技术校验该版本，然后创建对应版本。对应版本是为目标语言读者所做的改编，而不是逐字转译。

两个版本都必须保留：

- 核心问题与范围；
- 技术主张及其生命周期状态；
- 确定性程度；
- 示例与标识符；
- 图表语义；
- 决策依据与权衡；
- 警告、限制与失败行为。

允许句子结构、章节措辞和解释性上下文存在自然差异。不得在未有意更新或标记另一版本的情况下，只向单一语言版本添加技术主张。

## 术语

维护一个项目术语表，至少包含：

| 字段 | 含义 |
|---|---|
| 中文术语 | 首选中文名称 |
| 英文术语 | 规范的英文名称 |
| 代码标识符 | 相关的类型、字段、API 或包拼写 |
| 定义 | 与语言无关的概念边界 |
| 避免 | 含混或已弃用的同义词 |

代码标识符必须原样保留。首次出现时，如果有助于识别，可引出对应语种的说法，例如 `运行（Run）`；之后应一致使用自然的首选术语。

不要仅仅为了让行文看起来完全本地化而翻译产品名、协议名、类型名或标识符。

## 语义对等检查

按含义而非句子数量来比较两个版本：

1. 标题和摘要是否承诺了相同的答案？
2. 范围与排除项是否一致？
3. Current、Planned、Exploratory、Deprecated 和 Historical 标签在效果上是否一致？
4. MUST、SHOULD、MAY、保证与可能性是否具有同等强度？
5. 数量、超时、限制、状态名称和排序规则是否一致？
6. 失败与恢复行为是否同样完整？
7. 图表中使用的术语是否被两个版本共同认可？
8. 链接是否指向合适的语种版本或共享来源？

翻译时不得悄悄把"可以"变成"将会"、把"计划中"变成"已支持"，或把"通常"变成"总是"。

## 建议的元数据

优先使用仓库约定。当不存在约定时，建议使用如下元数据：

```yaml
doc_id: architecture.example
title: "Reader-oriented title"
language: zh-CN
source_language: zh-CN
counterpart: ./example.md
implementation_status: current
document_status: draft
translation_status: synced
last_verified: YYYY-MM-DD
owners:
  - vera-backend
```

有用的翻译状态包括 `synced`、`needs-update` 和 `source-only`。除非项目正式采用，元数据是可选的；但语义清晰是必须的。

## 写作风格

在两种语言中：

- 优先使用直接、具体的句子；
- 首次使用时解释必要的术语行话；
- 标题写成面向读者的路标；
- 避免宣传性表述和含糊的形容词；
- 保持相同的技术高度，即使某种语言需要额外的衔接性解释。

中文行文应读起来像地道的中文技术文章，而不是用中文词汇堆砌的英文句法。英文行文应读起来像原创的技术文章，而不是暴露中文语序或省略主语。
