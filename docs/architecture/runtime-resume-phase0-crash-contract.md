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

# 运行时恢复阶段 0 崩溃契约

阶段 0 为完全提交的 `RuntimeEvent` 前缀定义回放安全性。它不恢复执行、不协调工具副作用，也不引入未来的 SQLite 工具日志。

生产 API 是纯函数：

```text
committed RuntimeEvent prefix
  -> ToolOperation projection
  -> ResumePlan
  -> safe_replay or blocked
```

## 稳定的故障注入点

`RUNTIME_RESUME_FAILPOINTS` 是机器可读的事实来源。`committedPrefix` 列表示崩溃后可用的最后一个完整 RuntimeEvent 前缀。它刻意不假装未来的 T1/T2 日志已经存在。

| ID | 注入边界 | 最后完全提交的 RuntimeEvent 前缀 |
|---|---|---|
| P0 | 工具准备（T1）之前 | `before_function_call` |
| P1 | 函数调用已提交，预准备日志未提交 | `after_function_call` |
| P2 | 预准备日志已提交，实现尚未开始 | `after_function_call` |
| P3 | 工具实现进行中 | `after_function_call` |
| P4 | 副作用已完成，结果事务（T2）未提交 | `after_function_call` |
| P5 | 函数响应已提交，结果日志未提交 | `after_function_response` |
| P6 | 结果已提交，结果未送达模型 | `after_function_response` |
| P7 | 结果已送达，下一步提供商步骤未开始 | `after_function_response` |
| P8 | 终结性 RuntimeEvent 提交 | `after_function_response` |
| P9 | 终结性运行头部（run-header）提交 | `after_terminal_event` |
| P10 | 恢复决策提交 | `after_terminal_event` |
| P11 | 续接运行创建 | `after_terminal_event` |

对于 P8，阶段 0 仅对终结性追加之前的前缀进行推理。终结性追加之后的前缀由 P9 表示。撕裂（torn）的 JSON 行属于存储损坏，不是合法的已提交前缀，绝不能被升级为恢复事实。

## 必需的决策

| 前缀 | 预期结果 |
|---|---|
| `before_function_call` | `safe_replay`；不存在工具操作 |
| `after_function_call` | `blocked`；操作状态为 `indeterminate`；原因为 `dangling_tool_state`；未解决的调用不出现在提供商回放中 |
| `after_function_response` | `safe_replay`；操作状态为 `succeeded` 或 `failed`；调用和响应在提供商回放中保持配对 |
| `after_terminal_event` | 与前一前缀相同的工具决策；终结性事实保留在规范账本（ledger）中 |

与重新打开的前缀不同的预期 RuntimeEvent 高水位线，始终以 `runtime_offset_mismatch` 拒绝。

## 进程测试框架

阶段 0 崩溃测试必须使用真实的、基于文件的 `RuntimeEventStore`：

1. 创建一个临时工作区。
2. 启动一个子 Node.js 进程。
3. 通过 `RuntimeEventStore` 追加故障注入点的完整前缀。
4. 仅在追加的 Promise 全部完成之后才通知父进程。
5. 由父进程使用 `SIGKILL` 终止子进程。
6. 验证 `finally` 清理标记未被写入。
7. 使用新的 `RuntimeEventStore` 实例重新打开工作区。
8. 对重新打开的前缀投影两次，并要求 `ResumePlan` 值完全一致。
9. 验证投影没有改变持久化的账本。

该测试框架在 Windows、macOS 和 Linux 上覆盖全部十二个稳定的故障注入点 ID。它测试的是进程崩溃恢复，而非断电持久性或文件系统 `fsync` 保证。

## 阶段边界

阶段 0 不改变任何工具执行行为。以下内容仍不在范围内：

- 自动续接；
- 工作区恢复；
- T1/T2 事务性工具边界；
- 副作用协调；
- 幂等工具重执行；
- 以 SQLite 作为规范的 RuntimeEvent 和工具日志存储。

这些能力需要后续阶段来实现。阶段 0 仅基于当前可用的证据，使决策确定化并以失败关闭（fail-closed）方式处理。
