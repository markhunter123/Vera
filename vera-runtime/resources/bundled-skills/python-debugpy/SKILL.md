---
name: python-debugpy
description: Python 调试：pdb REPL 交互 + debugpy 远程调试（DAP 协议）。
category: '开发'
metadata:
  source: invt-ai-platform
---

# Python 调试器 (pdb + debugpy)

## 概述

三种工具，按场景选用：

| 工具 | 使用场景 |
|---|---|
| **`breakpoint()` + pdb** | 本地、交互式、最简单。在源码中添加 `breakpoint()`，正常运行，在那一行进入 REPL。 |
| **`python -m pdb`** | 无需修改源码，在 pdb 下启动已有脚本。适合快速探查。 |
| **`debugpy`** | 远程 / 无头 / "附加到已运行的进程"。使用 DAP 协议，可从终端脚本化调用，适用于长生命周期进程（网关、守护进程、PTY 子进程）。 |

**从 `breakpoint()` 开始。** 这是成本最低、最有效的方案。

## 适用场景

- 测试失败，traceback 无法揭示某个值为何错误
- 需要逐步跟踪函数并观察集合如何变化
- 长生命周期进程（the agent 网关、tui_gateway）出现异常且无法重启
- 事后分析：生产环境代码抛出了异常，想检查崩溃现场的局部变量
- 子进程 / 子 worker（Python `_SlashWorker`、PTY bridge worker）是真正的 bug 所在

**不要用于：** `print()` / `logging.debug` 在一分钟内能搞定的事，或者 `pytest -vv --tb=long --showlocals` 已经能揭示的问题。

## pdb 快速参考

在任意 pdb 提示符 (`(Pdb)`) 下：

| 命令 | 作用 |
|---|---|
| `h` / `h cmd` | 帮助 |
| `n` | 下一行（步过） |
| `s` | 步入 |
| `r` | 从当前函数返回 |
| `c` | 继续执行 |
| `unt N` | 继续执行直到第 N 行 |
| `j N` | 跳转到第 N 行（仅限同一函数内） |
| `l` / `ll` | 列出当前行附近的源码 / 整个函数 |
| `w` | 显示调用栈 (where) |
| `u` / `d` | 在调用栈中上移 / 下移 |
| `a` | 打印当前函数的参数 |
| `p expr` / `pp expr` | 打印 / 美化打印表达式 |
| `display expr` | 每次停顿时自动打印表达式 |
| `b file:line` | 设置断点 |
| `b func` | 在函数入口处断点 |
| `b file:line, cond` | 条件断点 |
| `cl N` | 清除第 N 号断点 |
| `tbreak file:line` | 一次性断点 |
| `!stmt` | 执行任意 Python 语句（包括赋值） |
| `interact` | 在当前作用域中进入完整 Python REPL（Ctrl+D 退出） |
| `q` | 退出 |

`interact` 命令最强大——你可以导入任意模块、检查复杂对象，甚至调用会改变状态的方法。局部变量默认只读；从 `(Pdb)` 提示符使用 `!x = 42` 来修改。

## 方案一：本地断点

最简单的方式。编辑文件：

```python
def compute(x, y):
    result = some_helper(x)
    breakpoint()           # <-- 在此处进入 pdb
    return result + y
```

正常运行代码。你会在 `breakpoint()` 所在行暂停，并拥有对局部变量的完全访问权限。

**别忘了在提交前移除 `breakpoint()`。** 使用 `git diff` 或 pre-commit grep：
```bash
rg -n 'breakpoint\(\)' --type py
```

## 方案二：在 pdb 下启动脚本（无需修改源码）

```bash
python -m pdb path/to/script.py arg1 arg2
# 停在脚本第一行
(Pdb) b path/to/script.py:42
(Pdb) c
```

## 方案三：调试 pytest 测试

the agent 测试运行器和 pytest 均支持：

```bash
# 失败时（或任何异常抛出时）进入 pdb：
scripts/run_tests.sh tests/path/to/test_file.py::test_name --pdb

# 在测试开始时进入 pdb：
scripts/run_tests.sh tests/path/to/test_file.py::test_name --trace

# 在 traceback 中显示局部变量（不进入 pdb）：
scripts/run_tests.sh tests/path/to/test_file.py --showlocals --tb=long
```

注意：`scripts/run_tests.sh` 默认使用 xdist（`-n 4`），而 pdb 在 xdist 下**不起作用**。添加 `-p no:xdist` 或用 `-n 0` 运行单个测试：

```bash
scripts/run_tests.sh tests/foo_test.py::test_bar --pdb -p no:xdist
# 或者
source .venv/bin/activate
python -m pytest tests/foo_test.py::test_bar --pdb
```

这会绕过封闭环境的保证——调试时可以这样做，但推送前务必在包装器下重新运行以确认。

## 方案四：对任意异常进行事后分析

```python
import pdb, sys
try:
    run_the_thing()
except Exception:
    pdb.post_mortem(sys.exc_info()[2])
```

或者包装整个脚本：

```bash
python -m pdb -c continue script.py
# 当它崩溃时，pdb 会捕获并让你进入异常所在的帧
```

或者在 REPL/Jupyter 中设置全局钩子：

```python
import sys
def excepthook(etype, value, tb):
    import pdb; pdb.post_mortem(tb)
sys.excepthook = excepthook
```

## 方案五：使用 debugpy 进行远程调试（附加到正在运行的进程）

适用于长生命周期进程：the agent 网关、tui_gateway、守护进程、已经出现异常且无法干净重启的进程。

### 环境准备

```bash
source /path/to/your/project/.venv/bin/activate
pip install debugpy
```

### 模式 A：修改源码——进程在启动时等待调试器

在入口点附近（或你要调试的函数内部）添加：

```python
import debugpy
debugpy.listen(("127.0.0.1", 5678))
print("debugpy listening on 5678, waiting for client...", flush=True)
debugpy.wait_for_client()
debugpy.breakpoint()       # 可选：附加后立即暂停
```

启动进程；它会在 `wait_for_client()` 处阻塞。

### 模式 B：不修改源码——使用 `-m debugpy` 启动

```bash
python -m debugpy --listen 127.0.0.1:5678 --wait-for-client your_script.py arg1
```

模块入口的等效写法：

```bash
python -m debugpy --listen 127.0.0.1:5678 --wait-for-client -m your.module
```

### 模式 C：附加到已运行的进程

需要 PID 且目标环境中已安装 debugpy：

```bash
python -m debugpy --listen 127.0.0.1:5678 --pid <pid>
# debugpy 会注入自身到进程中。然后按下方方式附加客户端。
```

某些内核/安全配置会阻止基于 ptrace 的注入（`/proc/sys/kernel/yama/ptrace_scope`）。修复方法：
```bash
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope
```

### 从终端连接客户端

最简单的终端侧 DAP 客户端是 VS Code CLI 或一个小脚本。在 agent 内部有两个实用选择：

**选项 1：`debugpy` 自带的 CLI REPL**——非官方功能，但可以写一个微型 DAP 客户端脚本：

```python
# /tmp/dap_client.py
import socket, json, itertools, time, sys

HOST, PORT = "127.0.0.1", 5678
s = socket.create_connection((HOST, PORT))
seq = itertools.count(1)

def send(msg):
    msg["seq"] = next(seq)
    body = json.dumps(msg).encode()
    s.sendall(f"Content-Length: {len(body)}\r\n\r\n".encode() + body)

def recv():
    header = b""
    while b"\r\n\r\n" not in header:
        header += s.recv(1)
    length = int(header.decode().split("Content-Length:")[1].split("\r\n")[0].strip())
    body = b""
    while len(body) < length:
        body += s.recv(length - len(body))
    return json.loads(body)

send({"type": "request", "command": "initialize", "arguments": {"adapterID": "python"}})
print(recv())
send({"type": "request", "command": "attach", "arguments": {}})
print(recv())
send({"type": "request", "command": "setBreakpoints",
      "arguments": {"source": {"path": sys.argv[1]},
                    "breakpoints": [{"line": int(sys.argv[2])}]}})
print(recv())
send({"type": "request", "command": "configurationDone"})
# ... 循环读取事件并发送 continue/stepIn 等
```

这种方式适合一次性自动化，但作为交互体验很痛苦。

**选项 2：从 VS Code / Cursor / Zed 附加**——如果用户打开了这些编辑器，可以添加 `launch.json`：

```json
{
  "name": "Attach to the agent",
  "type": "debugpy",
  "request": "attach",
  "connect": { "host": "127.0.0.1", "port": 5678 },
  "justMyCode": false,
  "pathMappings": [
    { "localRoot": "${workspaceFolder}", "remoteRoot": "/home/bb/the agent" }
  ]
}
```

**选项 3：放弃 DAP，使用 `remote-pdb`**——通常这才是终端 agent 真正需要的：

```bash
pip install remote-pdb
```

在代码中：

```python
from remote_pdb import set_trace
set_trace(host="127.0.0.1", port=4444)   # 阻塞直到有连接
```

然后从终端：

```bash
nc 127.0.0.1 4444
# 你会得到一个 (Pdb) 提示符，就像在本地调试一样。
```

当 `debugpy` 的 DAP 协议显得过于复杂时，`remote-pdb` 是对 agent 最友好的选择。只有在确实需要 IDE 集成时才使用 `debugpy`。

## the agent 特定进程调试

### 测试
参见方案三。始终添加 `-p no:xdist` 或在不使用 xdist 的情况下运行单个测试。

### `run_agent.py` / CLI——一次性运行
最简单：在可疑行附近添加 `breakpoint()`，然后正常运行 `the agent`。控制权会在暂停点返回终端。

### `tui_gateway` 子进程（由 `the agent --tui` 启动）
网关作为 Node TUI 的子进程运行。可选方案：

**A. 修改网关源码：**
```python
# tui_gateway/server.py 中 serve() 函数顶部附近
import debugpy
debugpy.listen(("127.0.0.1", 5678))
debugpy.wait_for_client()
```
启动 `the agent --tui`。TUI 会看起来冻结了（其后端正等待连接）。附加客户端；执行 `continue` 后恢复运行。

**B. 在特定处理器中使用 `remote-pdb`：**
```python
from remote_pdb import set_trace
set_trace(host="127.0.0.1", port=4444)   # 放在你想捕获的 RPC 处理器中
```
从 TUI 触发对应的斜杠命令，然后在另一个终端中 `nc 127.0.0.1 4444`。

### `_SlashWorker` 子进程
同样的模式——在 worker 的 `exec` 路径中使用 `remote-pdb` 的 `set_trace()`。worker 在多次斜杠命令之间是持久的，所以首次触发会阻塞直到你连接；除非重新设置，后续斜杠命令正常通过。

### 网关 (`gateway/run.py`)
长生命周期进程。在处理器中使用 `remote-pdb`，或者如果你本来就要重启网关，用 `debugpy` 加 `--wait-for-client`。

## 常见陷阱

1. **pdb 在 pytest-xdist 下静默失效。** 你看不到提示符，测试直接挂起。始终使用 `-p no:xdist` 或 `-n 0`。

2. **`breakpoint()` 在 CI / 非 TTY 环境中会挂起进程。** 本地安全，但永远不要提交。添加 pre-commit grep 作为安全网。

3. **`PYTHONBREAKPOINT=0`** 会禁用所有 `breakpoint()` 调用。如果断点不生效，检查环境变量：
   ```bash
   echo $PYTHONBREAKPOINT
   ```

4. **`debugpy.listen` 只有在同时调用 `wait_for_client()` 时才会阻塞。** 否则，执行会继续，你的第一个断点可能在客户端附加之前就触发了。

5. **在加固内核上附加 PID 会失败。** `ptrace_scope=1`（Ubuntu 默认）只允许同用户对子进程进行 ptrace。解决方法：`echo 0 > /proc/sys/kernel/yama/ptrace_scope`（需要 root）或从一开始就用 `debugpy` 启动。

6. **线程。** `pdb` 只调试当前线程。对于多线程代码，使用 `debugpy`（支持线程的 DAP）或对每个线程设置 `threading.settrace()`。

7. **asyncio。** `pdb` 可以在协程中工作，但在 pdb 中使用 `await` 需要 Python 3.13+，旧版本需从 `interact` 模式中 `await`。对于 3.11/3.12，使用 `asyncio.run_coroutine_threadsafe` 技巧或通过 `asyncio.ensure_future` 的 `!stmt` 式 await。

8. **`scripts/run_tests.sh` 会剥离凭据并设置 `HOME=<tmpdir>`。** 如果你的 bug 依赖于用户配置或真实 API 密钥，在包装器下无法复现。先用原始 `pytest` 调试复现，再在包装器下确认。

9. **Fork / multiprocessing。** pdb 不会跟随 fork。每个子进程需要自己的 `breakpoint()` 或 `set_trace()`。对于 the agent 的子 agent，一次只调试一个进程。

## 验证清单

- [ ] `pip install debugpy` 之后，确认：`python -c "import debugpy; print(debugpy.__version__)"`
- [ ] 远程调试时，确认端口确实在监听：`ss -tlnp | grep 5678`
- [ ] 第一个断点确实被触发（如果没有，很可能是因为 `PYTHONBREAKPOINT=0`、用了 xdist、或者执行在附加之前就结束了）
- [ ] `where` / `w` 显示预期的调用栈
- [ ] 调试后清理：提交的代码中没有残留的 `breakpoint()` / `set_trace()`
  ```bash
  rg -n 'breakpoint\(\)|set_trace\(|debugpy\.listen' --type py
  ```

## 速查配方

**"为什么这个字典缺少某个键？"**
```python
# 在 KeyError 位置上方添加
breakpoint()
# 然后在 pdb 中：
(Pdb) pp d
(Pdb) pp list(d.keys())
(Pdb) w                # 看看是怎么走到这里的
```

**"这个测试单独运行通过，但在测试套件中失败。"**
```bash
scripts/run_tests.sh tests/the_test.py --pdb -p no:xdist
# 但如果只在与其他测试一起运行时才失败：
source .venv/bin/activate
python -m pytest tests/ -x --pdb -p no:xdist
# 现在它会在状态累积后，恰好在失败的测试处被 pdb 捕获。
```

**"我的异步处理器死锁了。"**
```python
# 在处理器入口处添加
import remote_pdb; remote_pdb.set_trace(host="127.0.0.1", port=4444)
```
触发处理器。`nc 127.0.0.1 4444`，然后 `w` 查看挂起的帧，`!import asyncio; asyncio.all_tasks()` 查看还有哪些待处理任务。

**"Ink 子进程 / 子进程中崩溃的事后分析。"**
```bash
PYTHONFAULTHANDLER=1 python -m pdb -c continue path/to/entrypoint.py
# 崩溃时，pdb 会进入异常所在的帧，并拥有完整的局部变量访问权限。
