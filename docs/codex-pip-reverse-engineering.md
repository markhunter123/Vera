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

# Codex 画中画逆向工程

Vera 的 Computer Use 镜像从 Codex 复制了什么、每个事实的来源，以及 Vera 刻意做出不同选择的四个地方。本文与 [computer-use-cursor-provenance.md](./computer-use-cursor-provenance.md) 一样，将已确认的原生事实与实现推断分开记录。

## 检视过的产物

共两件，且两者之间的分工比其中任何一件都更重要。

| | 路径 | 职责 |
|---|---|---|
| service | `~/.codex/computer-use/Codex Computer Use.app/Contents/MacOS/SkyComputerUseService` | 采集与发布的一半 |
| host | `/Applications/ChatGPT.app/Contents/Resources/native/sky.node` | 窗口的一半 |
| main JS | `/Applications/ChatGPT.app/Contents/Resources/app.asar` → `.vite/build/main-Be_0DBuv.js` | 宿主注册 |

service 拥有 `RemoteHostedPIPContentPublisher`、`RemoteHostedPIPCaptureStream` 和 `CUAServiceRemoteHostedPIPController`，链接了 AVFoundation 和 ScreenCaptureKit，并使用 `AVSampleBufferDisplayLayer` — 但**没有**链接 AVKit。它通过 XPC 采集并发布；不承载窗口。

窗口位于 ChatGPT 自己的原生插件 `sky.node` 中的 `PIPStack*` 系列。只搜索 service 中的窗口符号就断定窗口不存在，正是本文档存在的部分原因所要防止的错误：类名中的 `RemoteHosted` 表明另一半在另一个进程中，所以在断定任何东西不存在之前，先找到那个进程。

## 已确认：面板

从 `RemoteHostedPIPContentCreateStackPanel` 反汇编中逐指令读出：

```objc
NSPanel initWithContentRect:… styleMask:0x80   // NSWindowStyleMaskNonactivatingPanel
                             backing:2 defer:NO
setTitle:
setBackgroundColor: [NSColor clearColor]
setOpaque: NO
setHasShadow: NO
setLevel: 0                       // NSNormalWindowLevel — deliberately not floating
setAcceptsMouseMovedEvents: YES
setCollectionBehavior: 0x108      // FullScreenAuxiliary | Transient
setHidesOnDeactivate: NO
setMovableByWindowBackground: NO  // dragging is hand-rolled, see below
```

然后是来自 `-[PIPStackWindow attachToOwnerWindowForPositioning]` 的 `addChildWindow:ordered:`。

支撑整个设计的两个事实是 `setLevel: 0` 和 `addChildWindow:`。子窗口相对于其父窗口排序，而不是相对于桌面，并由父窗口在同一个 window-server 事务中携带。

## 已确认：结构

```
PIPStackHost      { hostID, ownerWindow, anchorContentRect, anchors[], presentationScope }
PIPStackHostAnchor{ contentPoint, alignment }
PIPStackWindow    attachToHost: / startFollowingOwnerWindow / ownerWindowFrameMayHaveChanged:
PIPStackController
    drag    beginDragAtContentPoint: → dragToContentPoint: → endDrag
    snap    nearestTargetAnchorForCurrentAnchor:draggingVelocity: → moveStackToAnchorAlongCurve:
    motion  configureMotionSpringsWithLeadItem:dragging:programmaticMove:
    hosts   moveStackToHostID: / compatibleAnchorsIncludingDragHosts:
    clamp   clampEnvelopeToVisibleScreen:
PIPStackItemMotion{ springStiffness, springDamping, velocity, target, origin, restOffset }
PIPStackContentView
    reinstallMouseEventMonitors → addGlobalMonitorForEventsMatchingMask:handler:
                                  addLocalMonitorForEventsMatchingMask:handler:
    updateHoverFromCurrentMouseLocation / contentPointForCurrentMouseLocation
```

`ownerWindowFrameMayHaveChanged:` 读取 `notification.object` 并比较 `notification.name`，因此它是宿主窗口移动/缩放的通知处理器。它重新计算锚点。它不移动窗口 — 由 window server 移动，因为面板是子窗口。

## 已确认：常量

**弹簧**，来自 `configureMotionSpringsWithLeadItem:dragging:programmaticMove:` — 一条 `cmp w26, #0` 后接四条 `fcsel`，因此是两列四行：

| | 未拖拽 | 拖拽 |
|---|---|---|
| 主弹簧刚度 | 320 | 900 |
| 主弹簧阻尼 | 42 | 55 |
| 跟随弹簧刚度基数 | 150 | 260 |
| 跟随弹簧阻尼基数 | 30 | 32 |

跟随值分别除以 `1 + 0.18·s` 和 `1 + 0.08·s`，其中 `s = |index| · (1 + 0.45·|index|)`。

阻尼比正是选择这些数值而非其他数值的原因：静止时 ζ ≈ 1.17，略过阻尼，因此永远不会回弹越过落定的角落；拖拽时 ζ ≈ 0.92，略欠临界，因此窗口在指针拖动下仍保留一丝弹性。

**抛掷**，来自 `nearestTargetAnchorForCurrentAnchor:draggingVelocity:`：

```
throw   = velocity * 0.55
t       = min(|throw| / 5000, 0.45)
target  = currentAnchor + unit(throw) * t
score(a)= |a.point − target| − |throw| · max(0, dot(unit(throw), unit(a.point − current)))
pick min score
```

另有 `hypot(velocity) >= 120` 决定其他宿主上的锚点是否成为候选。

0.55 是"窗口飞向你抛出的方向"与"窗口飞向你指向的方向"之间的差别，只有前者让人觉得有分量。点积项使一次有意的隔窗抛掷落在瞄准处；仅凭距离会选中你正要离开的那个角落。

**尺寸**：默认最长边 200pt，限制在 [100, 400]，按较短边缩放保持宽高比。锚点内缩 24pt。三个边界就是字面量的 double `0x4069…`、`0x4059…`、`0x4079…`。

**缩放**，来自 `-[PIPStackResizeInteraction maxDisplaySizeForPointerScreenPoint:]`，只有四条指令：

```
sign = (alignment & ~1) == 2 ? +1 : -1
size = initialMaxDisplaySize + (pointer.y - initialPointer.y) * sign
```

只有垂直分量驱动缩放，符号来自镜像所靠的角落，因此该手势在任何位置含义一致：远离锚点即放大。没有任何增量累积 — 交互保持起始时的边缘与指针高度 — 因此抖动指针不会累积漂移。

**控件**：`performControlWithIdentifier:` 接受 `stop`、`hide`、`close`；`setHoveredControlIdentifier:` 和 `_pressedControlIdentifier` 驱动其外观。

## 编写任何代码之前在 Electron 43 上的实测

| | 结果 |
|---|---|
| `documentPictureInPicture` | `undefined`，无论是否带 `--enable-features=DocumentPictureInPictureAPI` |
| 子窗口、父窗口移动 | 子窗口跟随，无需代码，同一事务 |
| 子窗口、父窗口缩放 | 子窗口不动 — 需要重新计算锚点 |
| 子窗口 `isAlwaysOnTop()` | `false` |
| 向点击穿透窗口注入鼠标事件 | 会送达，但被合并 — 5 次中 2 次，随后 5 次中 1 次 |

Document Picture-in-Picture 在 Electron 中不只是被禁用；其实现位于 Chromium 的 `//chrome` 浏览器层（`PictureInPictureWindowManager`），而 Electron 没有这一层。这条路是关闭的，而不是变窄了。

## Vera 复制了什么

- 应用窗口的子窗口，普通层级。镜像最初的两个缺陷 — 漂浮在无关应用之上、拖拽时滞后一帧 — 出自同一个原因：自己定位而不是被携带。
- `hasShadow: false`。`pip.html` 自行绘制阴影；原生阴影会成为第二个阴影，由 window server 在每次帧落地时根据内容 alpha 重新计算，而这恰是每次动作后都会收到一帧的那个窗口。
- 200pt 默认边长、[100, 400] 限制、24pt 内缩。
- 弹簧常量、抛掷投影与锚点评分，位于 `vera-desktop/src/main/computer-use/pip-motion.ts`，每个常量旁都引用了反汇编。
- 悬停状态由主进程侧的指针决定，因为 Codex 的全局与本地 `NSEvent` 监视器就是这么做的。它从不询问窗口指针是否在其内部。
- 只响应缩放。移动是 window server 的职责。

## Vera 做出不同选择的地方及其原因

**两个控件，而非三个。** Codex 的 `close` 关闭一个 tile，`hide` 关闭整个堆栈。Vera 一次只镜像一个窗口，因此这两个手势等价，其中只有一个配得上按钮。

**未指向时点击穿透。** Codex 的 tile 始终吞掉点击：`acceptsFirstMouse:` 返回 YES，`hitTest:` 认领整个视图。其 tile 是选择性加入的，隐藏在一个措辞为"在画中画模式下显示 Computer Use 正在处理的后台应用"的设置之后；Vera 的镜像在每次运行开始时都会出现，因此必须做到忽略它没有任何代价。`setIgnoreMouseEvents(true, {forward: true})` 仍会送达移动事件，因此 main 能判断何时把点击收回来。

**没有堆栈。** Codex 用主项加跟随项镜像多个 tile；跟随弹簧列及其索引衰减在这里没有可应用的对象。

**拖拽把手与控件一起出现。** Codex 的缩放把手属于同一套 hover 装饰；静止时 tile 不显示任何把手。这里同样如此 — 200pt 的窗口负担不起常驻的控件提示。

**帧，而非视频。** Codex 通过 XPC 上的 ScreenCaptureKit 推流。每次产生变更的 Computer Use 动作本就会在静置等待后返回目标的截图，因此镜像是一本由动作后帧组成的翻页动画，不产生额外采集开销。这个取舍是真实且刻意的：动作之间，镜像不更新。

**无跨宿主移动。** `moveStackToHostID:` 在*宿主窗口*之间移动堆栈 — Codex 注册了多个宿主，包括 `avatar-overlay`。Vera 只有一个窗口，因此没有可移动的目标。跨显示器可用是因为镜像是应用窗口的子窗口，跟着那个窗口走。

## 验证

`scripts/pip-interaction-smoke.mjs` 运行真实场景：真实父窗口、真实子面板、真实 preload 与 renderer、真实输入事件。它断言子窗口属性、停靠位置、随移动携带、悬停、抛掷落定在瞄准的锚点、应用缩放后镜像回到所选角落而非默认角落、把手拖拽放大（实测 200x160 → 290x232，宽高比保持，仍在角落上，位于限制内），以及 hide 控件。

它不需要辅助功能授权，也不需要解锁屏幕 — 它只驱动 Electron 窗口 — 因此当其他检查无法运行时，它是唯一仍然可用的真机检查。

物理与锚点评分在无桌面环境下被精确覆盖于 `vera-desktop/src/main/__tests__/computer-use-pip-motion.test.ts`。
