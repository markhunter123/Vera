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

# Vera UI 质量计划（一个月交付契约）

> 归档于 2026-07-13。这份首月上线计划与覆盖快照已不再适用；请使用 `docs/frontend-css-governance.md`、本地前端 README、源码和契约测试。

这是**UI 侧交付契约**，与已归档的全产品路线图（`docs/archive/full-product-test-plan-2026-05.md`，@xuan 的）和
@kenji 的 `notes/vera-one-month-completion-test-plan.md`（横向的
测试/发布矩阵）互补。前者定义「哪些功能上线以及整体
测试矩阵如何布局」，本文档定义每个可见界面在其 PR 可合并前必须达到的 UI 特定质量
门槛。

把这里的契约当作合并闸门。违反任何 §3
不变量或对其界面跳过 §5 测试层的 UI PR 不予合并。

---

## 0 — 范围

**UI = `vera-desktop/src/renderer/` 和
`vera-ui/` 内的一切。** 这涵盖：

- 视觉组合（布局、token、浅色/深色主题）
- 交互（鼠标、键盘、触屏稍后）
- 动效（时长、缓动、reduced-motion）
- 无障碍（ARIA、焦点管理、屏幕阅读器）
- UX 文案（标签、错误、空状态、文案立场）
- 视觉冒烟测试夹具 + 截图
- 渲染层专用 IPC 辅助（`window.vera.*`）

不在范围内（另有归属）：

- `vera-desktop/src/main/**` 中的 IPC 处理器（xuan + kenji 负责）
- 后端 runtime + 遥测（xuan）
- 存储 + 迁移（xuan）
- 横向发布流程（kenji）

---

## 1 — 逐界面闸门（「这个界面完成了吗？」清单）

每个 UI 界面在合并前必须通过**全部**这些闸门：

| # | 闸门 | 含义 | 所在位置 |
|---|---|---|---|
| 1 | **契约** | 界面在 `docs/design-system.md` §9.x 中列出，含状态机 + 边界规则 | `docs/design-system.md` |
| 2 | **纯辅助函数测试** | 所有派生状态提取为纯函数 + 覆盖状态转换的 node:test 用例 | `vera-desktop/src/renderer/*.ts` + `vera-desktop/src/main/__tests__/*.test.ts` |
| 3 | **组件契约** | 组件在 `vera-ui/src/components.tsx` 中声明，props 有类型；无未类型化的 `any` props；无隐式 DOM 事件向上泄漏 | `vera-ui/src/components.tsx` |
| 4 | **夹具场景** | 至少一个 `VERA_VISUAL_SMOKE_FIXTURE=...` 场景用真实数据填充该界面 | `vera-desktop/src/main/visual-smoke-fixture.ts` |
| 5 | **冒烟路径** | 带明确通过/失败信号的逐步手工验证 | `vera-desktop/tests/smoke.md` |
| 6 | **浅色 + 深色截图** | 在夹具中捕获两种主题变体 | 截图目录（TODO PR-IR-01） |
| 7 | **窄视口截图** | 捕获 ≤ 990px 宽度以验证类移动端布局 | 截图目录 |
| 8 | **失败/空状态** | 如果界面有失败或空状态，需要单独的夹具 + 截图 | 夹具 + 截图 |
| 9 | **a11y 断言** | 按 §3 声明并测试 ARIA 角色、标签、键盘导航 | 组件 + 测试 |
| 10 | **动效契约** | 动画遵守 `prefers-reduced-motion`；时长来自 token 目录 | `vera-ui/src/vera-tokens.css` + 组件 CSS |
| 11 | **i18n 契约** | 可见字符串默认为中文；面向用户的文案中无英文回退 | 组件源码 |
| 12 | **安全契约** | 不原样渲染用户输入；任何路径中无秘密；应用 redactSecrets | 组件 + 测试 |

跳过任何单个闸门都是发布禁止项（见 §11）。

---

## 2 — UI 测试层（「哪种测试」矩阵）

对每个关注点使用**最低充分**的测试层。过度测试
增加维护负担并拖慢合并。

| 关注点 | 层 | 工具 | 示例 |
|---|---|---|---|
| 纯派生（badge 色调、排序、过滤） | 对纯辅助函数的 node:test | `node:test` | `deriveChatHeaderAlert` |
| CSS 契约（没有规则隐藏 X，激活时透明度恢复） | 对 styles.css 的 grep 式断言 | `fs.readFile + regex` | `stale-sessions.test.ts` |
| 组件 prop 接线（renderer → IPC → backend） | preload + IPC 形状测试 | 对类型的 node:test | preload.ts 形状检查 |
| 用户流程（重命名、归档、发送） | smoke.md 手工路径 | 手工 | `smoke.md` 路径 4 |
| 视觉渲染（浅色/深色/窄） | 截图 diff | TODO（PR-IR-01） | 夹具截图 |
| a11y 语义（ARIA、键盘） | 带明确 Tab 顺序断言 + 辅助技术抽查的 smoke.md 路径 | 手工 | 类似 `smoke.md` 路径 9 |
| 动效（reduced-motion） | 切换系统偏好设置的 smoke.md 路径 | 手工 | 专用路径 |
| 跨平台（macOS / Win / Linux） | smoke.md 按平台运行 | 手工 | smoke.md 前言 |
| 性能（冷启动、滚动 FPS） | smoke.md + 专用指标 | 手工 + 未来遥测 | smoke.md 发布章节 |

### 我们不在 UI 工作区测试的内容

- 通过 JSDOM 的 React 渲染（过于脆弱；纯辅助函数 + 冒烟测试已覆盖）
- 后端逻辑（位于 @vera/runtime / @vera/storage 工作区）
- 网络调用（需要时在纯辅助函数中 mock；真实调用位于
  @vera/runtime 测试中）

---

## 3 — 跨界面不变量（常开的质量契约）

这些是每个 UI PR 必须遵守的**不可协商**规则。它们与
linter 强制执行的「常开」闸门同类，只是以文字固化，因为它们是判断性
问题。

### 3.1 焦点管理

- 每个模态框必须通过 `useModalA11y(ref, onEscape?)` 困住焦点。
- 每个模态框关闭时必须把焦点恢复到先前聚焦的元素。
- 焦点环必须使用 `:focus-visible`，绝不使用裸 `:focus`。
- 所有无可见文本（纯图标按钮等）的交互元素必须有 `aria-label`。

### 3.2 键盘

- 所有可点击控件必须可通过 Tab 到达。
- 所有 Tab 停靠点必须在 DOM 顺序中（除设计系统中说明的位置外无正
  `tabIndex`）。
- 单选组、工具栏、列表框、菜单必须使用漫游 tabindex 模式（方向键）——通过纯辅助函数的 node:test 验证
  （见 `model-table-keyboard.test.ts`）。
- Cmd/Ctrl+K 打开命令面板（PR31）。Esc 关闭它。
- ⌘/Ctrl+, 打开设置（PR98 菜单）。
- ⌘/Ctrl+F 聚焦会话搜索（PR32）。
- ? 或 ⌘/Ctrl+/ 打开键盘帮助（PR22）。
- 在输入区中 Enter 发送消息；Shift+Enter 换行（PR3）。
- Esc 取消重命名 / 关闭模态框 / 关闭抽屉。

### 3.3 动效

- 所有时长使用来自 `--ease-out-strong / --ease-in-out-strong / --ease-drawer` 的 token。
- `@media (prefers-reduced-motion: reduce)` 把所有动画上限设为约 0.01ms
  （已是全局上限；不要覆盖）。
- 在支持处使用 `@starting-style` 做入场动画。
- 只动画 `transform` 和 `opacity`；绝不动画 `width / height / top`。

### 3.4 间距 + 主题

- 每个组件必须使用与其局部信息密度匹配的稳定间距；Vera 不暴露全局 UI 密度开关。
- 每个组件必须通过 `.dark` 类在浅色 + 深色主题下正确渲染。
- token 必须来自 `vera-tokens.css`；组件 CSS 中**无硬编码颜色**（PR5 清扫；由视觉评审强制执行）。
- 主题选择器预览块必须反映真实的聊天界面（PR79）。

### 3.5 文案 + i18n

- 所有面向用户的文案**默认为中文**。
- 错误通过 `@vera/core` 的 `generalizedErrorMessage()`（PR58、
  PR74）。
- UI 层的 `redactSecrets()` 在任何可能包含用户输入或 provider 响应的字符串上运行（PR60）。
- **绝不**在用户可见的标签中暴露内部枚举（「演示版」、FakeBackend、reason 码、
  slug）。技术细节放入 tooltip。
- 空 / 加载 / 错误状态是**一等公民**；没有界面只带一条快乐路径就交付。

### 3.6 边界（renderer ↔ main）

- renderer 绝不从 `relativePath` 组装绝对路径。（产物
  契约 §9.1.5。）
- renderer 绝不直接检查凭据存储。provider 秘密是否存在
  通过 `window.vera.connections.hasSecret(slug)`；订阅 OAuth 的
  safeStorage 仍只在主进程中。
- renderer 绝不通过 `window.open(url)` 打开 URL。通过主进程中的
  `setWindowOpenHandler`（PR96）走 `shell.openExternal`。
- renderer 绝不把文件拖放进 DOM。`did-finish-load` 全局阻止
  dragover/drop（PR96 后续）。

### 3.7 信任层级（UI 脱敏器 + backend 脱敏器）

- 来自 `@vera/core` 的 backend `redactSecrets` 是**权威**。
- UI `redactSecrets` 是 runtime 字符串的**第二层**（工具
  输出横幅、复制到剪贴板）。
- 绝不显示来自任何 IPC 的原始错误消息——始终先经过
  `cleanErrorMessage(error)`。

---

## 4 — 逐界面覆盖矩阵（当前状态 + 首月计划）

行是 Vera 中的**全部 UI 界面**。列是 §1 的闸门 1–12。

✅ = 已满足。❌ = 缺口。⚙️ = 部分满足。

| 界面 | C | PH | CC | F | S | L+D | Nar | E/F | A11y | M | i18n | Sec |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **已交付（P0/V0.2）** |   |   |   |   |   |   |   |   |   |   |   |   |
| 侧边栏会话列表 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 聊天头部横幅 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 输入区 | ✅ | ⚙️ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EmptyChatHero | ✅ | ⚙️ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OnboardingHero | ✅ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings · 模型 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings · 账号 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings · 数据 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ |
| Settings · 个性化 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ |
| Settings · 网络 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ |
| Settings · 机器人对话 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ |
| Settings · 关于 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ⚙️ | ✅ | ✅ | ✅ |
| Settings · 主题 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ⚙️ | ✅ | ✅ | ✅ |
| Settings · 4 Coming Soon | ✅ | n/a | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ⚙️ | ✅ | ✅ | ✅ |
| 权限对话框 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 工具结果渲染器 | ✅ | ✅ | ✅ | ⚙️ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 回合摘要 chips | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 思考块 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 侧边栏流式圆点 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 侧边栏过期药丸 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 命令面板 | ✅ | ⚙️ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Toast | ✅ | ⚙️ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 键盘帮助模态框 | ✅ | n/a | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 错误边界 | ✅ | n/a | ✅ | ❌ | ⚙️ | ❌ | ❌ | ✅ | ⚙️ | ✅ | ✅ | ✅ |
| 产物面板 | ✅ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 会话状态分组 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 会话状态图标 + 聊天头部徽标 | ✅ | ✅ | ✅ | ✅ | ✅ | ⚙️ | ⚙️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **待交付（首月）** |   |   |   |   |   |   |   |   |   |   |   |   |
| 快速聊天（§9.7） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 工作站外壳（§9.8） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 回合控制（§9.9） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 来源/技能/自动（§9.10） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 健康中心（§9.11） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 首次运行分步向导（§9.12） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ModelCatalog ext | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 记忆抽屉 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 语音输入区 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 搜索服务 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 开放网关管理 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| MCP client UI | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

图例：C = 契约（Contract），PH = 纯辅助函数（Pure helper），CC = 组件契约（Component contract），F =
夹具（Fixture），S = 冒烟路径（Smoke path），L+D = 浅色 + 深色（Light + Dark），Nar = 窄视口（Narrow），E/F = 空 +
失败状态（Empty + Failure states），A11y = a11y 断言，M = 动效（Motion），i18n = 中文
默认（Chinese default），Sec = 安全（Security，脱敏 + 无原始输入）。

**缺口总数：13 个已交付界面 × 1–3 个 ⚙️ 闸门 ≈ 30 个单元格。所有
待交付界面全部为 ❌。**

---

## 5 — 必需的测试基础设施（PR-IR-XX 系列）

这些是 UI 侧欠项目其他部分的基础设施 PR。
没有它们，§1 的闸门无法被统一强制执行。

### PR-IR-01 — 截图捕获流水线

**是什么。** 一个 playwright（或 Electron 原生 + tape-recorder）runner，
在每种 `VERA_VISUAL_SMOKE_FIXTURE=...` 场景下启动 Vera，应用浅色 + 深色 + 窄视口变体，
并把 PNG 捕获到 `vera-desktop/tests/screenshots/<scenario>/<variant>.png`。

**为什么。** 目前 `smoke.md` 路径需要人工目视检查
屏幕。截图提供回归基线。

**它解锁的闸门。** §4 中的浅深和窄视口列可以从 ⚙️ 变为 ✅。

**负责人。** @yuejing（这是 UI 基础设施，不是功能）。

### PR-IR-02 — 截图 diff CI 闸门

**状态（2026-05-22）。** 第一阶段已上线为
`scripts/diff-screenshots.mjs`。`vera-desktop/tests/screenshots-baseline/`
中已提交的基线覆盖 3 个稳定场景 × 8 个变体 = 24 张 PNG：`artifact-pane`、`first-run` 和 `artifact-errors`。
`npm --workspace @vera/desktop run screenshots:diff:stable` 在硬性失败时以退出码 1 结束：PNG
缺失、PNG 损坏、文件小于 1 KB 或尺寸错误。尺寸漂移是软警告。

**范围内捕获。**
- 捕获流水线回归：renderer 在绘制前崩溃、捕获
  IPC 中断或夹具种子抛出异常。
- 视口配置错误：主进程未遵循
  `VERA_VISUAL_SMOKE_WIDTH/HEIGHT`。
- 被截断或空的 PNG。
- 捕获脚本与 diff 脚本之间的场景/变体矩阵漂移。

**范围外。**
- 像素级 UI 回归。Electron/字体光栅化漂移使
  字节级 SHA/SHA256 相等性不适合作为拦截条件（即使有 @xuan 的 PR108k 夹具时钟 + Date.now
  冻结，运行间仍约有 70/88 张 PNG 变化）。
- 保持相同视口尺寸的布局偏移。
- 颜色、对比度、透明度、排版和间距回归。

**PR-IR-02 v3 计划。** 添加 `pixelmatch` + `pngjs`，带校准
容差和被忽略的动态区域。在扩展到全部 18 个场景之前，仅在稳定子集
（`artifact-pane` / `first-run` / `artifact-errors`）上试点。根据观察到的漂移为每个场景配置容差。

**负责人。** @yuejing。基线发布与 @xuan 协调。

### PR-IR-03 — A11y 断言库

**是什么。** 一个小型 node:test 辅助函数，给定夹具 HTML 快照，
验证：
- 每个 `<button>` 要么有可见文本，要么有 `aria-label`。
- 每个模态框有 `role="dialog"` 和 `aria-labelledby` / `aria-label`。
- 每个 `<input>` / `<select>` 有关联的 `<label>`（通过 `for` 或
  包裹）。
- 快照中无 `tabIndex` > 0。

**为什么。** 目前 a11y 在 smoke.md 中手工检查；这增加一个自动化的
底线。

**负责人。** @yuejing。

### PR-IR-04 — Reduced-motion 夹具变体

**是什么。** 添加 `VERA_VISUAL_SMOKE_REDUCED_MOTION=1` 环境变量，无论操作系统设置如何都强制
`prefers-reduced-motion: reduce`。截图
流水线（PR-IR-01）为每个场景捕获 `reduced-motion.png` 变体。

**为什么。** 逐界面验证动效契约。

**负责人。** @yuejing。

### PR-IR-05 — i18n 字符串提取器

**是什么。** 构建时脚本，遍历 `vera-ui` + `vera-desktop` 中
JSX 文本节点和 `aria-label` / `title` 属性里的所有字符串字面量；把任何只含 ASCII
字母的标记为「未翻译的英文回退」。

**为什么。** 锁定「中文默认」契约。

**负责人。** @yuejing。

### PR-IR-06 — 严格组件 prop 类型审计

**是什么。** 禁止组件 props 中出现 `any` /
`Record<string, unknown>` / 未封闭对象类型的 ESLint 规则（或 tsc strict + grep）。

**为什么。** 组件契约必须由类型系统强制执行，而非
文档。

**负责人。** @yuejing。

---

## 6 — UI PR 模板（每个 UI PR 必须回答）

```markdown
## Contract
- Surface: <name + design-system.md §9.x reference>
- State machine: <list states>
- Boundary: <renderer ↔ main contract this PR touches>

## User Flow
1. <step>
2. <step>
3. <observable signal>

## Tests
- [ ] Pure helper test added in `vera-desktop/src/renderer/<name>.ts` +
      `vera-desktop/src/main/__tests__/<name>.test.ts`
- [ ] CSS contract test if styles touched
- [ ] Fixture scenario seeded in `visual-smoke-fixture.ts`
- [ ] Smoke path added in `smoke.md` with Pass + Fail signals
- [ ] Light + dark + narrow screenshots captured (or noted as PR-IR-01
      blocker)
- [ ] a11y assertions: <list — ARIA roles, kbd nav, focus trap, screen
      reader label>

## Security
- [ ] No raw user input rendered back without `redactSecrets`
- [ ] No secret in any IPC path (uses `hasSecret` envelope when needed)
- [ ] No absolute path in renderer (uses `relativePath` + storage helper)
- [ ] No `dangerouslySetInnerHTML` outside the artifact pane sandboxed
      iframe

## Not Included
- <explicit list of things out of scope this PR, link follow-ups>
```

如果一个 UI PR 没有回答全部五个部分，该 PR 不予合并。
「未包含」为空可以；缺失不行。

---

## 7 — 发布禁止条件（UI 特定）

打标签时若下列任一项成立，发布将被**阻止**：

### 7.1 功能

- 任何 P0 用户流程回归（发送 / 打开设置 / 选择模型 / 归档）。
- 当存在就绪默认值而旧会话仍能阻塞发送时（我们刚修复的 P0；通过冒烟路径 12 + 从旧会话新建聊天验证）。
- 「无法发送」/「已过期」横幅出现且无可操作的 CTA。

### 7.2 视觉

- 界面交付时没有浅色/深色或窄视口基线。
- 在没有明确基线更新提交的情况下，main 上截图 diff CI 变红。
- 检测到 token 漂移（组件 CSS 中的硬编码颜色）。

### 7.3 无障碍

- 任何模态框在焦点困住或焦点恢复上回归。
- 任何无 `aria-label` 的纯图标按钮。
- reduced-motion 夹具变体显示动画 > 0.1s。

### 7.4 文案 / 隐私

- 任何面向用户的字符串包含 "fake" / 「演示版」/ 内部枚举 reason
  码。
- 任何错误 toast 包含原始用户输入或未脱敏的秘密。
- 任何 tooltip / aria-label 在可见标签为中文时是英文
  （混合语言回退比完全翻译更糟）。

### 7.5 边界

- 任何 renderer 侧绝对文件系统路径。
- 任何在 `setWindowOpenHandler` 路径之外的 `window.open`。
- 任何不经 `generalizedErrorMessage` 返回 `errno` / 原生错误的 IPC 通道。

---

## 8 — 跨平台闸门

UI 默认在 macOS 上工作（那是主要的开发机）。在任何发布标签之前：

| 平台 | 负责人 | 冒烟运行 | 必需通过 |
|---|---|---|---|
| macOS arm64 | @yuejing | 全部 12 条冒烟路径 | 12/12 |
| macOS x86_64 | 待定 | 首次运行 + 发送 + 权限 | 3/3 |
| Windows | 待定 | 首次运行 + 发送 + 权限 | 3/3 |
| Linux（Ubuntu LTS） | 待定 | 首次运行 + 发送 + 权限 | 3/3 |

跨平台负责人待定——CI 基础设施就绪后由 @WAWQAQ 指派。

---

## 9 — 性能闸门

这些是预算上限；没有需要时我们不会优化到超过它们。

| 指标 | 预算 | 测量方式 |
|---|---|---|
| 冷启动到首帧绘制 | M1 air 上 < 1.5s | 手工秒表 |
| 输入区按键到字形延迟 | < 16ms（一帧） | 人眼检查 |
| 流式文本渲染 | 60fps（无卡顿） | DevTools 性能面板 |
| 200 个会话时侧边栏滚动 | 60fps | 手工滚动测试 |
| 设置模态框打开 | < 300ms（`@starting-style` 之后） | 人眼检查 |
| ⌘K 面板打开 | < 100ms | 人眼检查 |

回归会被调查而非阻止，除非回归超过预算的 2 倍。

---

## 10 — 界面交付清单模板

接手待交付界面（如健康中心、快速聊天）时，模式如下：

1. **阅读**目标界面的 `docs/design-system.md` §9.x。
2. 在 `vera-desktop/src/renderer/` 下**编写**带明确输入/输出类型的纯派生辅助函数。按 `<surface>.ts` 定位。
3. 在 `vera-desktop/src/main/__tests__/<surface>.test.ts` 中**编写**覆盖全部状态转换 + 边界情况 + 不变量的 node:test 用例。
4. 在 `vera-ui/src/components.tsx`（或界面足够大时的新文件）下**编写** React 组件。接入纯辅助函数。
5. 把组件**接入** `vera-desktop/src/renderer/main.tsx`（或相应的 App 级挂载点）。通过 `window.vera.*` 传递 IPC 句柄。
6. 只用 token 在 `vera-desktop/src/renderer/styles.css` 中**添加**样式。包含浅色 / 深色 / 动效变体。
7. 按 §3 **添加** ARIA 角色 + 键盘导航。
8. 在 `visual-smoke-fixture.ts` 中**添加**带真实数据（包括失败 / 空状态）的夹具场景。
9. 在 `vera-desktop/tests/smoke.md` 中**添加**带前置条件 / 步骤 / 通过信号 / 失败信号的冒烟路径。
10. PR-IR-01 落地后**捕获**浅色 + 深色 + 窄 + reduced-motion 截图。
11. **更新**本文件中的 §4 矩阵以反映新的 ✅ 行。
12. **PR 描述**填写 §6 模板。

一个界面通常需要 3–8 个 PR（组件脚手架 → 接入 IPC → 状态 → 键盘 → 冒烟 + 夹具）。避免超过 1000 行的巨型 PR；沿清单边界拆分。

---

## 11 — 负责人目录

| 领域 | 主要 | 后备 |
|---|---|---|
| 逐界面 UI 组件 | @yuejing | （暂无） |
| 视觉冒烟夹具填充 | @xuan（数据）+ @yuejing（消费） | — |
| 截图流水线（PR-IR-01） | @yuejing | — |
| 跨平台冒烟 | 待定 | 待定 |
| UX 文案 + i18n | @yuejing | @WAWQAQ 负责立场评审 |
| a11y 契约 | @yuejing | @kenji 负责不变量评审 |
| 主题 token（`vera-tokens.css`） | @yuejing | — |
| @vera/ui 包导出 | @yuejing | @xuan（构建链） |

---

## 12 — 开放问题 / 待定决策

- 跨平台：谁负责 Win + Linux 的运行？需要 CI runner 或
  这些机器上的人。
- 截图 diff 工具：playwright 还是自研 Electron runner？见
  PR-IR-01。
- 视觉回归基线：存放在仓库中（git LFS？）还是外部
  存储桶？
- 无障碍测试：原生辅助技术（VoiceOver、NVDA、Orca）覆盖——
  手工 + 频率？
- 性能回归：我们加插桩还是只靠手工？

本文档落地后，这些会归档为 `notes/open-questions.md`，并随首月工作推进而得到解答。

---

## 13 — 本文档如何演进

- 每个新界面为 §4 添加一行。
- 在 PR 评审中发现的新闸门违规为 §3 添加一条规则。
- 每个新基础设施需求为 §5 添加一行 PR-IR-XX。
- 当回归未经拦截到达 main 时，发布禁止条件会增加——这表明对应的闸门缺失。

本文档是**活的契约**，不是历史记录。如果一条规则过时（功能被砍、不变量被自动化消除），删除该规则并链接到移除它的提交。

最后更新：2026-05-22——在 P0 过期会话浪潮之后首次发布（PR108e/g 已交付，@xuan 的发送路径重绑定已落地）。
