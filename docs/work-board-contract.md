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

# Work Board 阶段 0 契约

状态：阶段 0。范围：`vera-core`（契约）+ `vera-storage`（存储与迁移）。

## 边界

Work Board 是一个用户所有、本地优先（local-first）的延迟工作表面。它不是执行权威：

- 没有 `task_*` 工具、没有 `task.ledger.query`、没有 `workflow_task_ledger_*` 读写；
- 没有模型可见的工具、没有回合尾部注入（turn-tail injection）；
- 没有 Goal、AgentRun、RuntimeEvent 或 Agent Graph 写入；
- 执行状态在读取时投影，从不复制进 board 存储。

## 条目契约

```ts
interface WorkBoardItem {
  schemaVersion: 1;
  id: string;              // durable UUID, never rewritten
  revision: number;        // monotonic per item, incremented on every effective mutation
  scope: WorkBoardScope;   // inbox | { kind: 'project'; projectId }
  title: string;
  notes?: string;
  state: 'todo' | 'in_progress' | 'done';
  creator: { kind: 'user' } | { kind: 'agent_suggestion'; confirmedAt: number };
  provenance: WorkBoardProvenance;
  createdAt: number;
  updatedAt: number;
  // Active items never carry `archivedAt`; archived items always carry it:
  // { archived: false } | { archived: true; archivedAt: number }
  archived: boolean;
  archivedAt?: number;
}
```

`linkedSessions` 推迟到阶段 3：阶段 0 没有消费方，也没有写入它的变更路径，因此阶段 0 契约会在创建输入与存储记录中拒绝该字段。它将在"以任务启动"落地时，与规范的连续性适配器一同加入。

`Inbox` 是作用域，不是状态。状态转换仅由用户确认：

```text
todo <-> in_progress
todo -> done
in_progress -> done
done -> todo | in_progress
```

`done` 是用户意图。它从不从 Session 或 AgentRun 结果推导。

## 来源（Provenance）

来源是一个判别联合（discriminated union）：

- `manual`；
- `main_conversation`（`sessionId`、`messageId`、可选的 `runId` / `turnId`、`capturedAt`、有界的 `excerpt`；`parentSessionId` 被拒绝）；
- `side_conversation`（相同字段，另加必需的 `parentSessionId`）。

有界的 `excerpt` 在捕获时快照，因此侧聊条目能熬过临时 fork 的删除。类型化引用是尽力而为的链接，不是硬依赖。

Agent 建议要求 `confirmedAt`，并且只由明确的用户操作或毫不含糊的指令创建。board 从不自我写入。

## 持久化与变更

`vera-storage` 中的 `WorkBoardStore` 拥有 `runtime.sqlite`（运行状态数据库）中的 `workflow_work_board_items` 表，由追加式 workflow schema 8 → 9 迁移加入：

```sql
CREATE TABLE IF NOT EXISTS workflow_work_board_items (
  item_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('inbox', 'project')),
  project_id TEXT,
  archived INTEGER NOT NULL CHECK (archived IN (0, 1)),
  record_json TEXT NOT NULL,
  CHECK (
    (scope_kind = 'inbox' AND project_id IS NULL)
    OR
    (scope_kind = 'project' AND project_id IS NOT NULL)
  )
);
```

写入：

- 变更是语义补丁（`title` / `notes` / `scope` / `state`），绝不是整条记录替换。在此补丁契约中，`undefined`（或被省略的字段）意味着"未提供"并保留存储值；`notes: null`、空字符串或纯空白字符串是明确的清除信号。这是契约决策，不是 JavaScript 对象相等规则；
- 所有变更在同一个写队列上串行化，并在一个事务中提交；
- 每一次有效变更都递增 `revision`；
- `expectedRevision` 提供乐观并发（CAS）；
- 变更时间戳被钳制到已存储的 `updatedAt`，因此即使墙钟回拨，keyset 排序也保持单调；
- 永久删除要求条目先被归档；
- 读取将索引列与 `record_json.scope` 之间的不一致拒绝为 `corrupt_record`。

没有条目总数上限。列表/查询规模受分页限制（默认 50，最大 100），带不透明 keyset 游标。游标绑定到归一化的 `scope` / `includeArchived` 过滤器；用不同过滤器复用游标会被作为无效输入拒绝。

默认 `archived = 0` 的列表查询只由活动行的部分索引覆盖：

```sql
CREATE INDEX workflow_work_board_items_active_scope_order
  ON workflow_work_board_items(scope_kind, project_id, updated_at DESC, item_id DESC)
  WHERE archived = 0;
CREATE INDEX workflow_work_board_items_active_order
  ON workflow_work_board_items(updated_at DESC, item_id DESC)
  WHERE archived = 0;
```

这防止一个归档繁重的数据库为了产生一页活动条目而走完大部分排序索引。

## 链接会话投影

推迟。阶段 0 不提供投影函数：目前没有生产消费方，而且最小 DTO 也会成为一套平行的契约，而非 Runtime Host 使用的规范 `SessionContinuitySnapshot` / `TurnSnapshot`。它将在"以任务启动"于阶段 3 落地时，紧挨真实的连续性适配器实现，只使用这些权威直接暴露的事实。

## 测试

- 契约：解码、来源不变量、状态转换、归档不变量、边界、补丁/CAS 语义；
- 存储：迁移、重开持久化、分页/过滤、归档/删除、归档繁重索引覆盖、并发变更、损坏记录拒绝、备份/恢复；
- 投影：推迟到阶段 3（没有阶段 0 模块或测试）。
