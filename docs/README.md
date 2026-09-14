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

# Vera 文档

本页是 Vera 文档的权威地图。当文档与实现不一致时，代码与契约测试仍然是最终权威。

## 信息归属何处

- 根目录与包的 README 描述稳定的产品入口点、公开接缝与本地归属。
- `docs/` 包含当前跨领域架构、安全、产品与验证契约。
- GitHub issues 与 pull requests 包含实现计划、迁移进展与时敏 TODO。
- `docs/archive/` 为历史背景保留已完成的计划与被取代的材料。归档文档不是当前实现指南。

## 从这里开始

- [后端架构](../ARCHITECTURE.md)
- [桌面端架构](../vera-desktop/README.md)
- [Renderer 架构](../vera-desktop/src/renderer/README.md)
- [Evaluation 内核](../vera-eval/README.md)
- [Runtime 包](../vera-runtime/README.md)
- [UI 包架构](../vera-ui/README.md)
- [安全策略](../SECURITY.md)

## 当前契约

### Runtime 与 Eval

- [Deep Research 持久 workspace](./deep-research-durable-workspace.md)
- [会话任务台账生命周期](./session-task-ledger-lifecycle.md)
- [Work Board 契约](./work-board-contract.md)
- [Work Board 阶段 1 表面](./work-board-phase1.md)
- [WorkHub 领域语言](./workhub-domain-language.md)
- [WorkHub 协调会话 ADR](./architecture/workhub-coordination-session-adr.md)
- [Runtime 恢复架构](./architecture/runtime-resume-architecture.md)
- [Runtime Host 架构](./architecture/runtime-host-architecture.md)
- [远程 Runtime Host 设置](./runtime-host-remote-access.md)
- [Runtime 恢复抽取台账](./architecture/runtime-resume-extraction-ledger.md)
- [Runtime 恢复阶段 3–4 实现路线](./architecture/runtime-resume-phase3-phase4-workspace-checkpoint-design.md)
- [技能目录策略](./skill-catalog-policy.md)
- [Agent Swarm](./agent-swarm.md)
- [Agent Graph 流调度](./architecture/agent-graph-stream-scheduling-draft.md)
- [IM 扫码接入 runtime 架构](./architecture/bot-onboarding-runtime.md)
- [后端架构章节](./architecture/)

### Computer use

- [基础契约](./computer-use-foundation-contract.md)
- [模型循环基础](./computer-use-model-loop-foundation.md)
- [证据类别](./computer-use-evidence-classes.md)
- [Provider 证据契约](./computer-use-provider-evidence.md)
- [Host 事件契约](./computer-use-host-events-contract.md)

### 前端与验证

- [产品设计](../DESIGN.md)
- [前端 CSS 治理](./frontend-css-governance.md)
- [Windows 支持基线](./windows-support.md)

### 发布运维

- [CLI/TUI 分发契约](./cli-distribution.md)
- [CLI npm 发布](./cli-npm-release.md)

### 安全与隐私

- [Workspace 隐私上下文](./workspace-privacy-context.md)
- [Runtime sandbox 边界](../vera-runtime/src/sandbox/README.md)

## 历史材料

- [Runtime Kernel 抽取](./archive/runtime-kernel.md)
- [Runtime v2 架构演进](./archive/runtime-v2-architecture-evolution.md)
- [Runtime v2 实现笔记](./archive/runtime-v2-implementation-notes.md)
- [DeepSeek Reasonix 成本 runtime 设计](./archive/deepseek-reasonix-cost-runtime-design.md)
- [文档归档](./archive/README.md)

## 维护

- 把稳定的跨领域文档加到上面最接近的章节。
- 把本地架构放在代码旁边，并从**从这里开始**链接它。
- 把进展与 TODO 放在 issues 或 pull requests 中，而不是复制进稳定文档。
- 把已完成的计划移到 `docs/archive/`；只有在其独特引用已更新或不再需要之后才删除文档。
- 优先更新现有权威，而不是添加平行文档。
- 把 PR 后续记录、事件调查与运行日志放在 pull request 或 `docs/archive/` 中，而不是作为新的当前契约。`notes/` 与 `docs/local/` 是 workspace 本地草稿，保持不被跟踪。
- 不要把 PR 或 issue 截图提交到 `docs/` 下。把临时视觉证据附在 GitHub 讨论串上；产品 hero/营销图片位于 `.github/assets/` 下。
