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

# 拖拽授权权限引导（macOS）

状态：**阶段 1 已完成**（`vera-desktop/src/main/permission-overlay/`、`vera-desktop/src/overlay/permission-overlay.*`）。阶段 2 仍是提案。写于 2026-07-27，对象为 vera。

## 问题

macOS 将辅助功能与屏幕录制权限放在 TCC 之后，而默认流程很不友好：用户必须打开系统设置，找到隐私与安全性，找到正确的面板，按下 `+`，在文件选择器中导航到 `/Applications`，选择 `Vera.app`，然后回来勾选复选框。一共六步，而多数人正是在文件选择器这一步放弃。

vera 目前的做法诚实但最小化：`permissions-actions.ts` 深链到正确的面板后便止步（`vera-desktop/src/main/permissions-actions.ts:52`）。深链之后的一切都交给用户。

Apple 的设计意图是让用户*明确地*添加应用 — 这部分不值得绕过。但系统设置也接受把 `.app` bundle **拖放**到权限列表上，一个手势即可满足同样的意图。这就是全部诀窍。

## 我们复制什么、从哪复制

同一思路的两个独立实现：

- [`riko2chen/AskForPermission`](https://github.com/riko2chen/AskForPermission) — MIT，原生 Swift/AppKit。不能直接使用（vera 是 Electron），但其窗口定位方法是正确的。
- Alma（闭源；行为在本地 `~/alma-re` 研究归档中观察）。Electron 实现，因此其形态几乎可以直接映射到 vera。

**我们取的是技术，不是代码。** 本仓库不复制任何 Alma 源码，`~/alma-re` 也留在仓库树之外。

## 机制

四个 API，其中只有一个比较冷门：

| 部件 | API | 说明 |
|---|---|---|
| 不抢焦点的卡片 | `BrowserWindow` `{type:'panel', focusable:false, transparent:true, frame:false}` + `setAlwaysOnTop(true,'screen-saver')` + `showInactive()` | 四个设置都承重。去掉任何一个，卡片就会抢焦点，从而在拖拽中途丢掉系统设置的拖放目标高亮。 |
| 跟随设置窗口 | `CGWindowListCopyWindowInfo` | **Electron 无法触达** — 见下文。 |
| 拖拽本身 | `webContents.startDrag({file, icon})` | 标准 Electron。向 `NSPasteboard` 写入 `kUTTypeFileURL`，这正是让拖放对另一进程可识别的原因。HTML5 `dragstart` 无法跨越进程边界。 |
| 授权检测 | `systemPreferences.isTrustedAccessibilityClient(false)` / `getMediaAccessStatus('screen')`，约 1.5s 轮询 | 这些权限没有可用的通知；轮询就是当前的最优做法。 |

### 唯一硬约束

Electron 没有提供任何 API 获取其他应用的窗口几何 — `screen.*` 只覆盖显示器与光标。macOS 上唯一无需权限的来源是 `CGWindowListCopyWindowInfo`：窗口*图像*需要屏幕录制权限，但*元数据*（`kCGWindowBounds`、`kCGWindowOwnerPID`）不需要。正是这个区别避免了一个鸡生蛋问题：用一个本身需要辅助功能权限的 API 去请求辅助功能权限。

明确排除：`osascript` / System Events（`get position of window 1 of process "System Settings"`）需要辅助功能和自动化双重授权 — 这正是我们要逃离的死锁。

因此停靠效果只需一次原生调用。有三种获取方式：

1. **`Resources/` 中预构建的 Swift CLI，作为子进程派生。** 约 50KB universal 二进制，与应用一同签名和公证。无 node-gyp，无 N-API/ABI 耦合，不会让主进程崩溃。**推荐。**
2. **首次使用时在运行时编译 Swift，并缓存二进制。** Alma 的做法。零构建系统工作量，但运行时硬依赖 Xcode Command Line Tools — 大多数非开发者 Mac 上没有 — 而 Alma 的版本在缺失时会*静默*失败。
3. **Node 插件（koffi / N-API）。** 避免每次 tick 派生进程，但要为每秒约 5 次的调用付出 ABI 耦合和每次 Electron 升级都要重新编译的代价。不值得。

注意 (1) 和 (2) 的代价模型：以 200ms 轮询的跟踪器在叠加层存续期间每秒派生 5 次进程。对短期存在的引导叠加层可以接受；但它不应成为通用设施。

## 分阶段

**阶段 1 — 纯 Electron，无原生代码。已完成。** 除停靠外的一切：面板窗口、深链、拖拽、轮询器、授权→关闭生命周期、文案。卡片锚定到 `screen.getCursorScreenPoint()`，并限制在该显示器的工作区内 — 用户刚点击了我们的按钮，因此光标是他们在看哪里的良好代理，且卡片会落在他们实际使用的显示器上。

入口是 设置 → 权限与能力 中的 引导授权 / "带我操作"，仅对两个拖拽授权权限显示，且仅在 `canOpenSettings` 为 true 时显示（main 只在 darwin 上将其置为 true）。普通的"打开系统设置"链接保留在旁边 — 拖拽只是快捷方式，绝不是唯一路径。

生命周期位于 `permission-overlay-controller.ts`，完全注入并用假时钟由 `permission-overlay-controller.test.ts` 覆盖：重入时不叠加窗口或定时器，授权 / 关闭 / 窗口消失时拆卸，并设有放弃超时，使被遗弃的流程不会留下永生的置顶卡片（两个参考实现都有的漏洞）。

**阶段 2 — 添加定位器二进制**，作为渐进增强。尚未构建。当它返回一个 frame 时，卡片停靠到设置窗口并跟随它；当它返回 `null` 时，回退到阶段 1 的锚定。与 Alma 不同，要大声记录降级 — 静默回退与 bug 无法区分。

## 阶段 2 雷区：两套坐标空间不匹配

参考定位器返回 **AppKit** 坐标 — 原点位于所在屏幕的左下角：

```swift
y = screen.frame.maxY - localY - cgFrame.height
```

注释声称这正是 `setBounds` 所期望的。其实不是。Electron 在 macOS 上将屏幕坐标规范化为**左上角**原点，因此喂给它一个左下角的 `y` 就是空间错配。停靠计算随后加上一个小偏移（`y = frame.y + 14`），含义是"窗口顶部正下方"，而两套空间只有在以下条件成立时才一致

```
screenHeight - windowTop - windowHeight  ==  windowTop
```

即只有当设置窗口**垂直居中**时才一致 — 而这正是它默认打开的位置，所以该 bug 在演示中不可见。以 900px 屏幕和 600px 窗口推算：

| 设置窗口顶部 | 传给 setBounds 的 y | 应有值 | 漂移 |
|---:|---:|---:|---:|
| 60  | 254 | 74  | **+180** |
| 150（居中） | 164 | 164 | 0 |
| 250 | 64  | 264 | **−200** |

因此卡片在用户移动设置窗口之前都放置正确，之后则按位移的两倍滑向错误方向。

阶段 2 必须要么返回 CG（左上角）坐标并完全跳过 AppKit 转换，要么先转换再转回。无论选择哪种，跟踪器都需要一个把窗口移离居中的测试 — 使用默认位置的 fixture 什么都证明不了。

## 值得借鉴的设计要点

- **拖拽图像应像目标行**，而不是应用图标：一个用 canvas 渲染的系统设置列表行小复制品（图标 + "Vera"）。你拖的东西看起来像它将要变成的东西，这正是让该手势一目了然的原因。
- **飞行动画：** 二次贝塞尔曲线，控制点抬升 `clamp(0.18 × distance, 44, 140)`px，在临界阻尼弹簧上约 720ms。弧线正是"这个东西属于那边"的信号。阶段 1 中跳过 — 没有真实目标时它只是装饰。无论如何都用 `prefers-reduced-motion` 门控。
- **屏幕录制需要额外一拍：** macOS 会缓存旧的拒绝状态，因此刚获得授权的应用常常仍读到 `denied`。诚实的解决办法是文案 — 约 8 秒后，告诉用户需要重新启动。

## 需要修复而非继承的缺口

两个参考实现都有不值得复制的漏洞：

- **不检测用户是否关闭了系统设置或放弃。** 卡片只是原地冻结，在所有 Space 上置顶，直到被手动关闭。vera 应将"设置已离开"和放弃超时视为真实状态。
- **没有开发者模式辅助。** 当没有可拖的 `.app` 时，按下鼠标静默无反应。应回退到"在 Finder 中显示"或复制路径按钮，使流程降级为仍可用的东西。
- **轮询器堆叠。** Alma 在每个入口都会推入一个新订阅者并重启跟踪器，因此两条路径进入同一窗口栈会重复定时器。每个窗口一个跟踪器，由窗口拥有。

## 范围

大致包括：一个主进程模块（窗口 + 跟踪器 + 生命周期）、一条拖拽用 IPC channel、一条卡片用 renderer 路由、双语文案，以及阶段 2 的定位器二进制及其构建/签名步骤。`vera-desktop/src/main/computer-use/cursor-overlay-window.ts` 已经实现了透明 / 置顶 / 所有工作区 / `showInactive`，是建模该窗口的正确参照 — 或许值得泛化。

这是独立的 PR，与任何设置控件工作分离。
