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

# Vera 能力成熟度审计 v1

> Archived on 2026-07-13. This is a point-in-time audit against a May 2026 code baseline; its progress and frontend-document references are not current guidance.

> 编写：@xuan
> 日期：2026-05-22
> 基线：`main` at `832bbac`
> 范围：能力 / runtime / storage / IPC / release gate。UI 视觉规则以 `docs/design-system.md` 为准。

本文档回应 task #12 中 "@xuan 详细挖掘现在项目存在的问题，和需要继续做的能力"。
目标不是再列一组 wish list，而是把 Vera 从 "能聊天的桌面 app" 推向
参考实现 / 参考实现那类成熟工作台时必须补齐的系统 contract。

审计参考：

- Vera 当前代码：`vera-core/src/session.ts`,
  `vera-core/src/events.ts`, `vera-core/src/llm-connections.ts`,
  `vera-runtime/src/session-manager.ts`, `vera-runtime/src/builtin-tools.ts`,
  `vera-desktop/src/main/main.ts`, `vera-desktop/tests/smoke.md`
- 参考实现本地资料：local research notes,
  architecture gap notes,
  `docs/11-providers.md`, `docs/17-workspaces-git.md`, `docs/39-streaming-deep.md`,
  `readable/preload.js`
- 参考实现本地资料：`~/.reference implementation-agent/docs/reference implementation-cli.md`,
  `~/.reference implementation-agent/release-notes/*.md`

## 0. 当前基线判断

Vera 目前已经不是早期 chat demo：

- provider model discovery 已走 live fetch + source/fetchedAt contract；
- Settings / ModelTable / turn grouping / typed tool renderer / visual smoke fixture 已有基本 gate；
- Electron 安全边界、console audit、readiness reason、window state 等桌面基础已补了一轮；
- `docs/design-system.md` 已把 visual release gate 写成契约。

但能力层仍然薄：核心数据模型仍围绕 "session + JSONL messages"，没有 artifact、
workspace status、turn control、source/automation、health、memory 这些成熟工作台必须有的持久化对象。
接下来最重要的不是继续堆 Settings polish，而是补数据结构和状态机。

## 1. 第一优先级：ArtifactRecord + right pane

### 现状问题

Vera 当前的 tool result 都落在 transcript 里：

- `ToolResultContent` 只有 `file_diff` / `file_write` / `terminal` / `image` / `summary` 等结果形状；
- UI 通过 typed renderer 把 diff/terminal 渲染好，但仍然是 chat turn 的一部分；
- 大 HTML、图片、PDF、长 diff、生成文件没有成为可选择、可复看、可导出的工作成果。

用户路径上的不成熟感：

- 一次生成网页 / 图片 / 文档后，用户只能在长聊天里找结果；
- terminal/diff 输出占据主叙事，缺少 "成果面板"；
- 后续 snapshot / rollback / preview 没有对象可挂。

### 参考实现对照

参考实现 preload 已有 `snapshot.*` 一组能力（create / file / list / get / diff / rollback / cleanup），并把 workspace diff/snapshot 从 transcript 中分离出来。
参考实现的 release notes 也反复强调 diff / preview / data table / terminal preview 的独立呈现。

可复制的是：artifact 作为第一等对象；不可照搬的是参考实现 wide-open local API。

### 合同 / API

新增 core contract：

```ts
export type ArtifactKind =
  | 'file'
  | 'html'
  | 'image'
  | 'pdf'
  | 'diff'
  | 'terminal'
  | 'json'
  | 'markdown';

export interface ArtifactRecord {
  id: string;
  sessionId: string;
  turnId?: string;
  toolUseId?: string;
  kind: ArtifactKind;
  title: string;
  createdAt: number;
  updatedAt: number;
  source: 'tool_result' | 'user_upload' | 'export' | 'snapshot';
  ref: StorageRef;
  mimeType?: string;
  bytes?: number;
  summary?: string;
  status: 'ready' | 'streaming' | 'errored' | 'deleted';
  errorReason?: string;
}
```

Storage:

- 每个 session 一个 `artifacts.jsonl`，或每个 workspace 一个 `artifacts/metadata.jsonl`；
- large payload 必须 file-backed，不进入 `session.jsonl`；
- HTML preview 使用 sandboxed iframe，禁止 inline untrusted script 执行；
- deletion 先 soft-delete，避免 transcript 中引用断裂。

IPC:

- `artifacts:list(sessionId?)`
- `artifacts:get(id)`
- `artifacts:open(id)`
- `artifacts:delete(id)`
- `artifacts:export(id, format?)`

Renderer:

- right pane 作为 `--z-panel` 消费者；
- Chat turn 内只显示 compact artifact card；
- pane 负责 full preview / copy / open / export。

### 失败状态

需要固定 reason：

- `artifact_missing`
- `artifact_deleted`
- `artifact_too_large`
- `artifact_preview_unsupported`
- `artifact_load_failed`
- `artifact_sandbox_blocked`

### 验证门

- node:test：ArtifactStore append/list/get/delete；HTML artifact 必须 file-backed；
- fixture：新增 `artifact-pane` scenario，包含 html + image + diff + errored artifact；
- smoke.md：新增「Artifact 面板打开 / 预览 / 导出 / 错误」路径；
- screenshot：light/dark/narrow + 缺失 artifact 的失败状态。

## 2. Tool output streaming delta 协议

### 现状问题

Vera 已有 `ToolProgressEvent`，但当前 runtime tools 多数只在 tool 完成后返回完整 result。
`Bash` 使用 `exec`，只有完成后一次性拿 stdout/stderr。UI 的 terminal renderer 也只能显示 settled output。

用户路径上的不成熟感：

- 长测试 / build / install 没有实时 stdout；
- 用户以为 app 卡住；
- Stop 后看不到 partial output。

### 参考实现对照

参考实现 streaming docs 强调 tool output delta；参考实现 release notes 也多次修复 partial output / streaming error recovery。
可复制的是 "delta 先到 UI，final result 再落盘"。

### 合同 / API

扩展事件：

```ts
export interface ToolProgressEvent extends BaseEvent {
  type: 'tool_progress';
  toolUseId: string;
  sequence: number;
  stream: 'stdout' | 'stderr' | 'progress' | 'text';
  text: string;
  truncated?: boolean;
}
```

Runtime:

- Bash 从 `exec` 改成 `spawn`；
- stdout/stderr chunk 经 redaction 后发 `tool_progress`；
- final `tool_result` 保留 capped output + artifact ref（完整日志入 artifact）；
- abort 时落 `tool_result` with `isError=true` + `reason='aborted'` 或独立 aborted event。

### 失败状态

- `tool_aborted`
- `tool_timeout`
- `tool_output_truncated`
- `tool_spawn_failed`
- `tool_permission_denied`

### 验证门

- node:test：fake streaming tool 按顺序发出 progress → result；
- fixture：`turn-with-streaming-tool`；
- smoke：长 running command 能实时显示 stdout/stderr，Stop 后保留 partial output。

## 3. ModelCatalogEntry：模型目录不再只是 ModelInfo

### 现状问题

当前 `ModelInfo` 只有 `id/contextWindow/maxOutputTokens/capabilities`，capabilities 也只有 vision/reasoning/functionCalling。
不足：

- 没有 `mode` 区分 chat/image/audio/embedding/rerank；
- 没有 pricing/source/stale/unsupported；
- default model 校验只看 model id 是否在 enabled list；
- 无法阻止 image-only / embedding-only model 被设为 chat default；
- Health / first-run 无法解释 "模型存在但不能用于当前 chat"。

### 参考实现对照

参考实现 provider 层会根据 model id 补 capability；参考实现 release notes 中也反复修 model resolution / Bedrock region / unsupported model 过滤。
可复制的是 backend-normalized catalog，而不是 UI 猜。

### 合同 / API

新增：

```ts
export type ModelCapability =
  | 'chat'
  | 'tool_use'
  | 'vision'
  | 'reasoning'
  | 'image_generation'
  | 'audio_input'
  | 'audio_output'
  | 'embedding';

export interface ModelCatalogEntry {
  id: string;
  displayName?: string;
  providerType: ProviderType;
  capabilities: ModelCapability[];
  contextWindow?: number;
  maxOutputTokens?: number;
  pricing?: {
    inputPerMtok?: number;
    outputPerMtok?: number;
    currency: 'USD' | 'CNY';
    source: 'builtin' | 'provider' | 'user';
  };
  source: 'fetched' | 'fallback' | 'user_custom';
  fetchedAt?: number;
  stale?: boolean;
  unsupportedReason?: 'not_chat_model' | 'missing_tool_use' | 'provider_deprecated' | 'unknown';
}
```

Readiness 守卫：

- chat default 要求 `capabilities.includes('chat')`；
- tool mode 要求 `tool_use`；
- image/audio model 不能设为 chat default。

### 失败状态

- `model_unsupported`
- `model_stale`
- `model_not_chat_capable`
- `model_requires_refresh`

### 验证门

- node:test：unsupported/image-only 不能成为默认模型；
- fixture：provider 有 chat/image/embedding 混合模型；
- smoke：ModelTable 中 unsupported 行显示为禁用 + 原因。

## 4. Session status / workstation shell

### 现状问题

`SessionSummary` 当前没有 status。运行态由 renderer 的 `streamingBySession` map 临时推断。
这对单窗口短聊天够用，但对工作台不够：

- session 正在 running / waiting permission / blocked / errored / review / done 无持久状态；
- app 重启后无法恢复 "上次卡在 permission" / "上次工具失败"；
- sidebar 只能显示 unread / streaming dot，不知道工作流阶段；
- Health / automations / artifacts 都缺 workspace shell 可挂载的位置。

### 参考实现对照

参考实现有 thread/workspace/snapshot 体系；参考实现有 workspace、labels、sources、automations，release notes 里也提到 branch/session recovery。
可复制的是 session 状态机和 workspace metadata。

### 合同 / API

扩展 `SessionHeader`：

```ts
export type SessionStatus =
  | 'active'
  | 'running'
  | 'waiting_permission'
  | 'blocked'
  | 'review'
  | 'done'
  | 'errored'
  | 'archived';

export interface SessionHeader {
  status: SessionStatus;
  statusReason?: string;
  workspace?: {
    root: string;
    branch?: string;
    pr?: string;
    dirty?: boolean;
  };
}
```

Runtime:

- send start → `running`
- permission_request → `waiting_permission`
- permission deny → `blocked`
- complete → `done` or `review`（由 turn control 决定）
- error → `errored` with reason
- archive → `archived`

### 失败状态

- `session_connection_missing`
- `session_permission_blocked`
- `session_tool_failed`
- `session_aborted`
- `session_recovery_needed`

### 验证门

- node:test：状态转换；
- fixture：running / waiting_permission / errored / done sessions；
- smoke：sidebar 行 + header 状态一致。

## 5. Turn control：retry / branch / regenerate / checkpoint

### 现状问题

Vera 有 turn grouping，但没有 turn-level controls：

- retry/regenerate 没有 contract；
- branch-from-turn 没有 lineage；
- cancel/abort 只是一条 system note，不是 turn status；
- tool 执行前没有 checkpoint/snapshot，因此 destructive 修改后无法 rollback；
- 旧输出不可覆盖这个原则没有被模型化。

### 参考实现对照

参考实现有 snapshots / branch / compact；参考实现 release notes 明确 session branching 和 branch cutoff 是长期复杂点。
这说明分支/重试必须从第一天就有 sidecar anchor 和 lineage，不要先做 UI 按钮。

### 合同 / API

新增 `TurnRecord`：

```ts
export interface TurnRecord {
  id: string;
  sessionId: string;
  parentTurnId?: string;
  branchId?: string;
  status: 'running' | 'completed' | 'aborted' | 'errored' | 'superseded';
  startedAt: number;
  completedAt?: number;
  modelId?: string;
  snapshotIdBeforeTools?: string;
  errorReason?: string;
}
```

IPC:

- `turns:retry(sessionId, turnId)`
- `turns:branch(sessionId, turnId)`
- `turns:cancel(sessionId, turnId)`
- `turns:createCheckpoint(sessionId, turnId)`

### 失败状态

- `turn_not_found`
- `turn_already_running`
- `branch_cutoff_invalid`
- `checkpoint_failed`
- `retry_requires_model`

### 验证门

- node:test：branch 只复制到 turn 边界为止的消息；
- fixture：branch 出的 session + 已中止的 turn；
- smoke：从先前 turn branch 出新的 sidebar session，原 session 不变。

## 6. Health Center：分散状态收拢

### 现状问题

目前健康状态分散：

- provider credential 在 Account / Models；
- proxy 在 Network；
- bot 在 Bot Chat；
- model fetch source 在 ModelTable；
- storage / visual smoke / console gate 不在 UI；
- missing connection 只在 chat header。

用户路径上的不成熟感：

- 出错时不知道是 key、网络、proxy、provider、bot、model list、workspace 权限哪一个；
- bug report 不能一键 copy redacted diagnostics；
- release smoke 也没有一个综合状态页。

### 参考实现对照

参考实现有大量 `/api/*/status` 和 settings tree；参考实现 CLI 的 `source test/validate`、automation validate/lint 都是 health surface。

### 合同 / API

新增：

```ts
export type HealthComponent =
  | 'provider'
  | 'credential'
  | 'model_catalog'
  | 'proxy'
  | 'bot'
  | 'storage'
  | 'skills'
  | 'search'
  | 'voice'
  | 'open_gateway';

export interface HealthCheckResult {
  component: HealthComponent;
  id: string;
  label: string;
  status: 'ok' | 'warning' | 'error' | 'disabled' | 'unknown';
  reason?: string;
  message: string;
  lastCheckedAt?: number;
  details?: Record<string, unknown>; // redacted only
}
```

IPC:

- `health:list()`
- `health:run(component?, id?)`
- `health:copyDiagnostics()`

诊断信息必须包含：

- app 版本 / OS / workspace schema；
- 不含 secret 的 provider 状态；
- 最近一次通用错误；
- 不含凭据的 proxy enabled/type；
- storage 文件存在性 / JSON 解析状态；
- 除非用户显式复制 workspace 路径，否则不出现原始路径。

### 失败状态

使用与 readiness / connection / proxy 相同的 reason 词汇表：

- `auth`
- `timeout`
- `network`
- `provider_unavailable`
- `connection_missing`
- `storage_corrupt`
- `unsupported`

### 验证门

- node:test：诊断脱敏；
- fixture：ok/warning/error 混合的健康状态；
- smoke：Health Center 复制出的输出不含 key/路径 secret。

## 7. Sources / Skills / Automations 可见系统

### 现状问题

Vera 只会从 `workspaceRoot/skills` 列出已安装的 skills。没有第一等 source、没有 source 作用域的权限、没有 automations。

当前缺口：

- skill 可见不代表可调用 / 有权限；
- 没有 source 的 auth/scope/status；
- 没有 automation 的上次运行/历史；
- 用户无法审计哪个能力可以触达什么。

### 参考实现对照

参考实现 CLI 拥有第一等的 `source`、`skill`、`automation`、`permission` 实体，并带有 validate/test/history 命令。
这对 Vera 是一个很强的模型，因为它让外部能力保持可见且可撤销。

### 合同 / API

最小的第一步：

```ts
export interface SourceRecord {
  slug: string;
  name: string;
  type: 'mcp' | 'api' | 'local';
  enabled: boolean;
  authType: 'oauth' | 'bearer' | 'none';
  scopeSummary: string[];
  status: 'ready' | 'needs_auth' | 'error' | 'disabled';
  lastTestAt?: number;
  lastErrorReason?: string;
}

export interface AutomationRecord {
  id: string;
  name: string;
  enabled: boolean;
  trigger: 'manual' | 'schedule' | 'event';
  permissionMode: 'explore' | 'ask' | 'execute';
  lastRunAt?: number;
  lastRunStatus?: 'ok' | 'error' | 'skipped';
}
```

### 失败状态

- `source_needs_auth`
- `source_scope_denied`
- `automation_disabled`
- `automation_last_run_failed`
- `skill_missing_source`

### 验证门

- node:test：skill 不能扩大权限模式；
- fixture：source 需要 auth + 已禁用的 automation；
- smoke：Settings 界面显示 source/skill/automation 的启用/禁用/测试状态。

## 8. 首次运行直达价值

### 现状问题

OnboardingHero 已存在，provider 保存后自动拉取模型也可用，但流程仍然碎片化：

1. 选择 Provider preset；
2. 粘贴 key；
3. 保存；
4. 自动拉取；
5. 选择默认模型；
6. 回到聊天；
7. 发送提示。

没有显式的「你已就绪」smoke 提示、没有内联的模型拉取失败通道，也没有 first-run 状态机。

### 参考实现对照

参考实现 `validate-server` 自动引导临时 workspace/connection 用于验证；参考实现的 onboarding 有权限时机与 settings 树。
可复制的是 first-run 引导状态，而不是电影式 onboarding。

### 合同 / API

```ts
export type FirstRunStep =
  | 'choose_provider'
  | 'enter_secret'
  | 'fetch_models'
  | 'choose_default'
  | 'send_smoke_prompt'
  | 'done';

export interface FirstRunState {
  current: FirstRunStep;
  providerSlug?: string;
  errorReason?: string;
  completedAt?: number;
}
```

### 失败状态

- `secret_invalid`
- `model_fetch_failed`
- `no_chat_models`
- `default_model_missing`
- `smoke_prompt_failed`

### 验证门

- fixture：`first-run`, `first-run-auth-error`, `first-run-fetched-empty`；
- smoke：从选择 provider 到首次成功得到 assistant 回答，最多 4 屏；
- node:test：步骤转换 reducer。

## 9. 记忆 MVP

### 现状问题

Vera 有个性化提示，但没有记忆对象：

- 没有持久化事实；
- 没有检索；
- 没有记忆来源可见性；
- 没有用户查看/删除；
- 没有 sleep/consolidation。

不要直接跳到参考实现的 sqlite-vec + ONNX。首先缺失的是用户可见的记忆 CRUD 与检索合同。

### 参考实现对照

参考实现有记忆存储、embedding、sleep 周期、Recall 工具、记忆归档。可借鉴的结构：

- 记忆行有持久性；
- 检索是 tool / 上下文来源；
- sleep 可预览、可取消。

### 合同 / API

MVP：

```ts
export interface MemoryRecord {
  id: string;
  content: string;
  source: 'user_pinned' | 'assistant_suggested' | 'imported';
  durability: 'temporary' | 'permanent';
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
}
```

首个 PR 不做 embeddings。使用关键词搜索 + 显式用户 pin/删除。

### 失败状态

- `memory_search_failed`
- `memory_disabled`
- `memory_import_invalid`

### 验证门

- node:test：CRUD/搜索/归档；
- fixture：3 条记忆 + 已归档项；
- smoke：Settings/Memory 页面可以增删/搜索，聊天可以引用检索到的记忆来源。

## 10. Open Gateway / 语音 / 搜索（即将推出）

### 现状问题

Settings 里有 search、voice、open gateway 的 Coming Soon 面板。文案现在好了一些，但能力仍然缺失。
这会造成期望负债。

### 推荐顺序

1. Open Gateway SSE bridge：最容易本地订立合同和测试。
2. Search 服务：可以从 provider 抽象 + disabled health 状态起步。
3. 语音输入：需要 macOS 权限 / 音频设备 UX，除非用户优先，否则推迟。

### Open Gateway 合同

仅在显式启用时暴露本地 OpenAI 兼容端点：

- 默认绑定 `127.0.0.1`；
- 本地生成 per-workspace token；
- 日志中不出现明文 secret；
- `/v1/models` 只返回支持 chat 的 `ModelCatalogEntry`；
- `/v1/chat/completions` 路由到所选连接；
- 默认连接不可用时给出 health 原因。

失败原因：

- `gateway_disabled`
- `gateway_token_invalid`
- `gateway_model_unsupported`
- `gateway_connection_unavailable`

验证门：

- node:test：token 认证 + 禁用路径；
- fixture：gateway 启用/不可用；
- smoke：用 curl 测试本地端点。

## 11. 推荐的 PR 顺序

### 第一波：工作台基础

1. `ArtifactRecord` core/storage 合同 + fixture 种子（暂不做 UI 面板）。
2. 右侧 artifact 面板 renderer + smoke 路径。
3. Bash 的 tool streaming delta + terminal artifact 引用。

为什么先做：这把 Vera 从「聊天记录」变成「工作成果工作区」。

### 第二波：决策质量

4. `ModelCatalogEntry` + chat 默认模型验证门。
5. Health Center 核心结果类型 + provider/proxy/bot/storage 检查。
6. First-run 状态 reducer + first-run fixture 扩展。

为什么第二：用户的设置与 provider/模型信任变得可理解。

### 第三波：工作流控制

7. Session 状态机。
8. TurnRecord + cancel/abort 持久化清理。
9. Branch/regenerate/checkpoint API。

为什么第三：这些改动更具侵入性，应该建立在 artifact/snapshot 形态之上。

### 第四波：生态

10. Sources/Skills/Automations 记录。
11. 记忆 MVP。
12. Open Gateway。
13. Search / Voice。

## 12. 禁止照搬清单

参考实现/参考实现中的这些模式不要复制进 Vera：

- 没有显式 enable/token 的完全开放本地 HTTP API；
- 通过 IPC / API 返回明文 secret；
- 自动批准或 subagent `--approve-all` 这类信任捷径；
- 默认开启活动/屏幕录制；
- 延迟首次价值的电影式 onboarding；
- 隐藏的 skill 权限扩大；
- 打印聊天 ID、API 响应、provider body 的原始 console 日志。

Vera 应该复制结构与状态模型，而不是不安全的捷径。

## 13. 立即执行的下一步

我对下一个实现 PR 的建议：

**PR-A1：只做 `ArtifactRecord` core/storage/fixture 合同。**

交付物：

- `vera-core/src/artifacts.ts`
- `vera-storage/src/artifact-store.ts`
- `vera-desktop/src/main/visual-smoke-fixture.ts` 新增 `artifact-pane`
- node:test：append/list/get/soft-delete/file-backed 不变量
- 文档更新：充实 `docs/design-system.md` §9.1
- 暂不做 renderer 面板

这让第一步保持小步、可测试，并直接解锁右侧面板。
