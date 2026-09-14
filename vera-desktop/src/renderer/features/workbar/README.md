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

# Workbar 功能

Workbar 是一个垂直的渲染器功能。其应用级模型拥有右/底面板拓扑、活动标签页、尺寸和持久化的折叠状态。工具数据保持在会话作用域内，会话内容界面会在活动会话变更时重新挂载。

## 依赖方向

- 消费者从 `features/workbar` 导入生产 API。
- 测试和故事还可以导入 `features/workbar/testing`。
- Workbar 可以使用共享的渲染器原语、核心类型和 Vera UI。
- Workbar 不得导入 shell 组合、Desktop 桥或主进程实现。
- Desktop I/O 通过 `WorkbarServices` 进入；工具代码不直接读取 Desktop 全局桥。
- `useWorkbarController` 是拓扑、快捷键、动态资源和 Side Chat 可见性的应用边界。`AppShell` 只提供活动 Session、工作区可用性、权威 Session ID、shell 可见性以及 composer 提及/模型上下文。

## 公开表面

- `host` 原样传递给 `<WorkbarHost model={workbar.host} />`。
- `commands.openTool`、`commands.openSideChatWithQuote` 和 `commands.toggleRight` 是仅有的 shell 动作。
- `selectors.rightCollapsed` 驱动标题栏的恢复提示，`selectors.hiddenSessionIds` 从栏中过滤掉临时的伴生分支（companion fork）。

## 生命周期不变式

- Review、Tasks、Browser、Files 和 Inspector 标签页全局持久化。
- Terminal 和 Side Chat 标签页、预览状态和资源元数据是临时的。
- `WORKBAR_TOOL_DEFINITIONS` 是持久化、单例行为和默认位置安排的权威来源；存储和控制器代码消费它，而不是维护并行的种类列表。
- 关闭或离开所有者会话会停止 Terminal 资源。
- Terminal 启动会打上其来源代数的标签。如果它在 Session 切换或控制器销毁之后才完成，返回的资源会立即停止，并且永远不会进入标签页拓扑。
- Terminal 所有权在 `start` 返回后立即注册，早于标签页状态提交。Host 投影排除其它 Session 拥有的资源，因此 Session 切换不会短暂重新挂载旧的 Terminal。
- Side Chat 在面板折叠后仍然存活，只有在其标签页关闭或导航离开其来源会话时才会被清理。
- 已销毁的 Side Chat 操作在每次 fork/send 边界处被围栏隔离；迟到的 fork 会被清理，迟到的 send 无法写回已被放弃的面板。
- 非活动标签页保持挂载；其 hooks 接收现有的活动/隐藏信号，并自行决定是否订阅。
- Inspector 将两个权威来源分开：Session 事件刷新其分页的时间线/上下文窗口，而用量变更事件刷新完整的 Session 用量摘要。重新激活和头部刷新保留请求的跟踪页深度。

## 添加工具

添加其元数据，定义它所需的最小服务端口，在 `tools/` 下实现并呈现其 hook，注册 fake-service 故事状态，并在测试中固定其状态转换和资源清理。
