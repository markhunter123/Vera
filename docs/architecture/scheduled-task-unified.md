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

# ScheduledTask — 统一定时任务

## 问题

Vera 之前有两个时钟：

1. Desktop 自有的通知调度
2. Runtime Host 独立会话调度

产品用语只有一个（"定时任务"），数据路径却是两套。代理创建的任务从未出现在桌面目录中。

## 设计

一个名词：**`ScheduledTask`**。

| 关注点 | 所有者 |
|---------|--------|
| 目录 + 调度计算 | Runtime Host `HostScheduledTaskCoordinator` + SQLite `workflow_scheduled_tasks` |
| 触发接纳与恢复 | Runtime Host（`workflow_scheduled_task_fires`） |
| 到期效果 | Runtime Host；Desktop 只是原生投递提供者 |
| Desktop/TUI/CLI 访问 | 有界的 `scheduled-task.query` / `scheduled-task.mutate` 协议 |
| 代理创建/列表/暂停/恢复/删除 | `ScheduledTask` 工具 → 直接到 Host 协调器 |

### 效果

- `notify.local` / `notify.bot` — Host 接纳触发，然后调用一个 Desktop 原生效果提供者。Desktop 从不读取或推进目录。
- `session_resume` — 使用新的 Turn 和持久的 ScheduledTask 来源续接创建它的 Session。
- `agent_run` — 在创建时冻结执行模板；触发时，Host 创建一个稳定的 Session 并自行接纳根 AgentRun。

### UI

定时任务面板直接消费 `ScheduledTask`。其 preload 外观使用共享的 `runtime-host:query` / `runtime-host:command` 传输层和规范的 Host 协议编解码器。Host 变更帧只是信号；Desktop 会重新查询规范记录。

### 权限不变式

Runtime Host 是唯一的目录写入者、调度器、时钟和触发接纳权威。没有任何交互式客户端打开 ScheduledTask SQLite 表。代理工具和所有 UI 界面都通向同一个协调器，因此所有权不取决于哪个客户端发起了 Session。

在效果跨越其不可逆边界之前，Store 为每个任务持久化一条唯一的触发认领（fire claim）。对于 `agent_run`，它还会在 Session 创建或执行接纳之前持久化稳定的 Session/Turn/Run/消息身份。因此，恢复时可以对确切的 Host 执行进行对账，而不会创建重复的 Session。原生投递认领在结果未知后不会被重放。

### Runtime 边界

定时任务让 Runtime Host 在发起客户端退出后仍然常驻。`agent_run` 不依赖 Desktop。本地和机器人通知会在跨越投递边界之前持久等待原生效果提供者。一旦调用开始，未知结果会被记录为失败且绝不重放。其它交互式客户端可以通过相同的 Host 协议创建和管理全局目录。独立的 Headless 运行时不在该交互式权限边界之内。

## 关键文件

- `vera-core/src/scheduled-task.ts`
- `vera-storage/src/scheduled-task-store.ts`
- `vera-runtime/src/scheduled-task-tools.ts`
- `vera-runtime-host/src/protocol/scheduled-task.ts`
- `vera-runtime-host/src/server/scheduled-task-coordinator.ts`
- `vera-desktop/src/main/runtime-host-renderer-ipc-main.ts`（共享协议传输层）
- `vera-desktop/src/preload/runtime-host-renderer-operations.ts`（渲染器白名单）
- `vera-desktop/src/main/runtime-host-boot.ts`（原生效果提供者）
