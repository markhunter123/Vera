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

# Vera 源码发布手册

本手册准备正式的 Apache Incubator 源码发布组件。Vera 的首次发布还需要 npm 与 Desktop 便捷产物，但这些产物有各自独立的构建、许可、签名与验收关口。它们必须基于此处产出的、经 IPMC 批准的确切源码发布来构建。

该工作流实现发布机制；它并不确立某个提交在法律上已可发布。启动投票之前，PPMC 与导师必须确认候选的来源与发布文档。

## 候选契约

- 归档：`apache-vera-<version>-incubating-src.tar.gz`
- 归档根目录：`apache-vera-<version>-incubating/`
- 校验和：`<archive>.sha512`
- 分离签名：`<archive>.asc`
- 暂存目录：`<version>-incubating-rc<rc>/`
- 候选标签：`v<version>-incubating-rc<rc>`

RC 编号标识一次暂存尝试，不是归档名称的一部分。如果任何候选字节发生变化，递增 RC 编号并重新启动投票。不要替换已提交投票的目录中的文件。

未签名的工作流交接由其确切的源码提交标识，而非 RC 编号。只有在为 Release Manager 选定的字节创建不可变候选标签与暂存目录时，才分配 RC 身份。

## 前置条件

1. 目标版本已提交到 `main` 上根目录的 `package.json`。
2. 该确切提交的常规 CI 通过。
3. PPMC 与导师已确认溯源、`LICENSE`、`NOTICE` 和 `DISCLAIMER-WIP` 已具备 Incubator 发布投票条件。
4. Release Manager 拥有一把公开的、与 ASF 关联的 RSA PGP 密钥，其实际签名密钥或子密钥至少 2048 位，完整指纹可独立审阅。新密钥应为 4096 位 RSA。
5. podling 的 `KEYS` 文件包含该公钥，并从 Apache 分发区发布，而不仅仅从 GitHub 发布。

## 构建并测试未签名候选

从 `main` 运行 **Prepare ASF source candidate**，提供确切版本。该工作流：

1. 从派发的 Git 提交而非工作树构建归档；
2. 生成并验证 SHA-512；
3. 检查归档身份与必需的法律文档；
4. 将确切归档解压到干净目录；
5. 在该解压目录中安装、审计、构建、类型检查、运行发布检查与测试；以及
6. 上传未签名的工作流产物供 Release Manager 交接。

本地也可以创建等效的未签名归档：

```sh
npm run release:asf:source -- \
  --version <version> \
  --revision <full-commit-sha>

npm run release:asf:verify -- \
  --artifact release/asf/apache-vera-<version>-incubating-src.tar.gz
```

创建操作拒绝覆盖既有输出。重新构建前先移除或移走私有的本地尝试；绝不覆盖已暂存或已投票的候选。不同的 gzip 实现可能把相同的源 tar 载荷编码成不同的压缩字节，因此应使用工作流产物作为待签名候选，而不是替换成本地压缩的归档。

开启投票前，在确切的归档提交处创建候选标签，并通过常规的经审阅 Git 流程发布：

```sh
git tag -s v<version>-incubating-rc<rc> <full-commit-sha>
git verify-tag v<version>-incubating-rc<rc>
git show --no-patch --format=fuller v<version>-incubating-rc<rc>^{commit}
```

推送标签是独立的、需认证的维护者操作。发布前确认其目标与签名；自动化不会推送标签。

## 本地签名

绝不把 Release Manager 的私密 PGP 密钥放进 GitHub Actions 或仓库。将未签名的工作流产物及其 SHA-512 文件下载到 Release Manager 的机器上。在包含已验证候选标签的干净可信检出目录中运行：

```sh
npm run release:asf:sign -- \
  --artifact <candidate-dir>/apache-vera-<version>-incubating-src.tar.gz \
  --key <full-pgp-fingerprint> \
  --revision v<version>-incubating-rc<rc>
```

签名命令首先验证下载的 SHA-512 与归档。随后在 Release Manager 的硬件上从指定修订重建规范的非压缩 Git 归档，与仓库本地、用户和系统的 Git attributes 隔离，并要求该源码载荷在解压后与下载的候选逐字节一致。然后将原始下载的候选以 SHA-512 签名，先把选定的私钥解析为确切完整指纹。比较规范载荷避免了把某平台的 gzip 编码当作源码身份。仅有工作流产生的摘要不是独立的信任检查，不足以用于签名。

从当前 podling `KEYS` 文件的经审阅副本开始，需要时再追加匹配的公钥：

```sh
(gpg --list-sigs <full-pgp-fingerprint> && gpg --armor --export <full-pgp-fingerprint>) >> KEYS
gpg --show-keys --with-fingerprint KEYS
```

发布前审阅合并后的文件。保留每一把曾用于签名 Vera 发布的密钥。

在仅由经审阅 `KEYS` 文件填充的临时 keyring 中验证完整的已签名候选：

```sh
npm run release:asf:verify -- \
  --artifact <candidate-dir>/apache-vera-<version>-incubating-src.tar.gz \
  --keys <path-to-reviewed-KEYS>
```

提供 `--keys` 需要分离签名。验证会拒绝：非 RSA 或不足 2048 位的签名密钥与子密钥、过期或吊销的密钥与签名、SHA-1 或接受集合之外的任何摘要，以及错误或缺失的签名。SHA-256、SHA-384 和 SHA-512 签名会被接受。

## 暂存到 Apache dist/dev

Release Manager 需要分发仓库的 ASF 提交权限。检出 podling 开发区，创建新的不可变 RC 目录，只添加源码归档、SHA-512 文件和分离签名：

```sh
svn checkout https://dist.apache.org/repos/dist/dev/incubator/vera vera-dist-dev
mkdir vera-dist-dev/<version>-incubating-rc<rc>
cp apache-vera-<version>-incubating-src.tar.gz{,.sha512,.asc} \
  vera-dist-dev/<version>-incubating-rc<rc>/
svn add vera-dist-dev/<version>-incubating-rc<rc>
svn commit vera-dist-dev -m "Stage Vera <version> incubating RC<rc>"
```

通过同样的经审阅 ASF 分发流程，在 podling 分发根目录发布或更新 `KEYS`。发送投票邮件前确认已暂存的 HTTPS URL。

## 独立验证

在投出具有约束力的 `+1` 之前，每位投票者都必须通过 HTTPS 把所有已签名源码包与已发布的 `KEYS` 下载到自己的硬件上，验证 ASF 发布策略合规性与所有加密签名，检视归档，并编译/测试解压后的源码。强烈鼓励无约束力的投票者执行同样的检查。投票者应记录提交、SHA-512、签名密钥指纹、平台与所用命令。

## 投票要求

podling 与 Incubator PMC 的评审期通常都应保持至少 72 小时开放。缩短的投票只用于特殊的加急发布；投票邮件必须说明加急原因，且该偏离必须通过 ASF 流程上报。

podling 投票只有在至少三个 PPMC `+1` 票且 `+1` 多于 `-1` 时才通过。该结果汇总到 Incubator 通用邮件列表后，发布还需要至少三个 Incubator PMC `+1` 票，且约束性 `+1` 多于约束性 `-1`。

## Podling 投票模板

发送到 `dev@vera.apache.org`，并留出至少 72 小时。

```text
Subject: [VOTE] Release Vera <version> (incubating) RC<rc>

Hello Vera community,

This is a vote to release Vera <version> (incubating), release candidate <rc>.

The source candidate:
<dist-dev-candidate-url>

The source commit:
<commit-url-and-full-sha>

The KEYS file:
<published-keys-url>

Please review and vote:
[ ] +1 Release this package
[ ]  0 No opinion
[ ] -1 Do not release this package (please provide the reason)

The vote will remain open for at least 72 hours.
```

podling 投票通过后，向 `general@incubator.apache.org` 发送投票，附上 podling 结果链接并呈现相同的不可变候选字节。将上述要求独立应用于这次 Incubator PMC 投票。

## 批准后发布

只有在两项必需投票都通过后，才把经批准的精确文件从开发分发区复制到相应的 Apache 发布分发区，更新下载页面并公告发布。提升过程中不要重新构建或重命名已批准的归档。

现行策略参考：

- https://incubator.apache.org/guides/releasemanagement.html
- https://incubator.apache.org/guides/distribution.html
- https://www.apache.org/legal/release-policy.html
- https://infra.apache.org/release-distribution.html
