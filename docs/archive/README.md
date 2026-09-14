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

# 文档归档

这里的文件为历史背景而保留。它们不是当前的契约、路线图或实现指令。

## 前端

- `design-system-v0.2-wave-10.md` —— 前设计系统文档；因为稳定规则、实现快照与未来 PR 计划已无法分离而退役。
- `full-product-test-plan-2026-05.md` —— 一份已完成的月度交付计划。
- `ui-quality-plan-2026-05.md` —— 一份有时效性的发布与覆盖快照。
- `design-refinement-roadmap-2026-07.md` —— 已完成的设计决策与一份过时的文档积压。

根目录 `DESIGN.md` 拥有共享产品设计意图。`docs/frontend-css-governance.md`、本地前端 README、源码与契约测试拥有实现规则与可执行行为。

## 审计

- `vera-capability-audit-v1-2026-05.md` —— 一份时间点能力与发布门禁审计，其前端权威引用已不再最新。

## 验证快照

- `desktop-smoke-plan-legacy.md` —— 已完成的 PR 验收路径与从当前可执行冒烟 runbook 中移除的推迟 UI 设计。

## 前仓库笔记

被跟踪的 `notes/` 文件作为未记录的平行权威退役。时间点审计、迁移计划、参考逆向工程与设计研究留在这里仅作来源（provenance）。当前仓库规则位于 `ARCHITECTURE.md`、`DESIGN.md`、活动的跨领域契约、本地 README、源码与测试中；workspace 特定的 agent 指令在跟踪文档集之外提供。

- `frontend-simplification-map-2026-07-13.md` —— 为 #871–#887 落地的前端简化轮次建立的基线 knip/体积测量。
- `composer-mentions-spec-2026-07-14.md` —— 已发布的 v1 `@`/`/` composer 提及弹窗规范（#979）；当前行为在 `vera-ui` 源码与 composer-mention 契约测试中。

## 安全契约快照

- `memory-threat-model-pr-memory-1.md` —— 仅契约的 PR-MEMORY-1 边界，作为当前产品的描述已被取代。
- `search-service-threat-model-pr-search-0.md` —— PR-SEARCH-0/1.5 边界，作为当前搜索的描述已被取代。
- `voice-threat-model-pr-voice-0.md` —— 仅 docs/core 的 PR-VOICE-0 边界，作为当前语音的描述已被取代。

## 实现计划

带日期的 runtime 文件是已完成的执行计划。每个文件记录落地其实现的 pull request。

`heavy-task-mainline-system-design.md` 保留了原始 PR、trace 与发布纪事。它描述的无头 heavy-task 机制已被 #2598 退役，不再具有实现权威。

`deepseek-reasonix-cost-runtime-design.md` 保留了原始实现切片与未决决策。后端架构章节与 runtime 源码拥有当前的请求形态、重放、压缩与成本机制。

`runtime-kernel.md`、`runtime-v2-architecture-evolution.md` 与 `runtime-mainline-teaching-manual.md` 保留了导向当前 runtime 的抽取理由与重叠的教学叙事。当前权威从 `ARCHITECTURE.md` 开始。

`runtime-v2-implementation-notes.md` 记录最初的阶段 1–4 runtime 骨架，已被后端架构章节与当前源码取代。

## Computer use 后续记录

computer-use 后续文件是 #857–#985 交付链中逐 PR 的后续记录、事件调查与运行日志。当前 computer-use 权威在 `../README.md` 所列的契约以及源码与契约测试中。

- `computer-use-delivery-state.md` —— `outcome_unknown` 交付状态后续；后置条件语义由基础契约与 runtime 测试拥有。
- `computer-use-evidence-hardening.md` —— fail-closed 报告加固；当前边界由 provider 证据契约与证据类别拥有。
- `computer-use-executor-hardening.md` —— PR #893 的合并后审阅记录；持久决策已折入基础契约与模型循环基础，剩余工作归入 issues。
- `computer-use-runtime-hardening.md` —— PR #892 的生命周期修复记录；当前 fencing 由 runtime 源码与测试拥有。
- `computer-use-physical-input-guard.md` —— 物理输入干扰事件及它产生的守卫策略。
- `computer-use-process-restart-e2e.md` —— 进程重启浸泡目标、调查与运行日志；PID 复用不予声称这一点在 host 事件契约中重述。
- `computer-use-real-ax-model-e2e.md` —— 真实模型 AppKit AX harness 记录与 provider 运行日志；当前证据类别与操作员命令在 `../computer-use-evidence-classes.md`。

## 逆向工程记录

- `expert-team-plan.md` 与 `expert-team-implementation.md` —— 已退役 expert-teams 功能（#971）的历史 WorkBuddy 与 QoderWork 逆向工程笔记。

## 基准日志

- `economic-mechanisms-benchmark.md` —— economic-mechanisms 跟踪 issue #481 与切片 #578 的第一条 synthesis-cache 基准条目。当前进展属于那些 issues。
