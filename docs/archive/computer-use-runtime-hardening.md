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

# Computer Use 运行时加固

本后续文档处理评审 PR #892 时发现的生命周期缺口。

## 问题

- 当尚不存在会话状态记录时，`clearSession()` 不会创建停止墓碑（tombstone），因此首次排队的调用可能在清理后激活。
- 只读宿主动作不获取会话租约，可能在 `user_stopped` 之后继续。
- 后续生命周期事件可能覆盖 `blocked_url` 或 `user_stopped`。
- 进程级执行器队列会阻塞无关窗口，而早期的按会话替换又允许两个会话针对同一窗口交错执行快照/验证/分派。
- 歧义门禁在存在稳定元素身份时仍然包含临时元素 ID。
- `cursor_position` 格式化存在，但没有生产后端结果。
- 服务释放原因没有区分仅会话通知与真正的子进程代际释放，因此 `clearSession(A)` 可能丢弃无关会话 B 保留的观察和键盘所有权。

## 根本原因

Runtime 将观察和变更租约视为唯一需要生命周期围栏的操作。清理也只修改已创建的状态记录，而终结性转换与可恢复状态共享同一个不受限的转换辅助函数。

执行器队列的作用域是调用方，而不是被验证的资源。歧义签名还把稳定身份与快照本地 ID 混在一起，光标结果测试只使用了 fake 后端。

后端还从释放原因推断代际丢失。无进行中操作的 `clearSession()` 路径发出 `session_cleared` 而不停止子进程，因此仅凭原因无法确定共享执行器状态是否已改变。

## 修复

- 在 `clearSession()` 期间无条件创建同轮停止墓碑。
- 每个读取宿主或等待的动作都要求观察租约。
- 让 `blocked_url` 和 `user_stopped` 吸收后续生命周期事件。
- 按绑定的 PID/窗口串行化变更，为未绑定变更设置一个保守队列；无关的绑定窗口仍然可以独立推进。
- 当存在稳定元素身份时忽略临时元素 ID。
- 通过固定的 cua-driver 读取 `get_cursor_position`，返回解析出的点而不移动指针。
- 将 `generationReleased` 作为显式的服务释放事实。仅会话的释放只使其列出的会话失效；真正的子进程退出会清除所有保留的会话观察和键盘目标。

新的轮次仍然会创建全新的 Computer Use 会话状态，保留现有的显式恢复边界。

## 验证

- `npm --workspace @vera/runtime run typecheck`
- `npm --workspace @vera/runtime test`
- `npm --workspace @vera/computer-use test`
- `git diff --check`
