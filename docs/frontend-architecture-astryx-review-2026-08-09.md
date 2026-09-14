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

# 前端架构与 Astryx 覆盖度评审

**日期：** 2026-08-09（UTC）  
**HEAD：** `0ad579d33`（`main` 上的 `feat(ui): align high-traffic chrome with Astryx primitives (#2580)`）  
**范围：** `vera-desktop/src/renderer/**`、`vera-ui/src/**`  
**方法：** 文件级清单重新生成 + 模式扫描 + 对 shell/settings/modules/ui 的深度阅读；先前成果 `docs/astryx-full-surface-audit.md`、`DESIGN.md`、`docs/astryx-surface-file-inventory.md`  
**证据日志：** goal scratch `frontend-review-scan.log`（清单总计、grep、抽查、清单单元测试）

---

## 执行结论

产品已经具备**正确的预期分层**：

```
Astryx primitives/theme  →  @vera/ui compositions  →  desktop host (shell, settings, workbar)
```

#2580 之后，**原生交互控件阻塞项已清零**（清单：**183 个文件 · blocker 0 · polish 4 · aligned 179**）。空/加载/错误契约大多落在 Astryx `EmptyState` / `Spinner` / `Banner` 上。

剩余风险不是"缺 Button"。而是：

1. **架构集中** —— `app-shell.tsx` 仍然是整个应用；settings 和 workbar 表现得像迷你应用；CSS 存在三种历史方言。
2. **视觉体系债** —— 对话内面板（plan、agent-graph）仍叠加 fill + border + 原始 shadow（违反 DESIGN.md 的 One Means / surface 阶梯）。
3. **Astryx 控件之上的产品 CSS** —— quote chip / turn footer / lineage 仍在重写 chrome 几何。

---

## 1. 分层图（当前发布形态）

```
Electron frame
└── appFrame (app-shell.tsx ~3.1k lines)
    ├── window titlebar (drag + chrome actions)
    ├── Astryx AppShell
    │   ├── SideNav → SessionListPanel (@vera/ui)
    │   └── content
    │       ├── Module routes → ModulePage (@vera/ui → Astryx Layout)
    │       ├── ChatSurfaceLayout (@vera/ui → Astryx ChatLayout + conversationKey patch)
    │       │   ├── ChatView / turns / tool-activity
    │       │   └── Composer
    │       └── ChatWorkbar → SessionWorkbar (custom tab WM)
    └── Overlays
        ├── SettingsModal → SettingsSurface (second Layout + SideNav)
        └── palette / search / help / import
```

| 层 | 归属 | 职责 |
|-------|--------|-----|
| 窗口 chrome | desktop `app-shell*` | 拖拽区域、标题栏操作 |
| 列布局 | Astryx `AppShell` | sideNav + 内容面板 |
| 对话页外壳 | `@vera/ui` `ChatSurfaceLayout` | 滚动 / 停靠 / 跟随 |
| 对话记录产品 | `@vera/ui` chat-turn、tool-activity | 回合、工具、空态英雄 |
| 设置 | desktop `settings/*` 套件 | 模态框 IA + 行 |
| 模块 | `ModulePage` + desktop MCP | 密集列表 + 检查器 |
| 基座 | Astryx + `vera-tokens.css` + 生成的主题 | 原语 / token |

**健康的接缝（不要"修掉"它们）：**

- 作为对外发布的对话外壳的 `ChatSurfaceLayout`（`vera-ui/src/chat-surface-layout.tsx`）
- 卡片混乱收敛后的设置套件（`settings-section.tsx` 中的 `SettingsPage` / `SettingsSection`）
- 模块套件（Astryx `Layout` / `ResizeHandle` 之上的 `primitives/module-page.tsx`）
- 级联层 + 死 CSS / astryx 清单门禁（`cascade-layers.css`、`scripts/check-astryx-*.mjs`）
- 通过 desktop 对话表面适配器实现的流隔离意图，使 shell chrome 不必随每个 token 重渲染

---

## 2. 架构评审（简化 / 提升）

严重级别：**blocker**（阻塞级）= 阻碍所有功能的结构性成本；**high**（高）= 明显的多界面税；**polish**（打磨级）= 可以等待的清理。

### A1 — AppShell 仍是神级编排器（阻塞级）

**锚点：** `vera-desktop/src/renderer/app-shell.tsx`（约 3099 行）；同族文件 `app-shell-*.tsx`、`use-app-shell-*.ts`、众多 `*-actions.ts` 工厂。

**问题特征：** 逻辑是**按文件分片**，而非**按边界拆分**。导航路由、workbar 生命周期、侧聊、设置关闭级联、composer 属性扇出和模块数据接线仍然闭包于同一个 React 组件。

**痛点：** 每个新功能仍汇聚到 AppShell 的局部状态上 → 属性钻取和重渲染风险。把处理器钉死在 `app-shell.tsx` 中的测试冻结了进一步的抽取。

**方向：**

1. 仅将 AppShell 作为组合根（挂载区域 + 注入控制器）。
2. 提升出具有稳定身份的真正控制器：
   - `SessionWorkspaceController`（消息、实时回合、发送/停止）
   - `WorkbarController`（标签 + terminal / side-chat IPC）
   - `ShellNavigationController`（navSelection + 设置意图）
3. 用 `ShellMainRoute` 映射替换 section 三元表达式丛林。
4. 停止膨胀 `createAppShellXActions({…40 deps})` 星形调用；让 action 与状态同处一地。

### A2 — 双重 chrome 归属（高）

**锚点：** `app-shell.tsx` 中的标题栏；Astryx `AppShell`；设置模态框二次外壳（`settings-modal.tsx` / `settings-surface.tsx`）；workbar 标签条（`session-workbar.tsx`）；标题栏与 `SessionContextLayer` 中的会话身份。

**问题特征：** 四个 chrome 系统都在回答"我在哪里 / 我能做什么"。

**方向：** 每条轴一个归属——列布局 → AppShell；会话工具 → workbar 作为内容区域；settings 长期作为 shell 路由（或保留模态框，但停止复制 `agents-layout-root` 的双应用样式）；标题栏只拥有名称，上下文层只拥有 runtime 徽标。

### A3 — Workbar 是第二个窗口管理器（高）

**锚点：** `session-workbar-tabs.ts`、`use-shell-layout.ts`、`session-workbar.tsx`（约 932 行）、AppShell 的 side-chat / terminal 副作用。

**问题特征：** 双停靠、重排、预览/固定、资源支撑的标签（`terminal:*`、`side-chat:*`），进程生命周期在纯 reducer 与 AppShell 副作用之间分裂。

**方向：** 由 `WorkbarController` 拥有面板状态 + IPC；把静态工具类别与临时资源标签拆分为显式 store；保留自定义标签条（dnd + `role=tab` 是合理的），但用一个 Tab 模型封住 chrome 状态爆炸。

### A4 — Settings 多通道路由（高）

**锚点：** `settings-surface.tsx`（section + localStorage + `vera:jumpToSettingsSection` + 父级意图）；`ProvidersPanel` 嵌套的 catalog/setup/detail；宿主上有五个开启入口。

**问题特征：** 导航有四个通道，可能复活过期的意图（surface 中的注释已经记录了这类 bug）。

**方向：** 单一 `SettingsRoute` 值（section + 可选的 models 子路由）；一个开启入口；移除 window 事件；由注册表驱动的 `SettingsPageBody`，使导航与主体不会分叉。

### A5 — 对话栈过度组合 + composer 大杂烩（高）

**锚点：** `ChatSurfaceLayout` → desktop message surface → `ChatView` → 回合；`Composer`（约 1803 行）带来自 AppShell 的几十个并行模式属性。

**问题特征：** 隔离是对的；属性面不对。产品模式以并行布尔值落地，而不是一个会话模型。

**方向：** 保留 `ChatSurfaceLayout`；引入 `ComposerSessionModel`（model / permission / plan / swarm / attachments / quotes）；在单个 pane 模块中组装 desktop 对话属性，而不是在 AppShell JSX 中。

### A6 — 工具预览并行设计体系（高）

**锚点：** `vera-ui/src/tool-activity.tsx` + `tool-activity/**`；`primitives/chat.tsx` 中的 `previewVariants` / `ToolOutputSurface`；`vera-ui/src/styles.css` 中约 254 条 `.vera-*` 规则；renderer 的 `chat-message.css` 仍伸入工具卡片。

**问题特征：** 工具 UI 是 Astryx CodeBlock/Banner 之外的第二种视觉语言。部分统一（`ToolOutputSurface`）证明问题真实存在——修复长出了一个包内本地设计体系。

**方向：** 冻结新的预览卡片；纯 `toolName → PreviewKind` 映射；通用 mono/error → Astryx；结构化多部分结果只作为产品种类；禁止在 `.vera-tool-*` 上新增 renderer 选择器（把覆盖移入包/主题）。

### A7 — CSS 方言蔓延（高）

**锚点：** 一个节点上三代并存——例如模块主区域 `vera-main detailPane vera-module-main agents-chat-panel`（`module-pages.tsx`）；`styles/settings/**` 下的 camelCase settings；包与 renderer 的双重归属。

**方向：** 冻结新的 `agents-*` / `detailPane` 名称；包拥有 chat/tool/module 组合 CSS；renderer 只拥有 shell/workbar/settings；完成过渡性 `reference-shell` / token 配方堆积的收编。

### A8 — 模块归属分裂：MCP 与包内模块（打磨级 → 若 MCP 分化则为高）

**锚点：** `@vera/ui` `module-pages.tsx` 中的 Skills/Plan/Daily；desktop `mcp-page.tsx` 中的 MCP，带自己的 skeleton 方言。

**方向：** 像 DailyReview 一样桥接 MCP，或只抽取共享的列表/检查器配方；统一模块根类。

### A9 — Action 工厂星形图（打磨级）

**锚点：** 众多 `app-shell-*-actions.ts` 工厂只被 AppShell 重新绑定。

**方向：** 由 hooks 拥有状态；其余工厂只接受一个小型 `ShellContext`，而不是 40 个具名依赖。

---

## 3. Astryx 样式 / 组件覆盖缺口

### 3.1 清单基线

| 指标 | #2580 后审计 | 评审债务修复后（本分支） |
|--------|------------------|-------------------------------------|
| 文件数 | 183 | 183 |
| blocker | **0** | **0** |
| polish | **4**（见下方具体行） | **0** |
| aligned | 179 | 183 |

**#2580 后的 polish 行（历史记录，为保持准确）：**

| 路径 | 标记的高度 | 内容 |
|------|----------------|-------------|
| `styles/chat-header.css` | `min-height: 40px` | `.vera-session-context__inner` 条带 |
| `styles/settings/bot.css` | `height: 44px` | `.settingsBotLogo[data-large]` |
| `styles/settings/models.css` | `height: 44px` | `.providerLogo` 默认面板 |
| `styles/settings/theme-preview.css` | `height: 34px` | `.settingsPaletteSwatch` |

这些**不是**抽象意义上凭空捏造的"logo 误报"——它们就是清单中的四行。它们被**修复到 28/32/36 控件节奏**（36 条带 / 36 面板 / 32 色块），而不是通过白名单豁免。

| 指标 | 值 |
|--------|--------|
| 产品 TSX 中的原生 `<button\|input\|select\|textarea>` | **无**（去除注释后的扫描） |
| `role="button"` 伪装 | **仅 ChatReasoning eject**（+ composer 中对 Astryx 折叠组件的 querySelector） |

### 3.2 按界面族的缺口

#### Shell / 对话记录 / plan / graph

| 严重级 | 缺口 | 锚点 | 状态 |
|-----|-----|---------|--------|
| **高（P1）** | plan 面板：fill + border + 原始多层 shadow | `plan-mode.css` | **已修复** → 仅 `--surface-raised` + border |
| **高（P1）** | agent graph 面板同一堆栈 | `agent-graph.css` | **已修复** → 仅 `--surface-raised` + border |
| **高（P1）** | plan 状态 wash 为手写 oklch | `plan-mode.css` | **已修复** → `--info-wash` / `--warning-wash` / `--success-wash` |
| **高（P1）** | quote 伴生 composer 原始 shadow | `quote-side-panel.css` | **已修复** → `var(--elevation-raised)` |
| **中（P2）** | 浏览器工具栏临时 div | `browser-panel.tsx` | **已修复** → Astryx `Toolbar` |
| **中（P2）** | workbar 启动器原生 `<kbd>` | `session-workbar.tsx` | **已修复** → Astryx `Kbd` + token 快捷键 |
| **中（P2）** | 键盘帮助原生 `<h3>` | `keyboard-help.tsx` | **已修复** → `Heading level={3}` |
| **中（P2）** | 网页工具结果原生 `<a>` | `tool-result-preview.tsx` | **已修复** → Astryx `Link` |
| **中（P1/P2）** | Deep Research 面板 wash | `deep-research.css` | **已修复** → wash token |
| **中（P2）** | 键盘帮助原生 `<h3>` | `keyboard-help.tsx` | `Heading` / `Text` |
| **低（P3）** | quote chip / remove / turn footer / lineage 重写 Astryx Button | `vera-ui/src/styles.css`、`quote-ref-chip.tsx`、`chat-turn.tsx` | 收缩覆盖；lineage 优先用 Badge/Token |
| **低（P3）** | workbar 标签繁忙用 `Loader2` | `session-workbar.tsx` | 若表示加载则用 `Spinner` |

#### Settings / 模块

| 严重级 | 缺口 | 锚点 | 修复 |
|-----|-----|---------|-----|
| **中** | usage 临时工具栏 CSS | `usage-settings-page.tsx`、`settings/usage.css` | `Toolbar` |
| **中** | daily review 指标手工布局 | `daily-review-panel.tsx` | 可选 `StatTile` |
| **已对齐** | #2580 后 Settings 的空/错误/骨架 | memory、permission、web-search、providers 列表… | 保留套件 |
| **有意为之** | Providers catalog/setup 不归属 `SettingsPage` | 嵌套在 Models 下的多层级 | 不强推行套件 |

#### vera-ui 组合

| 严重级 | 缺口 | 锚点 | 修复 |
|-----|-----|---------|-----|
| **中** | DeepResearchProgressPanel 手工面板 + wash | `chat-view.tsx` 的 `DeepResearchProgressPanel`、`deep-research.css` | wash token；可选后续套件 |
| **中** | 网页工具结果原生 `<a>` | `tool-activity/tool-result-preview.tsx` | Astryx `Link`（或记录为预览例外） |
| **有意为之** | 工具/agent/网页预览卡片 chrome | `primitives/chat.tsx`、`styles.css` 工具族 | 内容设计体系，而非表单控件 |
| **有意为之** | 对话空态英雄 | `chat-empty-hero.tsx` | 欢迎界面 ≠ EmptyState |
| **有意为之** | ChatReasoning 实验室 eject | `astryx-chat-reasoning.tsx` | 在出现稳定的对等组件前保留 |
| **有意为之** | Astryx 补丁 | `patches/@astryxdesign+core+0.3.0.patch`、`patches/README.md` | conversationKey / tool 行 / List aria / UA-CH |

### 3.3 加载套件蔓延（架构 × Astryx）

空/错误基本共用 Astryx。**加载**仍有 6 种以上方言：

| 配方 | 示例 |
|--------|--------|
| `vera-lazy-fallback` + Spinner | overlays、workbar suspense、modules |
| `WorkbarPanelLoading` | `session-workbar.tsx` |
| `SettingsSkeletonStack` | settings 页面 |
| `vera-module-list-skeleton` | `mcp-page.tsx` |
| 对话消息 Spinner | `chat-view.tsx` |
| onboarding Skeleton 条 | chat-message-surface |

**方向：** 一个产品级 `SurfaceLoading` / `SurfaceEmpty` / `SurfaceError` 套件（对 Astryx Spinner/Skeleton/EmptyState/Banner 的薄封装）。

---

## 4. 按优先级排队的待办（可执行）

### P0 — 架构（无需视觉替换）

| # | 事项 | 成果 |
|---|------|---------|
| P0.1 | 从 AppShell 抽取 `WorkbarController` | terminal/side-chat 生命周期 + 标签集中在一处 |
| P0.2 | `ShellMainRoute` 映射；AppShell JSX = 区域挂载 | 终止 section 三元表达式丛林增长 |
| P0.3 | 定义单一 `SettingsRoute` 原子 | 终止多标志开启入口 + window 事件竞态 |

### P1 — Astryx / DESIGN 视觉体系

| # | 事项 | 状态 |
|---|------|--------|
| P1.1 | plan + agent-graph 面板 → 阶梯 / One Means | **完成**（本分支） |
| P1.2 | plan 状态 wash → `--*-wash` | **完成** |
| P1.3 | quote 伴生 composer shadow → elevation token | **完成** |
| P1.4 | 节奏外高度（chat-header 40、bot/models 44、swatch 34） | **完成** → 36/36/32 |

### P2 — 原语一致性

| # | 事项 | 状态 |
|---|------|--------|
| P2.1 | 浏览器工具栏 → `Toolbar` | **完成** |
| P2.2 | workbar 启动器 → `Kbd` | **完成** |
| P2.3 | 键盘帮助标题 → `Heading` | **完成** |
| P2.4 | 网页工具链接 → `Link` | **完成** |
| P2.5 | daily-review 指标可选 StatTile | 未开始（打磨级） |
| P2.6 | `SurfaceLoading` 套件；淘汰临时 fallback | 未开始（架构后续） |
| P2.7 | usage 设置工具栏 → `Toolbar` | 未开始（打磨级） |

### P3 — CSS chrome 债与卫生

| # | 事项 | 状态 |
|---|------|--------|
| P3.1 | 收缩 quote-chip / turn-footer / lineage 的 Button 覆盖 | 未开始（渐进） |
| P3.2 | ~~白名单豁免装饰性高度~~ | **已被取代** —— 真实的 polish 路径已修复到节奏 |
| P3.3 | 冻结新的 `agents-*` 类名；迁移模块根类混乱 | 未开始（架构） |
| P3.4 | 包/renderer CSS 归属规则 | 未开始（架构） |

### 明确非目标（来自本次评审）

- 在一个 PR 中批量重写工具预览内容语言  
- 把 providers 多层级强塞进 SettingsSection 行  
- 在上游出现稳定 ChatReasoning 之前删除 ChatReasoning eject  
- 把残余补丁扩展到已记录的宿主接缝之外  

---

## 5. 抽查日志（验证）

评审时在磁盘上复核的声明：

| 声明 | 路径 | 结果 |
|-------|------|--------|
| AppShell 集中 | `app-shell.tsx` 约 3099 行 | 通过 |
| plan 面板使用 surface-raised，无手写 shadow | `plan-mode.css` | 已修复 |
| agent-graph 面板使用 surface-raised | `agent-graph.css` | 已修复 |
| 浏览器 `Toolbar` | `browser-panel.tsx` | 已修复 |
| workbar `Kbd` | `session-workbar.tsx` | 已修复 |
| ChatReasoning `role="button"`（有意为之） | `astryx-chat-reasoning.tsx` | 例外 |
| 设置套件 | `settings-section.tsx` | 通过 |
| 模块套件 | `primitives/module-page.tsx` | 通过 |
| 债务修复后清单 | 重新生成 | `blocker=0 polish=0 aligned=183` |


---

## 6. 决策者摘要

| 问题 | 回答 |
|----------|--------|
| 我们还缺 Astryx Button 吗？ | **不缺** —— 原生控件阻塞项为零。 |
| 产品是"Astryx 原生"吗？ | **控件 + 空/错误状态是**；elevation/wash 和若干布局原语**在本次跟进中已修复**；quote/turn 的 CSS chrome 仍是产品方言。 |
| 最大的剩余架构收益？ | **为 AppShell 去神**（P0）——需要数周；本次未完成。 |
| 哪些先别动？ | ChatReasoning eject、工具预览内容卡片、providers 多层级 IA、残余的 quote/turn Button 几何——直到专门的 chrome 专项。 |

## 7. 实现说明（跟进分支）

在仅做分析的评审之后，P1 的 elevation/wash、节奏外高度以及 P2 的 Toolbar/Kbd/Heading/Link 已在分支 `fix/astryx-review-debt-2026-08-09` 上实现。架构 P0（AppShell 控制器）仍留在待办中。
