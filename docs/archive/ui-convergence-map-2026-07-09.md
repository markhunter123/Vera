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

# UI 收敛地图（2026-07-09）

> 归档于 2026-07-13。该行动已完成；当前归属在前端 README、源码与契约测试中。

维护者抱怨：共享 UI 方案在每个调用点被重新实现。这张地图盘点每个重复的 recipe 族与抽取顺序。由只读审计 agent 产出；令牌层（--state-hover-bg/--state-selected-bg、Chip alphas、tabular-nums）已由契约治理——工作是把 STRUCTURE 迁移到共享 primitives 上。

## 按优先级排序的抽取顺序

1. **Chip 扩展 + CSS 标签迁移** —— 7 张以上手写的 tone→alpha 表折叠进 primitives/chip.tsx。顺序：先做无 primitive 的 CSS 标签（vera-skill-library-status-label、vera-scheduled-task-run-status、vera-daily-review-archive-status），然后 settingsAuthActionPill（connection.css:160-227）、settingsBotStatusPill（bot.css:189-213，加 `dot` prop）、providerCatalogBadge.is-state（models.css:193-198）。chip-converge-contract.test.ts 已经钉死目标 alphas（/12 /14 /18 /15）。Badge 保持 pill 角色（badge-converge 契约）。
2. **列表行采用 Item** —— primitives/item.tsx 已经编码 4%/8% 填充；添加 `selected` prop → --state-selected-bg；迁移 enabledConnRow、providerCatalogRow、vera-skill-library-row、daily-review 归档/会话行、settingsOsPermissionRow。高风险契约：sidebar-topbar-rail / model-oauth-section / skills.test.ts 钉死；state-token-governance-499 拒绝迁移期间引入的任何非令牌填充。
3. **PageHeader primitive** —— 模块 h2 外壳（vera-module-main-header、vera-scheduled-task-hero）+ 设置 h3 引言（settingsPermissionIntro、settingsHealthIntro、settingsFeatureStatusHero、settingsAboutHero）。API：title/subtitle/icon/eyebrow/as('h2'|'h3')/actions/meta。为 renderer-module-styles + tailwind-compile 契约保留 class 钩子。
4. **StatTile** —— permission.css:547 的 tile ≈ health.css:118 的 tile（几乎相同）；折叠 settings-metric-card.tsx MetricCard + daily-review totals 单元格。outline|filled 强调。必须内建 tabular-nums（tabular-nums-converge 契约）。
5. **SectionHeader + ActionRow（+ EmptyState 内联变体）** —— 三种 section-header 方言（vera-skill-section-row / 带 ::before 强调条的 vera-daily-review-section-title / settingsPermissionSectionHeader）；动作行：settingsActionRow 已共享，折叠 vera-module-main-actions / vera-scheduled-task-top-actions / vera-daily-review-actions。

## 状态
- [x] 1 Chip — 已发布 #681（退役 5 个 recipe，添加 dot prop，扩展契约）
- [~] 2 Item 行 — 第 2 轮在 feat/item-row-convergence 上发布：Item 获得 `selected`（→ --state-selected-bg）与 `interactive` 门禁。已迁移 enabledConnRow（data-default → selected）与 daily-review 归档行（UiButton → Item）。providerCatalogRow 已用 Item。带原因推迟：enabledProviderTrigger（手风琴头，不是行）、settingsOsPermissionRow（静态网格 + 条纹，钉死 grid/div-actions）、daily-review 会话行（复合：preview 兄弟在按钮之外）、vera-skill-library-row（定制网格 + 父 li hover，skills.test.ts 钉死——为未来采用落地了 interactive={false} 支持）。
- [x] 3 PageHeader — 在 feat/page-header-convergence 上发布：新增 primitives/page-header.tsx（title/subtitle/eyebrow/icon/badge/as('h2'|'h3')/actions/meta + contentClassName/iconClassName/headingRowClassName/subtitleClassName/as_wrapper 逃生舱）。已迁移全部 6 个调用点：skills-panel vera-module-main-header、scheduled-task-panel vera-scheduled-task-hero（contentClassName=vera-scheduled-task-heading）、permission-center settingsPermissionIntro（meta）、health-center settingsHealthIntro（meta + <strong> subtitle）、voice-settings settingsFeatureStatusHero（icon + 本地自检 badge）、about-settings settingsAboutHero（icon + version/channel badge fragment + h2 scale）。无需重新钉 CSS：每个包装器的排版 CSS 都使用 DESCENDANT 选择器（`.wrap h2/h3/p`），它们会继续匹配穿过 primitive 的 slot div；radius/pruning 契约未动（包装器块未变）。check-a11y：把 `Vera` 加入品牌允许清单（About title prop 触发了 english-aria-label）。已验证：ui+desktop 构建，2293 桌面 / 46 ui 测试，死 CSS 干净，对齐审计干净，notes/round3-page-header-captures/ 中有 5 张 CDP 截图。
- [x] 4 StatTile — 已发布 #701（agent 取消后的内联；添加 --font-size-stat 阶梯级）
- [x] 5 SectionHeader（#703）+ EmptyState 内联（#704）。ActionRow 有意关闭：settingsActionRow 已在 9 个页面共享；3 个模块集群承载各自钉死的布局，在那里加 primitive 只会多一个钩子而不消除重复。

行动完成于 2026-07-10：每个族都有单一 primitive + 契约钉死 + CI 对齐审计器。

（各族的细节——带 file:line 的实现、分歧、风险——在审计 agent 的报告中；要点已内联如上。每轮发布后更新复选框。）
