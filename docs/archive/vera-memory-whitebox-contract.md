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

# Vera 记忆 — 白盒契约锚点（2026-05-29）

> 已于 2026-07-13 归档。本快照不再拥有当前记忆契约。

所有者：yuejing。在 xuan 的透明文件 MVP 于 `c06e13f` 落地后，作为团队不断演进的本地记忆功能的契约锚点。对齐至：
- `vera-core/src/local-memory.ts`（xuan）
- `vera-desktop/src/main/local-memory-service.ts`（xuan）
- Settings → 记忆 UI（xuan）
- 外部参考深潜笔记 `notes/external reference-deep-dive-2026-05-29.md` §3.5
- PilotDeck 深潜笔记 `notes/pilotdeck-deep-dive-2026-05-29.md` §2.2
- kenji `19b0996f` 边界：本地透明文件绝不能成为隐式持久记忆；agent 读取默认关闭。

本笔记是契约锚点，不是 PR。它冻结字段名与状态语义，使 V0.2 / V0.3 的 PR 可以可预期地扩展而不破坏 V0.1 磁盘格式。如果现实发生变化，先在此处编辑。

## V0.1 — xuan 交付的内容（`c06e13f`）

### 设置形状（现行）

```ts
interface LocalMemorySettings {
  enabled: boolean;          // file feature on/off (default ON)
  agentReadEnabled: boolean; // agent may consume in system prompt
                             // (default OFF)
}
```

两个开关是正确的作用域：

- `enabled` 开 + `agentReadEnabled` 关 — 文件存在于磁盘上，用户可编辑，agent 什么也得不到。
- `enabled` 开 + `agentReadEnabled` 开 — 文件以专门章节出现在系统 prompt 中。无痕上下文故障关闭。
- `enabled` 关 — 磁盘上的文件不被触碰；读取返回禁用状态。

### 文件位置与权限

- 目录权限 `0700`，文件权限 `0600`。
- 位于工作区目录之下。
- `LOCAL_MEMORY_MAX_BYTES = 128 KB` 在解析时强制执行。

### 磁盘格式（现行）

每个条目是一个 Markdown H2 章节，后跟一行 HTML 注释元数据：

```markdown
# Vera Memory

## <title or slug>
<!-- vera-memory: id=<id> origin=manual createdAt=<unix-ms> -->
<content lines>

## <next title>
<!-- vera-memory: id=<id2> origin=manual createdAt=<unix-ms> -->
...
```

解析器故障开放（fail-open）：注释格式错误的条目仍会渲染其内容。HTML 注释元数据在大多数 Markdown 查看器中刻意对人类读者隐藏。

### 解析输出（现行）

```ts
interface LocalMemoryEntryPreview {
  id: string;
  origin: 'manual' | 'unknown';
  title: string;
  content: string;
  createdAt?: number;
}

interface LocalMemoryState {
  path: string;
  enabled: boolean;
  agentReadEnabled: boolean;
  status: 'ok' | 'disabled' | 'safe_mode' | 'incognito_blocked' | 'error';
  content: string;
  entryCount: number;
  latestEntry?: LocalMemoryEntryPreview;
  reason?: string;
}
```

状态枚举不变式：
- `disabled` — `settings.enabled === false`。UI 显示开关。
- `incognito_blocked` — 工作区隐私上下文激活。即使启用，也不会发生读取。
- `safe_mode` — 文件超过 `LOCAL_MEMORY_MAX_BYTES`。返回空条目列表并显示横幅；用户仍可打开 + 编辑。
- `error` — IO 错误。`reason` 中为通用文案。
- `ok` — 正常读取。

## V0.2 — 基于 V0.1 磁盘格式的扩展

V0.2 用可选字段扩展元数据注释。**解析器对未知字段必须保持故障开放**，使 V0.1 的读取者永远不会因 V0.2 写入的文件而崩溃。

```html
<!-- vera-memory: id=<id> origin=<origin> createdAt=<ms> updatedAt=<ms> status=<status> tags=<csv> decayTtlMs=<ms> -->
```

### 来源（V0.2）

```ts
type MemoryOrigin = 'manual' | 'extracted' | 'imported' | 'unknown';
```

- `manual` — 用户输入。V0.1 只写这个。
- `extracted` — 由未来的 `extract_memory` agent 工具写入。该工具必须是 `permissionRequired: true`，带自己的用户批准提示，受 `agentReadEnabled` 门控（你无法提取你已声明 agent 不能读取的内容），受 `!incognitoActive` 门控。
- `imported` — 批量导入（Honcho / mem0 / supermemory 导出 / OpenAI ChatGPT 记忆 JSON / 等）。

### 状态（V0.2）

```ts
type MemoryEntryStatus = 'active' | 'archived';
```

- `active` — 出现在 agent prompt 与 UI 列表中。
- `archived` — 保留在文件中（用户可重新激活）但不进入 prompt。UI 在单独的面板中列出已归档条目。

`decayTtlMs` 是自动归档定时器：当 `now > createdAt + decayTtlMs` 时，下一次解析会把条目提升为 `archived`。文件以行内 `status=archived` 重写 — 这是用户可见的写入，不是隐藏的后台变更。

### 标签（V0.2）

`tags=foo,bar` — 字符串 CSV。用于 UI 过滤和可选的系统 prompt 章节分组。

### 稳定 id（V0.2）

目前 V0.1 使用 `manual-<unix-ms>`。V0.2 将新条目改为 `sha256(content + createdAt).slice(0, 16)`，使 id 在标题编辑之间保持稳定。旧的 `manual-*` id 仍然有效；解析器两者都接受。

### 设置新增（V0.2）

```ts
interface LocalMemorySettings {
  enabled: boolean;
  agentReadEnabled: boolean;
  // V0.2:
  defaultDecayDays?: number;     // entries created without an
                                 // explicit decay inherit this
  extractToolEnabled?: boolean;  // gates the extract_memory tool
                                 // registration; default false
}
```

`extractToolEnabled` 是让 `extract_memory` agent 工具浮现的第三个开关。它默认关闭，且当 `agentReadEnabled` 关闭时被禁用（你无法提取 agent 无法使用的记忆）。

## V0.3 — 开放问题（不是契约；相关时再议）

这些明确是开放问题。在此记录，让下一个接手这条线的人知道该领域尚未定案。

### Provider 抽象

external reference 提供 `plugins/memory/{honcho,mem0,supermemory}`。PilotDeck 有 `EdgeClawMemoryProvider`。reference implementation 是内置的 `MemoryService` + sqlite-vec。**三方汇聚尚未出现** — kenji 的发现 `7749c411` #3。推迟抽象，直到真实的第三方后端落地（付费用户想要 Honcho 或向量存储）。

如果我们采用：
- `@vera/core/memory` 中的 `MemoryProvider` 接口
- 内置 `LocalMarkdownProvider`（今天的文件）
- 为 `HonchoProvider` 等提供插件路径

### 向量搜索

Embedding 生成是独立的 provider 线（reference implementation 的 `__local__` / OpenAI / aihubmix / openrouter / Google 选择器）。与记忆存储后端无关。推迟。

### 跨会话召回

V0.1 / V0.2 总是返回整个记忆文件。V0.3 可能实现检索 — 只输出基于查询的 top-K 相关条目。需要选择检索算法；vector 与 FTS5 与 LLM-judge 之争。推迟。

### 梦境模式（PilotDeck 术语）

空闲窗口记忆整合：当应用空闲 X 分钟时，把聊天会话总结成新的记忆条目。有严重的隐私影响。即使 `extractToolEnabled` 开启，这也需要额外的选择性加入。推迟。

### 多工作区记忆

PilotDeck 的主张是按工作区记忆 + 跨工作区聚合。Vera 有工作区。V0.3 可以按条目暴露 `memory.scope: 'workspace' | 'global'` 字段。推迟。

## 契约测试面（建议，未交付）

V0.2 落地时，以下不变式应由契约测试强制执行：

1. `parseLocalMemoryMarkdown` 对未知注释字段故障开放 — 永不抛出异常，永不丢弃已知条目。
2. `agentReadEnabled === false` ⇒ 无论 `enabled` 如何，系统 prompt 绝不包含记忆章节。
3. 工作区隐私上下文 `incognitoActive === true` ⇒ 即使两个开关都开启，`LocalMemoryState.status === 'incognito_blocked'`。
4. `extract_memory` agent 工具的注册受 `extractToolEnabled === true && agentReadEnabled === true` 门控。
5. 保持 token 边界契约：记忆内容跨越 renderer↔main IPC；原始 token / API key 绝不在写入路径上通过 redactSecrets 泄漏进记忆条目。

## 决策日志

| 日期 | 决策 | 来源 |
|---|---|---|
| 2026-05-29 | 双开关模型（文件启用 / agent 读取启用） | xuan `c06e13f` |
| 2026-05-29 | `agentReadEnabled` 默认关闭 | kenji `19b0996f` 边界 |
| 2026-05-29 | 推迟 provider 插件抽象（无三方汇聚） | kenji `7749c411` #3 |
| 2026-05-29 | `extract_memory` agent 工具：未来实现，受权限门控 | 本笔记 |
| 2026-05-29 | 梦境模式 / 向量 / 跨会话：V0.3+ 开放 | 本笔记 |

## 指针

- xuan 的实现：`vera-core/src/local-memory.ts` + `vera-desktop/src/main/local-memory-service.ts`。
- 设置 UI：`vera-desktop/src/renderer/settings/`（找到记忆章节）。
- 测试：`vera-core/src/__tests__/local-memory.test.ts`。
- external reference 的灵感来源：`notes/external reference-deep-dive-2026-05-29.md` §3.5（警示在缺乏外部需求时做插件抽象）。
- PilotDeck 的灵感来源：`notes/pilotdeck-deep-dive-2026-05-29.md` §2.2（白盒记忆）和 §3.2（扩展提案）。
