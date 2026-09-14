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

# `@vera/runtime`

`@vera/runtime` 是 Vera 的纯 Node 代理运行时。它拥有模型/后端执行、会话 sandbox 边界控制流、事件投影、上下文处理、恢复和感知 sandbox 的工作区执行。产品外壳组合它，而不是重新实现它的循环。

## 公开接缝

包根 barrel 和 `package.json` 中声明的子路径是受支持的公开 API。不要从其它包导入未声明的内部源码路径。主要集成点包括：

- `SessionManager`：会话和轮次编排。
- `BackendRegistry` 和 `AgentBackend`：后端选择。
- `AiSdkBackend`：随附的后端实现。`FakeBackend` 仅供测试：它位于 `test-only/` 下，以 `@vera/runtime/test-only/fake-backend` 导出，发布打包会丢弃该目录，因此任何生产模块都不得导入它。测试和 Desktop E2E 运行通过组合的 `primaryBackendFactory` 接缝访问它。
- Session 执行边界 API：受管 sandbox 扩展和显式绕过。
- `buildBuiltinTools()` 和工作区执行器接口：工具组合。
- `RuntimeKernel`、运行时事件、投影和恢复辅助函数：执行生命周期。

Desktop 组合位于 `vera-desktop/src/main/main.ts`。其它客户端通过 Runtime Host 执行 Vera，而不是直接组合 Runtime。

## 扩展规则

- 在 `AgentBackend` 之后添加后端行为，并通过现有注册表注册。
- 通过 builtin/工具组合接缝添加工具；把文件系统和 shell 效果保留在 `WorkspaceExecutor` 之后。
- 把共享的纯契约放在 `vera-core` 中，把交互式 Runtime 状态放在 `vera-storage` 拥有的 SQLite 控制平面中。
- 通过根 barrel 或声明的 `package.json` 子路径暴露受支持的包 API，而不是从其它包导入内部文件。
- 把提供商凭据和 Electron IPC 保持在该包之外。产品外壳解析凭据，只传递执行所需的依赖。

关于系统级模型和代码阅读地图，从根 `ARCHITECTURE.md` 开始。sandbox 特有的契约位于 `src/sandbox/README.md`。
