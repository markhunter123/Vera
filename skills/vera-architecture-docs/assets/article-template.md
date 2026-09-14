---
doc_id: architecture.<subject>
title: "<Reader-oriented title>"
language: <zh-CN|en>
source_language: <zh-CN|en>
counterpart: ./<counterpart-filename>.md
implementation_status: <current|planned|exploratory|deprecated|historical>
document_status: <draft|stable|deprecated|historical>
translation_status: <synced|needs-update|source-only>
last_verified: YYYY-MM-DD
owners:
  - vera-backend
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

# <面向读者的标题>

> 用一段话说明：本文回答什么问题、结论是什么，以及它为什么重要。

## 为什么这很重要

描述工程或读者面临的问题。定义范围和相关排除项。

## 心智模型

给出最简单正确的直觉。在依赖核心术语之前先定义它们。

## 一个具体场景

引入一个可以贯穿全文的代表性示例。

## 工作原理

解释机制、顺序、数据和组件职责。只添加回答具体问题的图表。

## 状态与不变式

描述生命周期、持久与临时状态、合法转换、所有权、排序以及必须保持成立的条件。

## 边界

说明该机制拥有什么、委托什么，以及明确不保证什么。

## 失败与恢复

视适用情况覆盖超时、中断、取消、重试、部分成功、恢复和不可恢复的失败。

## 决策与权衡

解释所选设计、可信的替代方案、收益、成本和复审条件。

## 代码与运维地图

指向与承诺阅读深度相称的稳定模块、类型、接口、模式、测试、日志、追踪和指标。

## 已知限制与未来方向

将 Current、Planned 和 Exploratory 的主张在视觉上明确分开。

## 延伸阅读

链接相关的架构文档、ADR、API 规范和代码自有的参考资料。

<!-- 删除任何无助于回答本文核心问题的章节。 -->
