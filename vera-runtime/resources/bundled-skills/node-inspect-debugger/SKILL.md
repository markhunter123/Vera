---
name: node-inspect-debugger
description: '通过 --inspect + Chrome DevTools Protocol CLI 调试 Node.js。'
category: '开发'
metadata:
  source: invt-ai-platform
---

`debug>` 提示符下可用的命令：

| 命令 | 操作 |
|---|---|
| `c` 或 `cont` | 继续执行 |
| `n` 或 `next` | 单步跳过 |
| `s` 或 `step` | 单步进入 |
| `o` 或 `out` | 单步跳出 |
| `pause` | 暂停正在运行的代码 |
| `sb('file.js', 42)` | 在 file.js 第 42 行设置断点 |
| `sb(42)` | 在当前文件的第 42 行设置断点 |
| `sb('functionName')` | 在函数被调用时中断 |
| `cb('file.js', 42)` | 清除断点 |
| `breakpoints` | 列出所有断点 |
| `bt` | 回溯（调用栈） |
| `list(5)` | 显示当前位置周围 5 行源代码 |
| `watch('expr')` | 每次暂停时对表达式求值 |
| `watchers` | 显示已监视的表达式 |
| `repl` | 在当前作用域中进入 REPL（Ctrl+C 退出 REPL） |
| `exec expr` | 对表达式进行一次求值 |
| `restart` | 重新启动脚本 |
| `kill` | 终止脚本 |
| `.exit` | 退出调试器 |

**在 `repl` 子模式中：** 输入任意 JavaScript 表达式，包括访问局部/闭包变量。`Ctrl+C` 返回到 `debug>`。

## 附加到运行中的进程

当进程已在运行中（例如 Vite 开发服务器或 Electron 主进程）：

```bash
# 1. 发送 SIGUSR1 以在现有进程上启用检查器
kill -SIGUSR1 <pid>
# Node 输出：Debugger listening on ws://127.0.0.1:9229/<uuid>

# 2. 附加调试器 CLI
node inspect -p <pid>
# 或通过 URL
node inspect ws://127.0.0.1:9229/<uuid>
```

从一开始就以启用检查器的方式启动进程：

```bash
node --inspect script.js           # 监听 127.0.0.1:9229，继续运行
node --inspect-brk script.js       # 监听并在第一行暂停
node --inspect=0.0.0.0:9230 script.js   # 自定义 host:port
```

通过 tsx 运行 TypeScript：

```bash
node --inspect-brk --import tsx script.ts
# 或旧版 tsx
node --inspect-brk -r tsx/cjs script.ts
```

## 程序化 CDP（从终端脚本化）

当你需要自动化 — 设置大量断点、捕获作用域状态、编写复现脚本 — 使用 `chrome-remote-interface`：

```bash
npm i -g chrome-remote-interface        # 或安装在项目本地
# 启动目标进程：
node --inspect-brk=9229 target.js &
```

驱动脚本（保存为 `/tmp/cdp-debug.js`）：

```javascript
const CDP = require('chrome-remote-interface');

(async () => {
  const client = await CDP({ port: 9229 });
  const { Debugger, Runtime } = client;

  Debugger.paused(async ({ callFrames, reason }) => {
    const top = callFrames[0];
    console.log(`暂停：${reason} @ ${top.url}:${top.location.lineNumber + 1}`);

    // 遍历作用域以获取局部变量
    for (const scope of top.scopeChain) {
      if (scope.type === 'local' || scope.type === 'closure') {
        const { result } = await Runtime.getProperties({
          objectId: scope.object.objectId,
          ownProperties: true,
        });
        for (const p of result) {
          console.log(`  ${scope.type}.${p.name} =`, p.value?.value ?? p.value?.description);
        }
      }
    }

    // 在暂停帧中对表达式求值
    const { result } = await Debugger.evaluateOnCallFrame({
      callFrameId: top.callFrameId,
      expression: 'typeof state !== "undefined" ? JSON.stringify(state) : "n/a"',
    });
    console.log('state =', result.value ?? result.description);

    await Debugger.resume();
  });

  await Runtime.enable();
  await Debugger.enable();

  // 通过 URL 正则 + 行号设置断点
  await Debugger.setBreakpointByUrl({
    urlRegex: '.*dist-electron/main/index\\.js$',
    lineNumber: 119,       // 0 起始索引
    columnNumber: 0,
  });

  await Runtime.runIfWaitingForDebugger();
})();
```

运行它：

```bash
node /tmp/cdp-debug.js
```

`chrome-remote-interface` 不是本仓库中任何包的依赖。请安装到临时位置，以免污染项目的 `package.json`：

```bash
mkdir -p /tmp/cdp-tools && cd /tmp/cdp-tools && npm i chrome-remote-interface
NODE_PATH=/tmp/cdp-tools/node_modules node /tmp/cdp-debug.js
```

## 调试 Electron 桌面应用

`invt-desktop` 是一个 Electron 应用。**主进程**是一个 Node 进程 — `electron/main/index.ts`，由 Vite 编译为 `dist-electron/main/index.js`（`package.json` 中的 `main` 字段）。它会将 Java 后端作为子进程启动。**渲染进程**是一个 Chromium `BrowserWindow` — 请使用窗口的 DevTools 来调试它，而非本技能。

### 以暂停方式启动主进程

Electron 会将 `--inspect` / `--inspect-brk` 转发到其主进程。首先构建 Electron 输出，确保 `dist-electron/` 存在：

```bash
cd invt-desktop
npm run build                          # 生成 dist/ 和 dist-electron/
npx electron --inspect-brk=9229 .      # Electron 启动，在主进程第一行暂停
# 在另一个终端中：
node inspect ws://127.0.0.1:9229/<uuid>
```

然后在 `debug>` 中：

```
sb('dist-electron/main/index.js', 220)   # 例如窗口/后端设置中的可疑行
cont
```

暂停时，`repl` → 检查 `mainWindow`、`javaProcess`、`BACKEND_PORT`、更新器状态等。

### 附加到已在运行的桌面应用

Electron 主进程是那个不带 `--type=` 标志启动的进程（渲染/GPU/实用进程带有 `--type=`）：

```bash
# 找到主进程 PID（没有 --type= 的那个入口）
ps aux | grep -i 'invt-desktop' | grep -v -- '--type='

# 对其启用检查器
kill -SIGUSR1 <主进程-pid>

# 找到 WebSocket URL 并附加
curl -s http://127.0.0.1:9229/json/list | jq -r '.[0].webSocketDebuggerUrl'
node inspect ws://127.0.0.1:9229/<uuid>
```

主进程启动的 Java 后端是 JVM，不是 Node 目标 — 它不会出现在 `/json/list` 中。要调试它，请使用 JVM 自身的远程调试标志，而非本技能。

## 调试 Vite 开发服务器

`invt-ai-platform-ui`、`invt-ai-platform-webchat` 和 `invt-desktop` 都通过 `vite` 运行 `dev`。要逐步调试 Vite 配置或构建插件，请将 Vite 二进制文件放在检查器下运行，而不是使用 `pnpm dev` 包装器：

```bash
cd invt-ai-platform-ui
node --inspect-brk ./node_modules/vite/bin/vite.js
# 在另一个终端中：node inspect -p <pid>，然后 sb('vite.config.ts', N)，cont
```

这会在加载 `vite.config.ts` 并运行插件钩子的 Node 进程中暂停。它提供的浏览器端 Vue 代码在此无法访问 — 这些代码在浏览器中运行，应使用浏览器 DevTools 调试。

## 堆快照与 CPU 性能分析（非交互式）

在上述 CDP 驱动程序中，将 Debugger 替换为 `HeapProfiler` / `Profiler`：

```javascript
// CPU 性能分析，持续 5 秒
await client.Profiler.enable();
await client.Profiler.start();
await new Promise(r => setTimeout(r, 5000));
const { profile } = await client.Profiler.stop();
require('fs').writeFileSync('/tmp/cpu.cpuprofile', JSON.stringify(profile));
// 在 Chrome DevTools → Performance 标签页中打开 /tmp/cpu.cpuprofile
```

```javascript
// 堆快照
await client.HeapProfiler.enable();
const chunks = [];
client.HeapProfiler.addHeapSnapshotChunk(({ chunk }) => chunks.push(chunk));
await client.HeapProfiler.takeHeapSnapshot({ reportProgress: false });
require('fs').writeFileSync('/tmp/heap.heapsnapshot', chunks.join(''));
```

## 常见陷阱

1. **TypeScript 源码中行号不对。** 断点命中的是生成的 JS，而不是 `.ts` 文件。解决方法：(a) 在构建产物中设置断点（`dist-electron/main/index.js`），或 (b) 启用 sourcemap（`node --enable-source-maps`）并使用 `sb('electron/main/index.ts', N)` — 但仅适用于会跟踪 sourcemap 的 CDP 客户端。`node inspect` CLI 不会。

2. **`--inspect` 与 `--inspect-brk` 的区别。** `--inspect` 启动检查器但不暂停；如果附加太晚，脚本会直接跑过你的第一个断点。当你需要在任何代码运行之前设置断点时，请使用 `--inspect-brk`。

3. **端口冲突。** 默认端口是 `9229`。如果有多个 Node 进程在调试，请传入 `--inspect=0`（随机端口）并从 `/json/list` 读取实际 URL：
   ```bash
   curl -s http://127.0.0.1:9229/json/list   # 列出主机上所有可检查的目标
   ```

4. **子进程。** 父进程上的 `--inspect` 不会检查其子进程。Electron 本身是多进程的，而桌面主进程还会额外交互启动 Java 后端子进程。使用 `NODE_OPTIONS='--inspect-brk' node parent.js` 来传播到每个 Node 子进程；注意它们都需要唯一的端口（当 `NODE_OPTIONS='--inspect'` 被继承时，Node 会自动递增端口号）。

5. **后台挂起。** 如果你在目标暂停时对 `node inspect` 执行 `Ctrl+C`，目标会保持暂停状态。要么先执行 `cont`，要么显式执行 `kill` 终止目标。

6. **通过 Agent 的 Shell 工具运行 `node inspect`。** `execute_shell_command` 工具是一次性的且非交互式的 — 它无法驱动交互式的 `debug>` REPL。要进行交互式单步调试，请自行在真实终端中运行 `node inspect`。对于 Agent 驱动的调试，优先使用上述脚本化的 CDP 驱动程序：它完全非交互式，并且可以作为单个 `execute_shell_command` 调用正常运行。

7. **安全性。** `--inspect=0.0.0.0:9229` 会暴露任意代码执行。除非在隔离网络中，否则始终绑定到 `127.0.0.1`（默认值）。

## 验证清单

设置调试会话后，请验证：

- [ ] `curl -s http://127.0.0.1:9229/json/list` 恰好返回你预期的目标
- [ ] 第一个断点确实被命中（如果没有，很可能你漏掉了 `--inspect-brk`，或者在执行完成后才附加）
- [ ] 暂停时的源代码列表显示正确的文件（不匹配 = sourcemap 问题，参见陷阱 1）
- [ ] 在 `repl` 中执行 `exec process.pid` 返回你打算附加的 PID

## 一次性操作速查

**"为什么这个变量在第 X 行是 undefined？"**
```bash
node --inspect-brk script.js &
node inspect -p $!
# debug>
sb('script.js', X)
cont
# 暂停了。现在：
repl
> myVariable
> Object.keys(this)
```

**"进入这个函数的调用路径是什么？"**
```
debug> sb('suspectFn')
debug> cont
# 在入口处暂停
debug> bt
```

**"这个异步链挂起了 — 卡在哪？"**
```
# 使用 --inspect（不带 -brk）启动，让它运行到挂起状态，然后：
debug> pause
debug> bt
# 现在你能看到卡住的帧了
