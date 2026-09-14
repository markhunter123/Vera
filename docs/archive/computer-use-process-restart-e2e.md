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

# Computer Use 进程重启 E2E

## 目标

证明来自某个存活应用进程的 Computer Use 观察结果，不能在同一个规范应用路径（canonical application path）被重新启动为新进程后授权某个动作。

预期的存活期遵循已恢复的 Codex 边界：

```text
canonical application path
  + current live process instance
```

对话或传输的连续性不得把一次观察延伸到真正的目标进程重启之后。

## 事件与调查

第一批真实机器 harness 尝试在触达进程边界之前，暴露了几个独立的测试假设：

1. 全新 worktree 没有 workspace `node_modules`，因此下游包无法解析 `@vera/core`。运行 `npm ci` 建立了与 CI 相同的依赖布局。
2. 新 worktree 中缺少被忽略的 cua-driver 制品。启动器现在会在启动 fixture 之前运行 `prepare:cua-driver` 并验证固定的制品。
3. WKWebView AX 节点可能延迟出现，并可能以重复标签和不同 frame 镜像出现。因此重启门禁（restart gate）使用原生的 `CUA Lab Coordinate Target`；OOP 行为仍由专门的受保护 E2E 覆盖。
4. 激活 fixture 会让测试通过，但会夺走用户的焦点。`open -g` 避免了激活，却让 app 从驱动的屏幕窗口集合中消失。最终的 fixture 模式使用 LaunchServices 后台启动，加上 `unhideWithoutActivation`、`moveToActiveSpace` 与 `orderFrontRegardless`，使窗口上屏却不成为最前台应用。
5. 运行时工具失败通过模型可见的文本投影，而非顶层 `error` 属性。门禁同时验证后端类型化结果与模型可见的 `target_missing` 结果。

这些都是 harness 缺陷或环境前置条件。在触达目标进程身份门禁之前，没有任何一个派发过动作。

## 真实序列

启动器与 harness 在五次目标重启期间保持一个 cua-driver 后端和一个 Runtime 工具实例存活：

```text
repeat 5 times with one backend/Runtime instance:
  -> observe current PID/window
  -> bind coordinate action
  -> terminate current app
  -> launch same canonical app path
  -> require globally new host PID and WebContent PID
  -> attempt old observation
  -> require target_missing, no dispatch, mutation 0 -> 0
  -> clear session
  -> observe new PID/window
  -> execute fresh native AX set_value action
  -> if visible, require exact readback on the new process
  -> if covered by the user's window, require target_occluded and zero mutation
  -> require cua-driver generations stable and restartAttempts == 0
```

启动器负责防睡眠、fixture 清理、有界子进程终止，以及私有的临时握手/报告文件。合成 app 以 `CUA_LAB_BACKGROUND=1` 启动。在该模式下，fixture 将窗口置为可见，但不激活应用，也不让它成为用户的最前台 app。一个持续的 Swift 哨兵（sentinel）允许用户在自家应用之间切换、输入、移动指针，但一旦合成 fixture 成为最前台或屏幕被锁定，就立即失败。清理会保留用户当前的应用；只有当 fixture 本身夺走焦点时，恢复才是应急路径。

fixture 仍然是一个真实可见的 AppKit 窗口。后台启动避免了显式激活，但窗口创建与 `orderFrontRegardless` 仍可能引人注目，并可能扰动 WindowServer 的响应性。这是一项有人值守的发布测试，不是零干扰的后台运行证明。

物理用户指针移动被允许，并作为观察数据报告。当用户的窗口遮住目标时，更强的无干扰证明是：后端不发出任何派发，且目标与诱饵（decoy）的变异都保持为零。

## 历史像素结果

在兼容性输入被禁用之前，2026 年 7 月 14 日的五轮无焦点像素浸泡（soak）证明了：

```text
restart rounds:             5
distinct host PIDs:         6
distinct WebContent PIDs:   6

old observation per round:
  outcome:                  target_missing
  native dispatch:          none
  target mutation:          0 -> 0

fresh observation:
  background px success:    4 rounds
  fail_closed_occluded:     1 round
  decoy mutation:           always 0 -> 0

cua-driver service:
  action generation:        1 throughout
  capture generation:       0 throughout
  restartAttempts:          0 throughout

desktop concurrency:
  fixture became frontmost: never
  user pointer moved:       151.2 logical points
  user app switching:       allowed
```

被遮住的那一轮证明了：

```text
outcome:               target_occluded
native dispatch:       none
target mutation:       0 -> 0
decoy mutation:        0 -> 0
```

测试命令是：

```bash
npm run computer-use -- real-ax --scenario restart-recovery
```

## 当前仅 AX 的结果

替代浸泡使用 AX `set_value`，而非像素输入。修正后的五轮运行证明了：

```text
restart rounds:             5
old observation:
  target_missing:           5/5
  native dispatch:          0

fresh observation:
  AX set_value + readback:  5/5

cua-driver service:
  action generation:        1 throughout
  capture generation:       0 throughout
  restartAttempts:          0 throughout

desktop concurrency:
  fixture became frontmost: never
  user pointer moved:       217.1 logical points
  user mouse/keyboard:      reported normal
```

首次仅 AX 的尝试已经确认了陈旧进程被拒绝与一次成功的新鲜 AX 变异，但用错了外部 oracle：直接 AXValue 变异不会调用 fixture 中写入 `state.json` 的 Cocoa 回调。最终运行改为验证由 Runtime 返回的新鲜 AX 观察结果。

## 剩余边界

这证明了普通的进程重启隔离。它并不强制操作系统复用旧的数字 PID。PID 复用安全仍需要以下两者之一：

- 执行器暴露的原生原子进程实例身份；或
- 一个确定性的驱动/host fixture，能在相同的 PID 形态身份下替换为新进程。

当前 fail-closed 的旧窗口查找对于观察到的真实重启是足够的，但它不是针对蓄意 PID 复用的证据。
