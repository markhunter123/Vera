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

# Renderer（`vera-desktop/src/renderer`）

Electron renderer 进程：Vera 桌面 app 的 React UI 主体。React + Vite，通过 `@vera/ui` primitives 消费 Astryx。

关于 main/preload/renderer 拆分与 IPC 契约，参见 `vera-desktop/README.md`。本文件涵盖 renderer 内部。

## 入口

`main.tsx` → `app.tsx` → `AppShell`（`app-shell.tsx`）。`index.html` 是 Vite HTML 外壳。`main.tsx` 在挂载 React 之前预取 onboarding 快照，使正常路径的首次提交绘制出真实表面（如果预取超时，则以 `null` 与 fail-soft 加载状态挂载）；`app.tsx` 把 `AppShell` 包在 `ToastProvider` + `ErrorBoundary` 中。

`styles.css` 是**唯一**打包的样式入口：它导入 Astryx、字体、`vera-tokens.css`、`reference-shell.css` 以及每一个 `styles/*.css`。它只包含顶层编排；真正的选择器规则放在 `styles/*.css` 中。有一个契约钉死的例外：`index.html` 带一个内联的 `.vera-preload` 骨架，使用硬编码颜色（没有 CSS 变量——`vera-tokens.css` 尚未加载），因此 CSS + JS 加载间隙不会出现空白窗口；`createRoot` 在挂载时替换它。

## AppShell 与动作模块

`app-shell.tsx` 是外壳组件：它拥有会话状态并接线 `@vera/ui` 对话表面。右侧/底部 Workbar 是 `features/workbar` 下的纵向功能；其自己的 README 定义了 Review、Terminal、Tasks、Browser、Files、Inspector 与 Side Chat 的状态与生命周期边界。外壳由一组 `app-shell-*` 模块支撑，每个模块是按单一关注点拆分的一薄片外壳逻辑（如 `app-shell-session-events.ts`、`app-shell-chat-actions.ts`、`app-shell-effects.ts` 与 `app-shell-overlays.tsx`）。让一个切片只做一个关注点；如果它变大了，就沿着同一条接缝拆开。

自主 Goal 状态、控件、对话框生命周期与桌面 I/O 位于 `features/goals` 之下；AppShell 提供活动 Session 边界并消费该功能的 host、命令与选择器。

`settings/` 存放设置页面与 `SettingsModal` 外壳——每个 `SettingsSection`（在 `@vera/core` 中定义）一个页面；models/providers 页面是 `ProvidersPanel`。外加 `provider-*` 文件与共享的 `settings-rows` / `settings-skeleton` / `settings-surface` 辅助。

## 样式与令牌

| 文件 | 职责 |
|---|---|
| `astryx-theme/veraTheme.ts` | Astryx 字号体系、中性色重映射与主题级组件覆盖的来源。 |
| `astryx-theme/vera.css` | 由 `styles.css` 导入的生成的 Astryx 主题；请从 `veraTheme.ts` 重新生成它，绝不直接编辑。 |
| `vera-tokens.css` | 产品 CSS 令牌（color / shadow / typography 别名 / radius / spacing / motion / z / layout）的主要来源，末尾还有一大段 recipe 区。过渡期：令牌与 recipe 共存于一个文件。 |
| `reference-shell.css` | 目标布局外壳重建，根据参考实现摘录手工编写（其头部注释记录了来源）。**过渡期**——计划折回令牌/样式体系后移除。 |
| `styles/*.css` | 各表面的手写 recipe（如 `chat-*`、`sidebar`、`composer`、`palette`、`settings/*`、`module-pages/*`）。 |

令牌编写规则：自定义 CSS 变量放入 `vera-tokens.css`。新的组件本地变量应带 `/* local: ... */`（现有变量并非全部都有）。不新增硬编码的 color / radius / z-index。

注意 `--foreground-N` 拆分：wash 停止点（`-2/-3/-5/-8/-10`）是背景与边框的表面填充，**不是**文本。3 层语义别名（`--foreground` / `--foreground-secondary` / `--muted-foreground`）是文本颜色词汇。它们是两套关注点——不要把 wash 停止点并进文本别名。

## 新代码：primitive 优先，CSS 最后

1. 先找 Astryx 背书的 `@vera/ui` primitive。
2. 只有当没有任何 primitive 承载它时，才在匹配的 `styles/<surface>.css` 中编写 CSS，遵循 `docs/frontend-css-governance.md`（layer 规则、无 layer 覆盖列表、`!important` 审计、死 CSS 允许清单）。
3. 不注册进 `vera-tokens.css` 就不添加令牌。

## 收敛方向（过渡期表面）

已承认的过渡状态——不是 TODO；在 issue/PR 中跟踪工作。

- 现有的手写 `styles/*.css` recipe 与对 Astryx 背书 `@vera/ui` primitive 的内部 DOM 覆盖，是已承认的过渡状态，不是新工作的先例。新样式使用已发布的 props、令牌或稳定的 `themeProps` 扩展点；在 GitHub issue 与 PR 中跟踪具体的退役工作。
- `reference-shell.css`：最终状态是折回令牌/样式体系并移除文件。
- `vera-tokens.css` 混合令牌 + recipe：最终状态是这里只留令牌，recipe 落在 primitives / `styles/` 上。

## 契约与护栏

- 产品设计意图：`DESIGN.md`。
- CSS 级联 / layer / `!important` / 死 CSS / 令牌规则：`docs/frontend-css-governance.md`。
- 组件状态、ARIA、令牌与文案行为由源码与聚焦的契约测试负责。
- 当散文与代码或行为测试不一致时，代码与测试是真相来源。CSS 约定由审阅与渲染表面验证来检查。构建/测试入口点是根目录 `package.json` 中的 npm scripts（参见顶层 `README.md`）。
