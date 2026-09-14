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

# Module Hub 功能切片

`module-hub` 拥有 Extensions 和 Automations 背后的 Desktop 渲染器行为：

- 已安装、受管来源和捆绑目录 Skills 的投影与变更；
- Scheduled Tasks 投影、变更、到期/变更订阅，以及创建对话框的请求 nonce；
- Scheduled Tasks 显示的保持系统唤醒（keep-system-awake）客户端设置；
- Daily Review 页面桥、页面动作和 Command Palette 命令；
- Skills、MCP、Scheduled Tasks 和 Daily Review 的选择与头部组合。

`AppShell` 仍然拥有顶层 `NavSelection`、模块内存持久化、Session/Project 导航和 Composer。这些能力只以意图（intent）的形式跨越边界。该功能向 Session 栏暴露只读的 Scheduled Tasks 投影，以及一个使 Composer 独立的、由 Runtime 持有的可调用 Skills 投影失效的修订号；两者都不会让 Shell 成为 Module Hub 数据的所有者。

## 依赖方向

生产消费者只导入 `features/module-hub/index`。测试和 Storybook 可以导入 `features/module-hub/testing`。该功能可以导入 core/UI 类型和与渲染器无关的本地化/格式化辅助函数，但不得导入 AppShell、preload 或主进程模块，也不得访问 `window.vera` 或 `navigator`。

所有环境 I/O 都由 `ModuleHubServices` 表示，并由 `platform/desktop/create-module-hub-services.ts` 映射一次。该适配器也是把较旧 preload 转换为不受支持的 keep-awake 能力的地方。

在这个切片中，MCP 是 I/O 所有权的明确例外。`McpPage` 保留其现有的、页面自有的控制器和直接 Desktop 桥。`ModuleHubHost` 只选择和挂载该叶子节点；移动 MCP 内部实现是另一项独立变更。

## 生命周期不变式

- 三个 Skills 投影和 Scheduled Tasks 各自拥有独立的代数围栏（generation fence）。
- 宿主作用域的读取在提交之前会重新检查当前默认 Runtime Host。来自旧 Host 的迟到读取、变更反馈和诊断信息会被丢弃。
- 初始的 Skills 和 Scheduled Tasks 刷新仍然推迟到第一帧动画帧。就绪的默认 Host 变更会刷新这两个簇。
- Scheduled Task 变更和到期订阅随控制器一起销毁；到期通知保留导航动作。
- 变更反馈以实时界面为围栏（live-surface fenced）。离开 Scheduled Tasks 后，确认续延也会被放弃。
- keep-awake 的读取、外部更新和写入共享同一代数，因此慢完成无法覆盖更新的已确认设置；失败的写入仍会被拒绝，以便面板进行乐观回滚。
- Daily Review 页面桥在一对 services/locale 组合下保持稳定。页面反馈以实时界面为围栏，而 Command Palette 命令在页面外仍然可用。
- Daily Review 粘贴会在第一次 await 之前捕获活动的 Composer，并在追加和反馈之前校验 Session、导航所有者和 Composer 句柄。
- 打开 Scheduled Task 创建会选中该页面并递增请求 nonce；页面确认会将其重置为零。

有意不设功能级 reducer 或 store：这些投影和命令具有真实的生命周期所有权，而导航持久化仍然是 Shell 的职责。
