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

# Computer Use 模型循环基础

## 产品边界

主模型路径是通过 `AiSdkBackend` 使用与提供商无关的 `vera_computer` 函数工具。模型观察无障碍（Accessibility）树，然后使用 `click_element`、`set_value` 或基于该观察结果中 ID 的其它语义动作。

这与恢复出的 Codex 分层结构一致：

```text
model function/tool call
  -> Computer Use facade
  -> observed AX element identity
  -> stale-element refetch and uniqueness checks
  -> element executor
  -> AXPick / AXPress / AXValue when supported
  -> synthetic event fallback only inside the native executor
```

在当前捕获的生产请求中，Codex 尚未暴露顶层原生的 `computer` 工具。其延后的 Computer Use 封装暴露的是 AX 外观（facade）。无障碍优先的分发发生在元素执行内部，而不是隐式地把每个模型坐标转换为 AX 元素。

## 当前安全策略

Vera 保持相同的分离原则：

- `vera_computer` 是面向模型的主路径；
- 语义元素动作和已验证的 AX/CDP 值更新被保留；
- 坐标点击、滚动、拖拽、按键输入和像素回退被描述为禁用并在失败时关闭（fail closed）；
- 提供商适配器使用相同的 `vera_computer` 契约，而不是单独的原生 Computer Use 循环。

任何提供商适配器都不得推断缺失的观察 ID，也不得把动作静默绑定到当前帧。

## 真实提供商结果

本地 Azure Responses 桥（`127.0.0.1:8538`）和 coproxy Anthropic 端点（`127.0.0.1:8537`）已用于测试，未持久化保存凭据或原始提供商响应。

### OpenAI Responses

`gpt-5.6-sol` 完成了产品路径：

```text
list_apps -> observe -> set_value -> verified finish
```

完整的产品路径通过：

```text
getAIModel
  -> OpenAI Responses model
  -> AiSdkBackend / streamText
  -> ToolRuntime
  -> vera_computer
  -> synthetic AX semantic backend
```

产品路径持久化了工具调用与结果，发出了权限安全的遥测数据，并达到了已验证的最终值。

### Anthropic

`claude-sonnet-4-6` 通过 coproxy 完成了相同的语义任务。

有一次运行在 `set_value` 中省略了 `observation_id`。测试框架返回了一个要求重新观察的类型化工具错误；模型自行恢复，而不是由执行器去猜测帧。该行为是未来提供商适配器必须的回归测试场景。

### Kimi 和 MiniMax

本机未配置可用的 Kimi 或 MiniMax 凭据。它们的产品路径以密闭（hermetic）协议证据的形式覆盖，而非真实提供商证据。

`kimi-coding-plan` 和 `minimax-coding-plan` 都通过其精确的 Anthropic 兼容 URL/认证契约完成了相同的多步骤语义循环：

```text
getAIModel -> streaming tool_use -> AiSdkBackend -> ToolRuntime
  -> vera_computer -> list_apps -> observe -> set_value -> final response
```

## 提供商模式发现

OpenAI 严格函数模式要求每个属性都列在 `required` 中。可选字段必须以可空（nullable）形式表示。由于一个函数模式服务于多个动作变体，模型可能会填充与所选动作无关的已知字段。

因此，OpenAI 适配器：

1. 将所有属性声明为必需且可空；
2. 拒绝未知键和访问器属性；
3. 仅投影所选动作允许的已知键；
4. 记录被丢弃的非空键；
5. 把投影后的值传递给现有的严格动作解析器。

核心 `vera_computer` 解析器仍然保持严格且与提供商无关。

## 非声明范围

本基础不包括：

- 重新连接兼容性 CGEvent 路径；
- 添加真实的 AppKit AX 提供商运行器（这是下一个证据层 PR）；
- 解决 PID 复用、过时驱动节点或执行器生命周期加固问题；
- 取代执行器加固和堆叠 PR 重组（restack）工作。
