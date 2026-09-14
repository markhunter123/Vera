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

# Windows 支持基线

Windows 是活跃的启用目标，但还不是 Vera 完全支持的平台。CLI 和 Electron 桌面应用可以从源码运行，发布工作流会产出经过验证的未签名 Windows x64 预览版。x64 包为受管理的 filesystem-worker 界面包含 AppContainer sandbox，带打包的生命周期和对抗性证据；自动更新在 CI 中于未签名预览通道完成端到端验证。签名、更广泛的通用命令 sandbox 层、直接的 Credential Manager/DPAPI 探测、独立安全评审和 computer-use 保证仍未完成。进展在 [GitHub issue #2142](https://github.com/vera-ai/vera/issues/2142) 中跟踪。

## 安装 Windows x64 预览版

只使用 Vera GitHub Release 附带的 Windows 资产。NSIS 安装包名为
`Vera-<version>-win-x64.exe`；ZIP 主要用于便携检查和问题排查。

1. 从同一个 release 下载 `.exe` 和对应的 `.sha256` 文件。
2. 在 PowerShell 中分别查看实际摘要和发布的摘要：

   ```powershell
   Get-FileHash .\Vera-<version>-win-x64.exe -Algorithm SHA256
   Get-Content .\Vera-<version>-win-x64.exe.sha256
   ```

3. 两个 SHA-256 必须完全一致。校验和只能确认文件与该 release 发布的字节一致，不能替代发布者身份认证。
4. 运行安装包。预览版尚无 Authenticode 签名，SmartScreen 会提示未知发布者；只有完成第 3 步后，
   才应选择 **更多信息 → 仍要运行**。
5. 启动 Vera，在 **设置 → 模型**中配置模型。需要 Runtime `Grep` 工具时，执行
   `winget install BurntSushi.ripgrep.MSVC`，并在 `PATH` 更新后重启 Vera。

发布门禁会安装固定的 v0.1.9、执行完整 smoke、在同一目录升级候选版本、再次完整 smoke、等待安装目录内
进程退出，并运行真实卸载器。另一个门禁证明**运行中的自动更新路径**：已安装且正在运行的候选版本通过打包的
electron-updater 从 loopback 测试 feed 发现新版本、后台下载、交接给 NSIS 安装器、以新版本自动重启并通过
完整打包 smoke——feed 请求（含差量下载探测）、`downloaded` 状态及其精确版本对、最终安装版本均逐项断言；
`checking`/`downloading` 等瞬态不逐项断言。

第三个门禁验证 **Abort 路径 rollback 与备份保留**。升级在任何破坏性步骤之前先把现有安装备份到同卷同级
目录（`<安装目录>.pre-upgrade-backup`），校验副本并持久化注册表快照；备份失败、卸载注册信息缺失、备份
版本标记与当前快照不匹配，或备份缺少可执行文件见证时直接拒绝升级，旧安装分毫未动（退出码 101）。在
NSIS **Abort 路径**上，安装器
用同卷两步换名恢复备份——任意中间时刻磁盘上都至少存在一份完整安装——并回写、回读校验必需的注册信息
（退出码 102）；注册表回读不一致时保留恢复证据并返回 103。门禁在最坏时点——新文件已抽取、
旧文件已删、新卸载器与注册表尚未写入——注入确定性的测试专用失败点，断言先前安装**逐文件 SHA-256 字节
一致**地恢复（文件内容字节，不含 ACL/时间戳）、注册信息恢复、且能以旧版本启动；还会强制制造并恢复
注册表回读不一致，验证旧版本或不完整备份不会被当前安装误接管，并断言正常升级成功且无备份残留。

边界必须说清楚：模板自身的失败分支（旧卸载器失败、抽取重试耗尽或被取消）经 `Quit` 退出，NSIS 对此没有
任何回调——**这些路径上不会发生自动 rollback**。门禁刻意钉住这一缺口：在最坏时点 `Quit` 之后，已校验的
备份和其中的 `RECOVERY-README.txt` 会被保留。仅当备份版本标记与持久化快照一致时，重新运行安装器才会
接管该备份并完成升级——这次重跑就是受支持的恢复方式，门禁对其有断言。如需手工恢复：关闭 Vera、删除
安装目录、把 `<安装目录>.pre-upgrade-backup`
重命名为安装目录、删除其中的两个标记文件。同样不覆盖：安装器进程被硬杀或断电（备份拷贝不经强制介质
刷盘，与下方耐久性边界同一口径）。整体仍未证明的是：更新签名校验（尚无 Authenticode 证书；生产 GitHub
通道的 feed 配置由单测钉死，并在每次真实 release 中例行使用）与业务数据迁移。

卸载入口为 **设置 → 应用 → 已安装的应用 → Vera → 卸载**。预览版尚未承诺业务数据迁移，
请先备份重要 workspace 数据。

## 第 0 阶段开发目标

初始目标是原生 Windows 11 x64 开发环境，包含：

- Node.js 22.19 或更新；CI 目前统一使用 Node.js 24；
- npm 11 与已提交的 lockfile；
- 支持长路径的 Git for Windows；
- 首选 PowerShell 7（`pwsh`），Windows PowerShell 5.1 和 `cmd.exe` 作为受支持的备用；
- `PATH` 中的 `ripgrep`，用于 Runtime 的 `Grep` 工具；
- 由当前 Windows 11 安装提供的 WebView/runtime 组件；
- 仅对创建文件 symlink 的测试需要 Windows 开发者模式或提升权限。常规 CLI 和桌面启动不得要求其中任何一项。

Windows 10、Windows on Arm、签名自动更新、最终 sandbox 支持声明和 computer-use 不在当前支持目标范围内。打包安装仅以上述未签名的 Windows 11 x64 预览形式提供；其自动更新路径经 CI 验证但未签名。

## 可复现性检查

从干净的检出安装并构建：

```powershell
npm ci
npm run build
```

审计所有在 Windows 上被排除的测试声明：

```powershell
npm run windows:inventory
```

运行隔离的 CLI 和真实 Electron 启动 smoke 检查：

```powershell
npm run smoke:windows
```

运行完整仓库测试计划：

```powershell
npm test
```

生成的 [Windows 测试跳过清单](./windows-test-inventory.md) 对每个检测到的 Windows 排除测试声明进行分类。新增或移除一条需要运行 `npm run windows:inventory:write` 重新生成清单并复核其分类。

## 崩溃与耐久性边界

Windows 恢复证据区分应用进程崩溃与操作系统或设备断电。通过真实进程崩溃门禁证明：拥有进程被强制终止后，
已提交状态会收敛。它本身不能证明 Windows 已将每个父目录更新强制刷入易失设备缓存。

| 界面 | 当前 Windows 保证 | 边界 |
|---|---|---|
| SQLite 运行状态 | 数据库使用 WAL 日志记录，`synchronous=FULL`。真实进程 failpoint 测试验证已提交的 runtime、continuation、memory 和受管理 workspace 事实在所有者死亡后仍然存续，而未完成事务不会成为权威。 | 保证基于受支持本地存储上的 SQLite 与 Windows 文件系统契约。Vera 不声称能防范在数据稳定前就确认刷盘完成的存储硬件或驱动。 |
| 产物载荷发布 | 载荷字节写入同目录暂存文件，发布前对文件同步。恢复会协调暂存载荷、元数据、删除和所有者死亡，且不接受未提交的残留。 | Windows 证据覆盖强制进程终止与重启。它没有确立系统突然断电后单独的强制父目录条目。 |
| 标记与受管理 workspace 控制文件 | 写入者在同目录 `link` 或 `rename` 发布前同步临时文件内容。读者校验文件和根身份，并在不支持的替换时失败关闭。 | Node 可以在 Windows 上同步文件，但仓库的目录同步屏障在 Windows 上刻意不可用。 |
| 根与打开数据库替换 | 存活所有者保留排他权力，清理在删除其根之前关闭 store 和 lease。 | Windows 不允许 POSIX 式的测试技术：重命名或 unlink 一个打开的 SQLite 数据库，或替换包含打开文件的目录。那些测试仍归类为平台契约而非可移植恢复门禁。 |

在 POSIX 上，稳定存储路径在发布或移除一个名称后会同步发生变化的父目录。在 Windows 上，Node 不提供
同样可用的目录句柄同步操作，因此 `syncDirectory()` 是空操作。因此 Vera 目前不承诺在 Windows 上为新创建、
重命名、链接或移除的目录条目提供与 POSIX 相当的断电耐久性。受支持的证据更窄：存储协议要求同步的地方
会同步文件内容，SQLite 事务使用完整同步 WAL 语义，进程崩溃恢复会收敛，不支持的存活根替换失败关闭。

## 2026-08-04 捕获的基线

环境：Windows 11 x64、Node.js 22.23.1、npm 11、Git for Windows。

| 界面 | 结果 | 备注 |
|---|---:|---|
| Workspace 构建 | PASS | 所有根 `build:test` workspace 构建完成。 |
| 仓库脚本测试 | 通过 110，失败 0，跳过 1 | 跳过项是真实的 macOS `pgrep` 探测。 |
| 受管理 workspace 基线测试 | 通过 17，失败 0，跳过 5 | 启用 Git for Windows 长路径后通过。 |
| 存储套件 | 通过 514，失败 100，跳过 40 | 失败主要由 SQLite 文件保持打开时的 `EBUSY` 清理主导。 |
| 完整仓库测试计划 | TIMEOUT | `npm test` 未在 10 分钟内退出，且留下了存活的 workspace 测试运行器。 |

存储结果是一个诊断基线，不是被接受的受支持阈值。Windows 不允许对打开的 SQLite 数据库或共享内存文件
做 POSIX 式 unlink。Store、owner 和 lease 必须在其临时根被移除前确定性关闭。

根测试超时与个别测试失败分开跟踪。第 1 阶段必须让 workspace 运行器在 Windows 上输出进度、终止其子进程
并产生有界的汇总。

## 当前能力边界

- CLI `--help`、`--version`、TUI 启动和非交互命令都是原生 Node.js 路径。
- Desktop 开发启动使用 Windows Electron 二进制。
- Runtime Host 端点使用 Windows 命名管道而非 Unix domain socket。
- 自动 shell 选择优先 PowerShell 7，其次 Windows PowerShell，最后 `cmd.exe`。
- Desktop 可以在 Runtime Host 机器上显式选择 GNU Bash `bash.exe`（Git Bash 或遗留的 `System32\bash.exe` WSL 垫片）。Host 在持久化前验证该可执行文件，若配置的路径之后消失则失败关闭；远程 Desktop 客户端不会在自己的机器上解析该路径。
- PTY 执行通过 `node-pty` 使用 ConPTY；进程树终止在需要时使用 `taskkill /T`。
- 受限的受管理配置文件在可用时使用打包的 AppContainer broker，当原生能力或请求的策略不可用时失败关闭。
- 打包的 filesystem-worker 门禁覆盖：客户端取消、Runtime Host 父进程死亡、重复并发启动、ACL 隔离区隔离、
  文件系统别名、受限 TCP 出站网络、宿主命名管道、环境变量、宿主注册表值、父进程 token、后代拒绝或
  AppContainer/Job 继承。它不声称覆盖 UDP/DNS/SMB 强制、本地入站监听器强制、推迟的无 Win32k/window-station 层，
  或直接的 Credential Manager/DPAPI 隔离。
- Computer-use 没有 Windows 后端。
- Windows x64 NSIS 安装包未签名。应用内自动更新路径（electron-updater →
  NSIS 交接 → 重新启动）在 CI 中针对 loopback feed 完成端到端验证；生产
  GitHub feed 配置由单元测试钉死。在 Authenticode 证书落地之前，更新不做签名验证。

在 issue #2142 中声称的支持层级标准完成之前，不要将 Windows 描述为已发布或完全支持。
