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

# Computer Use 证据加固

本后续文档让 real-model 报告作为证据时以失败关闭（fail closed）。

## 统一报告边界

每个直接或 Desktop 报告都通过一个模式驱动的清理器。只有已验证的归属信息、终结状态、动作摘要、合成装置状态、断言结果和白名单内的分派证据得以保留。

提示词、截图、坐标、键入文本、原始 UI 内容、任意跟踪字符串、提供商请求体和外部异常消息都被排除。

## 资格验证

真实提供商矩阵单元格要求：

- 模式版本 1 和 `real-runtime` 证据；
- 匹配的提供商、模型、场景、产出者和实时传输；
- 启动器状态 `pass` 和终结状态 `complete/end_turn`；
- 绑定到自有装置的、成功且被允许的动作；
- 每个动作的最小和最大计数加上总动作预算；
- 规范的预期状态和禁止效果断言；
- 变更场景的 AX 或语义分派证据。

缺失证据是无效或不确定的，绝不视为通过。

## Runtime 防护

real-model 模式要求显式策略。它强制执行精确的装置应用选择器、后续语义动作的观察所有权、每个动作的计数，以及分派前的总计数。

具有专用运行器或执行能力不可用的场景，在普通启动器中以失败关闭。

## 装置安全

部分装置构建会销毁已创建的窗口。替换场景枚举存活窗口，而不是陈旧的场景声明。
