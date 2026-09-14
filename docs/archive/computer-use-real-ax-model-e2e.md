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

# 真实模型到 AppKit AX E2E

## 范围

本 harness 把活生生的 provider 模型连接到生产的 Vera 模型与工具路径、固定的 `cua-driver` 以及自有的 `Codex CUA Lab.app`。

```text
live provider
  -> getAIModel
  -> AiSdkBackend / streamText
  -> ToolRuntime
  -> vera_computer
  -> cua-driver
  -> AppKit Accessibility element action
```

fixture 在后台启动，绝不使用显式激活。启动器负责 `caffeinate`、锁屏/最前台监控、临时文件、fixture 关闭与子进程终止。

动作策略只允许场景特定的子集：

```text
list_apps
observe
click_element
set_value
wait
```

坐标点击、滚动、拖拽、输入、按键输入与兼容性像素回退不可用。只读 HID 年龄探针（age probe）在用户正提供物理输入时围栏原生语义派发。

## 真实结果

### 经由 Azure 桥的 OpenAI

`gpt-5.6-sol` 完成了：

- 仅观察：两个工具，零派发；
- AX 设置值：一次已验证的 AX 派发，零像素派发；
- 物理干预恢复：第一次变异返回 `reobserve_required`，随后模型观察并成功；
- 进程重启恢复：旧的语义动作返回 `target_missing`，随后模型重新发现新进程并成功；
- AX 点击：一次 `click_element` 派发，外部 AppKit 按钮 oracle 恰好变化一次。
- 安全多步任务：`set_value` 后跟 `click_element`，每一步都使用上一步的新鲜观察；每个语义动作一次派发，零像素派发。

### 经由 coproxy 的 Anthropic

`claude-sonnet-4-6` 完成了：

- 经由完整 `AiSdkBackend` 产品路径的 AX 设置值；
- 物理干预恢复，同样的重新观察序列；
- 两次变异运行中各一次已验证的 AX 派发与零像素派发。
- 经完整产品循环的同样的安全多步 `set_value` 然后 `click_element` 任务。

### Kimi 与 MiniMax 协议路径

本机没有配置活的 Kimi 或 MiniMax 凭据。因此它们的产品路径以 `hermetic-protocol` 而非 `real-runtime` 验证。

`kimi-coding-plan` 与 `minimax-coding-plan` 都完成了：

```text
getAIModel
  -> Anthropic-compatible streaming protocol
  -> AiSdkBackend
  -> ToolRuntime
  -> vera_computer
  -> list_apps -> observe -> set_value -> final response
```

服务器 fixture 验证每个 provider 的确切 URL 前缀、API 密钥头、模型 ID、流式 `tool_use`、工具结果再注入与最终语义状态。它们还验证失败的语义动作以 `tool_result.is_error:true` 再注入；Runtime 记录失败结果一次，而 AI SDK 适配器把它作为可恢复的工具执行错误暴露给 provider。

## 动态结构发现

模型观察到一个陈旧目标。一个独立的 AX 设置动作在模型动作之前插入了一个语义身份相同的第二目标。

真实执行器返回 `target_changed`，零模型派发、零目标变异。内容指纹门禁当前在严格元素身份重取之前运行。这是安全的，但比已恢复的 Codex 行为更严格——在 Codex 行为中，语义元素动作在 AX 结构变更后可以继续到唯一/缺失/含歧义的重取决策。

该发现报告在执行器加固 PR #910 上。模型运行器把严格的类型化重取拒绝或保守的 `target_changed` 都当作 fail-closed 结果，并记录确切的结果码。

## Runtime 发现

真实模型运行暴露：带有顶层 `error` 返回的 Computer Use 结果被记录为成功的工具调用。模型还可以在新观察之后重试同一个被拒绝的含歧义语义目标，因为通用循环签名包含变化的观察 ID。

独立的 Runtime 修复：

- 对持久化结果、事件、遥测与循环控制一致地把返回的顶层错误分类；
- 给显式歧义失败一个忽略观察 ID 的稳定语义签名；
- 在原生执行之前阻止下一个相同的歧义重试；
- 不缓存可恢复的 `user_intervened` 或 `target_missing` 结果。

真实证据脱敏器此前还硬编码了 OpenAI producer。报告现在保留显式 producer 与 provider，同时保持相同的隐私投影。

## 证据发现

桌面端运行器此前从动作输出推断 fixture 窗口，因此一个错误的动作窗口可能把自己加入归属允许清单。启动器现在在模型运行前独立发现确切 fixture PID/窗口集合，按工具调用派发 trace 或观察血统绑定动作，并在资格判定前等待 trace 刷新。

## 证据隐私

报告是启动器拥有的临时文件，模式 `0600`。脱敏投影保留 provider/model、动作类型、结果码、聚合状态与允许清单中的 trace 字段。它丢弃坐标、输入值、AX/UI 文本、凭据、origin 之外的 URL 与原始 provider payload。
