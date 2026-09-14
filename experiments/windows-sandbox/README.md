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

# Windows sandbox 原生证据

本目录包含 Windows sandbox RFC 选定的原生 Rust broker/启动器与 Windows 证据工具。发布构建由 Windows x64 流水线打包，并且只有当原生资源存在时才会通过 `SandboxManager` 注册。

第一个切片把启动器请求/结果形态冻结在已发布的 Rust 类型中，并通过原生冒烟测试演练它们。一个仅仅启动进程的启动器不是充分的证据。

在 Windows 上运行契约检查：

```powershell
cargo test --manifest-path experiments/windows-sandbox/launcher/Cargo.toml --locked
pwsh experiments/windows-sandbox/appcontainer-smoke.ps1
```

当观察与预期不符时，冒烟以非零退出。它们的 JSON 报告是证据输入，不是父进程已被 sandbox 化的主张。

`launcher/` 还保留着被拒绝的进程包容（process-containment）原型。它探测受限主令牌、挂起进程创建、创建后 Job 分配、关闭时杀死后代与无继承句柄。创建后分配明确不是原子 Job 保证，也不是生产路径。它只作为有界的反面证据保留。

当前 Windows 2025 证据记录非特权候选中的一个不兼容：`CreateProcessWithTokenW` 创建受限子进程，但原生启动器自探针与 `cmd.exe /d /c exit 0` 都无法在 30 秒安全期限前完成初始化。启动器终止子进程并返回失败。CI 通道把这种确切的有界、fail-closed 结果当作证据；任何其他启动错误仍然使任务失败。该候选不满足 W0，不得连接到产品。

`atomic-launch-capability.ps1` 记录当前 Windows 身份是否拥有测试独立特权 broker 原型所需的特权。缺少特权是预期的 fail-closed 能力结果；绝不能通过静默使用非原子启动器路径来绕过它。

`vera-windows-sandbox --broker-local <manifest>` 消费一个 manifest，在进程内授权它、启动它、恢复 ACL 然后退出。更底层的 `--broker-serve-once <pipe> <account-sid> <profile-digest>` 模式通过管道暴露一个有界的实验性请求。管道拒绝远程客户端，只向 SYSTEM 与所提供的用户 SID 授予访问权，从内核获取客户端 PID，强制 nonce 重放与 profile-digest 检查，并且只调用 AppContainer 原子启动路径。授权验证完整启动策略的摘要。broker 绝不回退到创建后 Job 分配。

`launcher --atomic <request.json>` 是特权 broker 启动候选。它通过 `PROC_THREAD_ATTRIBUTE_JOB_LIST` 把 Job 句柄传给 `CreateProcessAsUserW`，因此成功的进程创建与 Job 成员资格是同一操作。启动器在报告 `atomicJob:true` 之前验证受限令牌与 Job 成员资格。原子候选绝不回退到创建后分配路径。`atomic-launch-smoke.ps1` 在 runner 同时拥有 broker 特权时要求完整证明，否则要求显式的非零、fail-closed 结果。

`launcher --appcontainer <request.json>` 是隔离身份候选。它创建一个由请求推导的全新 AppContainer 身份，把其令牌与同一个原子 Job 属性组合，并且不提供网络能力。启动前，broker 持久化 ACL 恢复台账、拒绝 reparse 点，并且只向该每启动 SID 授予所请求的根。一个短暂的全局互斥体串行化 ACL 变更，而一个请求特定的内核租约在不串行化子执行的情况下区分存活的台账与废弃的台账。冒烟证明允许的读/写访问、对用户可读兄弟文件与活环回端点的拒绝、陈旧台账恢复、并发启动、junction 拒绝，以及退出后临时 AppContainer ACE 的移除。
