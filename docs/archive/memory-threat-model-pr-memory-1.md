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

# 记忆子系统威胁模型

> Archived on 2026-07-13。本文档记录的是仅契约（contract-only）的 PR-MEMORY-1 边界，而非当前产品实现。源码与聚焦测试拥有当前生效的契约。

PR-MEMORY-1 是一个**仅契约**的包。它禁止添加 IPC handler、存储仓库、embedding provider、Recall 工具 runtime、renderer UI 或设置开关。实现包（PR-MEMORY-2+）位于本契约下游——任何实现都不得绕过 `validateMemoryWriteRequest`。

锚点：

- `notes/reference implementation-memory-reverse-2026-05-25.md`（kenji 消息 `66fd3eab`）——参考实现事实 + Vera 准记忆（quasi-memory）清单。
- `notes/pr-memory-0-audit-plan.md`——审计前计划骨架。
- `#my-ai:2f91befb` 线程，消息 `22209a1b`（xuan 门禁评审 + 范围调整）、`fb95a158`（kenji 不变量请求）、`68a1bcb5`（xuan 评审优先级）。

## 来源分离（门禁 #8 + 类型系统）

记忆不是单一表面。契约类型将其分开，使准记忆观测仅凭类型学就无法成为持久记忆条目。

- **`MemorySource`**（可持久）：`user_authored`、`chat_extracted`。只要提供了 `confirmedAt` 时间戳且请求并非来自 renderer，这些来源就能产生 `'active'` 条目。
- **`MemoryCandidateSource`**（不可持久）：`voice_transcript`、`activity_observation`、`cu_observation`、`search_recall`、`daily_review`。这些来源只能产生 `'draft'` 或 `'review_required'` 条目。规范化器会拒绝任何携带 `persistenceState: 'active'` 的候选来源请求（`MemoryBlockReason='candidate_source_no_active'`）。

`MemorySource` 与 `MemoryCandidateSource` 是互不相交的枚举。`DurableMemoryEntry` 形状的 `source` 字段类型为 `MemorySource`，`DraftMemoryEntry` 的 `source` 字段类型为 `MemoryCandidateSource`。Voice 转录在到达验证器之前就无法通过类型检查成为 `DurableMemoryEntry`。

## 资产

- 记忆条目 `content`（NFC 归一化、剥离控制/零宽字符）。
- 记忆条目 `source` 及其派生的用户可见来源信息。
- 记忆条目 `scope`（`'workspace'` / `'session'`）。
- 记忆条目 `confirmedAt`（关于用户行为的 CLAIM——门禁 #9 禁止 renderer 设置它）。
- 待处理/待评审队列内容。
- 未来的 embedding 向量（v1 契约范围外；`embeddingProvider: 'disabled'` 为硬编码）。
- 消费记忆时的引用索引 / prompt 注入参考（门禁 #4）。
- 导出包（门禁 #6 可逆性）。

## 边界

1. **Renderer → main**：renderer 可以 PROPOSE 记忆写入，但禁止提供 `confirmedAt`。确认事件记录是 main 侧的职责。
2. **Main → store**：每次写入都通过 `validateMemoryWriteRequest`；store 边界拒绝任何未通过的请求。
3. **Store → embedding/provider**：v1 未实现。`MemoryCapabilitySnapshot` 中的 `embeddingProvider: 'disabled'` 字面量防止意外接线 provider。
4. **Store → prompt-build**：只有 `'active'` 持久条目有资格注入，且必须有可见的引用表面（`MemoryUsePolicy='cited_only'`）。契约不包括 `'silent'`。
5. **准记忆表面 → memory**：禁止作为直接写入路径；从准记忆进入记忆的唯一方式是用户显式提升的 draft 条目。

## 九道隐私门禁（由 @xuan `22209a1b` 锁定）

| # | 门禁 | 契约中的执行 |
|---|---|---|
| 1 | 默认关闭（default-off） | `MEMORY_MODES` 包含 `'off'`；全新安装快照必须是 `'off'`。验证器第 1 步以 `MemoryBlockReason='mode_off'` 拒绝。 |
| 2 | 持久写入前手动确认 | 持久 `'active'` 路径要求 `confirmedAt`。缺失/无效时验证器以 `MemoryBlockReason='manual_confirm_required'` 拒绝。 |
| 3 | 可逆的删除/导出 | 契约文档要求在任何自动写入能力加入之前先存在可逆操作。v1 契约无自动写入；下游包在添加任何写入驱动之前必须先添加 `delete` 与 `export` 形状。 |
| 4 | 隐身模式读写禁用 | `MemoryWriteRequestContext.incognitoActive` 在验证器第 2 步以 `MemoryBlockReason='incognito_active'` 短路。（读路径是未来契约——同一标志必须门控它。） |
| 5 | 无自动睡眠合并 | 不在 `MemorySource` 枚举中；不在 `MemoryCandidateSource` 中。不存在自动化合并来源的类型——新增一个是需要显式评审的契约变更。 |
| 6 | 可见引用 | `MemoryUsePolicy` 只允许 `'never'` 或 `'cited_only'`。没有 `'silent'` 策略。新增 `'silent'` 需要扩展枚举（即需要显式评审）。 |
| 7 | 无隐藏活动提升 | `activity_observation` / `cu_observation` 仅属于 `MemoryCandidateSource`。验证器通过门禁 `candidate_source_no_active` 拒绝这些来源的 `persistenceState='active'`。 |
| 8 | provider+embedding 泄漏边界 | `MemoryCapabilitySnapshot.embeddingProvider` 是字面量 `'disabled'`。v1 的条目上没有 provider 字段。下游接线任何 provider 都需要扩展此快照类型。 |
| 9 | renderer 不能伪造来源/就绪性 | `MemoryWriteRequestContext.originatedFromRenderer=true` 阻止任何持久 `'active'` 写入——即使 `confirmedAt` 有效——返回 `MemoryBlockReason='renderer_provenance_forged'`。 |

## 不要从参考实现复制什么（负向参考清单）

依据 `notes/reference implementation-memory-reverse-2026-05-25.md`：

1. **睡眠周期 / 4 层合并**（`22-embeddings.md`）——Vera 没有睡眠阶段。没有任何代码路径自动聚合、总结或合并记忆条目。
2. **从聊天自动抽取**——每次 `chat_extracted` 写入都要求显式确认。即使 assistant 提出建议，用户也必须点击确认；无静默插入。
3. **自动检索 / Recall 工具 runtime**——v1 契约范围外。新增它需要单独的检索侧契约与自己的威胁模型。
4. **LLM 介导的遗忘/删除**——只允许用户发起的删除。没有"模型判定这与当前无关"。
5. **活动派生的记忆**——Activity 记录器只能经 `activity_observation` 候选来源喂给 Vera 记忆，绝不能作为持久来源。Activity 审计（独立通道）必须在任何 activity→memory 管线之前运行。
6. **未认证的本地路由**（参考实现的 `05-express-api.md` 通过本地 HTTP 暴露记忆）——Vera 记忆禁止有本地 HTTP 端点；如果 Local Gateway 通道落地，它必须经能力作用域 allowlist + 审计日志，绝不默认开启。
7. **云端 embedding 回退**——`embeddingProvider: 'disabled'` 锁。新增 provider 需要显式契约扩展；无静默的 OpenAI/Cohere/本地混合。
8. **Soul tree / `~/.config/reference implementation` 长期文件**——v1 范围外。如果持久化落地（PR-MEMORY-2+），它位于现有 workspace store 之内，而不是独立的全局树。

## 准记忆排除清单（门禁 #7 + #8）

以下现有 Vera 表面包含持久的用户关联数据，但禁止被视为 `MemorySource`，也禁止自动提升：

- `settings.json` —— personalization 字段、onboarding 里程碑。
- `skills/` —— 用户安装的技能内容。
- `usage_log`（`telemetryRepo`）——历史查询 / 延迟 / 错误。
- `sessions/*/session.jsonl` —— 会话历史。
- `workspace/` 指令文件 —— 仅 prompt 时注入。
- 能力快照 + runtime 探测历史（Health Center）。
- Visual-smoke fixtures。
- Daily Review 候选（Daily Review 通道之后）。
- 搜索索引命中（`MemorySource='search_recall'` 是候选来源桥，不是持久来源）。
- Voice 转录（`voice_transcript` 候选来源）。
- CU / Activity 观测（候选来源）。

**契约能抓住的**（门禁，依 @xuan `0c9c68f9`）：`source` 值是准记忆表面字面名称的请求——`source: 'usage_log'`、`source: 'health_probe'`、`source: 'session_summary'` 等——无论其他字段如何，都被 `validateMemoryWriteRequest` 以 `MemoryBlockReason='unknown_source'` 拒绝。该字符串不在 `MEMORY_SOURCES` 或 `MEMORY_CANDIDATE_SOURCES` 中。

**契约无法抓住的**（来源洗白——下游关切）：如果下游 IPC handler 或 store 边界读取一条 usage-log 条目、把其正文复制进一个全新的 `{ source: 'chat_extracted', confirmedAt: ..., content: ... }` 载荷并提交给验证器——验证器会接受它。验证器看到的是一条格式良好的持久 `chat_extracted` 写入；它无从得知正文源自准记忆表面。来源洗白防御是每个 IPC handler / 每个 store 边界的职责（输入层的来源锁定），不是契约层的职责。任何未来引入"把 draft 提升为 active"或"把准表面总结为 chat_extracted"路径的实现包，都必须在那个边界新增独立的来源门禁。

## 最小测试矩阵（锁定上述门禁）

配套测试文件 `vera-core/src/__tests__/memory.test.ts` 必须至少包含以下断言（每条标注其锁定的门禁 G#N）：

- G1：`mode='off'` → `mode_off` 拦截（任何来源、任何状态）。
- G2：持久 `user_authored` + `persistenceState='active'` 而无 `confirmedAt` → `manual_confirm_required`。
- G2b：持久 `chat_extracted` + `persistenceState='active'` 而无 `confirmedAt` → `manual_confirm_required`。
- G3：契约没有 `delete`/`export` 绕过形状（只能由下游包新增）。
- G4：`incognitoActive=true` + 任何有效写入 → `incognito_active`。
- G5：`MEMORY_SOURCES` 或 `MEMORY_CANDIDATE_SOURCES` 中不存在自动合并来源。
- G6：`MEMORY_USE_POLICIES` 只包含 `'never'` 与 `'cited_only'`。
- G7：候选来源 + `persistenceState='active'` → `candidate_source_no_active`（每种候选类型一条断言）。
- G8：`MemoryCapabilitySnapshot.embeddingProvider` 是字面量 `'disabled'`。
- G9：持久 + active + `originatedFromRenderer=true` → `renderer_provenance_forged`。

外加规范化器矩阵：

- `normalizeMemoryContent`：typeof 拒绝、NFC、控制/零宽字符剥离、trim、空拒绝、超限拒绝。
- `normalizeMemorySource`：已知持久、已知候选、未知拒绝。
- `normalizeMemoryMode` / `normalizeMemoryPersistenceState` / `normalizeMemoryScope`：非成员闭合枚举拒绝。
- `validateMemoryWriteRequest` 成功时返回规范的 `DurableMemoryEntry` 或 `DraftMemoryEntry`（而非原始输入）。
- `validateMemoryWriteRequest` 拒绝 `mode_only` + 候选（`mode_disallows_candidate`）。

## PR-MEMORY-1 源码 diff 中的禁止表面

评审者的源码 grep 不得在 PR 中发现以下内容：

- `ipcMain.handle` —— 不接线任何 IPC handler。
- `BrowserWindow` / renderer 导入 —— 无 renderer 代码路径触碰记忆。
- `fetch(` / `XMLHttpRequest` —— 无 provider/网络调用。
- `embedding` / `vector` —— 无 embedding 逻辑（契约字段是字面量 `'disabled'`）。
- `Recall` / `recall_tool` —— 无 Recall 工具 runtime。
- 存储仓库名称（`telemetryRepo`、`connectionStore`、`sessionStore` 等）——无持久化路径。
- 记忆的设置字段新增——直到 PR-MEMORY-2 添加之前，契约与设置形状无关。
