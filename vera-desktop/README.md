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

# @vera/desktop

Electron 桌面应用：`main`（Node/Electron 主进程）+ `preload`（上下文桥，context bridge）+ `renderer`（React UI）。本文件涵盖三层拆分与 IPC 契约。构建/测试命令与测试层选择指南请参见顶层 `README.md`；renderer 内部细节请参见 `src/renderer/README.md`。

## macOS 开发权限

`npm run dev` 与 `npm start` 在所有平台上都使用普通的 Electron 可执行文件。从事辅助功能（Accessibility）或屏幕录制（Screen Recording）相关工作是个例外：macOS TCC 不会保留对从终端启动的未签名可执行文件的授权。设置 `VERA_DEV_TCC=1` 可改为通过生成的、ad-hoc 签名的 `vera-desktop/.vera-dev/Vera Dev.app` 启动。

```sh
VERA_DEV_TCC=1 npm run dev
```

该 bundle 为 TCC 提供稳定的身份（`com.vera.dev.<worktree-id>`）、可验证的签名，以及一个负责的（responsible）进程——即应用本身，而非终端。之所以通过 LaunchServices 启动，也是出于同样的原因：直接运行其内部二进制会把终端放回责任链中。生成的 app 会被 Git 忽略，并在已安装的 Electron 版本或本仓库路径发生变化时重建；如需显式生成，可运行 `npm --workspace @vera/desktop run prepare:dev-app`。

该流程默认不启用，因为它需要一次 codesign 重建，并且会在 Dock 与"系统设置"中多出一个 app。不涉及 OS 权限的开发者不应为此付出代价。主进程日志仍会流式输出到终端。每次 TCC 启动都会获得独立的私有日志与结果文件：日志仅供观察，一次性结果文件则承载单实例判定。

Bundle 所需的一切在构建时即已固定，因此不带参数、不带环境变量的启动——来自 Dock、Spotlight 或屏幕录制的"退出并重新打开"（Quit & Reopen）——都会产生正确的 app。这里不存在长生命周期会话协议或监督进程：应用实例与开发会话是各自独立的生命周期。Ctrl-C 停止启动器，对于 `npm run dev` 还会停止其 Vite 服务器；但不会退出通过 LaunchServices 启动的 TCC app。请用 Cmd-Q 退出该 app。同样，退出 TCC app 也不会停止开发服务器。应用控制变量（API 密钥、`VERA_*`、Vite URL）被发布到 `.vera-dev/dev-env.json` 这个被忽略的 `0600` 文件中，而非命令行。让 Dock 或"退出并重新打开"启动得以工作的正是该文件，而不是 shell——因为这类启动根本没有父 shell。`PATH` 不会被记录其中：存储的 `PATH` 会过时，而 `shell-env.ts` 正是针对这种情况在主进程中解析登录 shell 的 `PATH`。

Bundle 标识符限定在 worktree 范围内，因为 TCC 是按该标识符存储记录行的：如果共享，每个 worktree 都会覆盖前一个已存储的需求并静默破坏它。限定作用域后，每个 worktree 都拥有自己持久、可独立撤销的授权。

ad-hoc 签名保留其默认的指定需求（designated requirement），即裸 `cdhash`。这意味着每次重建都需要重新授权——但重建只发生在 Electron 升级或仓库移动时，普通 `npm run dev` 不会触发。固定标识符倒能扛住重建，也正是因为这一点才诱人，但 `codesign --sign -` 对每个非特权进程都可用：磁盘上任何地方的任何二进制都能声明该标识符并满足需求。由于 TCC 记录行的存活时间超过了授予它们的代码本身，这会在本仓库被删除后仍留下一个永久可兑现的辅助功能与屏幕录制令牌。Electron 升级后重新授权才是这笔账中更划算的一侧。

请注意，`dist/main/main.js` 处的 payload 是从签名封条（signature seal）之外加载的。因此，对本仓库的写访问是开发流程的一种有意的信任假设——这与谁可以声明 bundle 的身份是两回事。

默认 profile 是 `~/Library/Application Support/Vera Dev`，它将开发环境与打包后的 Vera profile 隔离，并由普通 dev 构建与 TCC dev 构建共享；显式指定的 `--user-data-dir` 具有更高优先级。（该 README 此前还声称仓库 CLI（`npm run cli:dev`）也共享它——未经证实；CLI 入口不经过桌面 dev 启动器，因此在验证之前放弃这一说法。）Electron 的单实例锁是共享开发 profile 的唯一权威。第二次启动会以明确的冲突退出，而不是扫描或终止已有的 Electron 进程。普通 dev 拥有其直接子进程；TCC 启动器只消费一次性锁判定，从不拥有或向分离的 app 进程发送信号。

已知限制：Chromium 可能在 20 秒确认超时后杀掉无响应的锁持有者，并让新实例取得锁。共享 profile 会扩大可触及这一既有行为的启动组合；调查与证据见 #3539。

已知限制：`dev-env.json` 的存活时间超过会话本身，因此在 `npm run dev` 停止很久之后从 Dock 启动，会把 app 指向一个不再提供服务的 Vite URL，窗口保持空白。请先启动开发会话。如果之后另一个 worktree 占用了该端口，窗口会改为加载*它的* renderer，看起来像是正常工作。

请向 **Vera Dev** 授予权限，而不是某个通用的 Electron 入口。屏幕录制更改需要重启开发 app。未设置 `VERA_DEV_TCC` 时，权限覆盖层（permission overlay）仍会运行，但其拖放目标是 npm 的 Electron bundle，macOS 不会将其接受为持久授权。

## 三层结构

| 层 | 路径 | 职责 |
|---|---|---|
| main | `src/main/` | Node/Electron 客户端进程。拥有窗口、OS 能力、客户端本地设置、IPC 投影以及 Runtime Host 连接。运行时执行与规范的运行时策略属于 Runtime Host。 |
| preload | `src/preload/preload.ts`（单文件） | `contextBridge.exposeInMainWorld('vera', …)` —— renderer 可调用来触达 Node/Electron 的唯一表面。不直接暴露任何 Node API。 |
| renderer | `src/renderer/` | React UI 主体。参见 `src/renderer/README.md`。 |

## main 进程布局

`src/main/` 为扁平结构，采用命名约定：

| 后缀 | 职责 | 示例 |
|---|---|---|
| `runtime-host-*-ipc-main.ts` | 将 Runtime Host 协议域投影到 renderer IPC | `runtime-host-connections-ipc-main`、`runtime-host-session-execution-ipc-main`、`runtime-host-settings-ipc-main` |
| `*-ipc-main.ts` | 注册客户端本地的 Electron 或面向 OS 的 IPC 域 | `browser-ipc-main`、`notifications-ipc-main`、`workspace-search-ipc-main` |
| `*-service.ts` / `*-controller.ts` | 不直接拥有 IPC 的客户端本地服务 | `app-update-service`、`project-management-service`、`project-root-controller` |
| `*-guard.ts` | 校验 / 安全边界 | `external-link-guard`、`open-path-guard`、`permission-response-guard` |
| （其他） | 窗口、状态、平台接线 | `main.ts`（入口）、`main-window`、`window-state`、`theme-source`、`credential-store`、`skills`、`attachment-*` |

子文件夹存放面向 OS 的实现，如 `browser/`、`computer-use/`、`oauth/` 与 `permission-overlay/`。Runtime Host 适配器保持扁平结构并带有 `runtime-host-` 前缀，以便在 import 边界处就能看到归属关系。

`main.ts` 只做 ready 之前的 Electron 身份与单实例工作。在 `app.whenReady()` 之后，它动态导入 `runtime-host-boot.ts`。Boot 在写入任何 Runtime Host 状态之前先校验存储根目录，注册持久的客户端本地 IPC，连接或派生（spawn）Runtime Host，注册连接作用域的 Host IPC，然后才创建第一个 renderer 窗口。窗口在 renderer 首次 AppShell 绘制（`window:notifyRendererReady`）之前保持隐藏，并带有一个兜底显示定时器以支持 fail-soft 启动。

## IPC 契约

三种模式，全部根植于 preload 的 `vera` 命名空间。频道名为 `<domain>:<action>`。

- **请求/响应** —— preload 中的 `ipcRenderer.invoke('<domain>:<action>', …args)` ↔ `ipcMain.handle('<domain>:<action>', …)`。运行时域由 `runtime-host-*-ipc-main.ts` 投影；面向 OS 的客户端域使用聚焦的 `*-ipc-main.ts` 模块。
- **main→renderer 推送** —— main 通过安全发送守卫（safeSendToRenderer，经 `mainWindowController.send`）发送，而非直接 `webContents.send`（后者在窗口/`webContents` 被销毁时会抛出异常）；preload 通过 `ipcRenderer.on` 订阅并返回取消订阅函数（如 `sessions:changed`、`scheduled-tasks:changed`、`artifacts:changed`）。safe-send 契约测试会扫描固定列表中的 main 源文件，查找直接的 `mainWindow.webContents.send(...)` 形式——新建的 `*-ipc-main.ts` 文件不会自动被覆盖，因此每个新文件中的发送都要走守卫（`mainWindow` 的别名可绕过字面量扫描）。
- **renderer→main 即发即弃** —— preload 中的 `ipcRenderer.send('<domain>:<action>', …)` ↔ `ipcMain.on('<domain>:<action>', …)`。用于无需响应的情况（如 `browser:active-session`、`browser:setViewport`）。

新增 IPC 表面：如果要抽取，请编写导出 `register*Ipc(...)` 的 `*-ipc-main.ts`，在 `main.ts` 中 import 并在 `registerIpc()` 内调用；在 `preload.ts` 中为 `vera` 命名空间添加对应方法；在 `src/global.d.ts` 中为 `window.vera` 类型添加该方法（renderer 的类型化桥——没有它，renderer 调用会报 TS 错误）；保持 `<domain>:<action>` 频道命名。未在 `registerIpc()` 中注册的 handler 文件可以编译但永远不会挂载。

## 数据流

```
renderer (React)
  └─ window.vera.<ns>.<method>(…)        // typed surface, see preload.ts
      └─ ipcRenderer.invoke / send / on
          └─ main: safeSendToRenderer / ipcMain.handle / ipcMain.on
              └─ Runtime Host protocol → @vera/runtime + @vera/storage
```

renderer 在运行时从不 import `@vera/runtime` 或 `@vera/storage`——所有 Node 侧访问都经由 preload 的 `vera` 桥。renderer 仅从它们中拉取少量共享类型的 `import type`。跨 IPC 边界共享的类型大多来自 `@vera/core`，部分来自 `@vera/runtime`、`@vera/storage` 与 `@vera/ui`（参见 `preload.ts` 的 imports）。

## 收敛说明

renderer 侧背负着前端收敛债务（手写 CSS、primitive 覆盖）；参见 `src/renderer/README.md`。main 进程本身不属于该收敛范畴——它的边界（IPC 频道名、preload 桥、`*-guard.ts` 文件）是稳定的契约接缝。
