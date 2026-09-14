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

# CLI/TUI 便捷分发契约

Vera 的 Apache 发布版是 ASF 分发基础设施上经 IPMC 批准的源码归档。CLI/TUI ZIP 与桌面端安装程序是基于该确切源码身份构建的必需便捷制品。阶段 1发布一个已签名并通过公证（notarized）的 Apple Silicon 制品：

`Vera-<version>-cli-mac-arm64.zip`

该 ZIP 包含一个精确固定的官方 Node runtime，以及由仓库清单与 `package-lock.json` 推导的生产 workspace/npm 依赖闭包。它不使用系统 Node 安装，也不使用单文件/SEA 构建。

## 公开契约

只有这些表面是稳定的：

- `bin/vera`，包括通过解压归档之外的符号链接调用；
- 下面记录的 `RELEASE.json` 字段。

`libexec/**` 是私有的，可能在发布之间变化。没有公开的 `vera-agent` 启动器。TUI 是 `vera` 的默认交互模式，不是独立制品。

`RELEASE.json` 字段：

| 字段 | 含义 |
| --- | --- |
| `schemaVersion` | 元数据 schema 版本，初始为 `1` |
| `product` | 产品名，`Vera` |
| `version` | 根 `package.json` 的产品版本 |
| `sourceCommit` | 每个发布制品共享的确切源码提交 |
| `platform` / `architecture` | 制品目标，`macos` / `arm64` |
| `publicCommands` | 公开命令列表；阶段 1 恰好为 `["vera"]` |
| `node` | 官方 Node 版本、源码 URL、归档名与归档 SHA-256 |
| `npmVersion` | 用于物化生产闭包的确切 npm 版本 |
| `dependencyPatches` | 应用到暂存依赖上的已排序仓库补丁 |
| `productionDependencies` | 已排序的外部 `name@version` 生产闭包 |
| `thirdPartyNoticesSha256` | 把声明绑定到本制品的摘要 |
| `workspacePackages` | 已排序的、清单推导的生产 workspace 闭包 |
| `machOBinaries` | 每个必须被签名并验证的 Mach-O 文件的已排序路径 |
| `signing` | 发布制品为 `developer-id-notarized`；本地检查为 `development` |

CLI 专属的 `THIRD_PARTY_NOTICES.txt` 必须精确枚举 `RELEASE.json` 中记录的外部生产依赖。归档还携带仓库的 `DISCLAIMER-WIP`、`LICENSE`、`NOTICE` 与固定的 Node runtime 许可证。归档校验和只在签名与公证完成后生成。

归档内的每个 Mach-O 文件都被签名，ZIP 被提交给 Apple 的公证服务。ZIP 文件无法携带 stapled 公证票据，因此在另一台 Mac 上的首次 Gatekeeper 评估可能需要网络访问以从 Apple 取回票据。内嵌代码签名与已发布的 SHA-256 仍可用于离线验证；不要把 ZIP 本身描述为 stapled。

## 发布与安装边界

根 `package.json` 是唯一的版本权威。桌面端与 CLI 清单必须在打包前匹配。桌面端、CLI/TUI 与源码任务从同一个提交独立构建；一个 publish 任务收集它们已验证的输出，并创建一个 Draft GitHub Release。

GitHub Release ZIP 是独立的便捷分发来源。其确切字节由受保护的 Finalize 工作流身份签名的 Sigstore 来源 bundle 覆盖。npm 保留其安装器专属的 tarball、OIDC、暂存发布与 2FA 批准流程，但只能在产品 `v<version>` 标签与 GitHub Release 存在之后启动。它检出该标签的确切提交，并推导相同的版本、runtime 闭包、文件策略、声明与源码身份。它不创建标签或 GitHub Release，也不阻塞产品 Draft 的创建。Homebrew 必须消费独立 ZIP。

## 决策台账

| 问题 | 决策 | 由谁强制执行 |
| --- | --- | --- |
| 哪个文件拥有产品版本？ | 根 `package.json`；桌面端与 CLI 清单必须匹配它。 | `product-release-identity.mjs` 与发布契约测试 |
| 哪个事件定义 Apache 发布版？ | 批准的源码归档与投票结果。`v<version>` 标签与 Draft GitHub Release 标识基于该源码提交构建的便捷分发。 | ASF 源码发布工作流，加上 `release.yml` 身份与精确标签检查 |
| 哪些便捷制品是必需的？ | macOS 与 Windows 桌面端安装程序及更新资产，加上 macOS arm64 独立 CLI ZIP。 | `product-release-identity.mjs` 的确切清单，由每个制品任务与 publish 任务强制执行 |
| npm 是另一个发布权威吗？ | 不是。它是一个可选安装渠道，其 Stage ref、源码、工作流身份与来源都解析到现有产品标签提交。 | 标签派发的 OIDC 暂存与只读定稿；没有 npm 专属标签或 GitHub Release |
| 独立 CLI 是否定义另一套包策略？ | 不是。它从当前清单与共享策略推导 workspace 闭包、第三方修剪、声明与 Eval runtime 资产。 | 打包与制品契约测试 |
| 哪些命令是公开的？ | 只有 `vera`；TUI 是其默认模式。 | CLI 清单、帮助测试、包装器与发布元数据 |
