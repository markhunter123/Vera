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

# 产品发布检查清单

ASF 分发基础设施上经 IPMC 批准的源码归档即为 Apache 发布版。`Release` 工作流是 Vera 便捷制品（convenience artifact）的分发入口。桌面端与 CLI/TUI 均由经 IPMC 批准的精确 ASF 源码候选提交构建。它们共享该源码提交、根产品版本、一个便捷标签（tag）、一个 GitHub Release、一次 Draft 决策以及一个分发门槛。工作流中的任何必需制品任务成功之前，不会创建任何 Draft。

第一阶段要求：

- 已签名并通过公证（notarized）的 Apple Silicon macOS 桌面端制品；
- 未签名的 Windows x64 桌面端安装程序与 ZIP；
- 已签名、已公证、可重定位（relocatable）的 Apple Silicon CLI/TUI ZIP；
- 每个制品达到最终形态后生成的校验和。

便捷桌面端制品不得包含 Git runtime、bundle 的 Git 清单（manifest）或 Git/Dugite 再分发声明。在准入/T1 之前接入经单独审查、符合 ASF 规范的已验证 runtime 之前，托管 workspace 执行仍不可用。

首次产品发布还要求精确的 `vera-agent@<version>` npm 包。产品标签与 Draft 必须存在于 npm 暂存（staging）之前，但 Draft 必须保持未发布状态，直到 npm 公开、Finalize 已验证它、并且桌面端验收已演练过远程 Runtime Host 设置。

## 一次性仓库设置

创建一个受保护的 GitHub Environment，命名为 `release`，要求相应的审阅者，并配置：

- `CSC_LINK`：base64 编码的 Developer ID Application `.p12`；
- `CSC_KEY_PASSWORD`：该 `.p12` 的密码；
- `APPLE_API_KEY`：App Store Connect API `.p8` 密钥的原始内容；
- `APPLE_API_KEY_ID`：App Store Connect API 密钥 ID；
- `APPLE_API_ISSUER`：App Store Connect API issuer ID。

已检入的发布配置将 Vera 的 Apple Team ID 固定为 `FABM2QUA8Q`。更换凭据前，请确认每个替换的 `CSC_LINK` 都属于该团队；更改固定的 Team ID 需要其自身经过评审的产品发布变更。

Windows 在添加 Authenticode 策略与证书之前保持未签名。发布机密（secrets）绝不能暴露给 fork 或普通 pull-request 任务。

在首次产品发布之前，请确认已检入的 `.asf.yaml` 已与线上仓库对齐：

- `Immutable release tags` 规则集阻止对 `v*` 标签的更新、强制推送与删除；
- `release` 与 `npm-release` Environment 只接受其声明的标签模式，`product-release` 只接受 `main`，且每个都要求一个不同于触发用户的审阅者。

这些控制关闭了 check-to-upload 与 check-to-stage 的窗口。Finalize 使用 GitHub Actions OIDC 而非存储的签名密钥来证明每个便捷制品。在制品与验收尚未完成期间保持 Release 为 Draft；桌面端拒绝安装那些确切字节与预期文件名不受该受保护工作流身份覆盖的下载更新。

## 创建完整的 Draft

1. 确认 podling 与 Incubator PMC 投票均已为一个不可变的源码候选通过。记录两个结果 URL，并独立验证其带签名的注解式 `v<version>-incubating-rc<rc>` 标签。
2. 确认该标签解析到 `main` 上的一个提交，该确切提交的必需 CI 为绿色，且根目录 `package.json` 包含一个从未发布过的产品版本。
3. 确认 `vera-desktop/package.json` 与 `vera-cli/package.json` 与根版本完全一致，且 CLI 清单只暴露 `vera` 命令。
4. 从确切批准的候选标签派发 `Release`，并传入相同标签作为 `source_reference_tag`。重跑必须使用同一标签；绝不改选当前的 `main`。
5. 确认 `release-identity`、两个桌面端矩阵条目、`cli-macos-arm64` 与 `publish` 均通过。任何被跳过或失败的必需任务都必须阻止 Draft 的创建。
6. 确认一个名为 `v<version>` 的 Draft 指向批准的源 SHA，在其说明中指明 ASF 源码引用，恰好在产品版本是预发布（prerelease）时被标记为 GitHub 预发布，在仍是 Draft 期间不标记为 Latest，并且只包含 `node scripts/product-release-artifacts.mjs list` 报告的清单。该清单涵盖两个桌面端平台与更新元数据、独立 CLI/TUI 及其必需校验和。
7. 检查 CLI ZIP。它必须包含 `bin/vera`、`RELEASE.json`、`DISCLAIMER-WIP`、`LICENSE`、`NOTICE`、`THIRD_PARTY_NOTICES.txt`、固定的 Node 许可证，并且不得包含 `bin/vera-agent`。
8. 确认 `RELEASE.json` 记录了 Draft 的产品版本与源 SHA、Apple Team ID `FABM2QUA8Q`、官方 Node URL/归档/摘要、npm 版本、workspace 与生产依赖闭包、依赖补丁、Mach-O 清单，以及 `developer-id-notarized` 签名状态。其最终 Node 授权（entitlements）必须保留所需的 hardened-runtime 能力并省略 `com.apple.security.get-task-allow`，符合 Apple 的[公证指南](https://developer.apple.com/documentation/security/resolving-common-notarization-issues)要求。
9. 检查两个桌面端资源树，确认 `git/`、`bundled-git.json`、`licenses/git/` 与 `licenses/dugite/` 均不存在。

如果 publish 任务创建了产品标签或 Draft，但在所有制品上传完成前失败，请从同一批准的 ASF 源码候选标签并以相同的 `source_reference_tag` 输入重跑 `Release`。现有 Draft 制品必须与新验证的字节完全匹配；重试会保留匹配的制品并只上传缺失的。如果某个制品冲突或出乎意料，请在 Release 仍是 Draft 时手动检查并移除它，然后重跑。如果只有标签存在，重试会创建缺失的 Draft。

## 发布并验证 npm 频道

针对确切的产品标签与 Draft，遵循 [npm 发布 runbook](../docs/cli-npm-release.md)：

1. 记录构建 Draft 制品的那次成功的 **Release** 工作流运行 ID 与尝试。从 `v<version>` 运行 **Stage CLI npm release**，并记录其成功的运行 ID 与尝试。
2. 检查暂存的 tarball 与来源（provenance），然后用 npm 2FA 批准该确切暂存。
3. 从 `main` 运行 **Finalize product release**。其第一个任务验证公开包的字节、来源、签名与发布 dist-tag。
4. 在每个发布平台上安装确切公开版本，并完成 npm 验收步骤。

整个过程中保持 GitHub Release 为 Draft。最后一个工作流任务在 `product-release` Environment 处等待。只有在每个 npm 与跨机器验收检查都通过后才批准它。它会对照确切成功的 Release 运行的不可变发布记录验证线上 Draft 的摘要，创建 Sigstore 来源与一个离线 `Vera-<version>-attestation.sigstore.json` bundle，然后在同一 GitHub 操作中发布便捷 Release 并使稳定版成为 Latest；预发布保持非 Latest。请勿手动发布或更改 Latest 标记。失败的或被拒绝的 npm 候选需要新的产品版本；绝不通过发布 Draft 来绕过 npm 状态。

## 在另一台 Apple Silicon Mac 上验收

通过浏览器从 Draft 下载 DMG、CLI ZIP 及其校验和文件。不要直接从工作流 runner 移动制品；浏览器路径提供了真正的隔离（quarantine）边界。

1. 对 DMG 与 CLI ZIP 运行 `shasum -a 256 -c`。
2. 从 Finder 安装并启动桌面端 app。确认没有"未识别开发者"或"app 已损坏"警告。
3. 运行 `spctl --assess --type execute --verbose=4 /Applications/Vera.app`，确认 Developer ID 来源。
4. 在不清除隔离属性的情况下解压 CLI ZIP。运行 `bin/vera --version` 与 `bin/vera --help`。首次 Gatekeeper 评估期间请保持 Mac 在线：经过公证的 ZIP 无法携带 stapled ticket，因此 macOS 可能会从 Apple 检索它。
5. 创建一个外部链接，例如 `ln -s "$PWD/bin/vera" /tmp/vera-release-acceptance`，并确认被链接的命令报告相同的版本与帮助输出。
6. 不带参数启动 `bin/vera`，确认 TUI 能渲染、能接受输入并能干净退出。
7. 对打包制品演练一条非交互式 `bin/vera run`、一次确定性 `bin/vera eval run` 以及一条流式工具调用路径。
8. 配置一个桌面端模型连接，发送一条 prompt，并执行一个代表性文件工具任务。确认文档中描述的 Computer Use 限制仍然准确。
9. 从打包的桌面端 app 添加一个干净的远程 Runtime Host。确认设置安装了精确的公开 `vera-agent@<version>` 包，且远程会话完成一个模型回合。

## 在 Windows x64 机器上验收

从同一个 Draft 通过浏览器下载安装程序、Windows 桌面端 ZIP 与两个校验和文件。

1. 在 PowerShell 中验证两个 SHA-256 校验和。
2. 解压 ZIP 并启动一次其中的 Vera 可执行文件，确认便携制品可以启动。
3. 运行安装程序，确认预期的"未知发布者"SmartScreen 流程。
4. 从开始菜单启动 Vera，配置模型连接，发送一条 prompt，并运行一个代表性文件工具任务。
5. 运行一个终端任务，确认打包的 `node-pty` 行为。
6. 确认文档中描述的 Computer Use 限制仍然准确。
7. 从打包的桌面端 app 添加一个干净的远程 Runtime Host。确认设置安装了精确的公开 `vera-agent@<version>` 包，且远程会话完成一个模型回合。

在批准 `product-release` Environment 之前，立即重新验证批准的 ASF 候选标签与便捷 `v<version>` 标签仍解析到同一记录的提交。只有在 npm 验证与两个独立机器的验收都通过后才批准。如果任何必需制品、npm 步骤或验收步骤失败，请保持 Draft 不发布，修复问题，递增根产品版本，并再次运行完整工作流。绝不替换已有的发布身份。

在 Finalize 发布便捷 Release 之后，下载其证明（attestation）bundle，并独立验证每个安装程序或归档：

```sh
gh attestation verify path/to/Vera-<version>-mac-arm64.zip \
  --bundle path/to/Vera-<version>-attestation.sigstore.json \
  --repo markhunter123/Vera \
  --signer-workflow markhunter123/Vera/.github/workflows/release-cli-finalize.yml
```

桌面端在将下载的更新暴露给安装之前，会执行相同的信任决策。
