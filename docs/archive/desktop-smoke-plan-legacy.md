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

# Vera 桌面端冒烟测试计划

> 归档于 2026-07-13。这份快照混合了已完成的 PR 验收路径与延期的设计。当前运行手册是 `vera-desktop/tests/smoke.md`；脚本、fixtures 和测试负责具体场景细节。

V0.2 UI / 凭据 / 生命周期工作所依赖的手动端到端路径。每条路径都列出前置条件、步骤，以及证明路径完好的*可观察*信号。其中任何一条出现回归，都意味着我们丢失了底线——发货前必须修复。

## 环境准备

要么全新开始（macOS 上 `rm -rf ~/Library/Application\ Support/vera`，Windows / Linux 用等价路径），要么使用现有 workspace 并按各路径的前置条件执行。所有路径都在单次启动的构建中进行（`npm --workspace @vera/desktop run dev` 或打包构建）。

### 真实 Electron 窗口冒烟（PR-DESKTOP-SMOKE-0）

Visual-smoke 截图**不能**证明原生桌面行为。任何触及 shell、侧边栏、modal 背景遮罩、窗口拖拽区域或顶层 renderer 生命周期的 PR，还必须运行真实窗口冒烟门禁：

```bash
npm --workspace @vera/desktop run smoke:real-window
```

该脚本构建 `@vera/core`、`@vera/ui` 和 desktop，用隔离的 `--user-data-dir` 启动真实 Electron 窗口，然后提示评审者确认截图无法验证的检查项：

- 干净启动，无 ErrorBoundary / 崩溃画面；
- 拖拽左 / 右 / 上 / 下边缘可调整窗口大小；
- 拖拽四个角可对角调整大小；
- 拖拽允许的标题栏 / 空白头部区域可移动窗口；
- 行、按钮、输入框和 modal 控件**不会**拖拽窗口；
- Search modal 可通过关闭按钮、背景遮罩和 Esc 打开与关闭；
- Tab / Shift+Tab 停留在 modal 内部，焦点返回触发元素；
- Search modal 打开时，窗口边缘和角仍可调整大小；
- 关闭 modal 并切换模块后，不出现 React hook 错误或 ErrorBoundary。

报告写入 `vera-desktop/tests/real-window-smoke/<timestamp>.md` 和 `.json`。任何检查失败，脚本都会以非零码退出。在评审线程中附上或总结该报告之前，UI-shell PR 不满足合并条件。

为了确定性 visual smoke，用隔离的 fixture workspace 启动 dev 构建：

```bash
VERA_VISUAL_SMOKE_FIXTURE=all npm --workspace @vera/desktop run dev
```

单场景启动同样支持：

```bash
VERA_VISUAL_SMOKE_FIXTURE=first-run npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=provider-workspace npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=fallback-source npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=fetched-empty npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=connection-error npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=turn-narrative npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=streaming-sidebar npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=permission-destructive npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=artifact-pane npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=artifact-errors npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=stale-sessions npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-data npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-personalization npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-network npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-bots npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-about npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-theme npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=settings-daily-review npm --workspace @vera/desktop run dev
VERA_VISUAL_SMOKE_FIXTURE=workstation-statuses npm --workspace @vera/desktop run dev
```

Fixture 模式仅限 dev/test，拒绝打包构建。它每次启动都会从零 seed `workspaces/visual-smoke-*`，因此截图可重复，且不会触碰真实用户的 workspace。当环境变量未设置时，`visualSmoke` IPC 返回 `null`；仅用于 smoke 的 renderer 流式 / 权限状态绝不能在正常使用中出现。

### 自动化截图采集（PR-IR-01）

使用驱动脚本为每个 fixture 场景采集 light/dark/narrow/reduced-motion 基线 PNG：

```bash
# 单场景 × 全部 8 个变体（light/dark × 1280/990 × motion/reduced）
npm --workspace @vera/desktop run screenshots:single artifact-pane

# 全部场景 × 全部变体（完整回归基线）
npm --workspace @vera/desktop run screenshots
```

输出：`vera-desktop/tests/screenshots/<scenario>/<variant>.png`。

实现：脚本为每个（scenario, variant）用 `VERA_VISUAL_SMOKE_FIXTURE=<scenario>` + `VERA_VISUAL_SMOKE_AUTO_CAPTURE=<variant>`（可选加 `VERA_VISUAL_SMOKE_REDUCED_MOTION=1`）spawn 一次 `electron .`。fixture 稳定后，renderer 等待 2 个 RAF + 400ms 空闲，然后调用 `window.vera.visualSmoke.capture()`。主进程通过 `webContents.capturePage()` 写入 PNG，并输出确定性 stdout 标记 `[visual-smoke] captured scenario=… variant=… path=…`。驱动脚本 grep 该标记，杀掉子进程，把 PNG 复制到规范截图目录。

### 截图 diff 门禁（PR-IR-02 阶段 1）

`screenshots:diff:stable` 是稳定基线子集（`artifact-pane`、`first-run`、`artifact-errors`）的阻塞性**采集健全性**门禁：

```bash
npm --workspace @vera/desktop run screenshots
npm --workspace @vera/desktop run screenshots:diff:stable
```

**该门禁能捕获的问题：**
- 缺失、损坏或被截断的 PNG。
- 采集 IPC 或 fixture 启动故障。
- 尺寸错误，例如 `1280` variant 以 `990` 宽度采集。
- 采集脚本与 diff 脚本之间 scenario/variant 矩阵漂移。

**该门禁无法捕获的问题：**
- 图像内部的像素级 UI 回归。
- 保持总图像尺寸稳定的布局位移。
- 颜色、对比度、不透明度、排版或间距回归。

Electron/字体光栅化漂移使字节级 diff 无法作为阻塞条件。在加入带标定容差和忽略动态区域的像素级 diff（PR-IR-02 v3）之前，仍然需要人工评审截图。未来的该门禁应先在稳定子集（`artifact-pane` / `first-run` / `artifact-errors`）试点，再扩展到所有场景。

在有意的视觉变更后提升当前稳定子集基线：

```bash
npm --workspace @vera/desktop run screenshots:baseline:stable
```

完整基线经评审并提升后，使用不带 `:stable` 后缀的相同脚本。场景清单和输出基数由采集脚本中的 `ALL_SCENARIOS` 和 `VARIANTS` 所有：

```bash
npm --workspace @vera/desktop run screenshots:diff      # 所有场景
npm --workspace @vera/desktop run screenshots:baseline  # 完整提升
```

### Reduced-motion 变体（PR-IR-04）

将 `VERA_VISUAL_SMOKE_REDUCED_MOTION=1` 与上述任意方式组合，可将所有动画/过渡压缩到约 0.01ms，无论宿主操作系统的无障碍设置如何。截图流水线（PR-IR-01）用它为每个界面采集 "reduced motion" 变体。

```bash
VERA_VISUAL_SMOKE_FIXTURE=artifact-pane \
  VERA_VISUAL_SMOKE_REDUCED_MOTION=1 \
  npm --workspace @vera/desktop run dev
```

实现：主进程通过 `VisualSmokeState` 传递该标志；renderer 在 `<html>` 上应用 `data-vera-reduced-motion="true"`；`styles.css` 中的 CSS 匹配该属性选择器，使用与 `prefers-reduced-motion: reduce` 媒体查询相同的覆盖规则。真实用户永远不会走到这条代码路径，因为除非设置了 `VERA_VISUAL_SMOKE_FIXTURE`，否则 `visualSmoke.getState()` 返回 `null`。

---

## 路径 1 — 首次启动且没有真实模型

**前置条件。** 全新安装，设置中没有已启用的 LlmConnection。Fixture 场景：`first-run`。

**步骤。**
1. 启动 Vera。
2. 不要向 composer 输入内容；直接观察聊天界面。

**通过信号。**
- 聊天界面渲染 **OnboardingHero**（带六个精选 provider 磁贴的 "Welcome to Vera" 卡片），而不是 `EmptyChatHero`（"想一起做点什么？"）或空白画面。
- 点击任意 provider 磁贴打开 设置 · 模型。
- "先用 FakeBackend 走一遍流程 →" 聚焦 composer。

**失败信号。**
- 没有启用连接时仍显示空聊天 hero。
- 即使已启用连接，Onboarding hero 仍一直显示。

---

## 路径 2 — 添加连接并验证

**前置条件。** Workspace 已存在；你有一个真实的 provider API key（Anthropic / OpenAI / DeepSeek / Z.ai / 等）。

**步骤。**
1. ⌘K → "设置 · 模型" → Enter（PR64 palette 路由）。
2. 添加 Anthropic 连接，粘贴 API key，保存。
3. 通过导航切换到 "设置 · 账号"。
4. 观察新连接行：信息色调徽章应显示 **已配置 · 未验证**（尚无绿色勾选）。
5. 点击该行上的 "测试连接"。
6. 等待 toast。

**通过信号。**
- 成功 toast："连接已验证" + 延迟 + 被测模型。
- 行徽章翻转为绿色/成功色调的 **已验证可用**。
- 行卡片边框 + 背景切换为成功样式。
- 默认连接（如果在 设置 · 通用 或模型流程中设置）在名称行上有一个小 "默认" 胶囊。
- 徽章下方显示格式化后的 `lastTestAt` 时间戳。

**失败信号。**
- 测试按钮卡在禁用状态或永远旋转。
- 不关闭/重新打开设置，状态不刷新。
- 徽章显示 "disabled + verified" 或任何混合标签。

---

## 路径 3 — 失效凭据呈现在聊天头部

**前置条件。** 一个此前已验证的连接。你打开的会话使用该连接。
聊天头部状态的 Fixture 场景：`connection-error`。

**步骤。**
1. 设置 · 模型 → 选中该连接 → 破坏 API key（替换为明显无效的值）→ 保存。
2. 设置 · 账号 → 点击该行上的 "测试连接"。
3. 等待失败 toast。
4. 关闭设置，回到使用该连接的聊天。

**通过信号。**
- 账号行徽章变为 **需要重新登录**（警告色调）或 **连接出错**（破坏性色调），取决于底层 errorClass（401/403 → needs_reauth；5xx/timeout/network → error）。
- `lastTestMessage` 显示通用短语，如 `Authentication failed` / `Request timed out` — 绝不显示原始 provider body 或 API key。
- 聊天头部现在显示一个与行色调一致的小型可点击胶囊（"需要重新登录" 警告或 "上次连接失败" 破坏性）。
- 点击胶囊直接跳转到 设置 · 账号。

**失败信号。**
- 行已显示失败时，聊天头部缺少告警。
- 通用消息包含原始 `sk-...` / Bearer token / 带查询参数密钥的 URL。
- 单次失败后连接被自动禁用（失败应是一种状态，而不是生命周期变更 — 由用户手动禁用）。

---

## 路径 4 — 流式 + 删除活动会话的安全性

**前置条件。** 至少一个已验证连接。活动会话已选定模型。

**步骤。**
1. 发送一条 prompt；模型开始流式输出。
2. 验证 composer 工具栏换成 **"Vera 正在思考…"** 加脉动的强调色圆点，Send 按钮消失，唯一的 primary 动作是红色 **Stop** 按钮。
3. 尝试在 textarea 内按 Esc — 它应调用 onStop，流应被取消。
4. 发送一条新 prompt 并让它运行。
5. 在流式进行中删除当前活动会话。可选方式，从最容易的开始：
   - **IPC 级（自动测试运行首选）**：在 DevTools 控制台触发 `window.vera.sessions.remove(activeSessionId)`。被测契约是 `sessions:changed { reason: 'deleted', sessionId }` 广播，而不是右键操作。
   - **GUI**：从指向同一 workspace 的*第二个* Vera 窗口（必要时打开新 BrowserWindow），右键点击该行 → 删除 → 确认。原窗口必须观察到该广播。

**通过信号。**
- 侧边栏移除该行（通过 `sessions:changed` 广播）。
- 聊天界面清空：活动会话取消设置，消息清空，没有卡住的流式气泡。
- 之后没有 "向已删除会话发送" 的错误；composer 保持响应，用户可开始新聊天。

**失败信号。**
- 底层会话消失后，composer 仍显示流式提示。
- Renderer 崩溃，或在空标题上显示上一会话的消息。
- 已删除会话的工具活动继续流入新会话。

---

## 路径 5 — PermissionDialog 破坏性路径

**前置条件。** 一个允许模型调用工具的连接（例如默认 agent 设置）。用户处于 **Ask** 权限模式。
Fixture 场景：`permission-destructive`。

**重要 — 不要真正运行破坏性命令。** 目标是验证*对话框呈现*，而不是删除真实文件。两种方式任选：
- 让 assistant *提出*该动作，使其浮现 PermissionRequest，然后 **Deny**。或
- 通过 DevTools 模拟 IPC 事件注入合成的 permission request，让对话框挂载而无需任何工具真正挂起。

**步骤。**
1. 让 runtime 产生一个破坏性 PermissionRequest（例如告诉模型 "我会自己跑，先告诉我你打算执行什么 rm 命令"，让它发出一个你可以拒绝的 `fs_destructive` 请求），或在 DevTools 中注入合成请求。
2. 等待 PermissionDialog 出现。

**通过信号。**
- 对话框图标为 **AlertOctagon**（红色），标签为 **不可恢复的文件系统操作**。
- Summary 区域在代码块中显示确切的 shell 命令 + 如果 runtime 提供了超时元信息行也一并显示。
- 在 "本轮对话内记住选择" 复选框下方，可见红色强调说明 **"这类操作不可恢复，确认前请再读一遍上面的参数。"**。
- primary 按钮以破坏性色调（红色）显示 **"我已确认，允许"**，而不是通常的蓝色 "允许"。
- "记住本轮" 说明文字明确显示 "(同类型工具不再询问，关闭/切换对话后失效)"。
- 点击 Deny 不会运行该命令；assistant 收到拒绝信号。

**失败信号。**
- 对明显破坏性的操作，对话框以中性/信息色调（无红色处理）渲染动作。
- "记住本轮" 跨会话或应用重启持续存在（应仅限本轮）。
- 权限对话框可用 Esc 关闭（不应如此 — 权限决定明确禁用了 Esc）。

---

## 路径 6 — ModelTable workspace（UI-02）

**前置条件。** 一个已验证的 Z.ai 或 OpenAI 协议连接，可用模型 >6 个。设置打开在 模型 → 点击进入该连接。
Fixture 场景：`provider-workspace`、`fallback-source` 和 `fetched-empty`。

**步骤。**
1. 验证模型计数下方的来源行显示 *"实时拉取的 N 个模型（X 拉取）"*（绿色色调）。点击 "从 API 刷新" 一次；该行应更新为 "刚刚拉取"（或类似文案）。
2. 在模型超过 6 个时，在搜索框中输入。过滤到一个排除当前默认值的子串。
3. 观察列表上方的隐藏默认值提示：*"当前默认 `…` 不在搜索结果中 · 点这里清空搜索"*。点击它；搜索清空，默认行可见。
4. Tab 进入模型列表；多次按 ArrowDown。
5. 按 Home，然后按 End。

**通过信号。**
- 来源标签色调匹配：fetched 为 success（绿色），fallback 为 info，"0 models from provider" 走 fetched-empty 分支。
- ArrowDown/ArrowRight 移动焦点并同时将选中的默认 radio 向下移动一格。ArrowUp/ArrowLeft 向上移动。Home 跳到第一行；End 跳到最后一行。
- 默认 radio 圆点和 "默认" 徽章跟随活动行。
- 环绕：在最后一行按 ArrowDown 环绕到第一行；在第一行按 ArrowUp 环绕到最后一行。
- 隐藏默认值提示仅在搜索过滤掉默认值时挂载；搜索清空后消失。

**失败信号。**
- 来源标签显示 "实时拉取" 但缓存的模型看起来陈旧（例如精确的 fallback 列表 `glm-4.5/4.6/4.7`）— 这正是 PR91 关闭的静默 fallback 回归。
- ArrowDown 只移动焦点而不选择（UI-04 ARIA radiogroup 回归）。
- 搜索过滤隐藏默认值且无提示 — 用户会以为默认值被删除了。

---

## 路径 7 — 聊天 turn 叙事（UI-04）

**前置条件。** 任意已验证连接。活动会话包含多步交流（用户消息 → 工具调用 → assistant 最终回复）。
Fixture 场景：`turn-narrative`。

**步骤。**
1. 提问：*"读一下 README.md 并总结"*（或任何触发 Read 工具调用的 prompt）。
2. 等待完整 turn 落地。
3. 观察聊天界面内部的结构。

**通过信号。**
- 用户消息、工具活动面板和 assistant 回答在视觉上被归为**一个 turn 块**（`<section class="vera-turn">`），而不是三个独立漂浮的条目。
- Turn 元信息（模型 id，例如 `claude-sonnet-4-5`、时长 `X.X s`、费用 `$X.XXXX`）位于 footer 的 info-action tooltip 中，悬停时显示（#546 移除了顶部摘要 chip 条）。
- 如果模型提供了思考内容，assistant 回答上方会出现一个折叠的 `<details>` 块 *"查看思考过程 — 模型推理草稿，不是最终答案"*；展开后显示推理内容及专属的 "复制思考过程" 按钮。
- 对于进行中的 turn（用户已发送，assistant 尚未落地），不显示时长 — footer 的 info tooltip 在 assistant turn 落地前省略时长行。

**失败信号。**
- 工具活动出现在聊天最底部而不是其 turn 内部（旧的 "message stack + tools panel" 布局）。
- 默认 "Copy message" 按钮包含思考块（应只属于专门的 "复制思考过程" 按钮）。
- costUsd 未知时，token 费用悬停显示 `$0.0000`。

---

## 路径 8 — 侧边栏流式 + 多会话指示（PR85）

**前置条件。** 至少存在两个会话。打开其中一个。
Fixture 场景：`streaming-sidebar`。

**步骤。**
1. 在会话 A 中发送一条 prompt；让它开始流式输出。
2. 不等流式结束，点击侧边栏切换到会话 B。
3. 观察侧边栏中会话 A 的行。

**通过信号。**
- 会话 A 的行在会话名旁边显示一个脉动的强调色小圆点。
- 行预览文本显示 *"Vera 正在思考…"*（覆盖先前的 `lastMessagePreview`）。
- 流式中的行抑制未读光晕圆点（按 PR85，流式优先）。
- 流式结束后，脉动圆点消失，行可显示未读光晕 + 更新后的 `lastMessagePreview`。

**失败信号。**
- 流式会话与空闲会话看起来完全一样（丢失了指示）。
- 脉动圆点与未读圆点同时渲染（违反优先级）。

---

## 路径 9 — 命令面板诊断 + 导出（UI-05, PR86）

**前置条件。** Vera 正在运行，至少有一个已验证连接，且活动聊天会话包含多个 turn。
Fixture 场景：`all`。

**步骤。**
1. 按 ⌘K。浏览分组：操作 / 主题 / 设置 / 诊断 / 连接 / 会话。
2. 输入 "测试默认"。"测试默认连接 · {name}" 命令应在 诊断 分组中出现；按 Enter。
3. 再次按 ⌘K，输入 "导出"。"导出当前对话为 Markdown" 命令应出现；按 Enter。
4. 将剪贴板内容粘贴到 markdown 查看器中。
5. 再按一次 ⌘K，输入 "设置 · 模型" 并按 Enter（此时设置未打开）。

**通过信号。**
- ⌘K palette 打开，包含相同的五段导航（操作/主题/设置/诊断/连接）加底部的逐会话条目。
- "测试默认连接" 运行连接测试，浮现成功或失败 toast，且账号行的 `lastTestStatus` 徽章无需关闭 palette → 重新打开设置即可刷新。
- "导出当前对话为 Markdown" 在剪贴板上生成结构化 markdown 文档，包含 `# {sessionName}` + `## 你` / `## Vera` 章节；不包含思考块；工具调用以带名称 + 意图的列表形式出现（意图经过 `redactSecrets`）。
- "设置 · 模型" 直接在 模型 板块打开设置，即使设置已打开在其它板块。

**失败信号。**
- "设置 · ..." 命令需要第二次点击才能真正导航（通过 `requestedSection` 的热切换回归）。
- Markdown 导出包含思考块（按 @kenji 的 PR86 评审，这是安全回归）。

---

## 路径 10 — Sandbox 桥接健全性

**前置条件。** Vera 以 fixture 模式（`VERA_VISUAL_SMOKE_FIXTURE=all`）运行，或使用至少配置了一个 provider 的正常 dev workspace。此路径存在的理由是 BrowserWindow renderer 以 `sandbox: true`、`contextIsolation: true` 和 `nodeIntegration: false` 运行；所有应用行为仍必须通过 `window.vera` 流动。

**步骤。**
1. 打开设置，更改一个无害的外观偏好，然后关闭。
2. ⌘K → "打开工作区文件夹"；验证操作系统打开允许列表内的文件夹。
3. 在已配置的 workspace 中 ⌘K → "测试默认连接"，或在 fixture 模式下点击连接测试动作并观察 toast 路径。
4. 在真实已配置的 workspace 中，发送一条 prompt 并在流式时按 Stop。在 fixture 模式下，验证流式侧边栏行和权限对话框仍能从 `visualSmoke.getState()` 渲染。

**通过信号。**
- `window.vera.settings`、`window.vera.app.openPath`、`window.vera.connections`、`window.vera.sessions` 和 `window.vera.visualSmoke` 都能通过 preload IPC 响应。
- 外部页面不会在 Vera BrowserWindow 内部打开；允许的 http(s) / mailto 链接通过操作系统处理，拖放的文件不会导航 renderer。

**失败信号。**
- sandbox 加固后，设置、连接测试、openPath、发送/停止或 fixture 状态损坏。
- 点击的 markdown 链接或拖放的文件替换了 React 应用界面。

---

## 路径 11 — Artifact 面板（UI-02 后续，§9.1）

**前置条件。** Fixture 场景 `artifact-pane` — 在 workspace 的 `artifacts/` 根目录下 seed 一个名为 "Artifact Pane 验收" 的会话，含 3 个 live artifacts（`report.html`、`patch.diff`、`notes.md`）。

```bash
VERA_VISUAL_SMOKE_FIXTURE=artifact-pane npm --workspace @vera/desktop run dev
```

**步骤。**
1. 用上述 fixture 启动 Vera。artifact 会话通过 `visualSmoke.getState()` 自动激活。
2. 验证右侧 **ArtifactPane** 可见，头部有数量徽章 **3**，列表中三行（最新的在前）。
3. 点击 **report.html** 行。确认预览区域渲染一个沙盒化的 `<iframe>`，包含文档正文和顶部状态栏，显示 *"此预览中已禁用外部链接 · 1 个链接"*。
4. 打开 DevTools，检查 iframe 元素。其 `sandbox` 属性必须恰好是 `allow-scripts` — 绝无 `allow-same-origin`、`allow-top-navigation`、`allow-popups`、`allow-forms`、`allow-modals`。
5. 点击 iframe 内被禁用的链接。不应发生任何事（父 renderer 中无导航、无弹窗、无 console 错误）。
6. 点击 **patch.diff** 行。预览切换到带红/绿行着色的 diff 视图（`data-line="add"` / `data-line="del"`）。
7. 点击 **notes.md** 行。预览切换到以等宽字体 `<pre>` 渲染的 markdown 文件内容。
8. 在浅色主题、深色主题和窄窗口（约 900 px 宽）下截图。在窄宽度下，验证 ArtifactPane 渲染为 composer 下方的 bottom sheet 而不是右侧栏。
9. 点击面板头部的折叠开关。面板应收窄为一条窄条；刷新页面（⌘R / F5）。面板应仍保持折叠（通过 localStorage `vera-artifact-pane-collapsed-v1` 持久化）。
10. 再次展开。验证刷新后列表仍显示 3 个 artifacts。
11. 键盘焦点位于 artifact 列表或预览内部时，按 `Escape`。面板折叠，焦点回到 composer。Command Palette / modal 打开时，按 `Escape` 正常关闭该浮层；ArtifactPane 不得在其自身焦点子树之外抢占 Esc。

**通过信号。**
- ArtifactPane 头部显示数量 `3` 和三行：`report.html`、`patch.diff`、`notes.md`。
- HTML 预览在 iframe 内渲染，其唯一的 sandbox token 是 `allow-scripts`。状态栏显示 *"此预览中已禁用外部链接 · 1 个链接"*（fixture HTML 包含一个 `<a href>`）。
- Diff 预览显示带红/绿行标记的补丁。
- Markdown 预览以等宽字体显示原始文件文本。
- 工具栏对所有类型显示「在 Finder 中打开」+「另存为」；只有文本支持类型（file / diff / html）额外显示「复制文本」 — `image` / `pdf` 行不显示（评审门禁 #5）。
- 折叠状态通过 localStorage 跨刷新持久化；刷新后列表仍有 3 个条目。
- 窄宽度下 ArtifactPane 显示为 composer 下方的 bottom sheet；composer textarea 和 Send/Stop 按钮保持可见可用。
- ArtifactPane 焦点子树内的 Esc 折叠面板并让焦点回到 composer；面板外的 Esc 保持全局 modal/palette 优先级不变。

**失败信号。**
- fixture 已 seed 三个 artifacts 但面板空白（订阅 / 列表 IPC 回归）。
- HTML 预览以文本形式显示原始 HTML 源码，而不是在 iframe 内渲染。
- 外部链接状态栏缺失或计数 = 0，尽管 fixture HTML 包含 `<a href="https://example.com">`。
- 点击 iframe 内的链接导航了父 renderer 或打开了弹窗（sandbox 应同时阻止两者）。
- iframe 的 `sandbox` 属性包含 `allow-same-origin`、`allow-top-navigation`、`allow-popups`、`allow-forms`、`allow-modals` 中的任意一个。
- `image` 或 `pdf` 行渲染了 复制 按钮（二进制类型绝不能有）。
- 窄窗口仍将面板作为被挤压的右侧栏，遮挡 composer，或使 Send/Stop 按钮不可达。
- 焦点在 Command Palette / 设置 / 权限对话框时，ArtifactPane 处理了 Esc。

---

## 路径 12 — 侧边栏为过期会话显示 "已过期" 胶囊

**前置条件。** Fixture 场景 `stale-sessions`：

```bash
VERA_VISUAL_SMOKE_FIXTURE=stale-sessions npm --workspace @vera/desktop run dev
```

该 fixture seed 一个 workspace，复现触发 P0 的磁盘状态 — 侧边栏中的三个会话：
- 「旧的 FakeBackend 演示」 — `backend='fake'`，slug `fake`（过期）
- 「旧的 Claude backend 会话」 — `backend='claude'`，slug `fake-claude`（过期，legacy）
- 「正常会话（Z.ai Live）」 — `backend='ai-sdk'`，slug `zai-live`（健康）

活动会话特意设置为 FakeBackend 过期行 — 该 fixture 用于验证 @kenji 的活动-过期门禁（活动行仍必须显示胶囊）。

**步骤。**
1. 针对该 workspace 启动 Vera。
2. 打开侧边栏；观察可见的会话行。
3. 点击进入一个过期会话，使其成为活动会话。
4. 点击进入健康会话（`backend='ai-sdk'`，真实 slug）。

**通过信号。**
- 每个过期会话行**变暗（opacity ≈ 0.7）**且在会话名右侧显示一个琥珀色小胶囊，标签为 **「已过期」**。
- 健康会话行完全不透明，无胶囊。
- 过期会话**处于活动状态**（已点击进入）时：
  - 行 opacity 回到 **1.0**（活动高亮压过变暗）。
  - **「已过期」胶囊仍然渲染** — 活动高亮不得抹掉警告信号（@kenji 评审门禁）。
  - 聊天头部浮现 PR108e 的对应横幅：`backend='fake'` → "会话已过期 · ..."；slug 缺失 → "原连接已删除..."
- 切回健康会话时，胶囊和头部横幅都消失；侧边栏其余部分不变。

**失败信号。**
- 过期行与健康行看起来完全一样（胶囊缺失或变暗处理缺失）。
- 活动过期行**隐藏**胶囊（@kenji 门禁回归 — 一旦用户点击进入一个坏会话，侧边栏仍应标记其为坏；否则用户会以为会话正常）。
- 健康行获得了胶囊 / 变暗处理（过度标记 — `staleSessionIds` Set 不应包含能解析到当前连接的 `slug`）。
- 胶囊颜色匹配破坏性（红）色调而非警告（琥珀）色调；破坏性色调保留给即使有 @xuan 的静默重绑、发送仍会实际失败的场景。

---

## 路径 13 — Artifact 面板失败状态与另存为（§9.1）

**前置条件。** Fixture 场景 `artifact-errors` — seed 正常的 artifact 会话加三个失败行：

- `deleted.md`，带 `status: deleted` tombstone
- `unsupported.bin`，含无法通过 MIME 嗅探的二进制字节
- `missing.md`，其元数据对应的后备文件缺失

```bash
VERA_VISUAL_SMOKE_FIXTURE=artifact-errors npm --workspace @vera/desktop run dev
```

**步骤。**
1. 用上述 fixture 启动 Vera。"Artifact Pane 验收" 会话自动激活。
2. 验证面板计数包含六行，已删除的行在视觉上用 "已删除" 徽章标记。
3. 选中 `deleted.md`。预览必须显示明确的已删除失败状态，即使后备文件存在也不得读取。
4. 选中 `unsupported.bin`。预览必须显示 "不支持的文件类型"，且不得显示原始字节或复制按钮。
5. 选中 `missing.md`。预览必须显示 "无法读取 artifact 文件"。
6. 选中 `report.html`，点击「另存为」，取消保存对话框。不应出现错误 toast。
7. 再次点击「另存为」并选择一个临时目标位置。文件应被复制到那里，并出现成功 toast。

**通过信号。**
- `deleted.md`、`unsupported.bin` 和 `missing.md` 各自渲染不同的失败文案；无空白预览状态。
- 已删除 artifact 的读取由 tombstone 语义阻止，而不是文件缺失。
- 不支持的 MIME 绝不把原始字节送入 renderer 预览。
- 另存为使用真实的 OS 保存对话框并复制 artifact 文件；它不再别名为 "在 Finder 中打开"。
- 取消另存为是静默的。

**失败信号。**
- 任意失败行渲染空白预览。
- 已删除 artifact 的内容仍可读取。
- 不支持的 MIME 显示乱码/原始二进制。
- 另存为在 Finder 中显示文件而不是打开保存对话框。
- 取消另存为显示错误 toast。

---

## 路径 14 — Workstation 侧边栏状态分组（§9.8）

**前置条件。** Fixture 场景 `workstation-statuses` — seed 11 个会话，覆盖每种 SessionStatus（包括 aborted）加 4 个 blocked 变体（每个 SessionBlockedReason 一个）：

```bash
VERA_VISUAL_SMOKE_FIXTURE=workstation-statuses npm --workspace @vera/desktop run dev
```

活动会话是运行中的那个，因此聊天头部状态徽章（"进行中"）会与侧边栏一起出现在截图中。

**步骤。**
1. 用上述 fixture 启动 Vera。"正在生成报告" 会话处于活动状态。
2. 按顺序观察侧边栏分组。从上到下预期为：`进行中`、`等待你`、`已阻塞`、`会话`、`待审核`、`已完成`、`归档`、`已中止`。`归档` 和 `已中止` 默认都折叠。
3. 悬停每行的状态图标。Tooltip 显示状态标签（4 个 blocked 行显示通用化的阻塞原因文案 — 绝不显示原始 enum 标识符）。
4. 点击 `归档` 分组头部切换展开状态。
5. 点击任意 blocked 行。验证聊天头部状态徽章更新为匹配的原因文案。

**通过信号。**
- 分组顺序匹配：`进行中 / 等待你 / 已阻塞 / 会话 / 待审核 / 已完成 / 归档 / 已中止`。`归档` 和 `已中止` 都是默认可折叠分组；展开任一分组会显示其行。
- 每个非活动会话行在会话名左侧显示 SessionStatusIcon，色调匹配（running=强调色脉动、waiting=警告、blocked=破坏性、review=info、done=success、archived=muted、aborted=muted）。
- blocked 行通过悬停 tooltip 显示通用化原因：
  - `缺少可用模型连接`
  - `需要重新登录`
  - `等待权限确认`
  - `工具调用失败`
  - `运行中断`
- 聊天头部徽章 "进行中" 可见（因为活动会话正在运行）。
- `归档` 分组默认折叠；点击头部展开；展开状态在会话内的重渲染之间保持（但跨启动不保持 — 这是故意的，archived 处于休眠状态）。
- 所有可见标签都是中文；没有原始 enum 字符串泄露到 UI。

**失败信号。**
- 分组顺序不同（例如 `归档` 浮到顶部，或 `已完成` 出现在 `进行中` 之前）。
- `已中止` 分组被静默隐藏（@kenji PR109b 评审回归 — aborted 处于休眠状态但必须保持可见）。
- blocked tooltip 暴露原始 enum（`NO_REAL_CONNECTION`、`auth`、`permission_required`、`tool_failed`、`unknown` — 这些是内部标识符，不是用户文案）。
- `归档` 分组默认展开（应默认折叠；PR108k-yj 约定）。
- 运行中的会话没有旋转指示（`Loader2` 图标应通过 CSS `animation` 旋转，除非 `prefers-reduced-motion` 生效或设置了 `VERA_VISUAL_SMOKE_REDUCED_MOTION=1`）。
- 活动会话 `status !== 'active'` 时，聊天头部生命周期徽章缺失。

---

## 路径 15 — Turn 控制契约 API + UI（§9.9, PR109c / PR109d / PR109e / PR109f）

**范围。** PR109c 交付了契约/runtime；PR109d–f 在其上叠加 UI：turn footer 动作、aborted 标记、失败横幅、正向 + 反向 lineage 徽章、分支会话横幅。

**Fixture。** `turn-control-history` 状态族 — 三个场景共享一个磁盘 seed，仅活动会话不同：

| 场景                              | 活动会话                              | 验证内容                                               |
| --------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `turn-control-history`            | `…-primary`                           | lineage 徽章、aborted 标记、失败横幅                    |
| `turn-control-branch-visible`     | `…-branch-visible`                    | 分支横幅文案 `分自 ${primaryName}` 渲染                 |
| `turn-control-branch-orphan`      | `…-branch-orphan`                     | 分支横幅缺席（父会话不在列表中）                        |

三个变体属于同一状态族 — 只有活动会话切换。孤儿分支的 `parentSessionId` 指向一个特意**不** seed 到磁盘的会话 id，因此 renderer 的 `deriveBranchBanner()` 会把父会话解析为缺失。

**运行。**

```bash
VERA_VISUAL_SMOKE_FIXTURE=turn-control-history VERA_VISUAL_SMOKE_THEME=light \
  VERA_VISUAL_SMOKE_AUTO_CAPTURE=primary-light-1280 npm run dev
```

用 `turn-control-branch-visible` 和 `turn-control-branch-orphan` 重复。

**路径 15 验收矩阵（6 个可观察信号）。**

- **S1 — 失败横幅文案。** primary 会话中的 `turn-failed` 行渲染一个破坏性横幅，使用 `errorClass='timeout'` 的中文通用化短语（"请求超时"）。原始 enum 标识符（`timeout`）绝不能出现在渲染的 DOM 中。对截图 DOM 做子串检查：`not contains(/(timeout|auth|rate_limit|network|provider_unavailable|tool_failed|permission_required|unknown)/i)`。
- **S2 — aborted turn 标记。** `turn-aborted` 行在 assistant 文本旁显示一个柔和的 inline 标记 "(已中断)"；部分输出被保留（用户仍可读取 abort 之前生成的内容）。
- **S3 — lineage 徽章滚动。**
  - *正向（后代顶部）：* 在 `turn-regen-new` 上徽章显示 "重新生成自 turn turn-regen"，点击它将 `turn-regen-origin` 滚动到视口中央。
  - *反向（origin footer）：* 在 `turn-regen-origin` 上徽章显示 "已重新生成 → turn turn-regen"，点击它将 `turn-regen-new` 滚动到视口中央。
- **S4 — 分支横幅的正例与反例。**
  - 在 `turn-control-branch-visible` 中，聊天头部显示 `分自 ${primary.name}`。该横幅是一个可点击按钮，导航到 primary 会话。
  - 在 `turn-control-branch-orphan` 中，聊天头部**不**出现横幅 — 也不存在禁用/死按钮占位。DOM 检查：`.vera-session-branch-banner` 必须不存在。
- **S5 — visual-smoke 折叠平滑滚动。** 三个变体中任一 lineage 徽章点击都使用 `scrollIntoView({ behavior: 'auto' })`，因为 fixture 在 `<html>` 上设置了 `data-vera-visual-smoke="true"`。由 `scroll-motion-policy.test.ts` 验证（仅 visual-smoke 就足够 — 不需要 reduced-motion 属性）。
- **S6 — 无原始 enum 泄露。** 在所有三个变体中，渲染的 DOM 都不包含 `timeout`、`auth`、`rate_limit`、`network`、`provider_unavailable`、`tool_failed`、`permission_required`、`unknown` 作为原始子串出现。同一门禁适用于 `SessionBlockedReason`（`NO_REAL_CONNECTION` 等）。

**支撑该矩阵的自动化覆盖。**

- 辅助测试：
  - `session-status-presentation.test.ts` — S1、S6（仅中文，无原始 enum）
  - `turn-footer-actions.test.ts` — 每种 TurnStatus 的 footer 矩阵
  - `branch-banner.test.ts` — S4（父缺失 → undefined）
  - `scroll-motion-policy.test.ts` — S5（仅 visual-smoke → `auto`）
  - `turn-control-matrix.test.ts` — 横切矩阵门禁
- `visual-smoke-fixture.test.ts` 中的 fixture seed 测试：
  - 三个场景都 seed 相同的三个会话
  - primary 会话日志携带预期的 `turn_state` 记录（retry、regenerate、aborted、带 `errorClass='timeout'` 的 failed）
  - 孤儿父会话**绝不**写入磁盘

**原始 PR109c 契约门禁（仍然适用）。**
- retry/regenerate 后旧 turn 不可变；不会覆盖旧的 assistant 输出。
- 允许从 aborted turn 分支；子会话复制到被中断的 turn 边界。当前 UI 只在分支动作 tooltip 中显示 "从中断前"（PR109d）；在父 turn 预加载落地之前，会话横幅保持为 "分自 ${parentName}"，因此绝不在没有证据的情况下声称中断边界。
- `SessionChangedReason` 包含 `turn-status-change`，让 renderer 重新加载 turn 元数据，而不伪装成会话生命周期状态变更。

---

## 路径 17 — UI 信任边界 + 设置持久化契约

九个 UI / 设置 PR 的门禁契约的单一落地页，这些 PR 在 **2026-05-23 → 2026-05-24** 之间落地（整合时最终 main HEAD：`7a2b6eb`）。每个门禁刻意保持简短：**契约不变量**才是合并门禁今后必须强制的内容；实现历史存在于 commit 消息中。

下文每个门禁使用的文档约定：
- **契约不变量** — 门禁强制执行的 1–3 条最终状态要点。
- **定向测试** — 不变量被破坏时 fail closed 的 node:test 文件 / 用例名。
- **源码门禁 grep** — 合并评审者实际运行的模式。
- **延迟项** — 仅保留给未来 PR 的开放事项。已完成的工作不再重复。

### S1 — A3：工具输出流收口点

**契约不变量。**
- 工具输出块必须在到达 React 状态**之前**经过 `applyToolOutputChunk`。来自 `tool_output_delta` 的原始 `event.text` 绝不直接追加到 `outputChunks`。
- 次级 `redactSecrets` 总是在 renderer 收口点触发；上游声称的 `redacted` 标志绝不会向下降级。
- 每块 + 每工具数量 + 每工具总字符数上限会丢弃最旧的块；截断通过工具项上的 `已截断` 胶囊提示，绝不静默。

**定向测试**（`vera-desktop/src/main/__tests__/tool-output-stream.test.ts`）：
- `Authorization: Bearer …` / `sk-…` 文本 → 在存储的块中被掩蔽；无论上游声称什么，`redacted: true`。
- 单个超大块 → 保留尾部至 `maxChunkChars` 并带标记。
- 1000 个小块 → 列表上限为 `maxChunks`；最旧的先丢弃。
- 总字符数上限丢弃最旧块直到低于预算。
- 乱序到达时按 seq 去重 + 按 seq 排序仍然成立。

**源码门禁 grep。**
- `applyLiveTurnEvent` 必须在更新 `LiveTurnProjection` 中匹配的工具之前，把 `tool_output_delta` 经 `applyToolOutputChunk(base.outputChunks, chunk)` 路由；不得有直接原始追加的捷径。

### S2 — C0：扩展思考流收口点

**契约不变量。**
- Anthropic `ThinkingDeltaEvent` / `ThinkingCompleteEvent` 文本只能通过 `applyLiveTurnEvent` → `applyThinkingDelta` / `applyThinkingComplete` 进入 live step；两个 helper 都在状态更新**之前**运行 `redactSecrets` 并强制执行每 delta + 每 step 上限。
- `LiveTurnStepProjection.thinking.truncated` 对 delta 是单调-OR（一旦为 true 即保持），并在完成时替换（匹配 `thinking_complete` 的事实源语义）。
- 终端事件通过 `terminalizeLiveSteps` 完成 thinking 槽位；持久化证据对账仅在历史覆盖它之后移除临时状态。

**定向测试**（`vera-desktop/src/main/__tests__/thinking-stream.test.ts`）：
- 多 MB 的单个 delta → 保留尾部并带头部标记；`truncated: true`。
- 每会话累计超过总上限 → 保留尾部（保留最新推理，丢弃最旧）；`truncated: true`。
- delta 中间嵌入的密钥 → 在状态更新前被脱敏；`redacted: true`。
- `thinking_complete` 替换（不追加）缓冲区。

**源码门禁 grep。**
- `applyLiveTurnEvent` 必须调用纯 thinking helpers；不得有直接 `step.thinking.text + event.text` 追加捷径。

### S3 — C1：平滑器前缀泄露门禁

**契约不变量。**
- 平滑器（`useSmoothStreamContent`）逐字打出其输入的**前缀**；它看到的每个前缀都必须已经是无密钥的。
- `prepareSmoothStreamText(raw)`（对完整原始文本运行 `redactSecrets`）在每个平滑器调用点 — 流式 assistant 气泡和推理面板 — 把文本传给平滑器 hook **之前**都会被调用。

**定向测试**（`vera-desktop/src/main/__tests__/smooth-stream.test.ts`）：
- 包含 `Authorization: Bearer sk-…` 的原始文本在到达平滑器之前被 `prepareSmoothStreamText` 掩蔽；中间前缀 `Authorization: Bearer s` 不能未掩蔽地到达 DOM。
- 平滑器现有的 grapheme / EMA / 连续追赶行为在已安全的文本上保持不变。

**源码门禁 grep。**
- 每个 `useSmoothStreamContent(...)` 调用必须包裹在 `prepareSmoothStreamText(...)` 中（或调用会这样做的东西）。

### S4 — C2：`vera://` 内部 markdown URI 路由器

**契约不变量。**
- `parseVeraUri(href)` 是**严格**的（仅小写 `vera:`）且封闭世界：只有 `vera://settings/<SettingsSection>` 和 `vera://compose?text=...` 解析为带类型的 `VeraUriDest`。任何其它形态返回 `null`，并以带类型 `data-reason` 的内联坏链接 span 呈现。
- `isVeraUriCandidate(href)` 不区分大小写（`/^vera:/i`）— 它的存在是为了让大小写变体（`Vera://settings/account`）路由到坏链接内联错误，**绝不**落到 `<a target=_blank>` / `openExternal`。
- 外部链接经过 `isSafeExternalScheme(href)`，它通过 `new URL(...)` 解析，只允许 `http:` / `https:` / `mailto:`。`javascript:` / `data:` / `file:` / `vbscript:` / 未知 scheme 全部 fail closed 到坏链接 span。

**定向测试**（`vera-desktop/src/main/__tests__/vera-uri.test.ts`，共 41 个用例 — 29 个来自 PR-UI-RENDER-2 + 12 个来自 C2 修复）：
- 小写 `vera://settings/account` → 带类型的目标。
- `Vera://settings/account`（大小写变体）→ `parseVeraUri` 返回 `null`，但 `isVeraUriCandidate` 返回 `true`。
- `VERA://settings/account` → 同上。
- `javascript:alert(1)`、`data:text/html,…`、`file:///etc/passwd`、`vbscript:msgbox` → `isSafeExternalScheme` 返回 `false`。
- `mailto:user@example.com` → `isSafeExternalScheme` 通过 `URL().protocol` 返回 `true`，而非朴素前缀匹配。
- `vera-info://...`（相似前缀）→ 不是候选。

**源码门禁 grep。**
- `MarkdownLink` renderer 通过 `isVeraUriCandidate(href)` → `parseVeraUri(href)` 分发 → 内部按钮或坏链接 span；只有 `isSafeExternalScheme(href)` 为 true 时，外部分支才渲染 `<a target=_blank>`。

### S5 — C3：artifact 预览注册表（PR-RENDER-3a）

**契约不变量。**
- 纯函数 `resolvePreviewKind(input: ArtifactPreviewInput)` 是 L1 分类器（kind 门禁 + MIME 允许列表 + 扩展名回退 + 加载前尺寸上限）。输入很窄 — 绝不是完整的 `ArtifactRecord` — 因此注册表看不到 `relativePath` 或任何路径类数据。
- L2 加载后决策经过 `decideImageReadOutcome` → `decideImagePostLoad`。上限通过 `IMAGE_PAYLOAD_MAX_BASE64_LENGTH` 字符串长度比较强制执行。**不**用 `atob` 解码来检查上限。
- `<img src="data:<mime>;base64,...">` 由 `safeMime`（主进程嗅探的 MIME，经 `normalizeAllowedImageMime` 重新验证）构建，绝不使用 resolver 参考过的 metadata MIME。
- renderer hook 状态是 `ImagePreviewLoadState` — `{loading} | {image, safeMime, base64} | {unsupported, reason}` — 封闭联合，`unsupported` 分支不携带 base64。L2 决策在 async 内部、`setState` **之前**运行；原始 `ArtifactBinaryReadResult` 绝不进入 React 状态。
- IPC 失败路由到 `reason: 'read_failed'`，使用独立的 "加载预览失败" 文案，绝不并入 `'kind_disallowed'`。

**定向测试**（`vera-desktop/src/main/__tests__/artifact-preview-registry.test.ts`）：
- L1 kind 门禁：`file` / `diff` / `html` / `pdf` → `unsupported(kind_disallowed)`。
- L1 MIME 匹配：接受 `image/png` / `image/jpeg` / `image/gif` / `image/webp` / `image/avif`；拒绝 SVG / HEIC。
- MIME 缺失时的 L1 扩展名回退。
- L2 跨层：metadata `image/png` + 嗅探到 `image/svg+xml` → `unsupported(mime_disallowed)`。
- L2 超大优先于 MIME。
- IPC 失败（全部 6 个 `ArtifactBinaryReadFailureReason` 变体）→ `unsupported(read_failed)`。
- 超大 / mime_disallowed 结果 → 结果中**没有** `base64` 属性（kenji 门禁运行时断言：`outcome.base64 === undefined`）。

**Visual-smoke fixtures**（路径泄露防护，`visual-smoke-fixture.test.ts`）：
- `artifact-preview-image` — 真实的 1×1 透明 PNG（67 B）→ `image(mime_match)`。
- `artifact-preview-unsupported` — `kind=image` + `mimeType=image/heic` → L1 `unsupported(mime_disallowed)`；`readBinary` 绝不被调用。
- `artifact-preview-oversize` — `sizeBytesOverride=3MB` + `skipFile` → L1 `unsupported(oversize)`；文件绝不写入磁盘。
- 三者都：`relativePath` 必须**以** `visual-smoke-artifact/` 开头，绝不能以 `/` 开头；metadata.jsonl 绝不能包含 `/Users/` 或 `/private/`。

**源码门禁 grep。**
- `RegistryArtifactPreview` 分发必须使用 `resolvePreviewKind`；`ImageArtifactPreview` hook 状态必须是 `ImagePreviewLoadState`，而不是 `ArtifactBinaryReadResult`。

**延迟项。**
- SVG（PR-RENDER-3b）：需要沙盒化 `<iframe srcDoc>` + CSP + 威胁模型文档。
- HTML（PR-RENDER-3c）：同上。
- Mermaid（PR-RENDER-3d）：运行时求值器威胁面。
- 截图基线：采集对环境敏感；在宣布 3a-smoke 完成前，从干净的 CI 运行锁定基线。

### S6 — Cx：assistant 流式收口点

**契约不变量。**
- `text_delta` 的原始 `event.text` 仅作为输入流过 `applyAssistantDelta`；该 helper 是**唯一** sink。`setState` 绝不接收原始文本。
- helper 流水线运行**每 delta 脱敏 → 每 delta 上限 → 追加 → 跨 delta 脱敏 → 总上限**。对刚追加的候选文本做跨 delta 脱敏是承重的 — 它捕获跨 delta 接缝的 token（例如 delta N 中的 `"Bearer sk-"` + delta N+1 中的 `"abcdef…"`），这是每 delta 脱敏看不到的。
- 每会话总上限是**保留头部**并带尾部标记（assistant 文本自上而下阅读）。一旦缓冲区以尾部标记结束且达到总上限，后续 delta 被整体丢弃。
- renderer 状态是每会话一个 `LiveTurnProjection`。每个 `text_delta` 经过**一个**函数式 updater 并更新 `LiveTurnStepProjection.text`；多个 `setState` 调用之间没有并行的文本/截断映射或外层闭包变更。
- 终端事件就地完成文本槽位。平滑器拥有最终文本，直到其可见积压耗尽；随后持久化证据对账移除该临时 step。

**定向测试**（`vera-desktop/src/main/__tests__/assistant-stream.test.ts`，25 个用例）：
- 在接缝处拆分的跨 delta 长不透明 token（24 hex + 22 hex = 46 hex）→ L4 追加后捕获它；每 delta 的 L1 不能（验证门禁是真正的跨 delta，而非每 delta）。
- 跨 50+ 个 delta 逐字符流式传输 35 字符的 `sk-…` token → 最终累计状态不含原始 token。
- 先前 `"Token: sk-"` + delta `"abcdef…"` → 被 L4 捕获。
- 超大 delta + 在开头或保留尾部区域附近嵌入密钥 → 无原始密钥存活。
- 缓冲区达到带尾部标记的总上限后，后续 delta 短路（整体丢弃；`truncated: true` 仍然传播）。
- 非字符串的原始 delta → prev 不变，不声称脱敏。

**源码门禁 grep。**
- `applyLiveTurnEvent` 必须调用 `applyAssistantDelta(step.text?.text ?? '', event.text)`；不得直接追加。
- renderer 会话 UI 状态必须携带一个 `Record<string, LiveTurnProjection>`；不得有并行的流式文本或截断映射。

### S7 — B2：不可用的 OAuth 订阅 provider 不进入模型目录

**契约不变量。**
- `<ProvidersPanel>` 只列出当前可配置的 provider 类型：API key、local 和自定义 OpenAI 兼容端点。
- `claude-subscription`、`codex-subscription` 和 `gemini-cli` 保留在核心 provider 类型/默认注册表中，用于账号状态和未来迁移路径，但在其 send 路径开放之前，它们不出现在 `CATALOG_PROVIDER_TYPES` 中。
- provider 目录不渲染空的 OAuth 标签页，也不把未来的账号登录工作宣传为模型 provider 入口。

**定向门禁。**
- `CATALOG_PROVIDER_TYPES` 排除三个订阅 provider 类型。
- `ProvidersPanel.tsx` 没有 OAuth 目录标签页，也没有告知用户订阅登录稍后推出的头部文案。

**源码门禁 grep。**
- `ProvidersPanel.tsx`：无 `{ id: 'oauth' }`。
- `vera-core/src/llm-connections.ts`：`CATALOG_PROVIDER_TYPES` 数组体内无订阅 provider 字面量。

**延迟项。**
- Codex/Gemini 账号路径保持延迟。Claude 订阅在成为就绪的模型 provider 之前，仍需产品/法务签字和真实 send 路径冒烟。

### S8 — Provider 打磨：文件级禁用-可操作防护

**契约不变量。**
- `vera-desktop/src/renderer/styles.css` 中 `.providerCatalogCard` 上的每个交互选择器都必须限定到 `:not([data-disabled="true"])`。禁用的 provider 磁贴绝不获得可操作提示（抬起、强调色光晕、阴影、位移、强调色边框）。
- 禁用状态的 focus-visible 提示是柔和的（虚线 `--foreground-40` 轮廓，无强调色），键盘可发现但读作 "当前不可操作"。
- `[data-disabled="true"]` 始终有 `cursor: not-allowed`。

**源码门禁 grep**（对 `styles.css` 全文件，不只改动的行）：
- `.providerCatalogCard:hover`、`.providerCatalogCard:focus-visible`、`.providerCatalogCard:active` — 每个可操作变体都必须携带 `:not([data-disabled="true"])` 防护。
- `.providerCatalogCard[data-disabled="true"]:focus-visible` 只能发出柔和轮廓；无 `transform`、无强调色光晕、无 box-shadow。
- `.providerCatalogCard[data-status="unavailable"]:hover` 重置是正交的，可以保留（覆盖不同的属性）。

### S9 — Tool/Artifact 打磨：design-token 圆角对齐 + 折叠开关可访问性

**契约不变量。**
- 工具卡片 / diff / 终端圆角族统一为 10 px（chip 10 / card 12 / panel 14 / modal 18 的 design-system 节奏）。
- ArtifactPane 折叠开关有可发现的 `:focus-visible` 提示（3 px 强调色光晕）；图标按钮尺寸为 24×24，保证舒适的点击目标。
- 不引入新的折叠提示语义；开关行为不变。

**源码门禁 grep。**
- `.vera-tool`、`.vera-tool-diff`、`.vera-tool-terminal` — 圆角 10 px（原为 8 px）。
- `.vera-artifact-pane-collapse` 的 `:focus-visible` 选择器存在，并带强调色 ring tokens。

### S10 — D1：主题 palette 设置契约

**契约不变量。**
- `THEME_PALETTES` 是 11 个字符串字面量（`default` / `onedark` / `catppuccin-mocha` / `tokyo-night` / `nord` / `coral` / `azure` / `forest` / `dusk` / `sand` / `mono`）的封闭 `as const` 允许列表；`ThemePalette = typeof THEME_PALETTES[number]`。
- `isThemePalette(value)` 是类型守卫。区分大小写，拒绝其它一切（undefined / 非字符串 / 未知字符串 / 大小写变体）。
- `normalizeSettings()` 在任何失配（缺失 / 未知 / 非字符串）时把 `appearance.palette` fail closed 到 `'default'`。同一 normalize 过程绝不能静默重置无关字段（theme / palette ↔ toastPosition / personalization / network）。
- `createDefaultSettings()` seed `appearance.palette: 'default'`。
- renderer 路径：`applyThemePalette(palette)` 写入 `<html data-vera-theme="<palette>">`；`'default'` 移除该属性。CSS 变量覆盖位于 `vera-tokens.css` 的静态 `[data-vera-theme="..."]` 选择器下。

**定向测试**（`vera-core/src/__tests__/settings.test.ts`，`theme palette settings contract` 下的 10 个用例）：
- 允许列表形态、类型守卫接受/拒绝（含大小写变体）、默认 seed、字段缺失迁移、未知字符串 fail-closed、非字符串 fail-closed、有效值存活、无静默重置、patch 面往返、畸形 patch + normalize 往返。

**源码门禁 grep。**
- `THEME_PALETTES` / `isThemePalette` / `normalizeSettings` 中同时验证 palette 和 toastPosition 的单个 `appearance:` 块。
- renderer：`applyThemePalette` 只消费来自 normalize 后的设置；当前没有原始 `localStorage.getItem('vera-theme-palette-v1')` 读取路径。

**延迟项 / 未来契约锁定。**
- 如果以后加入 React 之前的 palette 读取（防止 FOUC），它必须通过 `isThemePalette()` 复用 `THEME_PALETTES` 允许列表；未知值落到默认值 / 移除属性。原始 localStorage 字符串绝不能直接写入 `data-vera-theme`。

### S11 — D2：toast 位置设置契约

**契约不变量。**
- `TOAST_POSITIONS` 是 6 个网格角（`top-left` / `top-center` / `top-right` / `bottom-left` / `bottom-center` / `bottom-right`）的封闭 `as const` 允许列表；`ToastPosition = typeof TOAST_POSITIONS[number]`。
- `isToastPosition(value)` 是类型守卫。区分大小写，封闭 enum 拒绝。
- `normalizeSettings()` 在任何失配时把 `appearance.toastPosition` fail closed 到 `'bottom-right'`。normalize 返回中的单个 `appearance:` 块同时验证 `palette`（D1）和 `toastPosition`（D2），不重置无关字段。
- `createDefaultSettings()` seed `appearance.toastPosition: 'bottom-right'`（匹配 v1 硬编码行为）。
- live UI 的事实源是 `App.toastPosition`（React 状态），经由 `AppShell → SettingsModal → SettingsSurface → SettingsPage → ThemeSettingsPage` 传递。`ToastProvider position={...}` 读取它；`ToastViewport data-position={position}` 由 React 驱动。**任何地方都不得有** `querySelector` / DOM 变更。
- `localStorage('vera-toast-position-v1')` 是 React 之前的启动镜像。它**只**从以下位置写入：
  - `AppShell` 设置加载：刚从磁盘读取的 normalize 值；
  - `ThemeSettingsPage` 选择器点击：`onUpdate(...)` **成功**后 normalize 的服务器返回。`onUpdate` 失败时，镜像**不**被触碰。
- React 之前的 `readPersistedToastPosition()` 通过 `isToastPosition()` 读取镜像；带外原始字符串绝不可能到达 `data-position`。

**定向测试**（`vera-core/src/__tests__/settings.test.ts`，`toast position settings contract` 下的 11 个用例 + 1 个跨契约用例）：
- 允许列表形态（6 个角）、类型守卫接受/拒绝（含大小写变体和同义词）、默认 seed `bottom-right`、字段缺失迁移、未知字符串 fail-closed、非字符串 fail-closed、有效值存活、无静默重置、patch 面往返、畸形 patch + normalize 往返、**D1 + D2 跨契约独立性**（两者都畸形 → 各自回退到自己的默认值，互不干扰）。

**源码门禁 grep。**
- `TOAST_POSITIONS` / `isToastPosition` / 合并的 `appearance:` normalize 块（D1 + D2 共用一个块）。
- `localStorage.getItem('vera-toast-position-v1')` → 只流经 `isToastPosition()`。
- `localStorage.setItem('vera-toast-position-v1', …)` 只写入设置加载的 normalize 值或 onUpdate 成功后的 normalize 返回。
- 活跃代码不得包含 `querySelector('.vera-toast-viewport')` / `dataset.position` 变更路径。

**残留 / 非阻塞。**
- `setToastPosition` 在 `onUpdate(...)` 抛错时保持乐观的 React 状态；与现有 theme/palette 语义一致。如需更严格的 catch-revert 路径，可以在后续补上；D2 不做门禁。

---

## 路径 18 — Computer Use 浮层威胁模型（PR-UI-CU-0）

**状态**：仅契约。目前尚不存在 Vera Computer Use 实现。此路径锁定未来的 PR-UI-CU-1（浮层实现）和 PR-RUNTIME-CU（动作运行器）在合并前**必须**满足的门禁标准。威胁模型记录在此，使实现无法对照一个愿望式的口头描述评审；门禁就是评审者 grep 的内容。

参考：一个独立签名的 helper bundle（`LSUIElement`、AX + ScreenCaptureKit + CGEvent、Unix socket 上的 NDJSON）是为这些边界提供信息的架构先例。Vera 的最终实现不必镜像相同的线上形态，但无论运行器位于 helper 进程还是主进程内联，下面的每一条契约都适用。

文档约定与路径 17 相同：
- **契约不变量** — 门禁将强制执行的 1-3 条最终状态要点
- **源码门禁 grep** — PR-UI-CU-1 落地时合并评审者将运行的模式；目前这些都因缺失而 fail-closed
- **延迟项** — 有意留给 PR-UI-CU-1 或 PR-RUNTIME-CU 的事项

### S12 — 权限来源：仅 TCC，renderer 永不声称

**契约不变量。**
- Computer Use 权限**始终**来自 macOS TCC（`com.apple.tcc` → `kTCCServiceAccessibility` + `kTCCServiceScreenCapture`）。renderer **绝不**断言 CU 权限；它只显示由查询过 TCC 的主进程 IPC 派生的状态。
- 除非在动作发生时刻两个 TCC 权限都已授予，否则**不得**发起 CU 动作；缓存的 "此前已授予" 状态不够，因为用户可随时通过 系统设置 → 隐私与安全性 撤销。
- renderer 的 CU 入口（按钮启用 / 禁用 / 首次运行设置）反映这个实时 TCC 状态；没有任何路径让 renderer 伪造已授予状态。

**源码门禁 grep。**
- renderer 绝不直接调用影响 TCC 的 API。搜索 `ApplicationServices` / `kTCCService` / `AXIsProcessTrusted` — 必须只出现在主进程（或独立签名的 helper）源码中，绝不在 `vera-desktop/src/renderer/` 下。
- renderer CU 状态来自带类型的 IPC 结果；没有任何路径用 renderer 本地布尔值构建 "permission granted" 状态。

**延迟项。**
- 每动作 TCC 验证（已开始的 CU 动作必须在动作开始时重新检查 TCC）— 在 PR-RUNTIME-CU 中接入。
- TCC 提示 UX（权限缺失时，从 runtime 浮现带类型的 `MissingPermissionState`；renderer 通过 `app:openExternal` 显示 "打开系统设置 → ..." 入口，规范 TCC URL 预先加入 openExternal 防护的允许列表）— 在 PR-UI-CU-1 中接入。

### S13 — 浮层生命周期：动作作用域，绝不持久

**契约不变量。**
- CU 浮层（显示 Vera 即将点击位置的高亮环 / 目标框 / 光标光晕）只在进行中的 CU 动作期间存在。它在动作开始时挂载，在动作结束时卸载。没有空闲 / "环境" 浮层状态。
- 浮层拆除**必须**在每个动作终止事件上触发：`tool_complete` / `tool_error` / abort / runtime 崩溃 / 用户关闭 Vera / 动作中途权限被撤销。
- 浮层状态不跨会话、跨 LLM turn 或跨 renderer 重新加载存留。没有进行中 CU 动作的 renderer 挂载**根本**不得渲染浮层组件。

**源码门禁 grep。**
- `<ComputerUseOverlay>`（或等价物）的 renderer 挂载必须由每会话进行中的 CU 动作门控 — 通常是 `liveTurnBySession[sessionId].steps[].tools` 中工具名匹配已知 CU 动词的条目。不得有 `&& true` / `&& isDev` 覆盖。
- 拆除必须在 abort/error/complete 分支中与 `clearTurnTransientState(sessionId)`（或等价的动作结束专用清理）放在同一生命周期包中。
- 不得用 `setTimeout` / `setInterval` 让浮层在动作结束后存活；拆除只能由事件驱动。

**延迟项。**
- Reduced-motion：浮层动画尊重 `prefers-reduced-motion`（与路径 17 S1-S11 使用相同的 `data-vera-reduced-motion` 通道）— 在 PR-UI-CU-1 中接入。

### S14 — 焦点 + 点击透传：浮层绝不能抢输入

**契约不变量。**
- 浮层窗口**必须**调用 Electron 的 `BrowserWindow.setIgnoreMouseEvents(true, { forward: true })`（或所选浮层机制的等价物）并以 `focusable: false` 构造。它纯粹是视觉提示；接收 CU runtime 经动作运行器 `CGEventPostToPid` / 无障碍分发路径发来的点击 / 按键的是底层应用。
- 浮层在 renderer 中绝不成为 `<button>` / `<a>` / tab 顺序目标 / ARIA 交互元素。用户**无法**与浮层本身交互；他们的输入落在目标应用上（或如果 Vera 窗口在前台，则落在 Vera 上）。
- 浮层的 `pointer-events: none`（CSS）是 BrowserWindow `setIgnoreMouseEvents(true)` 约束在 renderer 侧的镜像。两者都必须成立；BrowserWindow 设置是承重的，因为仅靠 CSS 无法阻止 OS 级窗口在点击时抢焦点。

**源码门禁 grep。**
- `<ComputerUseOverlay>` 根元素携带 `pointer-events: none`（CSS 类或内联样式），且**绝不**挂载在 `<button>` / `<a>` / role-button 上下文中。
- 浮层 BrowserWindow（主进程中）配置为 `focusable: false`，runtime 在显示前对它调用 `setIgnoreMouseEvents(true, { forward: true })`。grep 主进程：任何标记为 CU 浮层窗口的 `new BrowserWindow({ ... })` 必须满足这两条不变量。不得有 `focusable: true`；不得缺少 `setIgnoreMouseEvents`。
- 不得有键盘事件处理器附着到浮层（`addEventListener('keydown'` / `onKeyDown`）。

**延迟项。**
- 多显示器放置：浮层放在动作所针对的活动屏幕上 — 在 PR-RUNTIME-CU 中接入。

### S15 — 坐标权威 + 截图二进制显示路径

**契约不变量。**
- 坐标权威：**只有** runtime（主进程或签名 helper）决定在哪里点击 / 输入 / 滚动。renderer **绝不**发起原始 `{x, y}` 点击。renderer 的角色只是显示：它以浮层展示 runtime 的计划动作，并呈现用户 abort。
- 截图像素（二进制 `Uint8Array` / PNG / JPEG）**必须**流经 artifact 预览注册表（S5）— 嗅探的 MIME 通过 `normalizeAllowedImageMime` 允许列表，base64 长度上限通过 `IMAGE_PAYLOAD_MAX_BASE64_LENGTH`（不用 `atob` 解码），超大 → `unsupported(oversize)` 并带 Finder 打开入口而不是内联 base64。像素**不得**走任何跳过此门禁的 "快路径"。
- 与截图一同捕获的文本形态数据 — 窗口标题、应用 bundle id、焦点元素标签、地址栏内容 — **是**文本，在到达 React 状态、artifact 面板或会话日志之前，**受** S16 的 `redactSecrets` 收口点约束。
- `redactSecrets` 仅限文本，**无法**清理截图像素。移除敏感像素发生在上游（按应用敏感块、OS 级屏幕捕获排除、runtime 在交付前应用的逐帧遮罩）— 绝不是 renderer 侧对 base64 字符串的处理。
- runtime 声称的 metadata MIME（例如 `image/png`）不可信；renderer **必须**用主进程**嗅探**并经过 `normalizeAllowedImageMime` 重新验证的 MIME 构建最终 `<img src="data:…">` 属性（与 S5 相同的门禁）。

**源码门禁 grep。**
- renderer 绝不导入坐标点击 IPC，也绝不在用户输入处理器中调用 `window.vera.computerUse.click({ x, y })`。唯一的调用者路径是经由 `session.subscribeEvents` 到达的 LLM 驱动 `tool_use(computer-use:*)` 事件流。
- CU 截图进入 artifact 面板必须为图像组件走 artifact 预览注册表（S5）；其周围的文本元数据走 `applyToolOutputChunk`（S1）。不得有绕过任一门禁的独立 "快路径"。
- 任何地方都**不得**出现 `redactSecrets(screenshot.base64)`（把文本 helper 用于二进制是边界被误解的迹象）。
- 在 renderer 代码中查找 `data:image/...;base64,` 字符串 — 它们只能来自 `decideImageReadOutcome` 收口点之后的 `safeMime + base64`。

**延迟项。**
- 按应用敏感策略：按 bundle id 的 denylist（1Password、银行应用、通过 AX 树检测到的密码字段），runtime 在上传**之前**、持久化**之前**、显示**之前**丢弃帧 — 在 PR-RUNTIME-CU 中接入。

### S15b — Provider 暴露边界：发送给 LLM 的屏幕内容

**契约不变量。**
- macOS TCC 捕获屏幕的权限 ≠ 用户同意把该捕获上传到远程 LLM provider。两者是独立的门禁；授予 provider CU 访问权的面向用户连接设置必须明确呈现 "截图上传将到达此 provider"。（renderer 文案超出本门禁范围；门禁锁定 runtime 侧。）
- runtime 发送给 LLM/provider 调用的任何截图帧**必须**包裹在带类型的 `ComputerUseScreenFrame`（或等价物）中，携带：
  - 限定捕获范围的 `actionId`（因此帧属于**一个**进行中的动作；跨动作复用无效），
  - 来源种类（`'live-capture' | 'cached-still'`），让评审路径能区分新帧与旧帧，
  - 与 artifact 预览上限匹配的最大尺寸不变量（`IMAGE_PAYLOAD_MAX_BYTES` = 2 MB；超大 → 敏感块，而非静默降级上传）。
- 截图帧**不得**原始持久化到会话日志。会话日志记录动作的结果 + 脱敏文本摘要；原始帧在动作期间保存在主进程内存中，动作结束时丢弃。如果用户通过 artifact 面板的 "另存为" 入口显式保存，那是用户主动选择的独立写入路径。
- provider 路由是**显式**的：如果 provider 不支持图像输入，或用户的账号级视觉开关关闭，CU 动作返回 `error: 'sensitivity_blocked'`，`reason: 'no_vision_route'`。**没有**把计划的视觉调用静默降级为纯文本调用的回退（那将意味着截图被静默丢弃，而 LLM 在未看到它的情况下做出决策）。
- `sensitivity_blocked`（S17 的封闭错误）在 provider 上传**之前**适用，而不只是在 renderer 显示之前。runtime 不会渲染的帧，也是 runtime 不会上传的帧。

**源码门禁 grep。**
- 接受 `imageContent` / `imageUrl` / `base64Image` 参数的 provider client 调用点：每个这样的调用点必须消费 `ComputerUseScreenFrame`（或等价带类型形态），绝不能直接消费来自捕获调用的原始 `string` / `Uint8Array`。
- `appendToSessionLog`（或无论写入者叫什么）必须拒绝原始截图负载。查找任何把带 `base64` 数据的 `kind: 'image'` 内容写入会话日志记录的路径 — 那是契约违规；日志应持有 artifact id 的引用，绝不持有内联帧。
- "no_vision_route" 敏感块路径必须存在于每个支持视觉的 provider client 中。查找能力检查，如 `if (provider.supportsVision) { … } else { … return error('sensitivity_blocked', 'no_vision_route') }`。不得静默回退到纯文本。

**延迟项。**
- 按 provider 的差异化同意：把 "我配置了这个 provider" 与 "我让 CU 向这个 provider 上传截图" 分开。第二种同意的 UX 呈现 — 在 PR-UI-CU-1 中接入。
- 帧留存计量：runtime 在单个 LLM turn 内允许在内存中保留多少帧（一个长的 CU 计划 = 多次捕获）。默认值和按 provider 上限 — 在 PR-RUNTIME-CU 中接入。

### S16 — 屏幕派生文本脱敏：runtime 侧，在 LLM 看到之前

**契约不变量。**
- Vera 从屏幕提取的任何文本 — OCR 输出、AX 树转储、选中文本查询结果、剪贴板样本、窗口标题、应用 bundle id、焦点元素标签、地址栏内容 — **必须**在落入 LLM 的 tool result 消息**之前**、在落入会话日志**之前**、在落入 artifact 面板**之前**，经过 runtime 的 `redactSecrets`（`@vera/runtime` 对 renderer 所用同一 helper 的再导出）。
- 范围澄清（非文本路径参见 S15 / S15b）：本门禁**仅限文本**。截图像素不是文本，显示走 artifact 预览注册表（S15），LLM 暴露走 `ComputerUseScreenFrame` provider 边界（S15b）。把 `redactSecrets` 应用于 base64 图像字符串是类别错误 — 像素可携带 `redactSecrets` 看不到的敏感内容。
- runtime 侧对屏幕派生文本的脱敏是**事实源**门禁。renderer 的 `applyToolOutputChunk` 次级脱敏（S1）是纵深防御，不是主边界 — CU 屏幕状态可能包含模型绝无意主动输出、但未经脱敏的捕获会泄露的凭据。

**源码门禁 grep。**
- `@vera/runtime` 中每个返回包含屏幕派生**文本**的 `ToolResultContent` 的 CU 动作处理器，必须在构造结果前对该文本调用 `redactSecrets(value)`。不得把 `JSON.stringify(rawScreenState)` 直接放进结果块。
- 会话日志写入者必须在 `appendToLog` 前调用脱敏；查找任何绕过现有日志脱敏包裹的路径。
- `redactSecrets(screenshot.base64)` **不得**出现（S15 的 grep 也锁定这一点；两个门禁都会标记）。

**延迟项。**
- 按应用脱敏策略（例如 1Password / 浏览器密码字段检测 → 整体丢弃而非掩蔽）— 超出初始范围；此处仅作为待回访的已知缺口锁定。相关：按应用像素侧 denylist 是 S15 的延迟项；这两个策略应在同一个 runtime PR 中落地。

### S17 — Fail-closed：每个门禁失败都中止动作，绝不静默继续

**契约不变量。**
- 动作开始时 TCC 权限缺失 → 动作返回 `error: 'permission_missing'` 的 `ToolResultContent`。不重试；没有 "尽力而为" 的部分点击。
- 浮层设置失败（窗口创建被拒、显示器不可用、焦点透传断言失败）→ 动作返回 `error: 'overlay_failed'`。没有浮层，动作**不会**继续 — 在任何点击落地之前，用户的安全提示**必须**可见。
- 坐标验证失败（目标坐标超出任何屏幕边界、NaN、负数、> 屏幕宽/高）→ 动作返回 `error: 'invalid_coordinate'`。不钳制 / 不吸附边缘；坏输入意味着中止。
- 截图捕获失败 → 动作返回 `error: 'capture_failed'`。runtime **不**伪造空白截图来满足 LLM 契约；LLM 看到错误并决定是否重试。
- 敏感检查失败（例如目标窗口是已知密码字段，或操作系统处于快速用户切换中间状态）→ 动作返回 `error: 'sensitivity_blocked'`。无绕过。

**源码门禁 grep。**
- CU 动作处理器中的每个 `catch` 都会转换为 `ToolResultContent` 中的带类型错误。查找被吞掉的 `catch` 块（`catch (e) {}` 或 `catch { return … defaultState }`）— 这些在 CU 路径中**不得**存在。
- 不得有返回带软错误字符串的 "成功形态" 内容的 `try / catch`；结果要么是设置了 `error` 的 `kind: 'tool_result'`，要么是真正的成功。没有中间地带。
- 封闭错误 enum：`permission_missing` / `overlay_failed` / `invalid_coordinate` / `capture_failed` / `sensitivity_blocked` / `aborted` / `timeout`。新增错误模式是类型手术级改动，**同时**是 smoke.md S17 的更新。

**延迟项。**
- 每动作超时策略：每个 CU 动词有最大墙钟时间；超过 → `error: 'timeout'`。默认值和每动词覆盖表 — 在 PR-RUNTIME-CU 中接入。

### S18 — Abort 语义：<100ms 拆除，无孤儿点击

**契约不变量。**
- 用户发起的 abort（Esc、聊天中的 "Cancel" 按钮、关闭 Vera、切换会话）**必须**在 100 ms 内拆除进行中的 CU 动作。所谓 "拆除"，我们指的是：
  - 浮层窗口销毁
  - 待处理的坐标分发取消（abort 信号落地后，下一个计划的 `CGEventPost` **不得**触发）
  - runtime 工具状态标记为 `aborted`（状态 enum），结果块返回 `error: 'aborted'`
  - 所有临时状态（目标坐标、计划动作、进行中的截图）从主进程内存清除
- 中途 ABORT 的动作（一次点击已落地、计划的下一次点击之前）**必须**报告 `error: 'aborted'`，并且**必须**在其结果块中包含已完成的子步骤计数，让 LLM 知道多步计划实际执行了多少。不得有静默完成的局部序列。
- 动作期间检测到权限撤销（例如用户在系统设置中关闭了辅助功能）是 abort 的特殊情况：同样的 `<100ms` 拆除，`error: 'permission_missing'`（不是 `'aborted'`，因为原因不同于用户意图）。

**源码门禁 grep。**
- `AbortSignal`（或等价的取消 token）穿过每个 CU 动作处理器 — 没有处理器是脱离 abort 钩子的 "fire and forget"。
- renderer abort 入口（聊天中的 Esc、Cancel 按钮）接入 `window.vera.computerUse.abort(actionId)`。不得有假装 abort 却不触达 runtime 的伪造形态本地 UI 回退。
- 权限撤销检测：runtime 在每个动作步骤检查 TCC；如果动作中途观察到撤销，在内部以 `'permission_missing'` 错误升起 abort 信号。

**延迟项。**
- 每步粒度：长的 CU 序列（"打开浏览器、搜索、点击第一个结果"）可以是单个 LLM 工具调用。子步骤级（相对于整个序列）的 abort 粒度 — 在 PR-RUNTIME-CU 中接入。

---

**跨领域备注（不是门禁，但为未来的 PR-UI-CU-1 / PR-RUNTIME-CU 评审者记录）。**

- Vera 的最终 CU 实现**不**必使用独立签名的 helper bundle。只要上述所有边界成立，主进程内联也是可接受的。主进程 Electron 上下文相对 renderer 已是信任边界；额外的进程边界是纵深防御，不是契约要求。
- Vera workspace 现有的 IPC 允许列表模式（`app:openExternal`、`app:openPath` 等）是范例：每个界面都是带命名、带类型、在主进程做输入验证的 IPC 通道。CU 应遵循相同形态。
- `redactSecrets` helper 目前位于 `@vera/ui`。CU 威胁模型实现需要 runtime 侧导入路径（`@vera/runtime` 再导出已存在）；`@vera/ui` 中的 renderer 纵深防御保持不变。
- 本路径 18 仅契约。PR-UI-CU-1（浮层实现）和 PR-RUNTIME-CU（动作运行器）将分别落地 S12-S18 各门禁的定向测试 + 源码门禁 CI 钩子；在此之前，门禁因缺失而 fail-closed（不存在 CU 代码）。

---

## 何时运行

- 在把任何大型 UI / runtime / 凭据 / 权限改动合并到 main 之前。
- 在任何触及 `LlmConnection`、`sessions:changed` 负载形态、`ConnectionUiStatus` 派生、`TurnViewModel`、`nextRadioId` 或 PermissionDialog 渲染的改动之后。
- 在打 release 标签之前。

每条路径 < 1 分钟。完整路径运行约 11–13 分钟。值得做。
