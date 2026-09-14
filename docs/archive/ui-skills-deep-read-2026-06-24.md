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

# UI 技能深入研读 — 2026-06-24（yuejing，第 2 轮）

> 已于 2026-07-13 归档。本研究快照不再作为当前产品设计依据。

WAWQAQ 在消息 `802dda4c` 中要求我深入学习他通过消息 `cdfd68eb` 发来的全部技能 + 6 个外部 URL。本文是第 2 轮的综合，承接昨天（2026-06-23）的 [[ui-skills-deep-read-2026-06-23]]。

## 新的外部来源（WAWQAQ 消息 `cdfd68eb`）

| URL | 类型 | 说明 |
|-----|------|-------|
| github.com/shadcn-ui/ui/tree/main/skills/shadcn | shadcn 技能 | 组合与 token 规则。关键：表单用 FieldGroup/Field，用 `size-*` 而非 `w-*/h-*`，`truncate` 快捷方式，Avatar 必须有 Fallback，Skeleton 不用 animate-pulse |
| github.com/Jakubantalik/transitions.dev | transitions 目录 | 18 个具名 transition（数字 pop-in、badge、text-state-swap、panel reveal、成功勾选），`t-*` 命名空间类，强制 `@media (prefers-reduced-motion)` |
| github.com/carmahhawwari/ui-design-brain | UI 设计脑 | 8px 基准线，正文 ≥ 14px（优先 16），微交互 150–250ms ease-out，toast 4–6s，skeleton 延迟 300ms 后显示，数字用 tabular-nums，单一强调色 |
| github.com/better-auth/better-icons | 图标 CLI | **不可访问** — 两个候选路径均 404。已跳过 |
| github.com/pbakaus/impeccable | 26 条命令 + 44 条规则的 SLOP | 正文宽度限制在 65–75ch；h1–h3 用 `text-wrap: balance`，长正文用 `pretty`；展示型标题 letter-spacing ≥ -0.04em；颜色用 OKLCH；ease-out 指数曲线，**无 bounce、无 elastic**；**禁用：** ghost-card（1px 边框 + 16px+ 阴影）、过度圆角 > 16px、通过 background-clip 的渐变文字、雷同的卡片网格 |
| emilkowal.ski/ui/agents-with-taste | Emil Kowalski 博客 | 起始缩放从 0.95 而非 0 开始；退出比进入快 20%；UI 动画 < 300ms；用 `will-change: transform` 消除抖动；动画子元素而非父元素以修复 hover 闪烁；`transform-origin` 置于触发点；`:active` → `scale(0.97)`；正文宽度限制 65ch；价格用 tabular-nums；大写标签使用宽松字距 |

## 本地技能合集（深度重读）

| 技能 | 前 5 条可执行规则 | 头号禁用反模式 |
|-------|------------------------|------------------------|
| high-end-visual-design | Double-Bezel 嵌套架构，`py-24` 最小区块内边距，自定义 cubic-bezier（不用 `linear`/`ease-in-out`），滚动入场 `translate-y-16 blur-md opacity-0` 800ms+，GPU 安全（仅 transform/opacity） | 生硬的投影（`shadow-md`）、千篇一律的 1px 边框、吸附在顶部的 sticky 导航栏 |
| design-taste-frontend | 基于指标的设计基调 DESIGN_VARIANCE/MOTION_INTENSITY/VISUAL_DENSITY=8/6/4，展示文字 `text-4xl tracking-tighter` + 正文 `text-base leading-relaxed max-w-[65ch]`，仪表盘上的持续微交互，用 Framer Motion `layout`/`layoutId` 平滑重排，通过 `calc(var(--index) * 100ms)` 实现错落级联 | Inter 字体、紫/蓝 AI 渐变、霓虹外发光、居中 Hero（variance > 4） |
| minimalist-ui | 暖单色 + 超低饱和粉彩（`#FDEBEC` / `#E1F3FE`），正文用近黑 `#111` 或 `#2F3437` 绝不用 `#000`，卡片严格为 `border: 1px solid #EAEAEA` + 8–12px 圆角，滚动入场 `translateY(12px) + opacity:0 → 0 + 600ms`，按键徽章胶囊形大写宽字距 | 重阴影、渐变、3D glassmorphism、emoji、通用占位名 |
| gpt-taste | Python 驱动种子随机化，AIDA 结构（Nav → Hero → Bento → GSAP 滚动 → CTA），Hero ≤ 3 行 + `max-w-5xl/6xl` 容器，无间隙 bento `grid-auto-flow: dense`，GSAP ScrollTrigger 固定 + 堆叠 | 元标签（"SECTION 01"）、hero 上的浮动印章图标、hero 下的胶囊标签、hero 中的原始统计数字 |
| stitch-design-taste | 密度谱（1–10）+ 差异谱（1–10）写入 DESIGN.md，行内排版图像按字体高度排布，默认弹簧物理（stiffness 100 damping 20），激活组件持续循环动画 | 元素重叠、纯 `#000`、霓虹光晕、三列等宽网格、AI 文案 |
| image-taste-frontend | IMAGE-FIRST 工作流（先生成再编码）、深度图像分析（文字 + 比例 + 间距）、全新重新生成（不要裁切旧图）、Hero 1–3 行标题、媒体置于固定宽高比的受限容器 | 多小块拼贴、通用库存图片、含糊的纯感觉式分析、实现过程中的设计漂移 |
| industrial-brutalist-ui | 瑞士工业印刷 或 战术遥测/CRT（二选一），宏观字体 `clamp(4rem,10vw,15rem)` 超紧 `-0.03em` 至 `-0.06em`，微观字体等宽 10–14px 大写宽 `0.05em` 字距，颜色 `#F4F4F0` 背景 + `#050505` 前景 + `#E61919` 强调，网格 `gap: 1px` 做锐利分隔线 | 圆角（只用 90°）、渐变、柔和阴影、小写、衬线字体 |
| redesign-existing-projects | 审计链：字体 → 颜色 → Hover/Active → 布局/间距 → 替换通用组件 → 加载/空态/错误 → 打磨，最多 1 个强调色饱和度 < 80%，最大容器宽度 1200–1440px，CSS Grid 优于 flexbox 计算，每个组件都需要 hover/active/focus/loading/empty/error 状态 | 居中偏好、三张等宽卡片行、`h-screen`、纯 `#000`、暖灰与冷灰混用 |
| shadcn | 优先使用现有组件（组合而非重造），关键规则：表单用 FieldGroup + Field，data-icon 且图标不加尺寸，用 `gap-*` 而非 `space-y-*`，完整 Card 组合（Header/Title/Description/Content/Footer），通过 data-invalid + aria-invalid 校验 | 覆盖层手动 z-index、space-x/y-*（改用 gap）、硬编码颜色、浮动标签 |
| shadcn-baseui | 触发器用 `render` prop 而非 `asChild`，Accordion 用布尔 `multiple` 而非 `type`，包裹 Link/自定义元素时 `nativeButton={false}`，Select 用 `alignItemWithTrigger={false}` 取代 `position="popper"` | 在 Base UI 项目中使用 Radix `asChild` 模式 |
| web-perf | 核心 Web Vitals：LCP < 2.5s、INP < 200ms、CLS < 0.1，动画只用 transform/opacity 绝不用 top/left/width/height，颗粒/噪点只用于固定伪元素，`backdrop-blur` 只用于 fixed/sticky 绝不用于滚动元素 | 持续 GPU 重绘、`window.addEventListener('scroll')`、无 async/defer 的阻塞渲染 JS/CSS |

## 交叉对照：Vera 源码中已覆盖的内容

11+ 外部 + 13 个本地技能收敛为一套紧凑的规则。Vera 覆盖情况（审计于 2026-06-24）：

| 规则 | Vera 源码位置 | 状态 |
|------|----------------|--------|
| 仅 transform + opacity 动画 | 所有 keyframes（vera-list-row-enter、vera-tool-card-enter、vera-message-row-enter、vera-onboarding-child-enter、vera-hero-enter、vera-composer-stream-bounce、vera-composer-permission-pulse） | ✅ |
| 减少动效保护 | 约 12 处 `@media (prefers-reduced-motion: reduce)` 块 | ✅ |
| 自定义 cubic-bezier（`--ease-vera` = `cubic-bezier(0.16, 1, 0.3, 1)`） | 所有缓动引用 | ✅ |
| 触感 `:active scale(0.97-0.98)` | onboarding-card、skill-row、prompt-chip、plan-new-task-button、palette-item、composer-tool-button、composer-send-button、list-row、artifact-row、model-switcher-trigger | ✅（本轮已发布） |
| 任何地方都没有 172deg 渐变 | 4 个契约测试钉住该不变式 | ✅（本轮已发布） |
| ARIA 语义化 `<ul>`/`<li>` 而非 `<div role="list">` | 全局 walker 契约测试 | ✅ |
| 正文 `text-wrap: pretty`，标题 `balance` | `.vera-bubble-assistant p`（pretty）、h1-h4（balance） | ✅（本轮已发布） |
| 正文最大宽度 65-75ch | `.vera-bubble-assistant { max-width: 72ch }` + pre/table/code 的出口阀 | ✅（本轮已发布） |
| h1/h2 负字距 | h1/h2 上 `letter-spacing: -0.012em` | ✅（本轮已发布）— 对中英文混排采取保守值 |
| 数字文本用 `tabular-nums` | `.vera-bubble-assistant code`、`.vera-artifact-row-meta`、`.vera-list-row-meta`、`.vera-tool-duration` | ✅（本轮已发布） |
| 嵌套式外框头像 | `.vera-message-avatar` 24×24 全圆 + 3 层 box-shadow | ✅（本轮已发布） |
| Hero 错落入场 | `.vera-onboarding > *:nth-child(n)` 以 0/60/120/180/220ms 级联 | ✅（本轮已发布） |
| 待定状态上的持续微交互 | `.vera-composer-permission-dot` 1.4s pulse + `.vera-composer-streaming-dot` 1.05s bounce | ✅（本轮已发布） |
| `<details>` 箭头旋转 + 内容淡入 | `.vera-turn-thinking` summary::before 箭头 + 内容 @starting-style opacity 渐变 | ✅（本轮已发布） |
| 禁止生硬 `rgba(0,0,0,0.5)` 阴影 | 审计未发现 — 所有阴影使用 oklch alpha | ✅ |
| 禁止 `transition: all` | 审计未发现 | ✅ |
| 禁止过渡 width/height/top/left | 仅 1 处（turn-footer 次操作 max-width hover 展开）— 可接受 | ✅ |
| 单一强调色饱和度 < 80% | 各调色板的 `--accent` oklch tokens | ✅ |
| Focus-visible 焦点环 | 审计了 65 条 `focus-visible` 规则 | ✅ |
| macOS 原生光标惯例（仅链接用 `pointer`） | 契约测试钉住 | ✅ |
| 代码块：语言胶囊 + 复制按钮 + 10px 圆角 | `.vera-code-block` 符合 | ✅ |
| 所有 `target="_blank"` 加 `noopener` | 全局 walker 契约测试 | ✅ |

## 剩余差异（延期或超出范围）

- **Lucide → Phosphor 图标替换**：技能禁用此项，但会触及全应用约 80+ 处图标用法。风险高，对高级用户的可见价值低。延后，直到有人要求专门的 PR。
- **重磅展示字体（`clamp(4rem, 10vw, 15rem)`）**：工业粗野主义风格，与 Vera 沉稳的桌面美学不符。跳过。
- **按字体高度排布的行内排版图像**：stitch 模式，不适用于聊天工具。
- **带法律链接的页脚**：Vera 是桌面应用，没有公开页脚。跳过。
- **GSAP 滚动触发范式**：Vera 没有营销滚动页面。跳过。
- **Skeleton 300ms 后延迟渲染**：需要 JS 状态模式而非纯 CSS。已评估规模，延后处理。
- **transitions.dev 的 18 个具名 transition 目录**：需要采用新的命名空间约定。延后。

## 技能轮任务 #116 — 本轮发布清单

10 个应用技能的 PR 已发布（均已合并到 shared/origin main）：

1. `e20662d1` — PR-CHAT-MESSAGE-AVATAR-BEZEL-0（high-end-visual-design §2 嵌套外壳）
2. `120f72f3` — PR-REASONING-PANEL-SMOOTH-EXPAND-0（design-taste-frontend §5 弹簧）
3. `e22035da` — PR-SKILL-SEARCH-DOUBLE-BOX-0（feedback_use_component_library）
4. `f946f86b` — PR-REFERENCE-SETTINGS-GRADIENT-CORRECTION-0（注释修正，防止回归循环）
5. `6a58e303` — PR-MESSAGE-BODY-READING-RHYTHM-0（pbakaus impeccable + agents-with-taste）
6. `fb26e391` — PR-ONBOARDING-HERO-STAGGER-0（Emil agents-with-taste）
7. `d761e1a8` — PR-ARTIFACT-ROW-TACTILE-0（Emil `:active scale`）
8. `5d9585f9` — PR-SESSION-ROW-TACTILE-0
9. `033d6a9a` — PR-COMPOSER-PERMISSION-PULSE-0（design-taste-frontend §8.3 持续循环）
10. `05b4d084` — PR-MODEL-SWITCHER-TACTILE-0
11. `b7a0cd2a` — PR-MESSAGE-BODY-MAX-WIDTH-0（impeccable 65-75ch）

全程测试 1482/1482 通过。当前 shared/origin main：`b7a0cd2a`。

## 何时重新阅读本笔记

在将来任何"打磨 UI"/"使用技能"的轮次之前。提出新想法前，先对照上文的"已覆盖"表格交叉核对 — 大多数通用的打磨想法已经发布，因此下一轮需要找到真正新的结构性差异，而不是重做已完成的事。
