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

# Goals 功能

Goals 是一个垂直的渲染器功能。它拥有活动 Goal 的读模型、Goal 变更订阅、arm/pause/resume/clear 控件、对话框目标，以及聊天界面消费的 Goal 指示器投影。

## 依赖方向

- 消费者从 `features/goals` 导入生产 API。
- 测试和故事还可以导入 `features/goals/testing`。
- Goals 可以使用共享的渲染器文案、核心类型和 Vera UI。
- Goals 不得导入 `AppShell`、preload 实现或主进程。
- Desktop I/O 通过 `GoalServices` 进入；功能代码绝不直接读取 Desktop 全局桥。
- `AppShell` 提供活动 Session id 和会话作用域的错误报告器。它只消费 `<GoalHost>`、commands 和 selectors。

## 生命周期不变式

- Goal 以会话为作用域。切换 Session 会同步清除之前的读模型，并在获取新 Goal 之前围栏隔离迟到的读取。
- 只投影 `active`、`waiting` 和格式良好的 `paused` Goal。已确定的 Goal 会移除指示器和 composer 的活动状态。
- Goal 变更广播刷新活动 Session；其它 Session 的事件不会。
- 当控制请求待处理时，每个 Session 的暂停和恢复互斥，保留现有的重入防护。
- 打开对话框时会快照活动 Session id。对话框打开期间导航无法把 arm 请求重新定向到其它 Session。
- 重连的 arm 结果只在 Host 确认新 Goal 时才关闭。已对账或不可用的结果会锁定表单并显示权威结果，防止意外的重复 arm 请求。
- 表单输入和错误在每次打开时重置。预算会对照核心边界校验，绝不静默截断。

## 公开表面

- `host` 原样传递给 `<GoalHost model={goals.host} />`。
- `commands.openDialog` 是 composer 动作的 shell 入口。
- `selectors.active` 禁用重复的 Goal 创建，`selectors.indicator` 为活动聊天界面提供数据。

Desktop 适配器在渲染器组合根中创建一次。测试使用 `testing.ts` 中的 `createFakeGoalServices`；生产代码不得导入该入口。
