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

# Task Entry / Workspace 功能

Task Entry 拥有决定新任务将在何处运行的渲染器状态。它加载 Runtime Host/Project 目录，按 Host 保留选择，推导新任务目标和草稿身份，投影 Workspace Picker，并拥有添加/重新关联以及远程目录交接的生命周期。

## 依赖方向

- 消费者从 `features/task-entry` 导入生产 API。
- 测试和故事还可以导入 `features/task-entry/testing`。
- Task Entry 可以使用共享的渲染器文案、共享的项目 UI、core/runtime-host 类型和 Vera UI。
- Task Entry 不得导入 `AppShell`、preload 或主进程。
- Desktop 目录 I/O 通过 `TaskEntryServices` 进入；功能代码绝不直接读取 Desktop 全局桥。
- `AppShell` 提供显式的导航/错误意图，并且只消费目标、Host 默认值、项目路径、草稿身份和 Workspace Picker。

## 生命周期不变式

- 目录刷新以代数围栏隔离。陈旧的响应不能覆盖更新的 Host/Project 快照，也不能驱动命令式的目录交接，包括在卸载或 locale 变更之后。
- 当前 Host 在可用期间保持选中。否则，选择回退到可用的默认 Host、第一个可用的 Host，然后是默认/第一个不可用的目录行，以便诚实呈现加载/错误状态。
- 项目选择按 Host 记忆。缺失、已归档和不可用的项目会依次回退到 Host 默认值、Host 选中的 Project，然后是显式的无 Project 能力。
- 添加/重新关联变更采用 single-flight。取消保持静默；失败保留选中的目标并保留现有的本地化诊断信息。
- 远程目录注册只接受打开选择器的那个 Host。关闭或完成选择器会把焦点还给其开启者。
- 草稿身份以目标为作用域。未解析的目录始终使用稳定的未解析新任务键，保留重载和目标切换的交接行为。

## 非所有权

Session 创建、首次发送/任务提交、Composer 状态、附件、就绪状态、Project Settings 和共享的远程目录浏览器内部实现仍然保持独立。Task Entry 提供它们的目标/工作区输入，但不拥有它们的生命周期。

Desktop 适配器在渲染器组合根中创建一次。测试使用 `testing.ts` 中的 `createFakeTaskEntryServices`；生产代码不得导入该入口。
