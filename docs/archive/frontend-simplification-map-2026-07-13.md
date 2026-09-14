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

# 前端简化路线图（2026-07-13）

维护者目标：项目已运行很久；在架构层面剪除冗余/混乱的前端代码。方法：先度量（knip + wc + grep），分轮推进，每轮以完整测试套件 + typecheck + dead-css + 对齐审计（alignment auditor）为门槛。

基线（当前 tip，1301404d）：45.5K 行 TS/TSX（非测试）+ 22.0K 行 CSS。
热点：app-shell.tsx 1733 · chat-turn 970 · bot-chat 961 · OnboardingHero 955 · provider-oauth 870 · composer 866 · scheduled-task 865 · connection-detail 861。
CSS：vera-tokens 1509 · onboarding 916 · scheduled-tasks 864 · skills 833。

Knip 验证说明：storybook stories 与 ui 的 `.test.tsx` 被标为 "unused" 属误报（vera-desktop/.storybook 的 glob 同时覆盖两个 story 根目录；ui 测试运行器执行 `dist/**/*.test.js`）。真实发现须经人工核实后再动手。

## 各轮

- [x] **A — 已发布（b2a1afd6）：knip 治理 + 死代码 + 依赖卫生。** 删除 6 个符号、降级 1 个、移除 dev-hmr.mjs；@base-ui/react 移入 deps、streamdown 移入 devDeps（仅测试用；正确性上有意偏离）、overlayscrollbars 未声明（overlay-scrollbars 契约禁止声明——改用 knip ignoreDependencies）；scroll-area.tsx 保留（有契约读取其内容——后续：与测试一起删除）；新增 knip.json（按 workspace 划分 entries、ignoreExportsUsedInFile、-knipignore 标记）+ typecheck job 中 2 个 CI 步骤；忽略原因记录见下文。门槛：desktop 2397/2397、ui 125/125、typecheck、4 项静态检查、auditor——前后完全一致。
  - 删除 vera-ui/src/primitives/scroll-area.tsx（被 overlay-scroll-area 取代后的孤儿文件）
  - desktop main+renderer 与 vera-ui 中约 40 个未使用的 export/type——逐一处理：先 grep __tests__（契约测试读取源码文本；部分 pin 断言 export 的形式）——按站点降级 `export` 或删除符号，绝不静默破坏任何 pin
  - 声明真实依赖：vera-desktop 需要 streamdown、@base-ui/react、overlayscrollbars（当前靠 hoisting 解析——脆弱）
  - 新增 knip.json（workspaces、storybook entry globs、test entry globs）+ CI 步骤，防止死代码重新累积
- [~] **B — app-shell.tsx 分解（旗舰项）— 4/5 个 blade 已发布（分支 refactor/app-shell-decomposition），1733 → 1666 行，零行为变化。**
  每个提交门槛一致：desktop 2397/2397、ui 125/125、typecheck、dead-css、knip（desktop+ui）；最终对齐审计（AUDIT_PORT_BASE=19300）在全部 9 个 fixture 上通过，且分支对基线的 CDP 像素截图一致（turn-narrative、module-skills、settings-general）。
  1. use-pending-action-registry — 首个发布（唯一消除重复的 blade）。一个通用 useKeyedPendingRegistry 取代四个手写的 keyed 集合（turnActions 的 state+timers、sessionRow、permissionMode、sessionModel）。keysRef 保持为稳定的 Set，工厂函数与卸载清理逐字节一致。重新 pin 了 sticky-model / status-presentation / row-actions-fail-soft 契约。
  3. use-project-context — 已发布。appInfo、branchList/pending、recentProjectPaths、projectPicker 的 pending+refs + createAppShellProjectActions 接线。
  4. use-module-data — 已发布。skills/managedSkillSources/bundledSkillCatalog/scheduledTasks + skill 与 plan 两组 action 工厂；注入 surface-active 谓词。
  5. use-shell-connections — 已发布（部分）。connections/defaultConnection + connectionsEqual + refreshConnections + handleConnectionEvent。theme/userLabel/defaultPermissionMode 保留：default-permission-mode 契约把 defaultPermissionMode 的 useState + refreshShellSettings + closeSettings 镜像专门 pin 在 app-shell.tsx 上，且 theme setter 有多个 app-shell 写入方（visual-smoke、settings-overlay 的 onChange）——迁移它们需要 setter 注入且没有净简化。
  2. use-shell-navigation — 跳过（风险不成比例，遵循"发布已完成的部分"规则）。它的两个锚点——openSessionInChat 和 closeSettings——被 source-slice 契约 pin 在 app-shell.tsx 上，无法移动。它最高价值的可移动代码（稳定桥接回调 searchModalOnNavigate / paletteOnSelectSession / paletteOnOpenSearchModal / useSkillInChat）承载 PR-FE-BUG-HUNT-0 的运行时身份稳定性语义，且零 source-pin 或 e2e 覆盖——一处细微的抽取错误就会静默回归"流式期间的搜索"而没有任何门槛能拦截。纯状态迁移净收益约 0 行 app-shell 代码，因为每个 setter（setNavSelection ×15 处、经被 pin 的 openSessionInChat/createSession 的 setSearchScrollTarget、经被 pin 的 closeSettings 的 setSettingsOpen）都必须原路穿回。保留原位并附此说明。
  注：路线图的 < 900 行目标无法仅凭五个状态簇 blade 达成——app-shell 的主体是派生值块（约 210 行的 model/thinking/alert memos）和 JSX return（约 340 行），二者都不在 blade 定义覆盖范围内；要达到 < 900 需要抽取这些内容 + 把 JSX 拆成子组件（超出范围，独立风险）。
- [x] **C — 已发布（refactor/css-token-consolidation）：CSS 分层合并。**
  普查（机器生成，统计全部 CSS+TSX 中的 var() 消费方）：reference-shell.css 定义 23 个 → 16 个死 token（删除），3 个活跃颜色别名移至 vera-tokens（--color-bg-container/--color-border-tertiary/--color-text-quaternary），4 个活跃布局局部变量保留在文件内（--agents-layout-bg/--agents-content-area-bg/-gap、--sidebar-width）。theme-glass.css 的 2 个 token 覆盖（darwin 的 --color-bg-container light+dark、--color-text-quaternary）迁移到 vera-tokens；glass-material + text/label 规则保留。vera-tokens.css：新增 token 权威性 README（权威的 --background 族 vs 兼容性的 --color-* 别名、别名策略）+ 精简被取代的 hue-80 考古注释（它命名了已删除的 token）。两个主题均已迁移（light :root + .dark + darwin light/dark）。计算值零变化——纯重组；已发布的 `--color-bg-container: var(--background)` 例外保持原样。vera-tokens 内部 0 消费的 token 全部是治理契约的 scale 成员（z-index/control-height/spacing/radius/406）——重新 pin，不删除。门槛：desktop 2397/2397、ui 125/125、typecheck 0、check-dead-css 通过、knip desktop+ui 0、auditor exit 0。CDP light+dark 截图（turn-narrative/module-skills/settings-general/first-run）前后对比——无视觉差异。
- [x] **D-1 — 已发布：共享 useMountedRef + 最后一个 formatBytes 分支。** 大小写不敏感的重新普查发现 mounted 守卫样板共 ×38 处（而非 ×6——首次 grep 漏掉了 `fooMountedRef` 的大小写变体）。已发布：`useMountedRef` 位于 @vera/ui（从 index 导出），两个 workspace 都能访问；转换了 6 个规范的 `mountedRef/onboardingMountedRef` 站点（OnboardingHero ×2、password-input、daily-review/general/permission-center 设置页），并重新 pin 了 5 个契约到共享 hook 形式；voice 的 formatVoiceBytes（最后一个 formatBytes 分支）删除，改用 @vera/ui 的 helper。有意不转换：use-workspace-instructions-controller（lifecycle-counter 变体，非样板）和 app-shell.tsx 的 rendererMountedRef（Round B 拥有该文件）。
- [x] **A 后续 — 孤儿 scroll-area.tsx 已移除。** primitives/scroll-area.tsx（34 行、零消费方、从未从 ui index 导出）连同其 knip ignore 一起删除；overlay-scrollbars 契约的逐文件断言升级为对 @base-ui react scroll-area 导入的全仓库禁令（更强的不变量，无覆盖损失）。
- [x] **D-2 — 已发布：mounted 守卫长尾。** 将普查出的 35 个 `*MountedRef` 站点中的 34 个转换为 `useMountedRef`——20 个 renderer 设置站点、4 个其他 renderer 站点（OnboardingHero 的 readyHero、FirstRunChecklist、artifact-pane、browser-panel）、10 个 vera-ui 面板（chat-turn、chat-model-switcher、search-modal、scheduled-task-panel、clipboard-feedback、skills-panel、composer、permission-dialog、session-history-list、daily-review-panel）。保留每个站点的伴生 ref 清理 effect 及其 ref 名称；仅当 effect 除了 mounted 标记外什么都不做时才整体删除（browser-panel、permission-dialog）。vera-ui 站点按项目风格从 `./use-mounted-ref.js` 导入 hook。重新 pin 了约 20 个测试文件中约 30 条契约断言到共享 hook 形状（定义行 + effect 块）。useRef(false) 变体都只在异步 handler 内读取标记——无 effect 前读取——因此翻转为 true 初始语义是行为保持的。有意不转换：use-memory-settings-controller（lifecycle-counter 变体——清理重置受 lifecycle counter 保护，读取将 mounted 与 lifecycle 相等性组合，形状与 use-workspace-instructions-controller 相同）和 app-shell.tsx 的 rendererMountedRef（Round B 拥有该文件）。
- [~] **E — app-shell 派生值抽取（Round B 后续）— blade 1 已发布，blade 2 跳过。分支 refactor/app-shell-view-split。app-shell.tsx 1680 → 1562。**
  1. **派生值抽取 — 已发布（2 个提交）。** 整个约 210 行的派生块移入两个纯派生 hook，遵循 use-shell-connections / use-project-context 的项目风格，零行为变化，每个 memo 保持完全相同的 dep 数组 + 引用稳定性：
     - `use-shell-chat-model.ts`（195 行）：model/thinking 选择（chatModelChoices、active/new-chat 的 model+label、thinking 变体列表、sticky-pick 校验、两个 pending new-chat 状态）+ 两个 chat-header alert memos。openSettingsSection 采用注入方式传入，使 chatConnectionAlert 保持其完全相同的 exhaustive-deps-excluded memo。
     - `use-shell-live-turn.ts`（112 行）：live-turn 投影（activeShellRunUpdates、streaming/thinking 切片、streamingSessionIds pulse 集合、liveTools/hasInFlightLiveTools）+ #646 turn-wait 提示。`activeLiveTurn` 保持 pin 在 app-shell.tsx（streaming-timeline source-slice 契约）并传入。
     重新 pin：将两个文件加入 renderer-shell-source-helpers 组合 allowlist；将 use-shell-chat-model.ts 加入 composer-new-chat model-picker 契约的两个子集读取（pendingNewChatModel / validPendingNewChatModel / newChatThinkingLevel 声明移入该 hook）。其余 model/live-turn 契约读取组合源码，经 allowlist 自动跟随。
  2. **JSX return 拆分 — 跳过（风险不成比例 + 净负收益，遵循"发布已完成的部分"规则；Round B 的跳过说明即范本）。** 约 340 行的 return 中，内容区与约 110 个 AppShell 局部变量不可约地耦合，且每个有意义的块都被 DIRECT-read（非组合）契约 pin 在 app-shell.tsx 上：ChatView 的 `liveTurn={activeLiveTurn}`（streaming-timeline）、Composer 的 `onPickAttachments`/`onAttachFilePaths`（attachment-frontend）+ `onPickNewChatModel`（composer-new-chat）、SessionListPanel 的 `statusGroups={sessionListGroups}`（session-project-view）、DailyReviewPage 的 `onCopyMarkdown`（daily-review-copy-feedback）、onboarding 的 `onSkip` handler（onboarding-one-time-regression）。把其中任何一个抽取进布局子组件都会（a）迫使约 50–110 个 prop 的直通钻孔，反而增加净接口/解构样板而非剪除（与本轮目标相悖）、（b）需要在结构上重新 pin 5 个以上专门断言"shell 编排器将 handler X 接入元素 Y"的行为契约、（c）最终 app-shell.tsx 仍约 1300 行——在零行为授权的约束下，≤1100 的目标不经过度抽取无法安全达成。保留原位并附此说明；派生值抽取（blade 1）已捕获真正的简化收益。
  门槛（每个提交）：desktop 2399/2399、ui 125/125、完整 typecheck 0、check-dead-css 通过、knip desktop+ui 0。最终：对齐审计（AUDIT_PORT_BASE=19900）exit 0，全部 9 个 fixture 通过。CDP 分支对基线截图（真实 Electron，light+dark 1280）覆盖 turn-narrative / module-skills / settings-general / first-run：module-skills 与 first-run 逐字节一致；settings-general 本身不确定（基线自身在重复通过中会产生两个 hash——既有截图抖动，与本项无关）；turn-narrative 仅在最底部 311×24px 区域不同——composer 底部的 git-branch chip，它渲染 worktree 的真实 HEAD（基线只能在 DETACHED-HEAD 状态下截取，因为 `main` 分支引用被并发的 worktree 持有，因此 chip 显示 `—` 而非 feature 分支名）。像素差 bbox 确认为 x:[1106-1417] y:[1570-1594]；其余每个像素一致，且无 chip 的 fixture 逐字节一致——即派生抽取被证明是渲染层面无操作的。

各轮发布时更新复选框。每轮：测试套件 + typecheck + dead-css + 对齐审计 + CDP 抽查，以退出码把关。
