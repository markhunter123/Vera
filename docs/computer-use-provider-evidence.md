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

# Computer Use provider 证据

本层定义真实模型 Computer Use 运行的证据契约。它并不声称任何 provider 已完成真实运行。

## 场景契约

场景库定义：

- 一个自有的 Electron fixture；
- 精确的用户提示与预期状态；
- 禁止的效果；
- 允许的动作与每动作预算；
- 必需的执行能力；
- 确定性状态评估。

fixture 辅助函数只导入 Electron。它不导入 Vera Runtime、provider 传输层或执行后端。

## 报告契约

报告区分三类证据：

- `real-runtime`：真实 provider 模型使用了生产版 Vera runtime；
- `fault-injection`：真实 provider 与 Runtime 演练了某个指定的注入故障，但该运行不能算作真实宿主证据；
- `hermetic-protocol`：伪传输层证明了协议行为；
- `static-contract`：仅源码或 schema 检查。

只有 `real-runtime` 才能满足标记为 `real` 的 provider 矩阵单元。绕过策略的运行保持可见标签，不能成为无条件的通过。

真实报告也会故障关闭，除非生产者、传输层、策略模式、模型、fixture PID/窗口归属、最新观测谱系、动作预算和分发溯源都是明确的。预期失败必须由场景授权；报告不能自行授权。

清洗器保留动作类型、时序、结果码、聚合状态和白名单 trace 字段。它移除坐标、输入文本、原始 UI 内容、凭据、完整 URL 和 provider 载荷。

## 整合发现

评审发现，AppKit 生产者发出 `traces`，而资格认定读取的是 `driverTraces`；桌面启动器从被评定的动作推导其 fixture 窗口白名单。第一处不一致拒绝了有效的 AX 证据；第二处允许了循环的归属证明。

两个生产者现在都发出同一套规范 schema。桌面 fixture 身份在模型执行前独立收集，来自启动器持有的 PID 和执行器窗口清单。资格认定等待匹配的分发 trace，并要求每个目标都属于该独立身份。

资格认定还保持三个故障关闭不变式：

- 重启恢复只授权场景声明的过期 `set_value / target_missing` 结果，并为所需的全新重试分配预算；
- 被禁止和超预算的模型尝试在 harness 拒绝之前，先记录为规范的失败动作证据；
- 桌面启动器和 provider 矩阵调用同一个真实报告验证器，因此启动器不能对矩阵无效的报告成功退出。

旧的直接真机资格认定运行器已移除。五轮重启运行器仍可通过 `npm run computer-use -- restart-soak` 使用，但仅用于回归，不能满足 provider 矩阵单元。只有一条资格认定路径，而不是并行的证据标准。

## 下一层

provider 启动器必须：

1. 固定本库中的一个场景；
2. 针对自有 fixture 和生产版 Computer Use 后端运行；
3. 在分发前强制执行场景动作预算；
4. 发出清洗后的 `real-runtime` 报告；
5. 让 provider 矩阵验证 fixture 状态与禁止效果。

## 首次真实运行

首次合格运行完成情况：

- provider：OpenAI；
- model：`gpt-5.4`；
- 证据类别：`real-runtime`；
- 工具暴露：直接 E2E，仅使用生产版 `vera_computer` 工具；
- 动作：一次应用范围的 `observe`；
- 工具延迟：1117 ms；
- 总运行延迟：7502 ms；
- 终止状态：`complete / end_turn`；
- fixture 预言机：验证码匹配，交互计数保持为零。

直接 E2E 工具暴露是刻意的。默认的延迟 `tool_search` 路径仍是独立的产品契约；启动器缩小 provider 变量范围，同时仍然演练生产版工具实现、权限引擎、Runtime、桌面宿主和执行器后端。

在此次运行中，OpenAI Responses 工具延续暴露了一个产品缺陷：服务端存储在第二个请求中生成了 `item_reference` 却没有 `previous_response_id`，导致自定义 Responses 端点拒绝了工具结果。OpenAI provider 选项现在使用 `store:false`，与现有 Codex 订阅边界一致，并保持函数调用/结果内联。

下一次运行应在执行器加固合并后执行一次 AX 语义变更。

该 L1 运行现已完成：

- 场景：`l1-single-click`；
- provider/模型：OpenAI `gpt-5.4`；
- 动作：两次观察和一次 `click_element`；
- 不允许任何坐标或兼容性输入动作；
- 语义点击延迟：1445 ms；
- 总运行延迟：26023 ms；
- fixture 预言机：主点击计数 1、危险点击计数 0、过度点击计数 0；
- 终止状态：`complete / end_turn`；
- 结果：通过。

当用户前台 ChatGPT 窗口遮挡合成目标时，运行起初故障关闭。fixture 宿主现在会在宣布就绪之前静置并用 `showInactive()` 和 `moveTop()` 提升其 layer-0 窗口，而不聚焦它，也不使用始终置顶的覆盖层。

## 原生 WebContent 资格认定

由 `vera-desktop/bundled-tools.json` 固定的执行器现携带源码提交 `4a9787d2c7f2fbc6a29b33d691916c6b84543661`，包括 `vera-agent/vera-cu#2`、#3 中的窗口切换后续，以及 #4 中直接的 WebContent 帧回流修复。

共享的合成 CUA Lab 在集成前连续运行了十次：

- 移除唯一镜像后，观察暴露了一个 OOP 按钮；
- slider 请求/回读/业务预言机：`42 / 42 / 42`；
- 滚动路径：语义 `ax_action`，预言机偏移 `76`；
- OOP 点击路径：`skylight_pid`；
- DOM `MouseEvent.isTrusted`：`true`；
- 宿主本地鼠标事件：一次按下和一次抬起；
- 过期错误目标计数：`0`；
- 目标应用从未成为前台。

一个单独的实时保留元素探针演练了三种 refetch 结果：

- 唯一替换：动作完成一次，错误目标 `0`；
- 缺失替换：`element_released`，无副作用；
- 歧义替换：`element_changed`，无副作用。

#4 之后，由 `vera-desktop/bundled-tools.json` 固定的确切二进制（`e457a3143544ba8385c489e5259f206d9450feb1c692eb562413b41b9f38de21`）完成了绑定源码的五次运行 Web 矩阵：

- 探针重建干净的源码提交 `4a9787d2c7f2fbc6a29b33d691916c6b84543661`，并要求固定二进制字节与该构建匹配；
- 主 AX 点击预言机每次运行均为 1；
- 每次 OOP 点击都使用 `skylight_pid`，产生 `MouseEvent.isTrusted=true`，并恰好送达一对宿主本地鼠标按下/抬起；
- 每次运行 slider 均为 42，滚动偏移均为 76；
- 唯一 refetch 点击了有意的过期目标一次，而缺失 refetch 无目标或诱饵效果；
- 全部 30 个前台哨兵跨度记录了零个目标置前样本，每跨度至少 92 个样本，最大样本间隔 80 ms。

确定性源码套件另行通过唯一、缺失和歧义 refetch 结果强制直接的 WebContent 仅帧回流，保留独立的 renderer 进程代次，并确认原生 AX 帧变更仍保持故障关闭。

这是原生执行器证据，不是 provider 模型资格认定单元。未来的 `real-runtime` web 场景仍必须通过上述报告契约。

同一源码提交新增 `doctor --json`。在锁定屏幕状态上的一次发布二进制冒烟测试正确报告了：权限已授予、所有必需的原生 SPI 可用、ad-hoc 非加固签名，以及 `metadataObservation / screenshotObservation / trustedWebContentClick = false`。

模态与次窗口路由现在拥有确定性与实时原生功能证据。针对确切固定二进制连续完成的五次 CUA Lab 运行：

- 打开模态，应用观察路由到 sheet，关闭，返回主窗口；
- 打开次窗口，应用路由到最前的次窗口，精确窗口按钮点击，语义滚动，关闭，返回主窗口；
- 全部 30 条分发路径均为 `ax_action`；
- 按钮计数为 1，滚动偏移达到 140；
- 五次逐运行记录保留在一个聚合 fixture 中。

高频前台哨兵未通过：跨十个模态/次窗口采样跨度记录了 1,738 个目标置前样本，每跨度至少 189 个样本，最大样本间隔 96 ms。阶段级的前后读取隐藏了这种瞬时焦点窃取。因此模态/多窗口路由在功能上合格，但尚未满足后台聚焦契约。

源码包含对两个实测 AppKit 竞态的有界处理：新列出的 CGWindow 可能稍后才发布其 AXWindow；按下操作在创建或关闭窗口时可能返回 `cannotComplete`。这个五次运行 fixture 没有演练拓扑恢复验证分支（`topologyRecoveryEvidenceCount: 0`），因此该行为仍属于实现与单元测试证据，而非实时声明。

这是原生执行器资格认定，不是 provider 模型矩阵单元。

同一固定版本现携带稳定的 AX 观察修订：

- 第一棵树接收深度优先的稳定 id；
- 匹配的兄弟节点在全新 snapshot token 之间保留 id；
- 新 id 从先前最大值之上开始；
- 动作后观察可以渲染无变更、有序的插入/更新变更、压缩的移除 id 区间，或全树回退；
- 显式 observe 继续渲染完整树。

这是 hermetic 协议/静态契约证据，不是 provider 模型资格认定单元。原生源码套件通过 326 个测试，其中 26 个显式跳过实时测试；宿主 Computer Use 套件通过 124 个测试。上述模态/次窗口证据是在解锁后运行的。
