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

# Computer Use 投递状态

本后续文档在原生或 Electron 动作到达执行器后保留投递不确定性。

## 问题

- 当回读未确认值时，AX 和 CDP 文本写入会变成 `capture_failed`，即使写入已经投递。
- 当必需的新鲜截图失败时，成功的语义动作会变成 `capture_failed` 或 `sensitivity_blocked`。
- 失败的截图观察在规范化之前被存储，可能驱逐掉更早的可用的观察。
- 面向模型的描述仍然声称 Electron 文本总是被拒绝。

## 修复

- 已投递但无法验证的写入和语义动作返回 `outcome_unknown`。
- 分派后的新鲜捕获错误保留动作的已投递状态。
- 观察只在截图规范化成功后进入有界 FIFO。
- 工具描述记录独特的 CDP 点击和文本路径。

这些变更不会削弱分派前的新鲜度、身份、遮挡或物理输入检查。
