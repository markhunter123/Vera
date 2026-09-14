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

# Desktop 冒烟测试手册

使用覆盖该变更的最窄确定性检查，当风险需要时再补充实时窗口证据或 Storybook 故事。场景清单和检查标识符位于脚本和 fixtures 中，而不在本文档中。

## 自动化桌面检查

对于主进程、IPC、fixture 或契约变更，运行桌面测试套件：

```bash
npm --workspace @vera/desktop test
```

对于跨渲染器和主进程的完整流程，扩展现有的 Playwright E2E 套件并运行：

```bash
npm --workspace @vera/desktop run e2e
```

在这些测试中使用 fake 后端，并使用确定性的 fixtures。

## 真实 Electron 窗口冒烟测试

截图和 DOM 检查无法证明原生缩放、拖拽区域、模态焦点或健康的活动渲染器。涉及 shell、侧边栏、模态背景、窗口拖拽区域或顶层渲染器生命周期的变更必须运行：

```bash
npm --workspace @vera/desktop run smoke:real-window
```

该脚本构建所需的工作区，以隔离的用户数据启动 Electron，记录程序化检查，并提示进行原生 OS 检查。确认以下事项：

- 窗口启动时不崩溃、不触发 ErrorBoundary；
- 每条边可缩放，拖拽四个角可对角缩放；
- 允许的标题栏区域可拖拽窗口，而控件不能；
- Search 模态框可通过按钮、背景点击和 Escape 键打开和关闭；
- Tab 和 Shift+Tab 保持在模态框内部循环，之后焦点返回；
- 模态框打开时窗口边缘仍可缩放；
- 关闭模态框后切换模块，渲染器保持健康。

报告写入 `vera-desktop/tests/real-window-smoke/`。失败或未验证的原生检查必须在报告中保持可见。UI shell PR 在附上所需报告或为评审总结之前，不应合并。

对于无法执行原生命中测试的环境，显式运行程序化层并记录该限制：

```bash
npm --workspace @vera/desktop run smoke:programmatic-window
```

## Storybook 基线与视觉契约

Storybook 是生产支撑的设计目录，而不是截图或桌面 E2E 测试框架。页面级故事（例如 `vera-desktop/stories/settings/settings-pages.stories.tsx`）通过 `withScopedVeraBridge` 用模拟的 IPC 渲染每个界面；为页面尚未覆盖的任何状态添加故事变体。CI 只构建目录并挂载每个故事一次，不运行 `play`。样式、布局和交互不变式应放在聚焦的组件契约或真实 Electron E2E 测试框架中。用以下命令运行 Storybook：

```bash
npm --workspace @vera/desktop run storybook
```

要在不触碰真实工作区的情况下交互式检查确定性 fixture（与 Playwright E2E 套件使用的 `VERA_E2E_FIXTURE` 机制相同）：

```bash
VERA_E2E_FIXTURE=all npm --workspace @vera/desktop run dev
```

如需更窄范围的启动，请使用 fixture 注册表中的场景名称。

## 发布底线

发布前，在受支持的桌面平台上运行完整自动化套件和真实窗口冒烟测试。视觉回归由 Storybook 故事和计算样式契约测试捕获；记录任何无法验证的平台，而不是把缺乏证据当作通过。
