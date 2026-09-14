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

# Computer Use 证据类别

Computer Use 报告使用四种证据类别之一。该类别是资格验证边界的一部分，不是描述性文案。

## real-runtime

真实提供商使用了生产 Runtime、Computer Use 工具、自有装置（fixture）和执行器路径。提供商资格验证还要求：

- `complete/end_turn`；
- 强制或明确报告的策略来源；
- 精确的提供商、模型、产出者和实时传输身份；
- 在分派前预算内成功或符合场景预期的动作；
- 每个目标动作的装置进程实例 PID/窗口所有权，包括重启场景中的旧实例和替换实例；
- 每个绑定观察的动作的观察谱系（lineage）；
- 当声明了场景时，其精确的动作序列；
- 变更的 AX 或语义分派证据；
- 通过预期状态和禁止效果断言。

缺失证据即为无效或不确定。绝不只从装置状态推断。

## fault-injection

真实提供商和生产 Runtime 运行了，但命名故障是由包装器注入的，而不是从真实宿主边界观察到的。`intervention-recovery` 目前属于这一类，因为包装器在后端和 HID 时长防护运行之前注入 `user_intervened`。

故障注入报告是有用的回归证据，但无法满足 `real-runtime` 提供商资格验证单元格。

## hermetic-protocol

本地协议服务器验证了提供商 URL、认证、模型 ID、流式工具调用、工具结果重新注入、错误标志和最终语义状态。不宣称任何真实提供商凭据或网络模型执行。

## static-contract

仅限源码、模式或确定性测试框架检查。被取代的直接真机资格验证运行器已移除。五轮进程重启运行器在将其资格验证检查移入规范的、由 Runtime 支撑的测试框架之后，作为不合格的浸泡测试保留。

规范的运维命令是：

```text
npm run computer-use -- real-ax
npm run computer-use -- real-ax --scenario restart-recovery
npm run computer-use -- real-model
```
