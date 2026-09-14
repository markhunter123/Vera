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

# Vera npm 源码 RC 预检

本 runbook 在 Vera（Incubating）源码发布候选审查期间验证 `vera-agent` npm 便捷制品。源码归档是 ASF 发布制品。npm 包只在源码发布获批之后、从确切批准的提交发布。

这遵循 Apache OpenDAL 孵化期间的做法：其 Node.js 工作流验证发布候选标签而不发布，同一提交上的最终标签在批准后触发 npm 发布。OpenDAL 的 ASF 分发包含签名源码发布，而非单独签名的 npm tarball。

## 预检契约

该工作流：

- 只在 `markhunter123/Vera` 中从带注解的 `v<version>-incubating-rc<rc>` 标签运行；
- 要求该标签解析到 `main` 上被派发的提交；
- 要求源码标签版本与根、桌面端与 CLI 产品版本匹配；以及
- 构建一个干净源码的 npm tarball，并在受支持的 Linux、macOS、Windows 与 Eval 矩阵上验证该制品。

由此产生的工作流制品是源码 RC 的诊断证据。它不是 ASF 发布制品，也不是 npm 发布输入。该工作流没有发布凭据，不能暂存包、发布版本或移动 dist-tag。

## 运行预检

从确切的源码候选标签派发 **Validate ASF npm package from source RC**：

```sh
version="$(node -p 'require("./package.json").version')"
rc=1
source_reference_tag="v${version}-incubating-rc${rc}"
gh workflow run asf-npm-candidate.yml --ref "$source_reference_tag"
```

成功的运行表明该包可以从候选提交在受支持的矩阵上构建并安装。它不验证源码标签签名，也不确定两项必需源码发布投票是否已经通过。这些仍然是源码发布流程的责任。

如果源码候选发生变化，创建新的源码 RC 并再次运行预检。为同一提交重跑预检是安全的，因为它没有注册表副作用。

## 发布边界

在两轮源码发布投票都批准候选之后，产品 Release 工作流在获批提交处创建 `v<version>`。npm Stage 工作流随后从该最终标签构建并验证一个 tarball，通过受保护的 `npm-release` Environment 与 OIDC 把那些确切字节提交到 npm 暂存，并记录暂存身份。人工通过 npm 2FA 批准使包公开；Finalize 验证注册表字节、完整性、签名、来源与 dist-tag。

因此 npm tarball 不需要 ASF 分离 PGP 签名、ASF SHA-512 sidecar、纳入 `dist/dev` 或 `dist/release`，或与投票前构建字节一致。其发布身份来自批准的源码提交与最终产品标签；其发布完整性来自 npm 暂存、Trusted Publishing 来源与 Finalize 执行的注册表验证。

项目当前保留 `vera-agent`，但必须在首次合规发布前记录明确的 mentor 或 ASF Brand 确认。Incubator npm 指南显示 `apache-<project>` 名称，而 Apache OpenDAL 在整个孵化期间发布了无前缀的 `opendal` 包。OpenDAL 的包早于其孵化进入，而 `vera-agent` 不是，因此该先例支持请求保留该名称，但不解决 Vera 的命名决策。

## 参考

- [ASF Incubator 分发指南：npm](https://incubator.apache.org/guides/distribution.html#npm)
- [ASF 发布策略](https://www.apache.org/legal/release-policy.html)
- [OpenDAL 孵化发布指南 v0.44.0](https://github.com/apache/opendal/blob/v0.44.0/website/community/committers/release.md)
- [OpenDAL 孵化 Node.js 工作流 v0.44.0](https://github.com/apache/opendal/blob/v0.44.0/.github/workflows/bindings_nodejs.yml)
- [ASF 归档中的 OpenDAL 0.44.0 源码制品](https://archive.apache.org/dist/incubator/opendal/0.44.0/)
- [OpenDAL 当前 Node.js 发布工作流](https://github.com/apache/opendal/blob/main/.github/workflows/release_nodejs.yml)
