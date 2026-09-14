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

# UI 技能深度阅读 — 2026-06-23（yuejing）

> 于 2026-07-13 归档。本研究快照不是当前产品设计的权威。

3 个并行的 Explore 代理按照 WAWQAQ 的请求 `f424c6b5` 深度阅读了 5 个设计技能合集。以下是综合结果——收敛规则 + vera 差异 + 1 份最终发布清单。

## 来源

| 来源 | 类型 | 仓库 |
|--------|------|------|
| Impeccable | 26 条命令 + 44 条规则的 SLOP 目录 | github.com/pbakaus/impeccable |
| UI Skills | 15 项技能合集（baseline-ui、fixing-a11y、fixing-motion-performance、12-principles-of-animation、fixing-metadata 等） | github.com/ibelick/ui-skills + github.com/raphaelsalaja/skill |
| Taste-Skill | taste / redesign / soft 变体 | github.com/Leonxlnx/taste-skill |
| UI Design Brain | 60+ 组件最佳实践 | github.com/carmahhawwari/ui-design-brain |
| Better Icons | MCP + 技能，20 万个图标 | github.com/better-auth/better-icons |

## 全部 5 个来源的收敛规则

以下规则在 **3 个以上来源**中独立出现。信号最强。

| 规则 | 来源 | Vera 差异 |
|------|---------|-----------|
| 正文文本 ≥ 14-16px，字重 400/500/600 且具有语义对比 | Impeccable /typeset、baseline-ui、Taste-Skill、UIDB | hint 13px → 14，无 display 字体 |
| **触感 `:active` = `scale(0.98)` 或 `translateY(1px)`** | Taste-Skill、UIDB、12-principles | 行/导航/返回没有 `:active` |
| 仅合成器动画（只使用 `transform`/`opacity`，≤ 200ms） | baseline-ui、fixing-motion-perf、Impeccable /animate | Vera 可能在 hover 时过渡 `background-color`（重绘）——可接受，但需确认没有动画影响布局 |
| 减少动画（reduced-motion）防护 | 全部 5 个 | ✅ 第 11 轮已完成 |
| 单一强调色，饱和度 < 80%，OKLCH 中性色向品牌色偏移 | Taste-Skill、Impeccable /colorize | vera 使用原始 `%foreground` 覆盖层，无品牌色调 |
| 8px 网格；重新设计默认双倍留白 | Taste-Skill、UIDB、Impeccable /layout | 行内边距 20/24 偏离网格（应为 16/24 或 24/24） |
| 开关/触摸目标 ≥ 44px 命中区域 | Taste-Skill、UIDB | switch 视觉尺寸 26×46，无命中内边距 |
| 侧边栏主导航 5-7 项，明确的活动状态 | UIDB、Taste-Skill | vera 在"AI 与集成"组中超过 7 项——可以折叠；活动状态为浅色填充，无强调色条 |
| 所有动画时序使用一个 CSS 变量（没有零散的 ms 值） | 12-principles 的 "timing-consistent" | Vera 有零散的 150ms 值，没有 `--motion-fast` 令牌 |
| 标题用 `text-balance`，正文用 `text-pretty` | baseline-ui | 未使用 |
| 数据/数字标签用 `tabular-nums` | baseline-ui、Impeccable /typeset | 未使用；值单元格 `已启用 / zai-live` 会受益 |
| 除非显式，否则不改 display 字距 | baseline-ui | h2 有 `-0.012em`（有意为之，可以） |
| 禁用破折号 | Taste-Skill、redesign | 需要 grep |
| 以 Inter/system 作为默认字体的做法被标记为"AI 痕迹" | Taste-Skill、redesign、soft | vera 默认 system-ui —— 已标记 |
| 以 Lucide 为默认被标记 | Taste-Skill | vera 使用 lucide-react —— 已标记，建议 Better Icons |
| 卡片或边框，二选一 | Impeccable 规则 36、UIDB、Taste-Skill | 基本 ✅（.settingsRows 仅用边框），但 `.settingsConnectionRow` 仍然同时有边框和阴影 |
| 可见的焦点环（`:focus-visible` 2px） | fixing-a11y、Impeccable /audit | ✅ 第 11 轮已完成 |
| 页面头部高度 56-72px | UIDB | vera 使用内边距堆叠，不是真正的栏——部分符合 |

## vera 当前触发的反模式

- **Impeccable 规则 11（卡片过度使用 / 嵌套卡片）：** 每个设置页面渲染多个堆叠的 `.settingsRows` 块，每块都有自己的卡片外观。可以改成一张带章节分隔线的卡片（按 /distill）。
- **Impeccable 规则 25（原始中性色未向品牌色偏移）：** `.settingsRows` 边框是 `oklch(from var(--foreground) l c h / 0.08)`。以 0.005-0.01 的色度向 `--accent` 偏移会让品牌色进入界面外观。
- **Taste-Skill 禁止：每一行都用 border-b。** ❌ — 等等，vera 确实在行之间使用 `border-bottom` 发丝线。WAWQAQ 在 PR-GROUPED-CARD-0 中明确要求这样做（"内容紧密、用分隔线划开"），因此 Taste-Skill 与 WAWQAQ 之间的这一分歧仍未解决。以 WAWQAQ 为准。

## 对 vera 最有价值的 10 项行动

按影响 / 工作量排序：

1. 行、导航项、返回按钮上的**触感 `:active` 缩放**。
   - `.settingsFormRow:active, .settingsRow:active, .settingsNavItem:active, .settingsBackButton:active { transform: scale(0.985); transition: transform 100ms cubic-bezier(0.16, 1, 0.3, 1); }`
   - 减少动画门控已就位——在 `@media (no-preference)` 分支内触发。

2. **侧边栏活动强调色条**（Redesign-Skill）。
   - `.settingsNavItem[data-active="true"] { box-shadow: inset 3px 0 0 var(--accent); }`
   - 把品牌色带入最常使用的界面。

3. 值单元格上的 **`tabular-nums`**。
   - `.settingsRow > span { font-variant-numeric: tabular-nums; }`
   - `zai-live` 之类的数值、版本字符串、计数可以整齐对齐。

4. 页面头部上的 **`text-balance` / `text-pretty`**。
   - `.settingsPageHeader h2 { text-wrap: balance; }`
   - `.settingsPageHeaderDescription { text-wrap: pretty; }`

5. **提示字号下限 13 → 14px**。
   - `.settingsFormRow small, .settingsField small { font-size: 14px; }`（当前为 13）
   - 跨越了 baseline-ui + UIDB + Impeccable 共同收敛的 14px 可读性下限。

6. **Switch 命中区域垫片**：在 26×46 的视觉尺寸周围提供 44×44 的不可见命中目标。
   - 把 `<Switch>` 包在 `min-width:44px; min-height:44px;` 的 flex 容器中。

7. **统一动画令牌**。
   - `--motion-fast: 160ms` + `--motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1)`。
   - 在导航 / 行 / switch / 输入过渡中复用。

8. 设置界面外观的 **OKLCH 品牌色调**。
   - `.settingsRows` 边框从 `from var(--foreground) ... / 0.08` 改为 `oklch(from var(--accent) l c h / 0.08)`。
   - 微妙的品牌传递，不改变感知上的中性。

9. **破折号 + AI 套话文案 grep**。
   - 审计 `vera-desktop/src/renderer/settings/SettingsModal.tsx` 中的 `—`、"Seamless"、"Elevate"、"Unleash"。
   - 快速机械清理。

10. **Better Icons MCP 安装（延后发布）**。
    - 添加到 `.mcp.json`。不要在这个轨道迁移图标——先让它在每个界面学习偏好的图标族。Lucide 暂时保持默认。

## 延后 / 超出范围

- **字体更换**（用 Geist/Cabinet Grotesk/Satoshi 替代 system-ui）：有意义，但需要在包中包含字体文件、做许可证检查和大范围视觉回归。值得单独一个 PR。
- **大组导航精简到 ≤7 项**：会重新拆分 AI 与集成。延后；WAWQAQ 在第 7 轮已经批准 3 个组。
- **卡片过度使用 / 合并堆叠卡片**：与 WAWQAQ 的分组卡片方向矛盾。不要更改。

## 第 15 轮（最终）PR 计划

打包行动项 1、2、3、4、5、7（影响最大、单一 CSS 文件）。跳过 6（组件包裹）、8（品牌色调风险）、9（审计）、10（配置）——这些需要各自的 PR。

PR-SETTINGS-MOTION-TYPO-TOKENS-0：
- 行/导航/返回上的 `:active` 缩放（第 1 项）
- 活动导航上的强调色条（第 2 项）
- 行值上的 tabular-nums（第 3 项）
- 头部上的 text-balance / text-pretty（第 4 项）
- 提示 13→14（第 5 项）
- 共享 `--motion-fast` 令牌（第 7 项）
