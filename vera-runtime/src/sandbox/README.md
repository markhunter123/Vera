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

# Runtime sandbox 边界

本目录拥有平台 sandbox 选择与命令变换。它把活动会话 `ExecutionBoundary` 中的 profile 翻译成执行请求；它不决定请求的边界扩展是否被批准，也不执行该请求本身。

代码与聚焦测试是最终权威。Windows 强制工作由 [issue #2142](https://github.com/vera-agent/vera-agent/issues/2142) 跟踪，并由 [Windows sandbox 后端 RFC](../../../docs/architecture/windows-sandbox-rfc-v1.md)（中文版）规定。

## 归属

`@vera/core` 拥有平台中立的边界语言：

- `execution-boundary.ts` 定义会话边界、其修订与单调扩展。
- `permission-profile.ts` 定义 managed、disabled 与 external profile；文件系统条目；网络策略；标准 profile；与纯路径匹配器。
- `permission-profile-compiler.ts` 在旧版产品模式必须映射到 profile 时保持兼容性。

`@vera/runtime` 拥有平台变换：

- `types.ts` 定义 sandbox 选择、命令、路径上下文、执行请求与类型化失败契约。
- `sandbox-manager.ts` 决定 profile 是否要求 sandbox、选择平台后端并委托变换。
- `macos-seatbelt.ts` 构建 Seatbelt 策略并用 `/usr/bin/sandbox-exec` 包裹内部 argv。
- `linux-sandbox.ts` 构建 bubblewrap 挂载、命名空间参数与网络 seccomp 过滤器。
- `linux-capability.ts` 在选择可用之前证明 bubblewrap 与命名空间可用。
- `windows-profile.ts` 把 managed profile 编译成规范的 ACL、网络与环境策略。
- `windows-sandbox.ts` 写入一次性 manifest 并调用打包的 AppContainer broker。
- `default-sandbox-manager.ts` 注册受支持的默认后端。
- `index.ts` 是公开子路径表面；runtime 包 barrel 再导出受支持的 API。

## 当前行为

- 受限 managed profile 在默认 `auto` 偏好下要求平台 sandbox。
- 不受限、disabled 与 external profile 不添加 Vera 管理的本地 sandbox。
- `require` 强制平台 sandbox 选择；`forbid` 选择 host 执行，是内部编排输入，不是批准证明。
- macOS 选择 Seatbelt 后端，并在后端不可用时 fail closed。
- Linux 选择 bubblewrap 后端，并在其可执行文件、命名空间探针或所请求的 profile 无法强制时 fail closed。
- Windows 仅在其打包的原生资源存在时选择 AppContainer broker；否则以不可用 fail closed。其他不支持的平台返回 `unsupported_platform`。
- 收到无效或不支持的 profile 的后端返回类型化失败；它不会静默降级到 host 执行。

## 边界

- 会话 `ExecutionBoundary` 是某个操作当前是否在 sandbox 边界之内的权威。Sandbox 选择不会扩展该边界。
- sandbox 边界交互路径拥有用户批准，并以原子方式把批准的扩展与其新修订落定。
- 调用方拥有规范 cwd 与路径上下文构建。平台后端不得猜测 workspace 根目录。
- `SandboxManager` 变换命令，但不派生进程、不无 sandbox 重试、不发出 UI，也不拥有遥测。
- macOS 后端拥有 SBPL 生成、根参数化、受保护元数据 deny-write 规则与网络策略翻译。
- `PermissionProfile.External` 意味着文件系统隔离由环境提供；Vera 在当前实现中不叠加本地平台 sandbox。

## 非目标

- Worktree 或 workspace 副本 sandbox 化
- Diff/写回或应用补丁 UI
- 自动无 sandbox 重试
- 托管网络代理或域允许清单
- Windows 发布签名与完整阶段 4 对抗性支持声明
- 第二套权限语言、shell runner 或文件策略系统

## 验证

- 核心 profile 工厂、编译器与匹配器：`vera-core/src/__tests__/permission-profile*.test.ts`
- 选择与变换：`vera-runtime/src/__tests__/sandbox-manager.test.ts`
- macOS 策略与包装器：`vera-runtime/src/__tests__/macos-seatbelt.test.ts`
- macOS 平台行为：`vera-runtime/src/__tests__/macos-seatbelt-smoke.test.ts`
- Linux 策略与包装器：`vera-runtime/src/__tests__/linux-sandbox.test.ts`
- Linux 平台行为：`vera-runtime/src/__tests__/linux-sandbox-smoke.test.ts`
- Windows profile 与 broker 变换：`windows-profile.test.ts` 与 `windows-sandbox.test.ts`
- 公开导出与默认注册：`sandbox-export.test.ts` 与 `default-sandbox-manager.test.ts`
