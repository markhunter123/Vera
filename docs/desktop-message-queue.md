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

# Desktop 消息队列

## 问题

Desktop 使用渲染出的 `streaming` prop 来决定 composer 提交是启动根轮次还是引导活动轮次。在首次发送完成其 IPC 往返之后，Runtime Host 可能已经拥有活动轮次，而 React 尚未渲染出新的 `streaming` 值。该时间间隔内的第二次提交会进入根轮次路径，并可能以 `session_busy` 失败。多次突发提交还会产生重复的错误 toast。

Runtime Host 已经拥有持久化的消息语义：

- `current_turn` 为下一个提供商边界排队引导。
- `next_turn` 排队一个后继轮次。
- 队列投影是权威的。
- 队列投影携带规范的排队消息内容；变更结果只返回队列状态。

## Desktop 行为

- 当轮次活动时，composer 提交会排队一个后续消息。没有模式切换：Send 永远是 Send。
- `Shift+Enter` 把草稿一次性引导进活动轮次。
- 排队的消息以发送顺序（先发的在上）渲染在 composer 卡片上方的待处理面板（pending plate）中。面板对每个条目提供：
  - 拖拽悬停把手以重新排序后续队列，
  - 提升（立即发送）以把条目引导进活动轮次，
  - 收回（收回草稿）以把条目恢复到 composer 草稿中。
- 队列内容和变更是 Runtime Host 操作（`turn.message.submit`、`queue.entry.promote`、`queue.entry.retract`、`queue.entries.reorder`）；渲染器镜像权威投影。
- 相同的活动 toast 复用一个 toast，而不是堆叠重复项。

## 竞态修复

提交路由在提交的瞬间读取同步的活动轮次 ref 和最新的会话目录快照。它不仅仅依赖之前的 React 渲染。

## 有意的范围

逐条目的队列变更限于重新排序、提升为引导和收回为草稿。原地编辑排队的条目、暂停队列和跨会话移动仍需要单独的 Runtime Host 协议和持久性评审。
