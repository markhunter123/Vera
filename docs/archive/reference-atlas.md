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

# 参考布局 —— UI 图集

> 归档于 2026-07-13。本逆向工程快照仅为溯源记录，并非当前产品设计权威依据。

对 Vera 视觉北极星——外部参考布局——进行的系统性逆向工程分析。基于从
`/tmp/qoder-extracted/out/renderer/` 提取的打包产物构建。

本文档是第二阶段（Phase 2）重新应用的事实依据。每个章节都有从
`assets/globals-UfMzAdiO.css`（265KB 压缩版，美化后为 `/tmp/reference-globals.css`，共 8032 行）和
`index.html` 提取的直接证据支撑。凡条目注明"来自 JS chunk"，即指从 `index-C02cm0ok.js` 中
提取的字符串字面量。

**沿用参考布局的机制——绝不照搬产品名称。** 命名规范规则（记忆 `project_reference_layout_lane`）
要求 Vera 代码库中的每个产物使用中性术语（"reference layout"、"upstream design"）。
本图集中出现产品名称，仅仅是因为需要用它来标识我们分析的对象；它绝不能泄漏到提交信息、
JSDoc 或发布的 CSS 注释中。

---

## 1. 主题系统

`<html data-theme="...">` 承载 8 个主题：

| 主题                | 加载背景色  | 加载前景色  | 备注                                   |
|--------------------|-------------|-------------|-----------------------------------------|
| `light`            | `#ffffff`   | `#09090b`   | Windows/Linux 默认                      |
| `dark`             | `#09090b`   | `#fafafa`   |                                         |
| `light-glass`      | transparent | `#09090b`   | macOS 默认；使用 Electron vibrancy      |
| `dark-glass`       | `#171716`   | `#eeeeeb`   |                                         |
| `classic-light`    | `#fafaf9`   | `#171716`   | 更暖的中性色                            |
| `classic-dark`     | `#09090b`   | `#fafafa`   |                                         |
| `light-parchment`  | `#FAF9F6`   | `#202116`   | 暖米色画布                              |
| `dark-parchment`   | `#1E1C18`   | `#FAF9F6`   |                                         |

初始 body 回退字体（React 挂载前）：`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`。

macOS 默认主题为 `light-glass`（透明 + 原生 vibrancy）。Vera 目前**未**使用 Electron
vibrancy——添加它是一个独立的平台相关问题。

### Glass 主题的影响

`light-glass`/`dark-glass` 使窗口内容在系统材质上渲染（半透明面板，桌面内容透出）。
整个页面 chrome 都是按 vibrancy 基底校准的。如果以后采用 `light-glass`，下面所有颜色也需要
补一遍 alpha 通道。

---

## 2. 字体系统

light-parchment 主题下的 CSS 自定义属性：

| 令牌              | 值                                                                    |
|--------------------|------------------------------------------------------------------------|
| `--font-ui`        | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC'` |
| `--font-sans`      | `ui-sans-serif, system-ui, sans-serif, …emoji fallbacks`                |
| `--font-mono`      | `ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, …`（浅色）/ `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, …`（深色） |
| `--font-body`      | sans 模式下为 `var(--font-ui)`；serif 模式下为 `'Libre Baskerville', Georgia, 'Songti SC', …` |

另外还有一个下载的变量字体：`InstrumentSans-VariableFont_wdth_wght-BjF37L9x.ttf`——
在我检查的代码片段中没有通过 `@font-face` 声明；如果某个具体界面明确使用了
Instrument Sans，需要进一步调查。

### 字重刻度
- `--font-weight-normal: 400`
- `--font-weight-medium: 500`
- `--font-weight-semibold: 600`
- `--font-weight-bold: 700`

### 字阶（Tailwind v4 默认值）
| 令牌         | 值          | 像素等效   | 行高                           |
|---------------|------------|------------|---------------------------------|
| `--text-xs`   | `.75rem`   | 12px       | `calc(1 / .75)` = 16px          |
| `--text-sm`   | `.875rem`  | 14px       | `calc(1.25 / .875)` = 20px      |
| `--text-base` | `1rem`     | 16px       | `1.5`                           |
| `--text-lg`   | `1.125rem` | 18px       | `calc(1.75 / 1.125)` = 28px     |
| `--text-xl`   | `1.25rem`  | 20px       | `calc(1.75 / 1.25)` = 28px      |
| `--text-2xl`  | `1.5rem`   | 24px       | `calc(2 / 1.5)` = 32px          |
| `--text-3xl`  | `1.875rem` | 30px       | `1.2`                           |

### 运行时字号控制器——`data-font-size`

通过 `localStorage.getItem('qoder-work-ui:fontStyle')` / `'…:fontSize'` 设置在 `<html>` 上。共三档：

| 模式                                                | 聊天输入框  | 正文      | 正文中的代码 |
|---------------------------------------------------|-------------|-----------|--------------|
| `[data-font-size=small]`                          | 13 / 24     | 13        | 12           |
| `[data-font-size=medium]`（默认；`:not([…])`）       | 14 / 24     |（默认）    | 13           |
| `[data-font-size=large]`                          | 16 / 28     | 16        |（更大）       |

默认 font-style（字体风格）为 `sans`。`[data-font-style=serif]` 将正文切换到 `Libre
Baskerville`（CJK 用宋体 Songti SC）。

Vera 目前既没有 `data-font-size` 也没有 `data-font-style` 运行时控制——这是一个尚未实现的
功能，而非样式疏漏。

---

## 3. 颜色令牌（以 light-parchment 为规范参考）

参考布局采用 Ant Design 风格的语义命名，包含 `--color-bg-*`、`--color-fill-*`、
`--color-text-*`、`--color-border-*`、`--color-link-*` 系列。下面是 light-parchment 系列——
即 vera 的"参考布局车道"（reference-layout lane）所瞄准的暖画布主题。

### 背景
- `--color-bg-base: #faf9f6` —— 画布 / 页面背景（暖米色）
- `--color-bg-container: #faf9f6` —— 主卡片背景
- `--color-bg-elevated: #f7f4ef` —— 略深的浮起表面
- `--color-bg-highlight: #c9c4b8` —— 选中行填充色
- `--color-bg-highlight-hover: #d4c9bc` —— hover 填充色（暖灰褐色）
- `--color-bg-layout: #fdfcfa` —— 外层外壳（侧边栏 / chrome 底板；最浅）

### 填充色阶（用于 chips、子面板的微妙色调）
- 三级填充：`var(--color-fill-tertiary)` —— 最微妙（约 4-5% 黑色）

### 边框
- `--color-border` —— 主边框
- `--color-border-secondary` —— 略浅
- `--color-border-tertiary` —— 最浅（用于 workbench 卡片边框）

### 浅色（默认）系列简录
- `--color-bg-base: #fff`
- `--color-bg-container: #fff`
- `--color-bg-elevated: #f9f9f9`
- `--color-bg-highlight-hover: #e0e0e0`（或 `#eeeeeb`）

### 深色系列简录
- `--color-bg-base: #171716`
- `--color-bg-container: #171716`
- `--color-bg-elevated: #22221f`

Vera 的令牌（`vera-tokens.css`）使用 `oklch()`——语义上等价。差距在于下面的
**chrome 变量**（`--agents-*`）——这些在 vera 中不存在。

---

## 4. 页面架构令牌（关键发现）

### 内容区令牌
- `--agents-content-area-radius: 6px` —— 卡片、面板、内容区外环的通用圆角半径。
  **六像素，不是 10-12。**
- `--agents-content-area-gap: 4px` —— 同级卡片 / 面板之间的间距。
  **四像素。** 卡片彼此靠得很近，几乎相触。
- `--agents-content-area-bg` —— 默认/深色主题下为 `var(--color-bg-container)`，
  浅色主题下为 `#fff`，glass 主题下为 `transparent`
- `--agents-layout-bg` —— 外壳使用 `var(--color-bg-layout)`；glass 主题下：
  `#0006`（深色）/ `#ffffff80`（浅色）；parchment 主题下：从 `--color-fill-tertiary`
  到 `--color-bg-container` 的 172° 线性渐变

### 页面布局 DOM（根据 CSS 选择器推断）

```
[data-agents-page]                              ← root, theme-scoped
  └── .agents-layout-root
       └── .agents-layout-body
            ├── (left sidebar, sometimes glass material)
            └── .agents-content-area            ← right column / main pane
                 └── [data-agents-view=cron|skills|chat|im_hub|new_chat]
                      └── .agents-inner-view-clamp   ← THE page card itself
                           ├── (page header / hero)
                           └── content (workbench-split-root, dual-card-row, etc.)
```

### 标志性卡片 chrome

当 **`light-parchment` / `dark-parchment` 主题** + 视图为 `skills` / `cron` /
`im_hub`（三个"宽"视图，区别于居中对话列的 chat）时，`.agents-inner-view-clamp`
呈现为浮起的页面卡片：

```css
border: 1px solid var(--color-border-tertiary);   /* often 50-60% via color-mix */
border-radius: var(--agents-content-area-radius); /* 6px */
min-width: 350px;
```

### 页面卡片内部的布局原语

- `.workbench-split-root` / `.workbench-split-view` —— 分栏容器
  （使用可调整大小的面板；`gap: var(--agents-content-area-gap)` = 4px）
- `.agents-dual-card-row` —— 备用的双卡片行
- `.workbench-card` —— 分栏内的内容卡片
- `.aux-panel` —— 同级卡片 / 子面板
- `.task-monitor-right-panel` —— 特殊的右侧监视器变体（无边框 / 无阴影 /
  使用 `--color-fill-tertiary` 背景以退居后方）

### 通用卡片配方

```css
border: 1px solid var(--color-border-tertiary);
border-radius: var(--agents-content-area-radius);  /* 6px */
background: var(--color-bg-base);
box-shadow: 0 1px 2px #0c0c0d0a;                   /* black @ ~4% */
```

这就是 `.workbench-card`、`.aux-panel` 和 `.agents-chat-panel` 的配方。它是打包产物中
**复用次数最多的外观**，也是与 vera 之间的差距所在——vera 的卡片圆角为 8-10px、
前景阴影 0.04，并使用 `var(--border)`（更接近 `--color-border-secondary`）。视觉上，
vera 的卡片比参考布局紧凑的 6px / 发丝线三级边框卡片显得"更大 / 更柔和 / 更孤立"。

### `--agents-layout-bg`（侧边栏 / chrome）——纯色，而非渐变（2026-06-24 更正）

```css
background: var(--color-bg-container);
```

**本节最初声称存在 172° 线性渐变。** 已于 2026-06-24 更正（WAWQAQ 消息
`5d3b10e5` + `1e693dee`）：参考产品在此处实际渲染的是纯色 `--color-bg-container`。
我从打包 CSS 中提取的渐变*确实*存在，但只是源码中的遗留物——生产应用并不渲染它。
遵循过时的提取 CSS 导致渐变被重新引入 vera 的 `.vera-shell-2col` 和
`--agents-layout-bg` 令牌，WAWQAQ 指出这是错误的：

> 谁让你他妈的用渐变的啊？参考实现就没有啊

PR-CHAT-CHROME-FIX-0（`ed292897`）将两个 vera 令牌都回退为纯色
`var(--background)` / `var(--color-bg-container)`。**未来的 agent：
不要依据逆向工程（RE）证据重新添加此渐变；用户可观察到的真实情况是纯色。**

---

## 5. 阴影词汇表（精选；5 种模式）

打包产物中有数百条 `box-shadow:` 声明，但可归结为以下 5 种模式：

| 模式                                                | 用途                                |
|----------------------------------------------------|-------------------------------------|
| `box-shadow: 0 1px 2px #0c0c0d0a`                  | **通用卡片浮起**（默认卡片上唯一的阴影） |
| `box-shadow: 0 6px 20px -12px #0c0c0d33`           | 中等浮起（popover、吸顶面板）          |
| `box-shadow: 0 8px 24px -16px #0000006b`           | 深浮起（深色模式等效）                 |
| `box-shadow: 0 4px 12px #00000026`                 | 固定式告警条                          |
| 3 层三重光晕（10px 侧翼变体）                        | Composer 主光晕（多色调）             |

备注：
- `#0c0c0d0a` = `rgba(12, 12, 13, 0.04)` —— 约 4% 黑色。
- 所有非光晕阴影都使用带 alpha 后缀的纯十六进制（而非 `rgba(…)`），
  以保持声明简短。

Vera 大多使用 `oklch(from var(--foreground) l c h / 0.04)` 风格的 alpha 阴影——
语义上是同样的浮起效果，只是用 oklch 表达。数值上的差距：vera 的浮起卡片在
第二层阴影中使用 0.10（依据 `da1a40f1` 移除）。参考布局只会用 `0 1px 2px` 4%
这一层，让 1px 边框来承担视觉分隔。

---

## 6. Keyframes（全部 13 个）

| Keyframe                          | 规格（取自先前样本）                                                       |
|-----------------------------------|---------------------------------------------------------------------------|
| `agents-fade-in`                  | 200ms ease-out 不透明度 0→1                                                |
| `agents-slide-up`                 | 200ms translateY 8px → 0，伴随不透明度 0→1                                  |
| `streaming-fade-in`               | `.18s ease-out` 不透明度 0→1（流式 Markdown 的逐 token 淡入）               |
| `workbench-card-scale-in`         | `.35s cubic-bezier(.16,1,.3,1) .15s both` 缩放 .97→1，不透明度 0→1          |
| `chat-input-glow-pulse`           | `4.8s ease-in-out infinite`（composer 环境呼吸——已移植）                    |
| `indeterminate-slide`             | `1.4s ease-in-out infinite` `left -40% → 100%`（不确定进度条）              |
| `pointer-poke`                    | `4s linear infinite`，微抖动以吸引光标注意                                   |
| `pulse`                           | `2s cubic-bezier(.4,0,.6,1) infinite`（Tailwind 内置）                      |
| `spin`                            | `1s linear infinite`（Tailwind 内置）                                       |
| `chroma-slide`                    | 平铺 chrome 上的色彩偏移（尚未采样）                                         |
| `connectors-lightning-pulse`      | Connector 横幅强调效果                                                      |
| `industry-guide-marquee`          | 行业指南页面的水平跑马灯                                                     |
| `agents-chat-design-launch-narrow`| 聊天 hero 启动（可能是空聊天上滑序列）                                       |

**已移植进 vera：**
- `agents-fade-in` → 保留为环境工具类
- `agents-slide-up` → `vera-message-row-enter`（第 24/30 轮）和 `vera-hero-enter`（第 29/30 轮）
- `workbench-card-scale-in` → `vera-tool-card-enter`（第 23/30 轮）
- `chat-input-glow-pulse` → `vera-composer-glow-pulse`

**尚未移植（不错的 Phase 2 候选）：**
- `streaming-fade-in` —— 将在流式 Markdown 中实现真正的逐 token 淡入
- `indeterminate-slide` —— 用于重试 / 等待状态的加载条
- `chroma-slide` / `connectors-lightning-pulse` —— 非核心，跳过
- `industry-guide-marquee` —— 不适用（Vera 无对应物）

---

## 7. 页面级组件名称（来自 JS chunks）

从 `index-C02cm0ok.js` 中逐字 grep 出的字符串。这些是 React 组件或 className
令牌——可用于为 Vera 的对应组件命名。

| 参考字符串                            | 可能的界面                                  |
|---------------------------------------------|------------------------------------------------|
| `agents-settings`                           | 设置页根节点                                  |
| `agents-settings-page-heading`              | 设置页 H1                                     |
| `agents-settings-page-title-narrow`         | 设置页 H1（窄视口变体）                       |
| `agents-settings-page-description`          | 设置页引言段                                  |
| `workbench-aux-stack-from-panel-layout`     | Aux 面板栈适配器                              |
| `workbench-root-from-panel-layout`          | 主 workbench 包装器                           |
| `workbench-tab`                             | 标签控件变体                                  |
| `cron-tasks`                                | Cron 页任务列表                               |
| `skills-navigation`                         | Skills 页导航                                 |
| `agents-rename-subchat`                     | 内联重命名浮层                                |

设置页有专用的标题/描述块（依据下面的 H1 + 引言段层级）。Cron 页有一个
`cron-tasks` 内容区用于实际的计划列表。

---

## 8. 数据属性选择器（状态词汇表）

参考布局大量使用 `[data-*]` 表达状态。与 Vera 相关的子集：

- `[data-agents-page]` —— 根作用域守卫（主题感知块）
- `[data-agents-view=cron]` / `[data-agents-view=skills]` / `[data-agents-view=chat]` / `[data-agents-view=new_chat]` / `[data-agents-view=im_hub]` —— 当前路由
- `[data-active=true]` —— 列表选中
- `[data-disabled=true]` / `[data-disabled]` —— 交互禁用
- `[data-focused=true]` —— focus-within（用于 composer）
- `[data-font-size=small|medium|large]` / `[data-font-style=sans|serif]` —— 运行时排版
- `[data-glass-effects=off]` —— 禁用 vibrancy / 背景模糊
- `[data-composer-message]` —— composer 富文本外壳
- `[data-user-bubble]` —— 用户消息气泡（聊天中）
- `[data-chat-launch-transition=design]` —— 初始聊天启动动画标志
- `[data-skills-banner]` / `[data-skill-filter-menu]` —— Skills 页 chrome
- `[data-canvas-dialog]` / `[data-close-button]` —— 模态框 chrome
- `[data-gradual-blur-layer]` —— 模糊遮罩
- `[data-banner-logo]` —— 设置横幅 logo

Vera 大多在列表行上使用 `[data-active="true"]`。目前没有 `[data-agents-view]`
路由属性——模块切换使用局部 React 状态，而非文档化的 DOM 契约。采用
`[data-agents-view]` 会使 CSS 定位更容易。

---

## 9. 具体差距分析：Vera vs 参考布局

| 界面                  | 参考配方                                                   | Vera 现状                                                  | Phase 2 需消除的差距                                    |
|----------------------|------------------------------------------------------------|-------------------------------------------------------------|----------------------------------------------------------|
| 页面卡片外框          | 1px `--color-border-tertiary` + 6px 圆角 + `0 1px 2px #0c0c0d0a` | 纯色（da1a40f1 之后无边框 / 无阴影）                          | 恢复浮起效果，但采用紧凑的 6px 圆角（原为 10）            |
| 卡片间距              | 4px（`--agents-content-area-gap`）                          | 10-14px 间距                                                | 收紧到 4-6px                                             |
| 卡片阴影              | 仅 `0 1px 2px` 4%——无第二层柔和阴影                        | 曾经是 2 层（0 1px 2px + 0 8px 24px -16px 10%）              | 单一 4% 浮起；让边框承担分隔                             |
| 侧边栏 / chrome 背景  | 纯色 `--color-bg-container`（2026-06-24 更正）               | 纯色 `--background`（一致）                                  | **无——切勿添加渐变（见 §4.5 更正）**                     |
| Cron 页标题           | （需要提取——JS chunk 中有 `cron-tasks` 块）                 | h2 24px / 650                                                | 可能更大 / 展示级字重                                     |
| 设置页                | `agents-settings-page-heading` + 引言段 + `narrow` 变体     | 模态弹窗（仍然是！）                                         | 重构为 module-main 窗格中的内联页面                       |
| 列表选中填充          | `var(--color-bg-highlight)` = `#c9c4b8`（暖灰褐色）         | `oklch(from --foreground l c h / 0.07)`（中性灰）            | 可选：parchment 主题下使用暖灰褐色                       |
| Glass 主题            | Vibrancy + `data-glass-effects` 开关                        | 未实现                                                       | 超出 UI 范围（Electron 平台工作）                         |
| `data-font-size` 控制 | 运行时小 / 中 / 大                                          | 未实现                                                       | 未来的设置界面                                           |
| 流式令牌              | `streaming-fade-in` 逐 token                                | 仅气泡级淡入                                                 | 需要 ChatMarkdown 渲染器包装                             |

---

## 10. Phase 2 计划（图集驱动）

目标：重写 Vera 的**计划/提醒**页面和**设置**界面，使其匹配参考布局的标志性卡片
chrome + 标题层级 + 紧凑的 4-6px 几何布局。

### 10.1 计划/提醒页面（ScheduledTaskPanel）
- 将内容包装在符合通用配方的 `.vera-page-card` 中（1px
  border-tertiary + 6px 圆角 + 4% 浮起），内部各区块之间使用等效的
  `--agents-content-area-gap`，即 4-6px。
- 标题：将 `.vera-scheduled-task-heading h2` 从 24/650 改为 30px / 字重 600
  （参考布局的页面标题使用 `--text-3xl`）。
- 内部区块渲染为 workbench-card 风格的子卡片：1px 边框、6px 圆角、柔和浮起。
  卡片间间距 = 4-6px。
- 任务列表 = aux-panel 模式：每行 1px 分隔线（在 `:not(:last-child)` 上使用
  `border-bottom`），行本身无边框或圆角（驾驶舱模式密度，符合 taste skills）。

### 10.2 设置（目前是模态框！）
- 从 Base UI Dialog 浮层转换为内联的 `.vera-module-main` 视图。
- 头部：`.vera-page-heading`（30px 展示级）+ 引言段 + 面向更窄侧边栏宽度的窄版变体
  （`-title-narrow`）。
- 导航：保留左侧栏（当前模态框导航），但作为页面卡片内两栏
  workbench-split-root 的一部分。
- 内容面板：右侧 workbench-card；子区块用 `border-bottom` 线分隔，而非嵌套卡片。

### 10.3 共享原语（先仅 CSS）
- 通过自定义属性添加 `.vera-card-base` 混合宏：一条规则即可定义
  配方（1px border-tertiary、6px 圆角、4% 浮起）。组合进
  `.vera-skill-library`、`.vera-scheduled-task-shell` 及未来的设置页。
- 添加 `.vera-page-heading` 排版类（30px / 1.2 行高 / 字重 600）。
- 可选：在包装器上添加 `[data-vera-view=plan|skills|settings|...]`，以匹配
  参考布局的 `[data-agents-view]` 模式。

### 10.4 不在 Phase 2 范围内（文件后续跟进）
- Glass 主题 + Electron vibrancy
- `data-font-size` / `data-font-style` 运行时控制
- 逐 token 流式淡入（需要 Markdown 渲染器改造）
- 暖灰褐色 `--color-bg-highlight`（仅 parchment）

---

## 11. 来源索引（证据所在位置）

- `/tmp/qoder-extracted/out/renderer/index.html` —— DOM 引导、主题引导、字体预加载
- `/tmp/reference-globals.css` —— 美化后的 CSS（多行）
- `/tmp/qoder-extracted/out/renderer/assets/globals-UfMzAdiO.css` —— 原始压缩 CSS
- `/tmp/qoder-extracted/out/renderer/assets/index-C02cm0ok.js` —— 主 JS 打包产物（组件名称在此）
- `/tmp/qoder-extracted/out/renderer/assets/chat-view-inner-Dgjr-1Tu.js` —— 聊天视图 chunk
- `/tmp/qoder-extracted/out/renderer/assets/chat-markdown-renderer-C-R6Fd8_.js` —— Markdown chunk

本次分析使用的 grep 模式（可重新运行）：
```sh
# CSS custom props
grep -E '^[[:space:]]*--[a-z][a-z0-9-]+:' /tmp/reference-globals.css | sort -u
# All keyframes
grep -oE '^[[:space:]]*@keyframes [a-zA-Z][a-zA-Z0-9-]+' /tmp/reference-globals.css | sort -u
# All shadow patterns
grep -oE 'box-shadow:[^;}]+' /tmp/reference-globals.css | sort -u
# Page-level class strings from JS
grep -oE '"(agents|workbench|aux|cron|skills|settings)-[a-z-]+"' /tmp/qoder-extracted/out/renderer/assets/index-C02cm0ok.js | sort -u
```

---

## 12. 深度逆向工程附录（Phase 1 后续）

第二轮分析（聚焦 JS chunk 组件命名、次要入口 HTML 以及 data-* 状态词汇表）的补充发现。
建立在 §1–§11 之上。

### 12.1 次要入口 HTML

打包产物除 `index.html` 外还提供了 4 个次要 HTML 入口：

| 文件                       | 行数   | 角色                                              |
|----------------------------|-------|---------------------------------------------------|
| `quickpick.html`           | 58    | 悬浮 spotlight 风格命令栏（透明 body、感知 vibrancy、自带渲染器打包产物 `quickpick-CilslRnn.js`） |
| `voice-overlay.html`       | 39    | 语音转写浮层（Whisper 风格）                       |
| `artifact-preview.html`    | 34    | 沙箱化 artifact 预览界面                           |
| `mcp-app-preview.html`     | 33    | 沙箱化 MCP 应用预览界面                            |

Quickpick 值得特别关注：`html, body, #root` 都获得 `background: transparent !important`
和系统字体回退。窗口 chrome（圆角、阴影）由 **Electron 窗口**本身拥有，而非 CSS——
他们不加任何内边距，依赖 `setVibrancy(theme)` 进行材质渲染。这是一个强烈信号：
参考布局的"高级悬浮 chrome"一半是 CSS，一半是原生窗口级处理。Vera 没有
quickpick 的对应物。

### 12.2 data-* 状态词汇表（超出 §8 的范围）

对 JS 打包产物的第二轮扫查揭示了参考布局用于布局状态的**结构性** data 属性。
这些是组件树以命令式方式设置的 CSS 钩子，而非用户状态：

- `[data-resizable-sidebar]` —— 侧边栏可调整大小（存在拖拽手柄）
- `[data-sidebar-collapse-button]` —— 折叠切换按钮
- `[data-sidebar-collapsed]` —— 当前折叠状态
- `[data-sidebar-content]` —— 侧边栏内容插槽
- `[data-workbench-root]` —— workbench 树根节点
- `[data-workbench-stack]` —— workbench 内部的垂直卡片栈
- `[data-workbench-card]` —— 单个 workbench 卡片
- `[data-workbench-fixed-panel-child]` —— 不可调整大小的子面板
- `[data-panel-name]` —— 具名面板（供 react-panel 可调整大小库使用）
- `[data-settings-nav-column]` —— 设置左侧导航列
- `[data-canvas-dialog]` —— canvas 风格对话框（可能用于全出血预览）
- `[data-banner-logo]` —— 品牌横幅 logo 插槽

模式：结构性状态放在 `data-*` 上，主题放在 `[data-theme=…]` 上，路由放在
`[data-agents-view=…]` 上。CSS 大量针对 data 属性进行选择，组件不携带展示类——
它们佩戴语义类（如 `settings-nav-column`），同时设置父级的 `data-*` 供 CSS
定位层识别。

Vera 大多使用常规 className 前缀（`.vera-*`）。采用 `data-*` 状态可以让我们
编写更紧凑的 CSS，而无需通过每个组件层层传递（prop drilling）className。

### 12.3 遥测命名作为结构代理

JS 打包产物中还包含遥测事件名（下划线分隔：`cron_run_log_view_conversation`）。
这些名称揭示了参考团队思考时的**界面粒度**。几个值得了解的模式：

- **Cron 页界面：** `cron_page_view` / `cron_task_create` /
  `cron_task_update` / `cron_toggle_enabled` / `cron_run_now` /
  `cron_run_log_detail_view` / `cron_run_log_rerun` /
  `cron_run_logs_filter` / `cron_run_logs_tab_view` /
  `cron_sort_change` —— 存在多个顶层界面：
  任务列表、运行日志、日志详情，以及过滤/排序。
- **设置页界面：** `settings_tab_view` / `settings_tab` /
  `settings_general_section` / `settings_preferences` /
  `settings_profile_tab_view` / `settings_app_update_check_click` /
  `settings_legokit_tab` / `settings_general_hidden_entry_unlock` ——
  设置页使用*标签页*（而非 Vera 的单一侧栏），顶层为
  Profile / General / Preferences / LegoKit（他们称呼 skills/扩展的术语）。
  隐藏入口解锁是一个点击 5 次的彩蛋。
- **侧边栏：** `sidebar_chat_group_set` / `sidebar_chat_group_delete` /
  `sidebar_chat_group_dissolve` / `sidebar_chat_group_toggle` /
  `sidebar_workspace_group` / `sidebar_im_session` /
  `sidebar_cron_group` —— 侧边栏支持嵌套分组（workspace、
  聊天、IM 频道、cron）。Vera 的侧边栏是扁平的。

Vera 的侧边栏没有任何分组嵌套。参考布局保留了完整的 IM 中心（IM-hub）
和 workspace 分组结构，Vera 需要新增 IPC + 数据模型才能支持——超出纯 UI
范围，但值得注意：**参考布局的侧边栏在结构上要复杂得多**。

### 12.4 流式 + 不确定 keyframes 规格（可立即移植）

我在 §6 中标注为值得移植的两个 keyframes，其确切规格已验证如下：

```css
@keyframes streaming-fade-in {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
.streaming-token-fade-in {
  animation: 0.18s ease-out forwards streaming-fade-in;
}
```
Markdown 流的逐 token 淡入——将每个流式 token 包装在带 `.streaming-token-fade-in`
的 span 中。这需要在 Vera 的 chat-markdown-renderer 中进行 Markdown 渲染器改造，
将每个增量包装进 span；为避免渲染器风险，暂缓进行。先添加 keyframe + 工具类，
以便日后无需再次图集分析即可完成包装。

```css
@keyframes indeterminate-slide {
  0%   { left: -40%; }
  100% { left: 100%; }
}
.animate-indeterminate {
  animation: 1.4s ease-in-out infinite indeterminate-slide;
}
```
不确定进度条——需要一个 `overflow: hidden` 的容器，以及一个应用该动画的子元素
（`width: 40%; position: absolute; top: 0; bottom: 0;`）。适用于：重试加载的等待
状态、模态框页脚中的进行中操作、计划任务"立即运行"进行中。

### 12.5 标题 + 引言段排版（设置页）

JS 打包产物中浮现出三个设置页专用的排版类：

- `.agents-settings-page-heading` —— 页面 H1（未采样到确切字号；按照
  字阶和惯例，应为 `--text-3xl` = 30px / 600，字距紧凑）
- `.agents-settings-page-title-narrow` —— 窄视口变体
  （当侧边栏处于全宽时可能为 `--text-2xl` = 24px）
- `.agents-settings-page-description` —— H1 下方的引言段
  （可能为 `--text-sm` = 14px，使用 `--color-text-secondary`）

Phase 2B 之后，Vera 的 `.settingsHeader h1` 目前为 30/600——已经匹配。
`-narrow` 响应式变体在 Vera 中不存在；可以通过 `@media (max-width: 1100px)`
添加（图集风格）。

### 12.6 更新后的 Phase 2 计划（深度逆向工程后修订）

Phase 2C（下一个大型 PR）：将深度发现落实到代码中。

**目前已完成：**
- 图集 §1–§11（Phase 1 提交 `fe74d870`）
- 计划 + Skills 页面卡片 + 展示级标题 + 令牌系统（Phase 2A `81b180d2`）
- 设置页 chrome 卡片配方 + 展示级标题（Phase 2B `753ae8e0`）

**Phase 2C 范围：**
- a) 移植 `streaming-fade-in` + `indeterminate-slide` keyframes + 工具类
     （图集 §12.4）——仅 CSS，不接线 JSX；未来的 PR 可在流式 token /
     加载条上使用它们。
- b) 将页面卡片配方应用于聊天 composer 卡片的外层 chrome
     （`.composer .vera-composer-inner` → 6px 圆角 + 发丝线边框 +
     1px 内高光 + 4% 浮起）。
- c) 将页面卡片配方应用于计划/提醒子区块（告警 hero、
     标签面板、模板条），使每个区块都作为 workbench-card 风格的
     aux-panel，同级之间保持 4-6px 间距（图集 `--card-gap: 4px`）。
- d) 设置页：按 §12.5 添加 `-narrow` 响应式变体。
- e) 设置页：将页面卡片配方应用于内部子卡片
     （偏好设置区块、个人资料卡片），使它们呈现为 aux-panel
     而非平面分隔线。

**不在 Phase 2C 范围内（推迟）：**
- f) 真正的设置模态框 → 内联页面重构（main.tsx 渲染树
     变更，需要焦点陷阱 / a11y 重做，值得一个专门的 PR）。
- g) `data-*` 状态词汇表重构（图集 §12.2）——侵入性太强，
     涉及每个组件文件。
- h) 侧边栏分组嵌套（workspace / IM 频道）——需要新的 IPC
     + 数据模型，超出纯 UI 范围。
- i) 将流式 Markdown token 包装在 `.streaming-token-fade-in` 中（需要
     渲染器改造；CSS 在 2C 中就位，未来接线只需一行）。

---

## 13. 深度逆向工程第 3 轮——侧边栏、Composer、横幅、调整大小手柄

继 WAWQAQ 消息 f31b4611（"还是多研究 参考布局 的代码 和前端
设计，一定要深入挖掘他们的设计和代码"）之后的后续工作。逆向工程项目已进行三天，
大多数表面层模式已被捕获（图集 §1–§12）。本轮聚焦我们尚未解码的结构性状态机
和较小的专用 chrome。

### 13.1 侧边栏——双模式 chrome 系统

参考布局的侧边栏有两种不同的视觉模式，渲染器在运行时切换：

- **标准 / glass-vibrancy 模式（glass 主题下的默认模式）：**
  侧边栏紧贴操作系统 vibrancy 材质边缘到边缘渲染。
  `[data-agents-page] [data-resizable-sidebar].agents-sidebar` 下的
  CSS 规则设置 `contain: layout paint style` 以实现性能隔离。
- **`agents-sidebar-floating-glass` 模式（parchment 主题）：**
  不透明的 `--color-bg-container` 背景 + 1px `--color-border-tertiary`
  边框 + `box-shadow: none` + `-webkit-backdrop-filter: none`。
  这就是"卡片式侧边栏"模式——侧边栏在暖 parchment 画布上呈现为
  浮起的卡片，而非半透明面板。

这就是"如何在 glass 主题之外同时支持暖 parchment 主题"的答案：同一个侧边栏
组件根据 `data-theme=light-parchment` / `dark-parchment` 条件性地应用
`.agents-sidebar-floating-glass`。该类通过 CSS 主题匹配激活，而非运行时分支。

侧边栏调整大小：通过 `react-resizable-panels` 库渲染
（`[role=separator]` + `data-resize-handle-active`）。

- `[role=separator]` 始终具有 `background-color: transparent !important`，
  在 `:focus-visible` 上为 `box-shadow: none / outline: none`。
  调整大小的交互能力位于 JS 命中区域中，而非可见 chrome——
  用户只能看到列边缘。
- 拖拽期间，侧边栏上的 `[data-resizing=true]` 会去掉 `box-shadow`，
  这样"浮起"效果在列拖拽时不会出现卡顿。

`.sidebar-section-title`（侧边栏内部的小型分组标签）使用
`var(--color-text-quaternary)`（vera 没有的一种微弱的第四级文本色）。
在支持 `color-mix` 的浏览器中，它取该令牌的 90% + 10% 透明，
因此标签会微微融入 chrome。

### 13.2 Composer——主光晕 + 3 层侧翼模式（已验证）

`.chat-input-primary-glow` 是 composer 主卡片。两个伪元素（`::before` 和
`::after`）各自携带 3 层侧翼光晕：

- **`::before`**（正向动画）：
  - `0 10px 30px -14px var(--color-primary)`（底部投影，主色）
  - `-18px 0 42px -24px var(--color-primary-hover)`（左侧翼）
  - `+18px 0 42px -24px var(--color-primary-border)`（右侧翼）
- **`::after`**（反向动画）：
  - `0 12px 34px -12px var(--color-primary)`（更深的投影）
  - `+20px 0 48px -22px var(--color-primary-hover)`（右侧翼）
  - `-20px 0 48px -22px var(--color-primary-border)`（左侧翼）

两者都以 4.8s ease-in-out infinite 运行 `chat-input-glow-pulse` keyframe。
Vera 已将该光晕移植为 `vera-composer-glow-pulse`（通过 `::before` 和
`::after` 各 2 层）；侧翼方向交替正是让 composer 感觉"有生命"而非
"闪烁"的魔法所在。核对 vera 的移植——它已经使用同样的模式（回看了
styles.css），只是用 `--accent` 令牌替代了 `--color-primary`。良好的一致性。

parchment 主题下的 composer 拥有自己的光晕调色板：
- `--chat-input-parchment-glow` = 主光晕颜色
- `--chat-input-parchment-halo` = 中程光环（parchment 中使用 `--color-warning`，
  因此光晕呈现暖琥珀色而非冷蓝色）
- `--chat-input-parchment-edge` = 远翼边缘（使用 `--color-link`）

Vera 没有 parchment 专用的 composer 调色板——无论主题如何，composer
光晕都使用 `--accent`。如果以后采用 parchment 主题，composer 应按照
参考布局获得暖琥珀色光晕覆盖。

### 13.3 横幅——三个动画吉祥物家族

三个不同的横幅家族，各自带有吉祥物动画：

- **`[data-skills-banner]`** —— Skills 页 hero。parchment 主题下：
  `background-color: var(--color-fill-tertiary)`（微妙的暖色覆盖）。
  承载 `.animate-pointer-poke` SVG 吉祥物（4s linear infinite
  微抖动——图集 §6 keyframe）。
  - 在 parchment 主题下重写内部 SVG 属性：
    `[data-banner-logo], [data-skill-deco-cover]` 的
    `[fill*=color-primary]` → `var(--color-fill-secondary)`，
    `[stroke*=color-primary-border]` → `var(--color-border-tertiary)`。
    这会将品牌蓝中和为对 parchment 友好的中性色。
- **`[data-connectors-banner-visual]`** —— Connectors 页 hero。内部含
  `[data-connectors-lightning]` SVG，在 `connectors-lightning-pulse`
  keyframe 上脉冲（1.4s ease-in-out infinite）。同样的 parchment 颜色重写模式。
- **`[data-plugins-banner]`** —— Plugins 页 hero，带有多部件吉祥物：
  `[data-plugins-banner-mascot-body]`、`[data-plugins-banner-mascot-hand]`、
  `[data-plugins-banner-tags-layer]`、`[data-plugins-banner-dynamic-visual]`。
  每个部件独立动画，形成分层的角色动画。本轮未能提取确切规格；
  其复杂程度值得一个专门的记录 PR。

Vera 没有等效的横幅吉祥物。它们是参考布局在 hero 页面上使用的有意义的
视觉钩子；移植一个（例如 Skills 吉祥物）可以弥合真实的"愉悦感"差距，
但需要 vera 团队委托制作的自定义 SVG 插画资产。

### 13.4 主题着色的品牌动效（`[data-parchment-brand-motion]`）

作用于任何自行播放品牌动效动画（Lottie / SVG）元素的特定属性：
parchment 主题下获得 `filter: hue-rotate(-85deg) saturate(.65)`；
深色主题（dark、dark-glass、classic-dark）下获得 `filter: brightness(.8)`。
这就是参考布局的吉祥物在全部 8 个主题下保持调色板一致的方式，
无需 Lottie 作者手工为每个变体着色。

Vera 可以采用：任何第三方品牌动效（例如 `vera-desktop/assets/`
下的 loader.gif）都可以加上 `data-brand-motion` 属性和这些 filter 规则，
使其随主题自动着色。改动很小，如果日后采用吉祥物则回报很高。

### 13.5 可选中文本标记

`.allow-text-selection { user-select: text !important }` —— 用于必须允许用户
选择文本的界面（例如 assistant 的 Markdown 正文）的显式类。Vera 大多默认
可选；参考布局则全局将默认值翻转为"不可选"（可能出于 chrome 考虑），并用
`.allow-text-selection` 显式选择加入。这与 Vera 的策略相反，但在 chrome
侧（侧边栏 / 导航行 / chips）可能值得对齐，因为这些元素上的 `user-select: none`
可以防止点击拖拽时误触发文本选择。

### 13.6 设置侧边栏插槽 `.agents-settings-wide-content`

`.agents-settings-wide-content { background: var(--agents-content-area-bg);
margin: var(--agents-content-area-gap) var(--agents-content-area-gap)
var(--agents-content-area-gap) 0 }` —— 设置页内承载每个子页面
（Profile / General / Preferences 等）的内容插槽。外边距使用
`--agents-content-area-gap`（4px）令牌，因此内容插槽在顶部/底部/右侧有
4px 间距（左侧为 0，导航列齐平）。这就是"设置标签内容容纳在页面卡片内"的
模式——正是 vera 在进行 Phase 2C 设置内联重构时应采用的模式。

### 13.7 更新后的推迟清单（§13 之后）

在 WAWQAQ 裁定后，可考虑纳入 Phase 3 PR 的项目：
- 为 parchment 模式侧边栏采用 `.agents-sidebar-floating-glass` 模式
  （不透明卡片变体）——纯 CSS + 一个 `data-theme` 选择器。
- 为以后随产品发布的任何 loader / 吉祥物采用 `[data-parchment-brand-motion]`
  主题着色模式——4 行 CSS，无需 JS。
- 为任何带品牌色的 SVG 移植 `[data-banner-logo]` SVG 颜色重写模式，
  使其在 parchment 主题下自动中和。
- 在 chrome 界面上采用 `.allow-text-selection` 选择加入策略，
  使导航行上的点击拖拽不会开始文本选择。
- 在计划/Skills 子区块间距上一致地使用 `--agents-content-area-gap`（4px）
  （我们目前使用 14px；参考布局的 4px 看起来紧凑得多，
  契合高密度驾驶舱美学）。

---

## 14. 深度逆向工程第 4 轮——设置调色板、popover、设置布局（§14）

继 WAWQAQ 消息 7f3ca067（"继续学习…多解决现有前端的问题，设计 布局的问题"）之后的继续。

### 14.1 设置页有自己的主色调色板

当渲染器在设置界面上设置 `[data-modal=agents-settings]` 时，参考布局会
应用调色板**覆盖**：

- 浅色 / light-glass / classic-light / **默认**：
  - `--color-primary: #8ee5a1`（薄荷绿）
  - `--color-fill-secondary: #ebebeb`（暖灰）
  - `--color-text-on-primary: #fdfdfd`
- Light-parchment：
  - `--color-primary: #202116`（深炭色——几乎接近非纯黑）
  - `--color-fill-secondary: #ede8e0`（parchment 奶油色）
- 深色主题：令牌来自 `--color-bg-container` / `--color-text`
  系列（无暖色主色覆盖）。

**这是参考团队做出的一个有意义的設計选择：** 设置页在视觉上与聊天有明显区别，
因为它的主强调色是薄荷绿而非品牌蓝。用户在设置页点击"保存"或"应用"时看到的是
薄荷绿 CTA——与聊天提交（品牌蓝）在语义上不同。这是一个微妙但高级的模式。

**Vera 到处使用 `var(--accent)`**，包括设置页。采用仅限设置页的
`data-surface=settings` 令牌覆盖可以弥合这一差距。约 10 行 CSS。

### 14.2 设置页的侧边栏背景绕过

当设置页打开且主题为 `light-parchment` / `dark-parchment` / `classic-light` 时：
- `aside[data-settings-nav-column].agents-sidebar > div { background: 0 0 }`
- `html[data-theme=light-parchment] .agents-layout-root .agents-sidebar
  { background: 0 0 !important }`

因此设置导航列**没有**背景——它从设置模态框调色板继承。Vera 的设置导航
有自己的 `.settingsNavGroup` chrome；也可以简化成继承方式。

### 14.3 Popover 侧向平移模式（Tailwind data-* 变体）

参考布局广泛使用 Tailwind v4 的 data 属性变体进行 popover 定位：

```
.data-[side=top]:-translate-y-1[data-side=top] { translate: 0 -4px; }
.data-[side=bottom]:translate-y-1[data-side=bottom] { translate: 0 4px; }
.data-[state=open]:bg-fill-secondary[data-state=open] { background: var(--color-fill-secondary); }
```

因此，设置 `[data-side=top]` 的 Base UI（或 Radix 风格）原语会自动通过
Tailwind 工具类获得正确的平移。Vera 也使用 Base UI 原语，但我们的 CSS
文件使用手写的定位规则，而非 Tailwind 的 data-* 变体。我们已经具备相应
工具（已安装 Tailwind v4）；转向 data-* 变体可以统一模式并移除约 30 行
自定义 CSS。

### 14.4 可选中文本——选择加入策略已确认

图集 §13.5 已标注 `.allow-text-selection`。已在参考布局中验证：它包含
`user-select: text !important`。这意味着参考布局对 chrome 界面的**全局默认值**
是 `user-select: none`——与 Vera 相反，Vera 继承浏览器默认值（处处可选中
文本）。这解释了为什么参考布局的聊天看起来"更像应用"，而 Vera 在点击
chrome 时可能意外进入文本选择模式。

**Phase 3 候选**（图集 §13.7）：对 `.vera-session-panel`、`.vera-nav-row`、
`.vera-list-row`、`.vera-module-main-header` 标题应用 `user-select: none`
（仅限 chrome 界面），并在 Markdown 正文 + composer + 只读内容上保留文本选择。

### 14.5 发现的更多打磨差距

- **参考布局使用全局 `cmd+k`** 聚焦聊天输入框（JS chunk 字符串中的
  `focus-input` / `agent-input-history`）；Vera 有 `cmd+k`，
  但冷启动时输入框不会自动聚焦。冷启动引导会更顺畅。
- **参考布局在 win32 主机上区分 `[data-glass-effects=off]`**：
  它会在全局禁用所有 `backdrop-filter`。如果我们把
  `[data-glass-effects=off]` 开关作为设置选项，用户也可以选择退出
  macOS vibrancy（有些用户不喜欢它）。4 行 CSS + 一个设置开关。
- **参考布局有 `[data-canvas-dialog]`**，用 `var(--color-bg-container)`
  覆盖标准模态框背景——一种全出血预览 / artifact 对话框变体。
  Vera 没有 canvas 风格对话框；这对 Artifacts 窗格预览会很有用。

### 14.6 Phase 3 扩大范围（现在是 8 个速赢项）

合并 §13.7 + §14：
1. 用于 parchment 模式不透明侧边栏的 `.agents-sidebar-floating-glass`
2. 全局主题着色 `[data-parchment-brand-motion]`
3. SVG 颜色重写模式（`[fill*=color-primary]` → 令牌）
4. `.allow-text-selection` 选择加入策略反转
5. 将计划/Skill 子区块间距从 14 收紧到 4-6px
6. **新增：** 设置页主色调色板覆盖
   （`data-surface=settings` → 薄荷绿主色）
7. **新增：** 为 popover 侧向平移采用 Tailwind data-* 变体
8. **新增：** `cmd+k` 冷启动 composer 自动聚焦
9. **新增：** 设置中的 `[data-glass-effects=off]` 开关
10. **新增：** 用于 Artifacts 窗格的 `[data-canvas-dialog]` 变体

第 1-5 项是纯 CSS，今天即可发布。第 6-7 项需要小幅 JSX 改动。
第 8-10 项规模更大（新 IPC / 新对话框挂载）。

---

## 15. 深度逆向工程第 5 轮——字体、hero、模糊层（§15）

继 WAWQAQ 消息 500eddc9（"一定要多做、多分析…深度抄袭和学习 参考
界面 布局"）之后。本轮捕捉我尚未解码的排版 + 视觉效果模式。

### 15.1 hero 界面上的 Instrument Sans 变量字体

参考布局加载一个下载的变量字体：
```css
@font-face {
  font-family: Instrument Sans;
  src: url(./InstrumentSans-…ttf) format("truetype");
  font-weight: 1 1000;
  font-display: swap;
}
```

仅用于 `.welcome-title` 和 `.login-title`：
```css
.welcome-title {
  font-variation-settings: "wdth" 100, "wght" 500;
  font-family: Instrument Sans, ui-sans-serif, system-ui, sans-serif;
}
```

当设置了 `[data-font-style=serif]` 时，回退到 `--font-body`
（Libre Baskerville）。

**洞察**：参考布局通过一个具有定制轴（bespoke axes）的特定变量字体来区分
hero 排版与 chrome 排版。Vera 到处使用 Geist Variable——在**不**随产品
多发布一种字体的前提下采用同样的区分是可能的：在 hero 标题上设置
`font-variation-settings: "wght" 550, "wdth" 105`，即可获得"更宽、略重"
的感觉。本次提交将其应用于 `.vera-hero h1` / `.emptyChat h1`。

### 15.2 `[data-gradual-blur-layer]` 覆盖层模式

参考布局有一个 `[data-gradual-blur-layer]` 属性，标记用于淡出内容边缘
（例如吸顶标题下方）的背景模糊遮罩元素。它直接使用 `-webkit-backdrop-filter`，
而 `[data-glass-effects=off]` 开关通过 `-webkit-backdrop-filter: none !important`
禁用它。

**模式**：在滚动容器的顶部或底部设置一个固定的 `pointer-events: none`
覆盖层，配以 `linear-gradient(transparent 0%, var(--background) 100%)`
蒙版 + `backdrop-filter: blur(8px)`，可营造"内容融入 chrome"的效果。
Vera 没有等效实现；在吸顶聊天头部 / 侧边栏滚动边缘添加一个，
可以弥合一个真实的打磨差距。

### 15.3 Font-display swap + 本地 Instrument Sans

参考布局的字体随打包产物发布，并以 `font-display: swap` 加载。这是
Electron 中变量字体的最佳实践——首次绘制使用系统回退字体（`ui-sans-serif,
system-ui`），同时变量字体从本地磁盘加载（首次运行快速，后续几乎瞬时）。
Vera 使用来自 `@fontsource-variable/geist` 的 Geist Variable，它同样
自托管并默认使用 `font-display: swap`。两者偶然对齐；并非差距。

### 15.4 `[data-os=win32][data-glass-effects=off]` 按平台回退

对于通过设置显式禁用玻璃效果的 Windows 用户，参考布局会在全局禁用
所有 `backdrop-filter` 规则：

```css
:root[data-os=win32][data-glass-effects=off] [class*=backdrop-blur],
:root[data-os=win32][data-glass-effects=off] [data-gradual-blur-layer],
:root[data-os=win32][data-glass-effects=off] .agents-layout-root,
:root[data-os=win32][data-glass-effects=off] [data-resizable-sidebar].agents-sidebar.agents-sidebar-floating-glass {
  -webkit-backdrop-filter: none !important;
}
```

Phase 2C（图集 §12.1）之后，Vera 的 `data-os` 设置在 `<html>` 上。
采用 `data-glass-effects` 开关还可以让 macOS 用户选择退出侧边栏 vibrancy——
对觉得模糊分散注意力的用户很有用。模式：添加一个设置开关，写入
`document.documentElement.dataset.glassEffects = 'off' | 'on'`，并用
`:not([data-glass-effects=off])` 门控现有侧边栏玻璃 CSS 规则。

### 15.5 Phase 5 候选清单（扩大）

在图集 §14.6 的基础上新增：
11. 变量字体 hero 排版（Geist 轴）——已在本提交中应用
12. `[data-gradual-blur-layer]` 覆盖层原语——约 10 行 CSS，
    一条 CSS 规则 + 在吸顶标题容器上应用属性
13. `[data-glass-effects]` 退出开关——小幅设置 JSX + CSS 模式门控
14. 登录界面（Vera 没有认证；如果日后添加则为未来界面）
