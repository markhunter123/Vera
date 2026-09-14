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

# ASF 源码头部策略

Vera（孵化中）将 [ASF 源码头部策略](https://www.apache.org/legal/src-headers.html)应用于其源码发布，并通过自动化审计强制执行。

`scripts/asf-license-headers.mjs` 就是策略本身。本文档解释它；脚本决定它。两者不一致时，以脚本为准，本文档就是 bug。

## 审计断言什么

审计对其指向的树声明两个性质，此外别无其他：

1. **每个条目恰好被分类一次** — 覆盖、附记录原因地排除，或审计失败。
2. **在每个被覆盖的文件中，ASF 许可文本恰好出现一次**，且该次出现是文件顶部的规范渲染。

两者都是产物的性质。两者都不以 `npm run write:asf-headers` 的输出为定义，这种分离是刻意的：把审计定义为"文件以写入器发出的字节开头"只会永远确认它自己的写入器。这样的审计会接受叠在第一个它未能识别的许可块之上的第二个许可块，因为它刚写入的块正位于文件顶部。

```sh
npm run check:asf-headers          # audit; fails on anything unresolved
npm run check:asf-headers -- --report
npm run write:asf-headers          # insert the header where there is none
```

## 检测宽松，接受严格

找到许可文本与接受许可是不同的问题，因此它们使用不同的测试。

- **检测**会先抹平注释标点与换行，再查找文本。它能找到用 `//` 写的头部、JSDoc 块中的头部、用 `#` 写的头部、HTML 注释内的头部、任意缩进的头部、带 `https` 许可 URL 的头部，或重排成一段的头部。
- **接受**是字节精确的：规范渲染，位于文件中除 shebang、HTML doctype 或 Markdown front matter 之外的最前位置。

因此被覆盖的文件处于四种状态之一，且只有第一种是程序可以采取动作的状态：

| 状态 | 含义 | 后续动作 |
| --- | --- | --- |
| `absent` | 任何位置都没有许可文本 | `write` 插入头部 |
| `canonical` | 恰好一次出现，规范的，位于顶部 | 通过 |
| `unrecognized` | 出现一次，但并非顶部的规范渲染 | 审计失败；`write` 拒绝 |
| `duplicated` | 出现不止一次 | 审计失败；`write` 拒绝 |

`write` 只做插入。调和以其他形式写成的既有头部意味着判断他人渲染的意图，这不是机械扫描该做的决定。

## 审计在何处运行

- **每个 pull request**，针对检出目录。这能防止新文件在没有头部的情况下落地。
- **`Prepare ASF source candidate`**，针对解压后的 `apache-vera-<version>-incubating-src.tar.gz`，在向该目录树安装或构建任何东西之前。因此发布关口读取的是投票者下载到的确切字节。

在检出目录中，审计读取源码发布会携带的文件：受跟踪文件加上 Git 不会忽略的未跟踪文件，减去 `export-ignore` 从归档中剪除的内容。因此新文件在暂存之前就被审计，而被忽略的本地临时文件不会进入关口。`.gitattributes` 被直接查询而不是在规则中重述 — 目录上的 `export-ignore` 会剪除整个子树，因此每个祖先也会被查询，因为 `git check-attr` 不继承。

解压后的归档没有索引，因此**磁盘上的每个条目都会被审计，不会按名称跳过任何一个**。源码候选中的 `dist/` 或 `release/` 目录里的文件不是可以绕开审计的东西 — 它未被分类，关口会明确说明。`export-ignore` 本应剪除的路径也一样：发现一个就说明剪除没有发生，因此审计会报告它，而不是用它不可能在那里的理由为其开脱。既非目录也非普通文件的条目会被报告而不是放行。

在检出目录中做减法并不是枚举给自己开脱。它决定检出目录代表哪个产物；归档中不会丢弃任何东西，因为产物已经固定。因此两种模式审计的是同一组文件。

## 被覆盖的文件类型

| 注释语法 | 扩展名 |
| --- | --- |
| `/* … */` | `.cjs`, `.css`, `.js`, `.mjs`, `.mts`, `.rs`, `.swift`, `.ts`, `.tsx` |
| `//` | `.jsonc` |
| `#` | `.ps1`, `.py`, `.sh`, `.toml`, `.yaml`, `.yml`, `Dockerfile`, `network-policy` |
| `<!-- … -->` | `.html`, `.md` |

## 经审阅的排除项

每条规则都是一个带理由的类别。规则**点名其排除的文件，或陈述适用于其匹配对象的任何内容的结构性性质**。光秃秃的目录前缀两者都做不到：它会把理由借给下一个加入该目录的任何东西，这正是本审计存在所要防止的失败。`npm run check:asf-headers -- --report` 会打印每条规则解析后的文件列表。

| 规则 | 为什么不应加头部 |
| --- | --- |
| `asf-release-documents` | `LICENSE`、`NOTICE` 和 `DISCLAIMER-WIP` 本身就是许可与声明。 |
| `third-party-license-texts` | 上游许可与声明的逐字文本。它们必须与上游发布的字节完全一致，执行器准备脚本会验证其摘要。 |
| `third-party-source` | 使用自有许可的第三方工作，包括 Vera 从上游改编的混合来源文件。见下文。 |
| `generated-files` | 机械推导并对一次全新生成器运行做字节比对，因此手写头部会被下一次再生成还原。生成器自带头部。 |
| `verbatim-runtime-payloads` | 捆绑的技能载荷逐字嵌入生成的目录，由内容摘要钉住，并作为指令交付给模型。每个载荷都按名称列出。 |
| `verbatim-github-templates` | GitHub 会把 pull request 模板复制进每个新 pull request 的描述。 |
| `byte-significant-fixtures` | 记录的输入与捕获的历史状态，按字节逐一断言或由严格解析器解析。 |
| `no-comment-syntax` | JSON 和 CSV 没有注释语法；加头部只能以破坏文件的方式损害其解析器。 |
| `binary-files` | 二进制内容无法携带文本头部。 |
| `no-creative-content` | 内容只是名称列表或必需平台键的版本控制元数据与平台清单。Apache RAT 默认排除同类文件。 |

## 第三方与混合来源源码

[ASF 策略](https://www.apache.org/legal/src-headers.html#3party)把文件中没有由版权所有者贡献的部分视为第三方工作。因此，Vera 从上游项目改编的文件并非全部可由 Vera 许可，机械扫描不能对它断言整文件 ASF 头部。重度修改的文件是否应改用组合头部，是 PPMC 逐案决定的。

此类文件在此被排除，其归属归 `LICENSE` 与 `NOTICE` 审计管，不归本关口管。

## 未经审阅的溯源

本关口无法判定溯源 — 那是关于人的事实，而不是路径的性质 — 但它可以拒绝让未经审阅的溯源声明通过。带有 SPDX 标识符、显式版权行或改编声明的被覆盖文件会审计失败，除非它出现在 `reviewedProvenance` 中，并带有一个仍然为其加上 ASF 头部的决定。

标记有意收窄，是通过对整棵树测量后选定的。那三个标记合计命中三个文件。`derived from` 命中七十个，而上游项目名如 `opencode` 命中四十五个，因为 Vera 将其作为 provider 支持；这么嘈杂的网只会得到一串为平息它而加入的路径清单，这正是本规则存在所要避免的结果。

这是网，不是证明。它能抓住声明其来源的文件。它抓不住仅仅暗示来源的行文。

## 协议兼容纪元

`scripts/protocol-epoch-check.mjs` 要求 Runtime Host 协议目录下的任何文件变化都要提升纪元。这个代理指标刻意保守 — 多余的提升只是花掉一个数字，漏掉的提升会把两个不兼容的协议同时发布在同一纪元下 — 但插入许可头部已被证明不会改变协议，为此提升纪元会因一条注释而向每个对端宣告线上协议不兼容。

因此该防护对恰好是对先前内容应用 `applyHeader` 的变更给予豁免，使用与写入头部相同的权威。既加了头部*又*有真实编辑的文件无法通过该比较，仍需要提升纪元。

## 修改策略

新增文件类型意味着把它加入 `coveredExtensions` 或 `coveredNames`，并运行 `npm run write:asf-headers`。

新增排除项意味着添加一条带 `id` 和 `justification` 的规则，让导师无需阅读周边代码即可评估。"审计在它上面失败了"不是理由。如果文件是 Vera 编写的源码，它就该有头部。
