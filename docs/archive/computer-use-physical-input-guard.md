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

# Computer Use 物理输入防护

## 报告的症状

在无焦点进程重启浸泡测试（soak）期间，用户的指针没有移动，合成的测试装置（fixture）从未成为最前端窗口。但用户在使用 Mac 的过程中仍然观察到偶尔的异常物理点击。

不能将该症状简单地归因于一般系统负载。Computer Use 像素路径会向目标 PID 投递鼠标按下/松开事件。这些事件不会移动真实光标，但仍然可能与系统和应用事件队列中的物理鼠标事件交错。

## 根本原因

Runtime 已经对物理干预进行了建模：

```text
physical input
  -> user_intervened
  -> invalidate the observation
  -> require a new observation
```

Desktop 没有提供真实的 macOS 物理输入生产者或分派前防护。并发 E2E 允许用户输入，而后端继续向目标 PID 分派鼠标事件。

## 最终修复

Desktop 提供了一个由宿主持有的防护，使用：

```ts
powerMonitor.getSystemIdleTime() < 1
```

Electron 报告的是整秒的空闲时间，因此这是一个保守的约一秒静默窗口，而不是精确到毫秒的截止时间。

后端在每次鼠标、键盘、语义、滚动、拖拽或文本分派之前的最后实际边界处检查该防护。如果输入处于活动状态，或者防护无法确认空闲状态，则返回：

```text
user_intervened
```

不会调用任何 cua-driver 输入工具。Runtime 使已消耗的观察失效，并要求在下一次动作前进行显式的新观察。

随后的实测证明，仅靠静默窗口不足以作为安全声明：当用户与代理的操作在时间上重叠时，绑定 PID 的 CGEvent 鼠标投递仍可能干扰物理按键状态。

因此，生产策略默认还禁用了兼容性事件后端：

- 坐标点击、右键/中键/双击/三击：已阻止；
- 滚动和拖拽：已阻止；
- `press_key`：已阻止；
- 语义动作回退到像素：已阻止。

保留的路径包括：

- 观察、截图、等待、缩放和虚拟光标呈现；
- 原生 AX 元素动作和 `set_value`；
- 唯一定位的 Electron CDP 语义动作和 `insertText`。

兼容性分派只能通过受控测试使用的显式后端选项重新启用。Desktop 不会设置该选项。

## 验证

单元和集成测试覆盖证明了：

- 坐标和语义输入返回 `user_intervened`；
- 没有 `click` 调用到达 cua-driver；
- 受防护的动作不会发出分派跟踪日志；
- 选择器与 Desktop 宿主接线保留了该防护；
- Desktop 生产源码使用 Electron 空闲时间信号；
- 现有 Computer Use 行为保持通过（green）。

真实的重启浸泡测试不再发出兼容性鼠标或键盘事件。它证明了旧进程的拒绝和新进程的恢复，配合原生 AX `set_value` 以及精确的状态回读。物理输入隔离仍由单元/集成测试覆盖，无需合成全局 HID 事件。

浸泡测试仍然会启动并置前一个真实可见的 AppKit 装置窗口。`open -g` 避免了显式激活，但启动过程仍可能引人注意，并可能干扰 WindowServer 的响应性。它并不是零干扰的后台运行证明。

## 剩余边界

重新启用坐标输入需要一个原生执行器，并证明其事件后端不影响全局物理按键状态。仅靠宿主侧的静默窗口不足以为证。
