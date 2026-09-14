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

# Vera 代码 Bug / 流程审计 - 2026-05-22

> Archived on 2026-07-13。这是一份时点审计，不是当前的实现指南。

Owner：@xuan  
线程：#my-ai:02c56cb6  
范围：当前 Vera 代码的 runtime/main/renderer/core/storage/settings 各表面。布局工作由 @yuejing 单独跟踪。

## 已在 main 修复

### 1. Shell 安全前缀命令绕过了 Ask 确认

提交：`778077d Fix runtime failure states and shell permission gaps`

证据：
- `vera-core/src/permission.ts` 在检查通用 shell 控制操作符之前就对安全前缀命令做了分类。
- 像 `echo hello > out.txt`、`cat package.json | wc -l`、`pwd && npm test`、反引号与 `$()` 这类命令可能被归类为 `shell_safe`。

影响：
- Ask/Explore 模式可能自动放行会改写文件、串联命令或展开携带密钥的命令替换的命令形式。

修复：
- 新增 `SHELL_CONTROL_PATTERNS`，在安全前缀匹配之前将此类命令归类为 `shell_unsafe`。
- 在 `vera-core/src/__tests__/permission.test.ts` 中补充回归测试。

### 2. 用户追加消息后 backend 构建/发送失败留下错误的会话状态

提交：`778077d Fix runtime failure states and shell permission gaps`

证据：
- `vera-runtime/src/session-manager.ts` 在 backend 创建之前就追加了用户消息并写入 turn 运行状态，而 backend 构建失败发生在 active 流记账/finally 状态转换之前。

影响：
- 一条已持久化的用户消息可能停留在 running/active 会话状态，而不是 failed/blocked turn。

修复：
- 将连接锁、backend 构建、流记账与 backend 发送包进同一个 try/finally。
- 捕获异常后追加 failed turn 状态，最终 header 变为 `blocked/unknown`。
- 在 `vera-runtime/src/__tests__/session-manager.test.ts` 中补充回归测试。

### 3. Renderer 过期消息刷新可能覆盖当前聊天

提交：`778077d Fix runtime failure states and shell permission gaps`

证据：
- `vera-desktop/src/renderer/main.tsx` 的 `refreshMessages(sessionId)` 总是调用 `setMessages(await readMessages(sessionId))`。

影响：
- 如果异步读取进行中用户切换了会话，旧会话可能覆盖当前活动的聊天视图。

修复：
- 用 `activeIdRef.current === sessionId` 守卫 `setMessages`。

### 4. 出错/中止/完成后流式/权限 UI 可能卡住

提交：`778077d Fix runtime failure states and shell permission gaps`

证据：
- error 与 abort 事件刷新了 sessions/messages，但没有一致地清除流式文本或挂起的权限对话框状态。

影响：
- 在 turn 已经失败或中止后，Composer/会话 UI 可能仍停留在流式/等待状态。

修复：
- 新增 `clearStreaming(sessionId)`，并在 error/abort 时清除挂起的权限状态；非权限的 complete 清除流式状态。

### 5. 打包应用可能从 renderer 输入创建 FakeBackend 会话

提交：`778077d Fix runtime failure states and shell permission gaps`

证据：
- `vera-desktop/src/main/main.ts` 直接接受 renderer 的 `sessions:create({ backend: 'fake' })`。

影响：
- 打包应用存在一条绕过真实就绪契约的假会话创建路径。

修复：
- 新增 `canCreateFakeSessionFromRenderer()`，仅在未打包的 dev/visual-smoke 环境下允许假会话。

### 6. 技能已列出但未注入 runtime prompt

提交：`a4a9b7e Wire skills into prompts and stop parked permissions`

证据：
- `skills:list` 扫描 `{workspaceRoot}/skills/*/SKILL.md`，但 `buildSystemPrompt()` 只包含 personalization。

影响：
- UI 让技能看起来已安装，但模型从未收到其指令。

修复：
- 将技能扫描/prompt 组装抽取到 `vera-desktop/src/main/skills.ts`。
- `buildSystemPrompt()` 现在包含有界的本地技能指令。
- Prompt 片段明确说明：技能优先级较低、不能授予工具、不能绕过权限、不能覆盖更高优先级的指令。
- 在 `vera-desktop/src/main/__tests__/skills.test.ts` 中补充测试。

### 7. Stop 未拒绝挂起的工具权限请求

提交：`a4a9b7e Wire skills into prompts and stop parked permissions`

证据：
- `AiSdkBackend.stop()` 中止了模型流，但未结束当前 permission-engine turn。

影响：
- 如果工具正等待权限对话框，Stop 可能让工具包装器一直 parked，直到用户稍后做出决定。

修复：
- `stop()` 现在调用 `permissionEngine.endTurn(currentTurnId, 'aborted')`。
- 在 `vera-runtime/src/__tests__/ai-sdk-backend.test.ts` 中补充回归测试。

### 8. 自动批准的读取工具可能逃逸会话 cwd

提交：`21522a9 Constrain read tools to session cwd`

证据：
- `Read`、`Glob`、`Grep` 是 `permissionRequired: false`，但接受绝对路径、`../` 或符号链接逃逸。

影响：
- Explore/Ask 模式可以在不弹确认的情况下读取会话 workspace 之外的文件。

修复：
- `Read` 拒绝绝对路径，并使用会话 cwd 下的词法 + realpath 包含检查。
- `Glob` 拒绝绝对/父级遍历模式，并约束可选 cwd。
- `Grep` 将会话 cwd 之下的可选路径约束。
- 在 `vera-runtime/src/__tests__/builtin-tools.test.ts` 中补充测试。

### 9. 主进程流 catch 发出随机 turn id

提交：`1e41f64 Preserve turn ids for stream errors`

证据：
- `streamEvents()` 的 catch 用 `turnId: randomUUID()` 合成 renderer error 事件。

影响：
- 即使 runtime 已持久化正确的失败 turn，renderer error 事件仍可能脱离实际的 turn 血统。

修复：
- send/retry/regenerate/quick-chat 现在生成显式 turn id，并作为 `fallbackTurnId` 传入 `streamEvents()`。
- Catch 使用该 id，并同时发出 session 与 turn 状态变更事件。

### 10. Prompt 组装缺少 workspace 指令上下文

提交：`0afcf2e Inject workspace instructions into prompts`

证据：
- `buildSystemPrompt()` 包含 personalization 与已安装技能，但不读取活动会话 cwd 下的项目本地工程指令。

影响：
- 编码会话可能忽略 `AGENTS.md` 这类仓库本地规则，除非用户手动重复它们。

修复：
- Runtime system-prompt 回调现在接收 `{ sessionId, cwd, workspaceRoot }`。
- Desktop prompt 组装从会话 cwd 读取有界的 allowlist 文件：`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`。
- 加载器用 realpath 检查包含性、跳过符号链接逃逸、剥离控制字符、限制单文件与总 prompt 大小，并将 workspace 文件标记为低优先级/不可信上下文，不能授予工具或削弱权限。

### 11. Health Center 有校验信号但无 LLM runtime 探测信号

提交：当前 runtime health-probe 变更集

证据：
- `health:getSnapshot` 只发出 `healthSignalFromConnection()`，因此 LLM 行表示的是连接测试校验（`lastTestStatus`），而非真实的 send/stream/abort 路径。

影响：
- UI 正确地表达了"校验通过 ≠ 可运行"，但没有首个 runtime 信号来显示某连接是否真正成功发送、失败或被中止。

修复：
- LLM telemetry 记录现在包含 `connectionSlug`。
- `TelemetryRepo` 可以按连接/模型返回最新的 runtime 探测结果。
- Health 快照现在为每个已配置的启用连接发出独立的 `runtime_probe` 信号：首次发送前为 unknown、最近成功后为 ok、用户中止后为 info、最近 runtime 错误后为 warning。

### 12. Write/Edit 变更工具可能逃逸会话 cwd

提交：当前 write-tool 包含性变更集

证据：
- `Read`、`Glob`、`Grep` 已被约束到会话 cwd，但 `Write` 与 `Edit` 仍只用 `resolve(cwd, path)` 解析路径。
- 当权限模式允许该工具时，绝对路径与 `../` 遍历可能写入会话 cwd 之外；符号链接父目录可能把写入导向 workspace 之外。

影响：
- 即使有权限确认，工具契约声称是会话 cwd 内工作，但实现允许的文件系统变更范围超出用户能合理推断的界限。
- 在 Execute 模式下，`Write`/`Edit` 按策略是放行的，因此同样需要硬性路径边界。

修复：
- `Write` 现在在写入前拒绝绝对路径、父级遍历与符号链接父目录逃逸。
- `Edit` 现在复用现有的 realpath 包含 helper，并拒绝绝对路径、父级遍历与符号链接文件逃逸。
- 为两个变更工具补充回归测试。

### 13. 会话存储接受路径形状的会话 id

提交：当前 session-id 包含性变更集

证据：
- `FileSessionStore.sessionDir(sessionId)` 把 renderer/runtime 提供的会话 id 直接拼接在 `workspaceRoot/sessions` 之下。
- `remove(sessionId)` 等操作可能在路径校验存在之前收到遍历形状的 id。

影响：
- 大多数常规调用使用生成的 UUID，但 IPC/runtime 边界仍应在任何文件系统操作之前拒绝路径形状的 id。

修复：
- 会话存储现在只接受匹配 `[A-Za-z0-9_-]{1,128}` 的有界 id。
- `list()` 跳过畸形文件夹。
- 所有文件系统路径与写队列在读取、写入或删除之前断言相同的 id 契约。
- 回归测试验证遍历 id 被拒绝，且不会删除外部受害者目录。

## 剩余的产品 / 架构发现

### A. "即将推出"（Coming Soon）设置表面仍待产品决策

证据：
- `vera-desktop/src/renderer/settings/SettingsModal.tsx` 将 `daily-review`、`voice-models`、`open-gateway`、`search` 作为带 Coming Soon 文案的启用导航项暴露。
- `vera-core/src/settings.ts` 有 section id，但这些功能尚无真实的 settings 契约。

风险：
- 作为产品姿态文案这足够诚实，但仍占用 Settings 界面空间，且可能让人感觉是已发布能力。

建议：
- @WAWQAQ 应逐页抉择：立即实现、从导航隐藏、或保留为禁用的路线图文案。
- 如果保持可见，每页在可操作之前都需要真实的快照/状态来源。

### B. Health / Capability 中心仍只完成了部分探测

证据：
- `vera-desktop/src/main/capability-snapshot.ts` 将 Computer Use、Activity、Voice、Open Gateway、Memory Write 标记为 `not_available` 并附脚手架理由。
- Bot 就绪状态现在更安全了。
- LLM 连接健康现在有来自 usage telemetry 的首个真实 runtime 信号。
- 大多数非 LLM runtime 探测仍是占位符。

风险：
- UI 不再对运行状态撒谎，但实际的对等能力尚未实现。

建议：
- 后续工程 PR 应在把任何非 LLM 行翻转为 enabled/operational 之前实现真实探测。
- Computer Use 需要真实的辅助进程 + AX/截图探测；Voice 需要麦克风/TTS 分块探测；Open Gateway 需要心跳。

### C. Main / renderer / settings / UI 组件文件仍然过大

当前规模：
- `vera-desktop/src/main/main.ts`：1300 行
- `vera-desktop/src/renderer/main.tsx`：1428 行
- `vera-desktop/src/renderer/settings/SettingsModal.tsx`：1643 行
- `vera-ui/src/components.tsx`：2654 行
- `vera-runtime/src/ai-sdk-backend.ts`：912 行

风险：
- 修复更难隔离；合并冲突增加；微妙的事件/状态耦合容易漏看。

建议：
- 按职责拆分，而不是按任意的 helper 拆分：
  - main IPC：sessions/connections/settings/artifacts/capabilities/skills 模块
  - renderer：session 事件 reducer / settings shell / chat shell
  - ui components：chat、sessions、permissions、composer、tool activity 模块
  - runtime backend：流泵、工具包装器、telemetry/artifact 钩子

### D. Open Gateway / search / voice / daily review 仍是无操作（no-op）的路线图功能

证据：
- 它们有 Coming Soon UI 文案与 capability 快照占位符，但没有后端实现。

风险：
- 用户可能把导航理解为功能已存在。

建议：
- 在各自拥有 snapshot/degraded/revoke/audit/probe 契约之前，不要接线按钮/开关。
- 将全部四项保持在禁用文案之后，或直到实现启动前一直隐藏。

## 验证日志

在最新修复之后：
- `git diff --check` 通过。
- `npm run typecheck` 通过。
- `0afcf2e` 之后完整的 `npm test --workspaces --if-present` 通过：core 122 / storage 38 / runtime 99 / desktop 327 = 586。
- runtime health probe 工作之后完整的 `npm test --workspaces --if-present` 通过：core 124 / storage 39 / runtime 99 / desktop 327 = 589。
- 至今已推送的提交：`778077d`、`a4a9b7e`、`21522a9`、`1e41f64`、`5c324c4`、`0afcf2e`。
