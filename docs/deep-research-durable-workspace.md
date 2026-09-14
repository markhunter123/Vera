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

# Deep Research 持久工作区

本契约是对 [FS-Researcher: Test-Time Scaling for Long-Horizon Research Tasks with
File-System-Based Agents](https://arxiv.org/abs/2602.01566)（Zhu 等人，ACL
2026）核心系统思想的独立、最小复现。它支撑 [issue #566](https://github.com/vera-agent/vera-agent/issues/566)
中跟踪的 Deep Research 方向。

复现采用论文的两阶段高层方法：

1. 先归档原始来源，再生成推导出的证据笔记，以此构建持久知识库。
2. 从该持久工作区撰写大纲、有来源支撑的章节和最终报告。

未从论文的参考仓库复制任何源代码、提示词或文档。Vera 实现独立构建于 Vera 现有的
event-ledger 和 Artifact Store 契约之上。

## 状态与读者

本文档是 PR #1227 交付的初始 Deep Research 工作区的稳定架构与安全契约。其面向：

- 对照实现核查 issue #566 的评审者；
- 演进 ledger 或工具的 runtime 和存储维护者；
- 消费投影运行状态的 Desktop 维护者；以及
- 在不削弱只读边界的前提下添加本地探索、网页研究或报告生成行为的贡献者。

若本文档与实现不一致，以代码和契约测试为准。

## 评审摘要

该变更刻意将工作流元数据与大型研究内容分离：

| 关注点 | 权威 | 主要实现 |
| --- | --- | --- |
| 运行生命周期与不变量 | 事件投影 | `vera-core/src/deep-research-run.ts` |
| 追加式持久化与重放 | Deep Research store | `vera-storage/src/deep-research-store.ts` |
| 来源、笔记与报告正文 | 现有 Artifact Store | `vera-core/src/artifacts.ts` |
| 面向模型的变更与读取 | 八个 runtime 工具 | `vera-runtime/src/deep-research-tools.ts` |
| 会话门禁与 IPC | Desktop main/preload | `vera-desktop/src/main/main.ts`、`vera-desktop/src/preload/preload.ts` |
| 可见进度与交接 | Desktop renderer/UI | `vera-desktop/src/renderer/use-deep-research-run.ts`、`vera-ui/src/chat-view.tsx` |

风险最高的评审区域是：

1. 损坏或冲突事件的投影不变量与失败行为；
2. 产物归属、来源可追溯性和完整性校验读取；
3. 对 Vera 自有写入工具的根会话门禁；以及
4. 从只读研究会话到新常规实现任务的显式转换。

## 论文到 Vera 的映射

论文描述了一个由 Context Builder 和 Report Writer 共享的持久工作区。Vera 采纳系统边界，而非参考实现：

| FS-Researcher 思想 | Vera 复现 | 有意差异 |
| --- | --- | --- |
| 文件系统作为外部记忆 | JSONL 事件 ledger 加 Artifact Store | Vera 复用应用自有存储，而不是暴露任意项目路径 |
| Context Builder 归档来源与笔记 | 带显式来源（provenance）的 `source` 和 `evidence_note` 产物 | 搜索与 worker 调度仍是有限的、单独授权的子步骤 |
| Report Writer 消费知识库 | 大纲、五个报告章节、最终报告和交接产物 | 完成由投影不变量强制，而非仅靠提示词约定 |
| 工作跨越上下文边界存续 | 状态投影与分块产物读取 | 恢复在损坏状态或完整性不匹配时失败关闭 |
| 多个智能体通过持久文件协调 | 研究步骤可记录 worker 运行 id 和证据 | 初始切片记录 worker，但不引入新的自主调度器 |

## 范围

本切片增加一个有界、可检查的研究工作区。它提供：

- 追加式 Deep Research 事件 ledger；
- 目标、范围、阶段、轮次、产物、清单、有界研究步骤、报告章节、检查点和完成状态的可安全重启投影；
- 面向原始来源、证据笔记、大纲、报告章节、最终报告和实现交接的应用自有 Markdown 产物；
- 分块、完整性校验的产物读取，使恢复的模型可以按 id 取回证据正文而无需重读原始来源；
- Desktop 上可见的进度：清单状态、已检查文件/符号/URL、worker 运行、阻塞项、产物计数和报告草稿状态；
- 每个派生产物对来源产物的直接引用；
- 仅当会话带 `mode:deep_research` 标签时才可用的根会话工具；
- 完成不变量：要求已落实的清单项、所有必需的报告章节、已归档的来源、最终报告和结构化交接。

搜索 provider 选择、浏览器自动化、排序、自动引用格式化和长期调度仍是独立关注点。工作区
记录本地和网页子步骤，但不会静默扩大其权限。

## 权威与数据流

研究事件 ledger 是工作流状态与关系的权威。Artifact Store 是大型正文的权威。
现有的 Task Ledger 仍是任务的权威；检查点只链接到任务 id。

```text
Deep Research root session
        |
        +-- deep_research_* tools
                |
                +-- sessions/<session>/deep-research/events.jsonl
                |      objective, checklist, steps, sections, refs, completion
                |
                +-- artifacts/
                       raw sources, notes, outline, sections, report, handoff
```

每次变更都包含可用的 run、turn 和 tool-call 引用。事件在追加前经过投影和验证。
损坏的 JSONL 失败关闭，而不是返回部分工作区。

## 生命周期与状态模型

```text
not started
    |
    | research_started
    v
knowledge_base (active or blocked)
    |
    | archived sources + evidence + bounded steps + checkpoints
    v
report_writing (active or blocked)
    |
    | five completed sections + final report + handoff
    v
completed
```

阶段和检查点轮次是单调的。完成的运行是终态的：
后续变更被拒绝，但原始工具调用的精确重放除外。

### 事件类型

| 事件 | 用途 | 重要验证 |
| --- | --- | --- |
| `research_started` | 确立目标与范围 | 必须是第一个且唯一 |
| `research_artifact_recorded` | 附加来源或派生产物元数据 | 派生产物必须引用已归档的来源产物 |
| `research_checklist_updated` | 持久化必需的评审进度 | 证据与阻塞字段必须与状态匹配 |
| `research_step_recorded` | 记录有界的本地或网页工作 | 需要根/关键词、停止条件和证据契约 |
| `research_checkpoint_recorded` | 标记可恢复的进度 | 轮次和阶段不得回退 |
| `research_completed` | 封存报告与实现交接 | 需要来源、已落实的清单、五个章节、报告和交接 |

### 产物角色

| 角色 | 含义 | 来源引用规则 |
| --- | --- | --- |
| `source` | 已归档的原始来源或可检查的一手材料 | 不需要父来源 |
| `evidence_note` | 派生的发现或对比笔记 | 必须引用一个或多个 `source` 产物 |
| `outline` | 计划的报告结构 | 必须引用一个或多个 `source` 产物 |
| `report_section` | 一个必需的报告章节 | 必须引用来源并携带章节 key/状态 |
| `report` | 面向用户的最终研究报告 | 必须引用一个或多个 `source` 产物 |
| `handoff` | 结构化的实现输入 | 必须引用一个或多个 `source` 产物 |

## 工具协议

根 Deep Research 智能体遵循以下顺序：

1. `deep_research_start`
2. 对每个重要原始来源及其可检查定位符，以 `role=source` 调用 `deep_research_save_artifact`
3. 带直接 `source_artifact_ids` 的派生证据产物
4. 在每个有界的本地或网页子步骤之后调用 `deep_research_record_step`，
   记录根/查询、忽略的路径、停止条件、已检查引用、
   worker id、证据和阻塞项
5. 在每个必需领域进展时调用 `deep_research_update_checklist`
6. 在有意义的轮次之后和压缩之前调用 `deep_research_checkpoint`
7. 中断或重启后调用 `deep_research_status`，然后只为恢复所需的
   证据正文调用 `deep_research_read_artifact`
8. 五个有来源支撑的报告章节，每个都明确为起草或完成状态
9. 最终的 `role=report` 和 `role=handoff` 产物
10. 带实现任务、建议的 issues 和/或 pull requests 以及验证命令的 `deep_research_complete`

变更重试按 tool-call id 幂等。精确重放返回现有投影；以相同 tool-call id 复用但带
不同的 start、artifact、checklist、step、checkpoint 或 completion 输入则失败关闭。
该 id 在所有 Deep Research 变更工具中唯一，产物重放比较包括精确的名称、摘要、正文哈希、
来源（provenance）、定位符、角色和报告章节元数据。重放查找发生在终态拒绝之前，
因此完成后的精确重试仍然安全。保存产物 id 也由 session、turn 和 tool-call id 派生。若
ledger 验证在产物正文创建后失败，该产物会被回滚。

## 恢复与失败语义

| 情形 | 行为 |
| --- | --- |
| 进程或模型上下文重启 | 重新投影 JSONL ledger，调用 `deep_research_status`，然后只读取必需的产物 |
| 精确的变更重试 | 返回现有投影，不追加重复事件 |
| 相同 tool-call id 但输入不同 | 作为语义冲突拒绝请求 |
| 无效事件或不变量回退 | 在追加前验证，保持 ledger 不变 |
| 产物已创建但事件被拒绝 | 回滚新创建的产物 |
| JSONL 损坏 | 失败关闭；不暴露部分运行 |
| 缺失、已删除或跨会话产物 | 拒绝读取 |
| 产物内容哈希不匹配 | 作为完整性失败拒绝读取 |
| 完成产物缺失、已删除、损坏、跨会话或角色/类型错误 | 在封存 ledger 前拒绝完成 |
| 中断或受阻的研究 | 保留检查点、阻塞项、已检查引用和收集的证据，供评审/恢复 |

## 只读实现交接

完成不改变研究会话的权限模式。Desktop
界面声明原始会话保持只读，并提供显式的**在新任务中继续**操作。该操作：

1. 创建一个常规的、无标签的任务；
2. 从结构化交接和来源 id 构建有界提示词；
3. 填充 composer 但不发送；以及
4. 要求实现任务在修改项目文件前检查当前代码并给出计划。

因此由用户选择模式转换，并且任何模型调用或项目写入前仍会审查种子提示词。

## 安全边界

Deep Research 仍使用 `explore` 权限配置。新工具只是写入 Vera 自有状态的窄例外。
它们不暴露通用文件系统路径，也不能编辑用户的项目。普通会话
和子智能体不会获得这些工具。

状态和产物文本在返回给模型前经过密钥脱敏，并剥离伪造的 workspace 和产物
封套标签。产物读取验证会话归属、实时状态、来源类型和 ledger 中记录的 SHA-256 哈希。
完成会对每个已归档来源、全部五个报告章节的当前产物、最终报告和交接重复这些检查，
包括持久化的 Markdown 类型和 Deep Research 角色。对 ledger 所有的产物禁用通用
Artifact Pane 删除，使 UI 操作无法静默使已完成的工作区失效。

## 兼容性与运行限制

初始运行 schema 为版本 `1`。ledger 是追加式的，本切片没有原地迁移路径。
未来的 schema 变更必须保持向后可投影，或引入带 fixture 覆盖的显式迁移。

限制是防御性边界，不是产品目标：

| 限制 | 值 |
| --- | ---: |
| 每次运行的产物数 | 2,000 |
| 每次运行的研究步骤数 | 500 |
| 每次运行的检查点数 | 500 |
| 每次运行的清单项数 | 50 |
| 每个步骤的已检查引用数 | 200 |
| 单个工具接受的产物正文 | 512,000 字符 |
| 单次读取返回的产物正文 | 64,000 字符 |
| 状态输出包含的产物数 | 最近的 100 个 |

这些边界防止不受信任或循环的模型把投影或状态渲染变成无界操作。
大型研究正文按块读取，并保持在事件 ledger 之外。

## 非目标与后续接缝

初始复现不声称提供：

- 新的搜索 provider、浏览器驱动、引用排序算法或自动参考文献格式化器；
- 用于 worker 运行的自主调度器；
- 整个进度面板中可点击的产物/引用下钻；
- ledger 压缩、索引或 schema 迁移；
- 与论文评估相当的报告质量基准；或
- 从 Deep Research 会话修改用户项目的权限。

这些能力应在独立的变更中构建于本契约之上，而不是扩大初始的持久化与权限边界。

## 评审者检查清单

- [ ] 只有带 `mode:deep_research` 标签的根会话获得这八个工具。
- [ ] 工具写入仅限于 Vera 自有的 ledger 与产物状态。
- [ ] 没有已归档来源的来源（provenance）就不能记录派生产物。
- [ ] 精确重试幂等，冲突重试失败关闭。
- [ ] 阶段/轮次回退、损坏的 ledger 和完整性不匹配被拒绝。
- [ ] 完成不能绕过清单、章节、报告、来源或交接要求。
- [ ] Desktop 进度来自持久投影，而非仅模型文本。
- [ ] 完成研究不会改变原始会话的 `explore` 权限。
- [ ] 实现交接创建常规任务，填充但不发送其有界提示词，并保持原始运行可检查。

## 验证

聚焦测试覆盖：

- 快乐路径的两阶段投影与完成；
- 拒绝没有已归档来源引用的证据；
- 单调的轮次与阶段；
- 清单证据与完成门禁；
- 带已检查引用、worker id 和停止条件的有界本地/网页步骤；
- 必需的报告章节与结构化交接门禁；
- 从追加式 JSONL 的重启恢复；
- 幂等的检查点与完成重试；
- 拒绝重放 tool-call id 下的冲突输入；
- 完整性校验的分块产物恢复；
- 损坏 ledger 的失败关闭行为；
- runtime schema 检查、重试幂等性和安全状态渲染；
- Desktop 根会话标签门禁、实时进度 IPC/UI 接线、服务端渲染进度组件覆盖，
  以及显式的只读到实现交接。

运行：

```sh
npm --workspace @vera/core test
npm --workspace @vera/storage test
npm --workspace @vera/runtime test
npm --workspace @vera/desktop test
```
