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

# Vera 全产品完成与测试计划

> 于 2026-07-13 归档。这份一个月交付计划保留作为历史背景；当前工作与进展请见 GitHub issues 和 pull requests。

> 负责人：@xuan
> 日期：2026-05-22
> 范围：Vera 桌面产品能力、质量门禁与发布测试的一个月完成计划。

本文档是一份交付契约。一个功能不因 UI 存在或 PR 合并而算完成。只有当用户流程、数据契约、测试、fixtures、smoke 路径和安全/隐私门禁全部就位时才算完成。

## 0. 不可协商的规则

每个 PR 都必须在描述中回答这五个问题：

1. **契约**：哪些数据结构、IPC 通道、runtime 事件、持久化状态或组件契约发生了变化？
2. **用户流程**：这个 PR 之后用户能完成哪条确切路径？
3. **测试**：哪些单元、存储、runtime、IPC/main、renderer-helper、fixture 和 smoke 测试覆盖它？
4. **安全**：适用什么信任边界、密钥处理、路径防护、sandbox、脱敏或权限规则？
5. **未包含**：哪些相邻工作明确不在范围内并单独跟踪？

出现以下任一情况则不允许发布：

- 已配置可用的默认模型，但旧会话仍可能阻塞发送。
- provider 密钥、原始 provider 错误、文件系统绝对路径、chatId 或密钥形态的值可能泄漏到 stdout、UI、遥测、导出、诊断或产物元数据。
- renderer 可以读取或打开任意绝对路径。
- HTML/Markdown 内容可以导航 Electron renderer、打开启用 Node 的窗口或逃逸其 sandbox。
- 新 UI 界面没有空、加载、错误和焦点状态。
- 新有状态功能没有确定性 fixture 场景和 smoke 路径。
- 新逻辑分支只存在于 React 代码中，而在纯辅助函数可行时却没有纯辅助函数或自动化测试。
- 对可以用 node:test 确定性测试的场景，使用了仅手工的门禁。

## 1. 一个月交付计划

### 第 1 周：重建信任并完成 Artifact Workbench

目标：核心对话发送路径和生成的工作产出必须可靠。

必需交付物：

- P0 过期会话发送/重绑定完全收口。
- Artifact 面板成为真正的工作台界面，而非对话记录的装饰。
- 产物具备真实的保存/导出行为。
- 产物 runtime 钩子覆盖常见的产出文件的工具。
- 对正常、错误、已删除、过大、不支持的 MIME 和重载状态提供确定性 fixture 和 smoke 覆盖。

完成意味着：

- 旧的 `fake`、遗留后端、已删除连接、过期模型和有效的 Z.ai 默认用例都已测试。
- 产物记录为文件支撑，renderer 永远看不到绝对路径，已删除的 tombstone 阻止读取，symlink 逃逸失败。
- HTML 预览为只读视图，带 sandbox 且导航被阻止。
- 二进制预览使用嗅探的 MIME 白名单。
- smoke 路径覆盖浅色、深色、窄屏、重载和失败状态。

### 第 2 周：模型目录、工作站外壳、会话状态、回合控制

目标：Vera 不再表现得像通用聊天列表，而是像一个带有显式状态的工作台。

必需交付物：

- `ModelCatalogEntry`，带规范化的能力、来源、过期/不支持原因、上下文和定价字段。
- 对话默认模型不能是仅图像、仅 embedding、不支持、已禁用、缺失或过期的，除非有可见原因。
- 会话状态模型：active、running、waiting、blocked、review、done、archived、stale、errored。
- 侧边栏/头部展示 workspace、模型、状态、阻塞原因和旧会话迁移状态。
- 回合控制：retry、regenerate、branch-from-turn、cancel、checkpoint-before-tools。

完成意味着：

- 状态转换有 node:test 覆盖。
- 回合控制不能覆盖旧输出。
- 取消持久化一个显式的 aborted 状态。
- 不支持的模型用例在 ModelTable 中可见，并在发送就绪检查中失败关闭。
- fixture 场景为每种状态和模型能力组合准备种子数据。

### 第 3 周：Health Center、首次运行、Quick Chat、Settings 完成

目标：安装设置、调试和入口都是一等公民。

必需交付物：

- Health Center 覆盖 provider、凭据、bot、代理、搜索、语音、open-gateway、存储、产物和 workspace 健康状态。
- 脱敏的诊断复制。
- 首次运行向导：provider 预设、粘贴密钥、测试/获取模型、选择默认、发送 smoke 提示。
- Quick Chat MVP：全局快捷键和面板窗口；MVP 不做无障碍树捕获，除非单独批准并加门禁。
- Settings 面板：字体/侧边栏、对话调优、可编辑按键绑定和高级标志。

完成意味着：

- 首次运行不允许"回退即成功"。
- Health Center 使用泛化原因，绝不使用原始 provider 错误。
- Quick Chat 快速打开、聚焦 composer、复用就绪防护，并在没有可用模型时失败关闭。
- 按键绑定检测冲突并提供恢复默认。

### 第 4 周：Open Gateway、Memory、Voice、Search、MCP、Sources/Skills/Automations

目标：在不隐形扩大权限的前提下，完成承诺的生态系统和自动化界面。

必需交付物：

- 兼容 OpenAI 的本地网关，带 auth、SSE、模型映射、用量遥测和关闭能力。
- Memory MVP，带显式的检查/删除控件，无隐藏的权限扩大。
- 语音输入 MVP，带权限状态和转录纠正。
- 搜索/网页引用界面，带来源徽标和导出行为。
- MCP 服务器面板，带状态、作用域、工具列表和禁用控件。
- Sources、Skills、Automations 视图：auth/scope、允许的工具、上次运行、上次错误和禁用。

完成意味着：

- 每个外部集成都有 auth、缺失、超时、网络、限流和已撤销状态。
- 每个自动化都可见、可禁用、可审计。
- Skill 安装绝不意味着权限扩大。
- 诊断和遥测经过脱敏并带原因编码。

## 2. 测试分层

### 2.1 核心单元测试

用途：

- 数据契约与枚举验证，
- 权限分类，
- 脱敏与泛化错误消息，
- 模型能力/就绪规则，
- 会话/回合状态转换。

门禁：

```bash
npm --workspace @vera/core test
```

### 2.2 存储测试

用途：

- JSONL 头部迁移，
- 产物元数据与文件支撑载荷，
- 凭据/连接持久化，
- 遥测聚合，
- symlink 与路径穿越防护，
- tombstone 与清除行为。

门禁：

```bash
npm --workspace @vera/storage test
```

### 2.3 Runtime 测试

用途：

- SessionManager 生命周期，
- 配置变更时后端重建，
- 流式事件，
- 工具产物推导，
- 取消，
- 权限搁置，
- provider 模型获取与连接测试。

门禁：

```bash
npm --workspace @vera/runtime test
```

### 2.4 Desktop main / IPC 测试

用途：

- 对话就绪与自动重绑定，
- 外部链接防护，
- 窗口状态，
- 打开路径防护，
- 视觉 smoke fixture 模式，
- 连接状态，
- settings IPC 辅助函数，
- 产物 IPC 失败原因，
- sandbox 桥健全性。

门禁：

```bash
npm --workspace @vera/desktop test
```

### 2.5 Renderer 纯辅助函数测试

用途：

- 状态推导，
- 键盘转换辅助函数，
- 展示文案矩阵，
- 状态优先级，
- 回合物化，
- 命令面板过滤，
- 侧边栏过期/会话状态投影。

规则：如果 React 分支根据数据决定行为，就抽取为纯辅助函数，除非该分支微不足道。

### 2.6 Fixture 场景

每个新界面都获得一个确定性 fixture。Fixture 必须：

- 只在 dev/test 中运行，
- 使用隔离的 `workspaces/visual-smoke-*`，
- 启动时从零播种，
- 不依赖真实密钥或网络，
- 只通过 `visualSmoke.getState()` 暴露瞬态，
- fixture 模式关闭时返回 `null`。

必需场景：

| 场景 | 用途 |
|---|---|
| `first-run` | 空 workspace、无连接 |
| `provider-workspace` | 已获取模型、默认、已验证 |
| `provider-fallback` | 回退来源与刷新错误 |
| `provider-empty` | 获取为空状态 |
| `connection-error` | needs_reauth/error 头部 |
| `turn-narrative` | 用户、工具、助手、token 汇总、thinking |
| `streaming-sidebar` | 流式预览与未读优先级 |
| `permission-destructive` | 破坏性 PermissionDialog |
| `artifact-pane` | html、diff、markdown/文件产物 |
| `artifact-errors` | 已删除、too_large、unsupported_mime、缺失 |
| `stale-sessions` | fake/stale/deleted 会话行与头部徽标 |
| `workstation-statuses` | active/running/waiting/blocked/review/done/archive |
| `turn-controls` | retry/regenerate/branch/cancel/checkpoint |
| `model-catalog` | chat/image/embedding/unsupported/stale 模型 |
| `health-center` | 全部健康 + 全部错误 |
| `first-run-stepper` | 快乐路径 + test/fetch 失败 |
| `quick-chat` | 面板打开、无可用默认、可用默认 |
| `sources-skills-automations` | 来源 auth/scope、skill 工具、自动化上次运行 |

### 2.7 Smoke 路径

`vera-desktop/tests/smoke.md` 是发布检查清单。上面的每个 fixture 场景都需要一条 smoke 路径，或一个被现有路径覆盖的明确理由。

每条 smoke 路径都必须包含：

- 启动命令，
- fixture 场景，
- 精确的用户步骤，
- 期望的 UI 状态，
- 失败状态，
- 浅色/深色/窄屏截图要求，
- 重载持久化预期，
- 禁止回归。

### 2.8 视觉回归

每个新界面必需的截图：

- 浅色桌面，
- 深色桌面，
- 窄宽度，
- 加载，
- 空，
- 错误/失败，
- 活动/焦点状态。

当前自动化：

- `npm --workspace @vera/desktop run screenshots` 捕获浅色/深色、1280/990 宽度、正常/减弱动画下的所有 fixture
  场景。
- `npm --workspace @vera/desktop run screenshots:diff:stable` 是稳定子集（`artifact-pane`、
  `first-run`、`artifact-errors`）的阻塞式健全性门禁。
- 稳定门禁只针对捕获/流水线/视口失败：PNG 缺失、PNG 损坏、过小/截断的 PNG 和错误
  的尺寸。
- 字节大小漂移是警告，不是阻塞项。

明确局限：当前的 PR-IR-02 门禁**不是**像素级视觉回归测试。它不能证明 UI 布局、颜色、排版、
间距或焦点渲染保持正确。评审者仍必须检查截图的视觉质量，并通过 smoke 路径验证行为。

未来自动化目标：

- 先在稳定子集上试点像素级 diff，
- 使用校准的容差而不是字节/SHA 相等，
- 支持时间戳/流式/瞬态 UI 的忽略动态区域，
- 保存 diff 产物供评审，
- 只有在门禁在 main 上稳定后才扩展到稳定子集之外。

### 2.9 安全与隐私门禁

每个功能必须声明：

- 路径边界，
- 网络边界，
- 密钥边界，
- renderer/main 信任边界，
- 导出/剪贴板边界，
- 遥测/日志边界，
- 权限边界。

必需检查：

- `scripts/check-console.mjs` 通过。
- 新增的 `console.*` 仅限开发环境或有理由的白名单。
- 导出/诊断中的用户/provider 文本经过脱敏。
- 原始 provider 错误经 `generalizedErrorMessage` 处理。
- renderer 永远不会收到解密后的密钥。
- 不显示绝对路径，除非该界面明确是本地路径管理界面。
- 文件操作使用 realpath 包含检查，而不是字符串前缀检查。
- 对不受信任的内容，Electron 导航/window-open 保持阻止。

## 3. 功能完成定义

### 3.1 对话发送与会话就绪

用例：

- 无默认连接，
- 默认指向 `fake`，
- 连接缺失，
- 连接被禁用，
- API 密钥缺失，
- 模型缺失，
- 模型列表为空，
- 模型未启用，
- 有过期 fake 会话且有可用默认，
- 有过期缺失连接且有可用默认，
- 有过期会话但无可用默认，
- 重绑定后的活动后端缓存。

完成意味着：

- 自动重绑定后，可用默认 + 过期旧会话发送成功，
- 无可用默认时以原始的机器可读原因失败，
- 发送失败时 renderer 保留未发送的输入，
- 发送前头部/侧边栏解释过期状态，
- 测试覆盖所有用例。

### 3.2 Artifact Workbench

用例：

- 列出/获取/读取文本/读取二进制/删除，
- 从工具输出实时创建产物，
- 已删除 tombstone 阻止读取，
- symlink 逃逸，
- 路径穿越，
- 文本过大，
- 不支持的 MIME，
- 带外部链接的 HTML，
- 重载持久化，
- 在 Finder 中显示，
- 真实的另存为。

完成意味着：

- 产物是一等对象，
- 对话记录引用紧凑，
- 面板预览可靠，
- 导出/保存正常工作且不让 renderer 接触绝对路径。

### 3.3 模型目录

用例：

- 获取来源，
- 回退来源，
- 获取为空，
- 过期缓存，
- 不支持的仅图像，
- 不支持的仅 embedding，
- 执行模式下缺少工具调用，
- 自定义 OpenAI 兼容，
- 定价覆盖。

完成意味着：

- UI 展示后端规范化目录中的事实，
- 对话就绪拒绝不支持的默认，
- 模型表解释禁用的行。

### 3.4 工作站外壳

用例：

- active（活动），
- running（运行中），
- waiting（等待权限），
- blocked（被配置/认证阻塞），
- review（评审），
- done（完成），
- archived（已归档），
- stale/rebound（过期/已重绑定），
- error（错误）。

完成意味着：

- 侧边栏、头部和对话主体对状态保持一致，
- 状态变更被持久化，
- 状态转换经过测试，
- 没有任何状态仅凭样式推断。

### 3.5 回合控制

用例：

- 重试失败的回合，
- 重新生成助手回答，
- 从先前回合分支，
- 取消运行中的回合，
- 工具前检查点，
- 保留旧输出。

完成意味着：

- 持久化的回合状态防止覆盖，
- 分支复制正确的消息边界，
- 取消写入 aborted，
- 无效时 UI 按钮被禁用。

### 3.6 Health Center

用例：

- provider 正常/错误/重新认证，
- 凭据缺失/已撤销，
- bot 禁用/错误/已连接，
- 代理禁用/错误/正常，
- 存储路径不可用，
- 产物根不可用，
- open gateway 停止/运行/错误，
- search/voice/MCP 不可用。

完成意味着：

- 用户有一个统一的地方检查系统健康，
- 复制诊断经过脱敏，
- 每个子系统使用原因编码的状态。

### 3.7 首次运行

用例：

- 无连接，
- 无效密钥格式，
- provider 测试 401，
- 模型获取错误，
- 获取为空，
- 选择默认，
- 发送 smoke 提示。

完成意味着：

- 用户可以在四步内从空 workspace 到达第一条真实消息，
- 失败内联展示，
- 无"回退即成功"。

### 3.8 Quick Chat

用例：

- 全局快捷键已注册，
- 热键冲突，
- 无可用模型，
- 有可用模型，
- 存在活动会话上下文，
- 发送/停止，
- 关闭/重新打开保留草稿策略。

完成意味着：

- Quick Chat 是同一就绪/runtime 契约的入口，
- 它不引入第二条发送路径。

### 3.9 集成

用例：

- Open Gateway auth/SSE/错误，
- Memory 检查/删除，
- Voice 权限/转录错误，
- Search 引用/导出，
- MCP 服务器安装/连接/工具列表，
- Sources/Skills/Automations 作用域与禁用。

完成意味着：

- 每个集成可见、有作用域、可禁用、可测试，
- 没有集成会静默扩大工具权限。

## 4. PR 检查清单

复制到 PR 描述中：

```md
## Contract
- [ ] Data/API/event/state changes described
- [ ] docs/design-system.md or docs/full-product-test-plan.md updated if contract changed

## User Flow
- [ ] Main happy path described
- [ ] Failure path described
- [ ] Reload/persistence behavior described

## Tests
- [ ] core/storage/runtime/desktop tests added or marked N/A with reason
- [ ] renderer pure helper test added where practical
- [ ] fixture scenario added/updated
- [ ] smoke.md path added/updated
- [ ] light/dark/narrow screenshots captured or visual gate marked N/A with reason

## Security
- [ ] secrets redacted
- [ ] raw provider errors generalized
- [ ] path boundary uses realpath containment
- [ ] renderer does not receive arbitrary absolute paths
- [ ] Electron navigation/window-open/sandbox boundary unchanged or tightened
- [ ] console/log behavior checked

## Not Included
- [ ] Follow-up work listed explicitly
```

## 5. 命令门禁

在合并任何非纯文档 PR 之前：

```bash
npm run build
npm run typecheck
npm test --workspaces --if-present
```

对于 UI 界面，还要运行 `vera-desktop/tests/smoke.md` 中的相关 fixture smoke 路径。

## 6. 当前下一步工作

P0 过期会话修复后的优先级顺序：

1. Artifact Workbench 完成：真实的另存为、产物错误 fixture、已删除/过大/不支持的 smoke。
2. ModelCatalogEntry 与不支持默认模型防护。
3. 工作站外壳/会话状态。
4. 回合控制。
5. Health Center。
6. 首次运行向导。
7. Quick Chat。
8. Open Gateway / Memory / Voice / Search / MCP / Sources-Skills-Automations。

下一个实现 PR 应针对第 1 项，且不得把范围扩大到无关的 UI 打磨。
