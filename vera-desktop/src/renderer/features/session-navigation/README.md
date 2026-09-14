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

# Session Navigation 功能

Session Navigation 是 Session 栏的渲染器功能边界。它拥有：

- 栏成员关系、链接会话高亮、Project/Runtime Host 分组、worktree 徽标、分支横幅和修订版导航；
- 折叠/展开状态、宽度、分组模式及其现有的本地持久化键；
- 显式跳转到 Session，包括搜索轮次目标；
- 标记、归档、恢复、重命名、删除和归档任务清理的生命周期。

## 依赖方向

- 消费者从 `features/session-navigation` 导入生产 API。
- 测试还可以导入 `features/session-navigation/testing`。
- Desktop Sessions 桥调用通过 `SessionNavigationServices` 进行；只有 `platform/desktop/create-session-navigation-services.ts` 读取该桥。
- Session Navigation 可以使用共享的渲染器存储/文案、核心类型和 Vera UI，但不得导入 AppShell、preload 实现或主进程代码。

AppShell 仍然负责权威的目录快照，并负责组合显式的跨功能意图：顶层目的地选择、WorkHub 退出、活动 Session 选择、记录清除和渲染器状态清理。Session Navigation 不拥有目录权威、记录/runtime 状态、Session 控件、任务提交或 Module Hub 路由。

## 公开表面

- `useSessionNavigationController` 拥有布局、投影、跳转和行变更命令。
- `<SessionNavigationHost>` 将该控制器映射到完整的 `SessionListPanel` 界面。
- `selectors.activeParentSession`、`branchBanner` 和 `revisionNavigation` 是 shell/会话界面仍在消费的窄投影。

## 生命周期不变式

- 已归档、链接子代理和隐藏伴生 Session 遵循现有的单栏投影；链接的子会话高亮其可见的根。
- 本地 Session 按 Project 分组，远程 Session 按 Runtime Host 分组。
- 打开 Session 时，先退出 WorkHub，选择 Sessions 目的地，然后激活 Session 并替换或清除轮次滚动目标。
- 每个 Session 最多运行一个行变更。变更保留修订族语义，渲染器状态只在 Host 确认移除之后才被清除。
- 宽度持久化保持尾随防抖（trailing-debounced）；宽度、折叠和分组复用现有的本地存储键和水合规则。
