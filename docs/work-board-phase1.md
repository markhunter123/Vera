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

# Work Board 阶段 1 — 捕获/列表 MVP

## 界面

会话 workbar 中一个紧凑的 Work Board 标签页，位于 Tasks 旁边，包含：

- 全局 Inbox 和当前项目过滤；
- 手动创建、重命名、移动（Inbox <-> 项目）、完成/重新打开、归档/恢复和删除（仅限已归档条目）；
- 空、加载和错误状态；
- 通过现有 operational-state 数据库进行本地优先持久化。

## 边界

- Desktop 主进程拥有 `WorkBoardStore`；渲染器是一个只读的 IPC 投影，在收到 `workBoard:changed` 信号时重新加载。
- 不涉及 Runtime Host，没有模型可见的工具，没有轮次尾部注入。
- `linkedSessions` 和链接会话投影继续推迟到阶段 3。

## 为什么用专用 store 而不是项目文件

项目 `TODO.md` / issue 可以覆盖字面上的捕获-列表原子，但让 store 变得合理的一件事是**来源（provenance）+ Session 链接**：侧边对话的捕获必须在临时分支被删除后保留类型化的来源引用和有界的摘录，阶段 3 必须把看板条目链接到它所启动的 Session。类型化来源和稳定的条目身份还允许并发的 Desktop 写入者用修订版 CAS 变更条目，而不是解析文件。如果来源和 Session 链接不在范围内，项目文件就足够了。

## 假设

我们押注用户会回到看板并从它启动任务。阶段 3 必须证明这一点。

## 顺序安排

根据维护者评审，薄的捕获 -> 回访 -> 作为任务启动循环在**阶段 2**（侧聊捕获）和**阶段 4**（证据/完善）**之前**验证：一个最小、带 flag 门控的阶段 3 尖峰（spike）把一条硬编码条目 -> "Start task" -> 新 Session -> 链接回来串起来，不做任何打磨。只有当该循环显示出真实使用时，我们才恢复阶段 2 和 4。

## 实现

- 主进程：`vera-desktop/src/main/work-board-ipc-main.ts`（`workBoard:list/create/update/archive/unarchive/remove` + 变更信号）。
- Preload：`vera-desktop/src/preload/preload.ts` 中的 `window.vera.workBoard`。
- 渲染器：`useWorkBoard` hook 和 `WorkBoardPanel`，在 `session-workbar.tsx` 中作为 workbar 标签页接线。
