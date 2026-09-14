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

# Vera 安全策略

本文档列出 Vera 视为承重（load-bearing）的信任边界、其内置但**不**视为边界的过程内安全网，以及如何报告漏洞。

它以 [hermes-agent 的 SECURITY.md][hermes-agent-sec] 为蓝本，并秉持同样的诚实原则：抵御恶意 LLM 的唯一强制边界是操作系统。agent 进程内部过滤的任何内容，都是作用在受攻击者影响的字符串之上的启发式规则。

[hermes-agent-sec]: https://github.com/NousResearch/hermes-agent/security

## 1. 报告漏洞

请通过邮件 **security@vera.app** 私下报告（或在 GitHub Security Advisory 启用后创建私有通告）。请勿为安全漏洞创建公开 issue。

有用的报告应包括：

- 简洁的描述与严重性评估。
- 受影响组件，注明文件路径与行范围（例如 `vera-desktop/src/main/main.ts:120-145`）。
- 环境信息（关于页中的 `vera` 版本、操作系统、Node / Electron 版本、最近提交 SHA）。
- 针对 `main` 或最新版本的复现步骤。
- 你认为被跨越的是 §2 中的哪条边界。

提交前请先阅读 §2 和 §3。若报告证明的是本策略不视为边界的某项过程内启发式规则的局限，将被以超出范围关闭，但仍欢迎作为普通 issue 或 pull request 提交。

## 2. 信任模型

Vera 是单租户个人桌面 AI 助手，以用户自己的操作系统账户运行。信任模型分为多层，且各层的承重程度**并不相同**。

### 2.1 定义

- **Agent 进程。** Electron 主进程及其加载的任何代码（`@vera/core`、`@vera/runtime`、`@vera/storage`、`@vera/ui`、内置工具、用户技能）。
- **Renderer 进程。** Electron 的沙箱化 renderer。仅通过 `vera-desktop/src/preload/preload.ts` 中的 preload IPC 桥接收数据。
- **权限引擎。** `@vera/core/permission` 依据所选模式评估每个工具类别。`PERMISSION_MODES`、`TOOL_CATEGORIES` 和 `PERMISSION_POLICY` 是确切权威；本文档不重复罗列其内容。
- **权限模式。** 按会话的用户设置。默认为 `ask`；其精确的允许、询问与阻止决策来自 `PERMISSION_POLICY`。
- **输入面。** 内容进入 agent 上下文的任何通道：聊天输入、文件读取、web 抓取、已启用的 bot 平台消息、工具结果，以及未来的外部集成。
- **信任包络。** Vera 从用户操作系统账户继承的资源集合：文件系统、网络、操作系统权限（钥匙串 / 麦克风 / 屏幕录制）。

### 2.2 边界：操作系统用户账户

**抵御恶意 LLM 的唯一强制边界是操作系统。** agent 进程内部的任何东西都不构成隔离 — 权限引擎不算、输出脱敏不算、URL 白名单不算、查询规范化不算、WebSearch 故障关闭链也不算。

每个过滤 LLM 输出的进程内组件，都是作用在 LLM 部分可控的字符串之上的启发式规则。我们发布它们是因为它们是有用的 UX 安全网 — 能拦住意外输出，并让对抗性输出慢到足以被人类察觉 — 但我们不把它们当作保证来发布。

Vera 默认不在独立进程或容器中运行工具。runtime 为受限 profile 暴露了 macOS Seatbelt 命令转换器，但当前产品组合尚未将命令执行路由到它，因此它今天还不是产品边界。外部隔离的 runtime 可以提供自己的边界。参见 [`vera-runtime/src/sandbox/README.md`](./vera-runtime/src/sandbox/README.md)。

### 2.3 我们确实视为承重的边界

1. **操作系统用户账户。** 工具以用户的权限运行。在相关系统上，用户应使用非管理员账户运行 Vera。
2. **静态凭据边界。** provider 凭据存储将 `credentials.json` 以带版本的明文 JSON 写入用户工作区目录。其承重边界是操作系统用户账户加文件系统控制：目录权限 0o700、文件权限 0o600、原子写入、无符号链接/路径穿越逃逸。订阅 OAuth token（Claude、Codex、GitHub Copilot 和 xAI）存放在同一存储中：`credentials.json` 是每个 Runtime Host 表面 — Desktop、TUI、CLI — 读写的唯一权威，遵循与其他 runtime 凭据相同的操作系统账户及 0o700/0o600 边界。Electron safeStorage 不再属于此边界。已存在的 safeStorage 加密凭据或 token 文件不会被导入；只有这些副本的用户必须重新认证。
3. **Renderer 进程沙箱 + preload IPC 桥。** renderer 无法直接触达文件、网络或 shell。`vera-desktop/src/main/main.ts` 中的每个 IPC handler 都是 renderer 控制输入与主进程动作之间的信任边界。renderer 代码被视为半可信：它可以读取脱敏/清洗后的数据，但明文机密绝不沿主进程到 renderer 的方向跨越边界（见 §4）。
4. **设置敏感项遮蔽。** Token、API key 和代理密码在 IPC 存储边界被遮蔽（`vera-desktop/src/main/settings-ipc-helpers.ts` 中的 `maskAppSettings`）。重新提交遮蔽哨兵 `••••••` 会被合并逻辑解释为"保持当前值"；空字符串被解释为显式清除。Tavily API key 遵循同样的边界。
5. **通过用户配置代理的网络出口。** `network.proxy` 设置驱动 Electron 的会话代理。绕过 `proxiedFetch` 的工具（Tavily 位于 main，使用标准 fetch）会被逐一审计。

### 2.4 我们发布但**不**视为边界的启发式规则

这些是有价值的 UX 安全网。证明其中某项存在局限的报告欢迎作为普通 issue 提交，而不是安全通告。

1. **权限引擎。** 在破坏性 / 文件写入 / shell 不安全 / web 出口类工具执行前询问用户。坚定的恶意 LLM 仍能构造出用户会接受的工具序列（社会工程）。操作系统是边界，引擎是 UX。
2. **`redactSecrets()` 输出清洗器。** 尽力而为的模式匹配器，应用于每一次文本→DOM 的跨越（`vera-ui/src/redact.ts`）。能减缓意外回显 token；无法捕获全新格式。
3. **`normalizeSearchUrl()` URL 白名单。** 在非 http(s) URL 到达 renderer 的 `<a href>` 之前，将它们从 agent 工具结果中过滤掉。
4. **默认 `PermissionMode.ask`。** 模式名称是 UX 控件，不是安全边界；即使宽松模式仍受当前策略表与操作系统隔离边界约束。
5. **模态生命周期契约测试。** 捕获可能违反 React hook 顺序的 `useEffect` 先于 `if (!open) return null` 模式。仅静态分析。
6. **WebSearch 故障关闭链。** `invalid_query → incognito_active → not_configured → invalid_credentials`。四个门都返回通用的中文文案，绝不暴露 API key、provider 原始响应体或触发的是哪个门。

### 2.5 隐私契约

除安全之外，Vera 还将以下内容视为面向用户的隐私承诺：

- **工作区状态保持本地。** 会话消息、工具结果、遥测、设置存储于 `app.getPath('userData')` 之下。不提供云同步。
- **工具查询字符串绝不记入日志。** WebSearch 工具的 `argsSummary` 在 `recordToolInvocation` 钩子处被清洗。
- **无痕上下文。** 当工作区隐私上下文报告 `incognitoActive: true` 时，WebSearch 工具在任何网络调用之前故障关闭。主进程组合与专项消费方测试掌握全部强制清单。
- **Token 边界。** 明文 API key / OAuth token / bot token 绝不跨越 main→renderer IPC 边界。`vera-desktop/src/main/__tests__/web-search-boundary.test.ts` 和 `claude-subscription-ipc-boundary.test.ts` 对 Tavily 和 Claude 订阅凭据强制执行此边界。

## 3. 漏洞报告的范围

当报告证明 §2.3 中的某条承重边界被跨越时，即属于范围内。示例：

- renderer 提供的 IPC 载荷到达工作区之外或超出用户明确批准的文件系统位置。
- `credentials.json` 被写入工作区凭据路径之外，通过符号链接/路径穿越逃逸，或使用比 0o700/0o600 边界更宽松的 POSIX 权限。
- 生产 OAuth 路径再次写入或要求 safeStorage 加密的 token 副本。`credentials.json` 是文档记载的唯一 token 权威；没有 safeStorage 旧版导入回退。
- 明文机密在任何情况下跨越 main→renderer IPC（包括错误路径、设置预览、IPC 结果信封、日志行）。
- 本应受权限门控的工具绕过了 PermissionEngine。

针对 §2.4 启发式规则的报告作为安全通告超出范围。它们欢迎作为普通 issue 或 pull request 提交。

## 4. Token 边界策略

此策略写得如此明确，是因为它是最常见的误解来源。

**明文 bot / API / OAuth token 仅在一个方向跨越 main↔renderer IPC 边界：用户在设置输入框中粘贴 token 时，由 renderer 提交。主进程绝不将明文 token 返回给 renderer。**

`settings:get` 的读取对所有敏感字段返回圆点遮蔽哨兵 `••••••`。renderer 可以通过与哨兵比较来区分"已有存储值"与"为空"，但永远看不到该值。恰好包含哨兵的更新载荷会被 `mergeWebSearchSettings`（及其在 `mergeSettings` 中的同类）解释为"保持当前值"，因此经由 `settings:get → settings:update` 的一次往返不会意外覆盖已存储的值。

凭据测试请求可以提交未保存的明文 token，以便用户在保存前验证。主进程仅为该单次请求接受它，且不会在响应中回显。

本策略的静态分析契约测试：
- `vera-desktop/src/main/__tests__/web-search-boundary.test.ts`
- `vera-desktop/src/main/__tests__/claude-subscription-ipc-boundary.test.ts`

## 5. 版本管理

本策略适用于当前 `main` 分支和最新版本。旧版本不受积极安全维护。如果我们推出长期支持版本，会在发布说明中说明。

## 6. 致谢

本文档的结构和若干措辞改编自 [hermes-agent SECURITY.md][hermes-agent-sec]。感谢 Nous Research 团队为诚实的 agent 安全框架树立标杆。
