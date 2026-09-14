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

# 代码来源审计

**历史扫描基线：** `1518442865763d603571f5d77c13ffc3b0c96125`（2026-08-11）
**证据重建：** 2026-08-12
**报告状态：** 已恢复扫描结果的报告已完成；引导工具确认仍待处理

## 结论

恢复的历史扫描未出现 GPL、AGPL、商业或未知许可证候选。一个候选是 source-available（第 23 行，`MIT + Commons Clause`）；它被单独检查，Vera 未从中获取任何素材。在 417 个有 SCANOSS 结果的文件中，392 个匹配 Vera 仓库，25 个匹配其他项目。人工审查将 25 个外部候选中的 22 个归类为常见或结构上必需的短代码，3 个归类为真实第三方来源但扫描器归属错误或不完整：

- 生成的 Astryx 主题和 ejected 的 Astryx `ChatReasoning` 组件是 MIT 许可的 Meta 素材；
- Vera 的模型协议类型改编自 Apache-2.0 的 AI SDK 包 `@ai-sdk/provider-utils` 和 `@ai-sdk/provider`，而非扫描器选中的 `talkio` 包。

本次审计在顶层 `LICENSE` 中新增了 Astryx 和 AI SDK 改编条目。`NOTICE` 不变：固定的 Astryx 和 AI SDK 源码不含上游 `NOTICE`，其许可证声明已承载在 `LICENSE` 或源文件中。22 个偶发匹配不新增第三方素材或署名义务。

这是有界证据，而非每一行都是原创的证明。结果取决于固定的源码快照、SCANOSS 知识库、扫描器阈值、支持的文件类型和人工分类。

## 范围与工具

基线包含 2,545 个受跟踪文件。历史调查使用了：

| 工具 | 版本 | 范围 | 数据行为 | 保留的结果 |
|---|---:|---|---|---|
| ScanCode Toolkit | 32.5.0 | 2,542 个受跟踪文件；本地许可证、版权和包分析 | 仅本地 | 原始结果已过期；同期的计数和结论保留于此 |
| SCANOSS JS CLI | 0.40.2 | winnowing 扫描器支持的 2,231 个文件 | 公共 API 收到带混淆文件标识符的 winnowing 指纹；未收到源文件或仓库相对路径 | 2,231 个文件的 JSON 和 WFP 在本地恢复，用于重建下表 |
| FOSSA CLI | 3.17.16（`d693e0d6f44d`） | 静态 npm 依赖分析 | 本地静态模式；未进行 FOSSA 项目或云端片段扫描 | 一个 npm 项目成功，无分析警告 |

SCANOSS 响应标识服务器 `5.4.25` 和知识库 `26.07`（月度）与 `26.08.10`（每日）。Markdown、图片和其他不受支持的格式未收到 SCANOSS 指纹。它们已在 [其他来源证据](#other-provenance-evidence) 下单独处理。

恢复的 JSON 和 WFP 是工作文件，未予保留；它们不在生成此报告的机器上，丢失前也未记录其哈希或字节大小。因此，此表无法对照其来源产物进行逐字节验证。可独立复查的是每条结论：每一行都指明上游候选，而驱动 `LICENSE` 或 `NOTICE` 决策的行带有自己的复现路径——参见第 17 行的 [模型协议改编](#model-protocol-adaptation) 和第 23 行引用的 git 修订。未来的扫描应将 JSON 和 WFP 写入保留位置，并在任何结论依赖它们之前，在报告中记录其 SHA-256 和大小。

重建本报告期间未执行任何新的指纹或源文件上传。

### 复现

原始 shell 记录未予保留。以下命令重建固定快照和恢复产物所代表的扫描器配置；由于知识库会变化，新的 API 响应可能不同：

```sh
AUDIT_SNAPSHOT="$(mktemp -d)"
git archive 1518442865763d603571f5d77c13ffc3b0c96125 | tar -x -C "$AUDIT_SNAPSHOT"
npx --yes --package scanoss@0.40.2 scanoss-js wfp --obfuscate -o scan.wfp "$AUDIT_SNAPSHOT"
npx --yes --package scanoss@0.40.2 scanoss-js scan --wfp --obfuscate -o result.json scan.wfp
```

最后一条命令向 CLI 的公共默认端点发送指纹。运行前需获得项目批准。若只想复现本地指纹集，在 `wfp` 命令之后停止即可。由于每次混淆运行可能分配不同的标识符，请按源内容哈希而非混淆文件名比较结果。

FOSSA 运行限于静态分析。它成功检测到 npm 项目，但未执行片段来源分析，因此既不佐证也不取代 SCANOSS 结果。

## SCANOSS 结果重建

恢复的结果有 2,231 个键：

- 1,814 个无匹配；
- 367 个匹配 `vera-agent/vera-agent`；
- 25 个匹配 `jackwener/vera-agent`，一个 Vera 分支；
- 25 个匹配 Vera 之外的项目。

WFP 记录每个扫描文件的 MD5 内容哈希和一个混淆文件名。对固定的 Git 快照取哈希，将所有 2,231 个标识符一一映射回恰好一个仓库路径；没有键无法映射。下表记录扫描器的最佳候选。“Common snippet”意为匹配文本是常规的 API 形态、类型声明、测试脚手架或构建样板，且该候选不能解释本地文件的来源。百分比是扫描器报告的覆盖率，而非作者概率。

若干行注明匹配文件在当前 `main` 中不存在。这是补充事实，而非处置结论：仓库历史也是公开的，因此每一行按匹配文本本身分类，而非按文件是否在发布快照中存续。候选许可证字段来自扫描器，第 23 行表明它们可能出错；任何影响 `LICENSE` 或 `NOTICE` 结论的许可证候选都已对照上游许可证文件复核。

| # | Vera 文件与行 | SCANOSS 候选 | 匹配 | 分类与处置 |
|---:|---|---|---:|---|
| 1 | `vera-desktop/src/main/__tests__/renderer-core-barrel-node-boundary.test.ts:30-52` | [`muratgur/ordinus`](https://github.com/muratgur/ordinus) v0.1.0, `app/src/main/runtime/cli/process.ts:6-28` (MIT) | 33% | 常见的子进程 Promise 脚手架；无独特共享实现。无署名义务。文件在当前的 `main` 中不存在。 |
| 2 | `vera-desktop/e2e/new-task-reload.spec.ts:11-18` | [`clickety-clacks/clawline`](https://github.com/clickety-clacks/clawline) `dictation-working-2026-05-12`, `playwright/tests/phase3-stream-management.spec.ts:348-355` (BSD-3-Clause) | 36% | 常见的 Playwright 点击/填写/重载/断言序列。无署名义务。 |
| 3 | `vera-desktop/src/main/os-permission-policy.ts:6-11` | [`jasonzh0/CineScreen`](https://github.com/jasonzh0/CineScreen) v1.3.4, `src/platform/mac/permissions.ts:43-48` (MIT) | 7% | Electron 权限字面量的必要映射。无独特表达。无署名义务。 |
| 4 | `vera-desktop/src/main/session-model-input.ts:10-17` | [`enisz/bitbutler`](https://github.com/enisz/bitbutler) v1.2.0, `packages/electron/src/ipc/server.ts:204-211` (MIT) | 35% | 常见的对象收窄和必填字符串校验。无署名义务。 |
| 5 | `vera-desktop/src/renderer/astryx-theme/vera.js:14-195` | [`@astryxdesign/theme-neutral`](https://www.npmjs.com/package/@astryxdesign/theme-neutral/v/0.1.0-canary.7847c5f) 0.1.0-canary.7847c5f, `dist/neutral.js:11-192` (MIT) | 92% | **真实第三方来源。** 由固定的 Astryx CLI 从 `veraTheme.ts` 生成，该文件扩展自 `theme-neutral`。已由 `LICENSE` 中新增的 Astryx 条目覆盖；生成的头部注释予以保留。 |
| 6 | `vera-desktop/src/renderer/astryx-theme-mode.ts:33-38` | [`kmcom-nuxt-layers`](https://www.npmjs.com/package/kmcom-nuxt-layers/v/1.6.11) 1.6.11, `layers/shader/app/composables/useCSSColourUniform.ts:33-38` (ISC) | 13% | 常见的 `MutationObserver` 设置与清理。无署名义务。 |
| 7 | `vera-desktop/src/renderer/use-system-ui-locale.ts:15-20` | [`@shak-hooks/cli`](https://www.npmjs.com/package/@shak-hooks/cli/v/1.0.0) 1.0.0, `templates/react/usePreferredLanguage.ts:16-21` (license not returned) | 25% | 常见的浏览器语言/media-query 钩子片段。该候选不能证明抄袭；无署名义务。 |
| 8 | `vera-cli/src/session-driver-policy.ts:16-23` | [`pi-telegram-plus`](https://www.npmjs.com/package/pi-telegram-plus/v/0.0.1) 0.0.1, `lib/commands/session.ts:27-34` (MIT) | 10% | 常规的引号剥离和主目录展开。无署名义务。 |
| 9 | `vera-computer-use/src/abortable-delay.ts:17-30` | [`@hashline/sdk`](https://www.npmjs.com/package/@hashline/sdk/v/0.1.0) 0.1.0, `src/retry.ts:61-74` (Apache-2.0) | 43% | 常规的可中止超时 Promise。无独特共享表达。无署名义务。 |
| 10 | `vera-computer-use/src/stdio-json-rpc.ts:23-29` | [`stefanhoelzl/codehydra`](https://github.com/stefanhoelzl/codehydra) `code-server-windows-v4.107.1`, `extensions/markdown-review-editor/src/extension/opencode-handler.ts:44-50` (MIT) | 8% | 常规的 `AbortSignal` Promise 包装。无署名义务。 |
| 11 | `vera-core/src/mcp.ts:78-86` | [`@combycode/llm-sdk`](https://www.npmjs.com/package/@combycode/llm-sdk/v/1.0.0) 1.0.0, `dist/plugins/mcp/types.d.ts:29-37` (MIT) | 7% | 由 MCP 内容种类决定的协议形态判别联合。对扫描器候选无署名义务。 |
| 12 | `vera-runtime/scripts/build-filesystem-worker.mjs:4-12` | [`zhongshi2x8/dust2cc`](https://github.com/zhongshi2x8/dust2cc) v1.1.1, `scripts/build-page-script.mjs:4-12` (MIT) | 42% | 标准的 `esbuild` 入口/输出设置。无独特共享实现。无署名义务。 |
| 13 | `vera-mcp/src/__tests__/tool-output-validation.test.ts:4-28` | [`modelcontextprotocol/conformance`](https://github.com/modelcontextprotocol/conformance) `32523cc`, `examples/servers/typescript/everything-server.ts:33-57` (MIT/Apache-2.0) | 51% | 使用标准 `inputSchema`/`outputSchema` 字段的 MCP schema 夹具。本地断言和用途不同。未识别出复制的夹具。 |
| 14 | `vera-core/src/user-question.ts:7-19` | [`baochipham942-eng/code-agent`](https://github.com/baochipham942-eng/code-agent) v0.2.4, `src/shared/types.ts:489-501` (MIT) | 50% | 关于问题、ID 和答案的短结构类型。无独特共享表达。无署名义务。 |
| 15 | `vera-eval/src/__tests__/fixtures/writer-worker.ts:3-22` | [`agent-awareness`](https://www.npmjs.com/package/agent-awareness/v/0.4.5) 0.4.5, `src/commands/codex-hooks.ts:10-29` (MIT) | 86% | 由标准文件标记、轮询循环和退出状态组成的小型并发测试 worker。候选用途和标识符不同。无署名义务。文件在当前的 `main` 中不存在。 |
| 16 | `vera-runtime/src/http-response.ts:9-14` | [`different-ai/openwork`](https://github.com/different-ai/openwork) `alpha-macos-v0.14.1-alpha.982-1aeb1e4`, `apps/server/src/server.ts:869-874` (MIT) | 35% | 删除编码/长度头后重建 Fetch API 的必要操作。无独特表达。无署名义务。 |
| 17 | `vera-runtime/src/model-protocol.ts:89-106,123-142,211-227,275-290` | [`talkio`](https://www.npmjs.com/package/talkio/v/1.0.0-alpha.1) 1.0.0-alpha.1, `src/types/common.ts:16-33,23-42,72-88,104-119` (Apache-2.0) | 14% | **真实第三方来源，候选有误。** 来源是 Apache-2.0 的 AI SDK，而非 `talkio`；参见 [模型协议改编](#model-protocol-adaptation)。两个 AI SDK 包现在都已列入 `LICENSE`，该文件带有 Apache-2.0 §4(b) 修改声明。 |
| 18 | `vera-storage/src/__tests__/package-import.test.ts:5-14` | [`openbroker`](https://www.npmjs.com/package/openbroker/v/1.9.5) 1.9.5, `scripts/setup/package-catalog.test.ts:4-13` (MIT) | 64% | 常规的 `spawnSync` 导入隔离测试。无独特共享表达。无署名义务。文件在当前的 `main` 中不存在。 |
| 19 | `vera-ui/src/__tests__/input-history.test.ts:14-46` | [`erichgschmidt/colorsmash`](https://github.com/erichgschmidt/colorsmash) `v2-preview-6559730`, `ColorSmash-v2/src/core/prefs.test.ts:7-39` (MIT) | 24% | 标准 Web Storage 接口的最小实现。无独特共享表达。无署名义务。文件在当前的 `main` 中不存在。 |
| 20 | `vera-ui/src/astryx-chat-reasoning.tsx:37-73` | [`@astryxdesign/lab`](https://www.npmjs.com/package/@astryxdesign/lab/v/0.1.2-canary.3f9afb0) 0.1.2-canary.3f9afb0, `src/ChatReasoning/ChatReasoning.tsx:181-217` (MIT) | 24% | **真实第三方来源。** 完整文件已标识 ejected 的 Astryx v0.1.9 组件、固定提交、Meta 版权、MIT SPDX 标识符和本地修改。已由 `LICENSE` 中新增的 Astryx 条目覆盖。 |
| 21 | `vera-ui/src/inline-rename-input.tsx:9-21` | [`695714420/ClaudeCodeIDE`](https://github.com/695714420/ClaudeCodeIDE) 1.3.0, `src/renderer/components/FileExplorer.tsx:481-493` (license not returned) | 25% | 短的 React prop 声明加 focus/select 效果。该候选不能证明抄袭；无署名义务。 |
| 22 | `scripts/cu-physical-input-age.swift:8-16` | [`jianzhoujz/input-indicator`](https://github.com/jianzhoujz/input-indicator) v1.1.0, `Sources/DoubaoInputIndicator.swift:352-360` (MIT) | 42% | API 所需的公共 CoreGraphics 输入事件用例的枚举。无独特表达。文件在当前的 `main` 中不存在。 |
| 23 | `vera-ui/src/utils.ts:all` | [`roseratugo/okarin`](https://github.com/roseratugo/okarin) v0.3.13, `vera-desktop/src/lib/utils.ts:all` (`MIT + Commons Clause`; the scanner reported `MIT/Mackerras acknowledgement`) | 100% | **逐字节相同，但独立达成。** Vera 的文件是一个五行 `clsx` 包装器，其来源记录在本仓库中：`3bedf3341` 以 shadcn 的 `cn` 辅助函数（带 `twMerge`）创建它，`51f04793c`（#1853）在 Astryx 迁移移除 Tailwind 时删除 `twMerge`，形成当前形态。未使用任何上游素材，因此无需署名，Commons Clause 的限制也触及不到 Vera 的任何内容。 |
| 24 | `scripts/apply-dependency-patches.mjs:17-22` | [`walkersutton/cyclemetry`](https://github.com/walkersutton/cyclemetry) v0.2.0, `scripts/release.mjs:4-9` (MIT) | 12% | 标准 ESM `fileURLToPath` 仓库根目录计算。无署名义务。 |
| 25 | `scripts/check-astryx-alignment.test.mjs:5-10` | [`naimkatiman/continuous-improvement`](https://github.com/naimkatiman/continuous-improvement) v3.9.1, `test/backfill.test.mjs:10-15` (MIT) | 25% | 标准 Node 测试导入和 `new URL('..', import.meta.url)` 根目录计算。无署名义务。文件在当前的 `main` 中不存在。 |

## 模型协议改编

第 17 行直接对照上游源码而非扫描器候选重新检查。结论是 `vera-runtime/src/model-protocol.ts` 改编了 AI SDK 素材，且本报告第一版夸大了文件自身披露的内容：该文件的头部仅声称其形态“结构等价”且“Vera 所有”，既未指明来源版本，也未指明改编。

改编的成立不仅基于形态等价：

- `ProviderReference` 的文档注释近乎逐字复现上游 `SharedV4ProviderReference` 的注释，包括对 `type?: never` 约束的解释及其两个示例，仅类型名称改变。
- `JSONValue`、`JSONObject` 和 `JSONArray` 与上游完全一致，包括联合顺序和 `| undefined` 索引签名。
- 字段顺序逐成员匹配上游，包括一处上游不一致：`FilePart` 的顺序是 `data, filename, mediaType`，而工具结果 `file` 变体的顺序是 `data, mediaType, filename`。两种顺序都被复现。
- 联合成员顺序匹配，包括任意序列，如 `CustomPart` 在 `AssistantContent` 中排第二。
- 上游对 `interface` 与 `type` 的选择逐声明复现。`ToolApprovalRequest` 和 `ToolApprovalResponse` 是 Vera 文件中仅有的声明为 `type` 的内容部分形态，与上游一致。

Vera 的修改包括：移除已弃用的 `file-*` 和 `image-*` 工具结果内容变体；将内联的工具结果内容联合提取为 `ToolResultContentPart`；内联共享的 provider 别名；将角色消息形态声明为接口。该文件 418 行中约 170 行——工具定义、用法、结束原因、失败、请求元数据和流契约——为 Vera 撰写，无上游对应物。

素材横跨两个包。`JSONValue` 以及 `SharedV4` provider 选项、provider 引用和文件数据形态来自 `@ai-sdk/provider`，而非 `@ai-sdk/provider-utils`。本报告第一版只提到 `provider-utils`；`LICENSE` 现在两者都列出。

`LICENSE` 中固定的版本是改编完成时安装的版本（`3249f2a0ec2b389efcd935078c6c835c31195e88`，#1381 切片 1，2026-07-23）：`@ai-sdk/provider-utils@5.0.11` 和 `@ai-sdk/provider@4.0.3`。审计基线快照解析为 `5.0.25` 和 `4.0.7`；每个改编声明在这些版本范围内逐字节一致，因此两个固定版本标识同一来源素材。复现方式：

```sh
npm pack @ai-sdk/provider-utils@5.0.11 @ai-sdk/provider@4.0.3
```

并将 `package/src/types/`、`package/src/json-value/` 和 `package/src/shared/v4/` 与模块对照。

该文件现在带有此来源链所要求的 Apache-2.0 §4(b) 修改声明。仅将组件加入 `LICENSE` 并不满足该义务。

## LICENSE 与 NOTICE 审查

顶层 `LICENSE` 现在为 Vera 中直接包含或改编的源码素材负责：

- Apache-2.0 的 [`@ai-sdk/provider-utils@5.0.11`](https://www.npmjs.com/package/@ai-sdk/provider-utils/v/5.0.11) 和 [`@ai-sdk/provider@4.0.3`](https://www.npmjs.com/package/@ai-sdk/provider/v/4.0.3)，`vera-runtime/src/model-protocol.ts` 从其中改编了 provider 边界形态；
- MIT 的 Astryx，位于 `c9fe4379e9959b9ba5eeff56def34c752223450e`（ejected 的 `ChatReasoning` 源码）和 `110987b4505dc44119b94bed53d92b9840088a61`（theme-neutral v0.4.0 及其生成的主题素材）；
- MIT 的 `trycua/cua`，位于 `8c921b2b3bf13494724ead4f0a814d80c56a7e8b`，已由拉取请求 #2676 记录。

桌面二进制分发还在 `vera-desktop/resources/licenses/npm/THIRD_PARTY_NOTICES.txt` 携带生成的 npm 生产通知，构建会逐字节校验该产物。

本次审计还修正了通知生成器的版本固定 Apache 覆盖。它此前读取整个顶层 `LICENSE`；一旦该文件获得第三方附录，那些不相关的附录就被复制进 `@ai-sdk/provider-utils` 包段落，受检产物变得陈旧。覆盖现在只提取标准的 Apache-2.0 部分，并带一个聚焦的回归测试。

无需新增 `NOTICE`。固定的 Astryx 和 `trycua/cua` 修订没有上游 `NOTICE`；两个 AI SDK 包都没有上游 `NOTICE`；已保留在 `LICENSE` 或源码中的 MIT 版权声明不应重复进 `NOTICE`。这遵循 ASF 指导，使 `NOTICE` 只包含法律要求的内容，并让 `LICENSE`/`NOTICE` 只反映随包分发的位。

## 其他来源证据

上表只覆盖 winnowing 扫描器会打指纹的内容，即以受支持格式存在的源码。扫描之外的其他来源素材和同作者转移记录在此记载。这些记录区分第三方署名义务与贡献者确认的 ASF 贡献，而非把每条跨仓库来源链都当作第三方代码。

### 改编的 opencode 源码

`vera-runtime/src/tool-output.ts` 和 `vera-runtime/src/edit-replace.ts` 都在头注释中声明改编自 opencode。两项声明都准确，且改编是实质性的：

- `truncateToolOutput` 逐行沿用 `truncate.output()`，共享 `2000` 行和 `50 KiB` 预算、`direction?: 'head' | 'tail'` 选项、本地名 `out`、`bytes`、`hitBytes`、`size`、`preview`、`removed` 和 `unit`，以及保留头部时用 `(i > 0 ? 1 : 0)`、保留尾部时用 `(out.length > 0 ? 1 : 0)` 的不对称换行计数。Vera 增加了字节安全的单行切片、尾随换行处理和恢复提示，并移除了上游的溢出文件机制。
- `edit-replace.ts` 在表达式层面逐字复用转义归一化替换器：正则表达式 `/\\(n|t|r|'|"|`|\\|\n|\$)/g` 逐字符相同，其九个分支以相同顺序出现，从 `switch` 改写为 `if` 链。行修剪和空白归一化的匹配器沿用相同的上游结构。

上游是 MIT，Copyright (c) 2025 opencode。仓库现在解析为 `anomalyco/opencode`；比较使用提交 `fc80874`。由于 opencode 不是 npm 依赖，`scripts/generate-third-party-notices.mjs` 无法触达它：该生成器只遍历 `@vera/desktop` 和 `vera-agent` 的 npm 生产依赖树。因此“opencode”不出现在 `LICENSE`、`NOTICE`、`vera-cli/THIRD_PARTY_NOTICES.txt` 或桌面通知中的任何一处，而两个文件都随 `@vera/runtime` 发布。MIT 要求版权和许可声明随素材传递，因此这是一项未决的署名义务。

### models.dev 数据快照

`vera-core/src/model-metadata.generated.ts` 和 `vera-runtime/src/telemetry/model-pricing.generated.ts` 是检入并随包发布的 `https://models.dev/api.json` 衍生数据，合计约 27,800 行。上游 `sst/models.dev` 是 MIT，Copyright (c) 2025 models.dev。单个条目是事实，本身不受版权保护，但选择与编排——携带哪些 provider 和字段，以及上游的规范化结构，如 `lifecycle` 和 `thinkingOptions.efforts`——来自该数据库。同样的生成器边界适用：models.dev 不是 npm 依赖，不出现在四个署名面中的任何一处。生成的头也未记录快照日期或上游修订，因此目前无法识别固定的来源。

### PawWork 浏览器移植

Vera 提交 `fab537af179232cc88dc39314038000f70d15d05` 引入的内嵌浏览器工作移植自 [`Astro-Han/pawwork`](https://github.com/Astro-Han/pawwork) 的两个固定源批次：

- CDP 桥与浏览器选项：`aff7ce202f5ccb9a7166a95172aa754b0d4de7db`；
- `BrowserSession`、通用 observe→act 工具及其桌面集成：`e3595b705c687c369828736ecd154127ed44f545`。

两个 PawWork 快照均为 Apache-2.0。2026-08-23，其作者 AstroHan 确认这是仅有的两个源批次，所有带入 Vera 的代码均为其本人作品，且他直接作为 ASF 贡献提交。PawWork 仓库级的 `NOTICE` 还描述了不相关的 OpenCode 素材，但该通知与本贡献者确认的切片无关。这两个声明批次之外的任何 PawWork 或 OpenCode 字节都不属于此移植。

确切的 Vera 引入边界是以下 23 个文件的变更。此清单记录转移边界，而非断言每个集成文件中的每个字节都来自 PawWork：

- `vera-desktop/src/global.d.ts`
- `vera-desktop/src/main/__tests__/automation-host.test.ts`
- `vera-desktop/src/main/__tests__/browser-logic.test.ts`
- `vera-desktop/src/main/__tests__/browser-session.test.ts`
- `vera-desktop/src/main/__tests__/browser-tools.test.ts`
- `vera-desktop/src/main/__tests__/browser-view-manager.test.ts`
- `vera-desktop/src/main/__tests__/cdp-bridge.test.ts`
- `vera-desktop/src/main/browser/automation-host.ts`
- `vera-desktop/src/main/browser/browser-host.ts`
- `vera-desktop/src/main/browser/browser-tools.ts`
- `vera-desktop/src/main/browser/cdp-bridge.ts`
- `vera-desktop/src/main/browser/controller.ts`
- `vera-desktop/src/main/browser/logic.ts`
- `vera-desktop/src/main/browser/options.ts`
- `vera-desktop/src/main/browser/session.ts`
- `vera-desktop/src/main/browser/view-manager.ts`
- `vera-desktop/src/main/main.ts`
- `vera-desktop/src/preload/preload.ts`
- `vera-desktop/src/renderer/browser-panel.tsx`
- `vera-desktop/src/renderer/main.tsx`
- `vera-desktop/src/renderer/styles.css`
- `vera-core/src/browser.ts`
- `vera-core/src/index.ts`

后续重构将 `vera-desktop/src/renderer/browser-panel.tsx` 移动到 `vera-desktop/src/renderer/features/workbar/tools/browser/browser-panel.tsx`，并删除了旧的 `vera-core/src/index.ts` barrel。这些变更不新增源批次；引入提交和固定的上游修订仍是来源锚点。

### 随包发布的 Skills

拉取请求 #2695 移除了 29 个无法确认各自来源的随包 Skill。唯一保留的随包 Skill `computer-use` 在此处承载其来源与审查证据，而非放在 `SKILL.md` 中，以免来源编辑改变已安装 Skill 的内容哈希。

- **状态：** 贡献者已确认，`origin: independently-authored`，Apache-2.0。
- **作者：** Haoqing Wang（@hqhq1025），起草与实现协助来自 OpenAI Codex。
- **输入：** Vera Computer Use 源码、`vera.cu/2` schema 和面向模型方的工具契约，以及 Vera Computer Use 测试。未使用任何第三方 Skill 主体。
- **引入者：** 拉取请求 #2147，提交 `2fb83e20b71124bc4a4f2fd4e40f971e415d0ea5`；贡献者于 2026-08-11 确认。
- **审查：** 由 Astro-Han 在拉取请求 #2676 中于提交 `3c7683b9793e97cba7d8536f6864da0e38f24c30`（2026-08-12）独立审查。该审查覆盖此来源记录的准确性；它不对实现输入作出法律或 ASF 发布认定（参见 [Computer Use 实现输入](#computer-use-implementation-inputs)）。

### Computer Use 实现输入

拉取请求 #1255 和 #1883 以及贡献者在拉取请求 #2676 上的确认声明：一个固定的已签名 `SkyComputerUseService` 二进制被静态检查，特定的光标几何、运动值、阈值、路径测量选择和核心评分权重被恢复并保留。仓库中既无 OpenAI 源码，也无可执行字节。这是关于所列事实的窄范围陈述，而非将 Computer Use 实现整体归类为二进制衍生。

确切边界、本地撰写的分歧和产物可复现性限制记录在 `docs/computer-use-cursor-provenance.md` 中。适用协议与法律是否允许保留那些已记录的事实，仍是人的法律/ASF 问题。来源审查不回答它。

### 生成的图片

一位维护者确认以下资产由 AI 生成，且没有第三方图片、徽标或艺术品作为输入上传：

- `.github/assets/vera-hero.en.png`
- `.github/assets/vera-hero.zh-CN.png`
- `vera-desktop/assets/icon.png`
- `vera-desktop/resources/status/cu-status.png`
- `vera-desktop/resources/status/cu-status@2x.png`

前三个使用了 ChatGPT Image。状态 PNG 是从 AI 生成的 SVG 导出的。确切的提示词未保留，且可能请求过视觉风格参考，因此此确认是来源证据，而非不存在风格或知识产权问题的保证。

### 源码归档非文本清单

ASF 源码校验器从候选本身读取此清单。非文本图片必须匹配以下路径之一；即使某路径列于此，可执行文件和归档的 magic 也会被拒绝。

- `.github/assets/*.png`：上面记录的 AI 生成 hero 图片。
- `vera-desktop/assets/icon.png`：上面记录的 AI 生成应用标识。
- `vera-desktop/assets/app-icons/*.png`：`mono.png` 是贡献者从拉取请求 #3431 提交的应用标识灰度衍生；其余变体由 `scripts/generate-app-icons.py` 从 Apache 许可的几何与调色板可复现渲染，并由 `scripts/generate-app-icons.test.mjs` 逐字节校验。
- `vera-desktop/build/*.png`：来自拉取请求 #3817 的贡献者提交 DMG 素材；该贡献将 Codex 记为审查与验证协助，而非素材来源。
- `vera-desktop/resources/status/*.png`：上面记录的状态图片，由 `scripts/generate-cu-status-icons.mjs` 可复现渲染。
- `docs/images/**/*.png`：作为审查证据提交的 Vera 自身用户界面截图，包括拉取请求 #3584 和 #3588。
- `vera-core/src/__tests__/foreign-session.test.ts`：Apache 许可的源码夹具，含字面 NUL、bidi 覆盖符和零宽字符，用于验证导入会话的净化。
- `vera-runtime-host/src/protocol/artifact.ts`：Apache 许可的协议源码，控制字符拒绝表达式含字面 C0 和 DEL 字符。
- `vera-storage/src/__tests__/foreign-session-store.test.ts`：Apache 许可的存储夹具，含字面 bidi 和响铃字符，用于验证持久化导入标题的净化。
- `vera-storage/src/__tests__/mcp-config-store.test.ts`：Apache 许可的校验夹具，被拒绝的 MCP 工具名含一个字面控制字符。
- `vera-storage/test-fixtures/v0.1.6-operational-state/runtime.sqlite`：通过 Vera 公共存储 API 在标签 `v0.1.6` 创建的迁移夹具；其确切来源和 SHA-256 记录在相邻的 `README.md` 中。

## 引导生成式工具链

初始提交是 `8fd91a43cc64cdde58cfbd046256effce0cfa6f8`（2026-05-19）。当前的贡献者账户预期确认引导历史。工作假设是 Raft 编排了 Claude 和 Codex，但仓库无法确立：

- 确切的 Raft 产品或版本；
- 确切的 Claude 和 Codex 产品或模型版本；
- 每个工具是通过个人、团队、企业、API 或其他协议使用的；
- 这些账户的适用条款和日期；
- 是否启用了任何训练数据相似性或来源保护。

在贡献者提供该信息之前，此项为 `pending contributor confirmation`（待贡献者确认）。它不阻止本证据报告的发布，但阻止更强的结论——每个引导工具的适用条款都已对照 ASF 生成式工具指导验证。

## 政策边界与待办事项

ASF 指导允许 AI 辅助贡献，前提是工具条款不以与开源不相容的方式限制输出，且任何包含的第三方素材要么不存在，要么在兼容许可证下使用。代码扫描可提供合理证据，但 ASF 不规定 SCANOSS 或 FOSSA，扫描结果也不是原创性证书。

在代码转移或发布审查之前：

1. 取得并记录引导贡献者确认；
2. 就保留通过静态检查恢复的、有具体记录的这些事实，取得适当的人的法律/ASF 认定，或独立替换这些事实及依赖代码；
3. 让记录在案的人工贡献者审查本报告、25 项分类和最终的 `LICENSE`/`NOTICE` 决定；
4. 按 #3270 为改编的 opencode 源码和 models.dev 快照署名，并关闭隐藏它们的生成器缺口。

恢复的扫描未指出额外的源码移除问题。在项目选定服务、数据策略、稳定阈值和误报审查负责人之前，不建议进行周期性云端片段扫描。本地依赖通知检查仍是随包 npm 依赖的更窄、更确定的 CI 控制。

该检查有一个值得直说的结构性盲区，因为它制造了 [其他来源证据](#other-provenance-evidence) 中的两个缺口。`scripts/generate-third-party-notices.mjs` 的清单来自 npm 生产依赖树，因此以 vendored 或改编源码、或生成数据形式进入仓库的素材，对它是结构上不可见的——不是偶然遗漏。今天，每个此类来源都必须手工登记，这意味着下一个会以同样的方式被遗漏，除非生成器获得一个受检的手工清单。

扫描器有类似的盲区。第 17 行以 14% 匹配到一个不相关的包，真正识别其来源的是结构：近乎逐字的文档注释、保留的声明形式，以及一处被复现的上游不一致。随后在仓库中对同一模式的扫尾——按名称重叠和有序属性序列，将本地声明的类型与已安装依赖的声明比较——未发现第二个实例。该扫尾对类型和字段名被改写的副本仍然不可见，也没有注释、导入或架构说明暗示存在此类情况。

## 参考资料

- [ASF 生成式工具指导](https://www.apache.org/legal/generative-tooling.html)
- [ASF 第三方作品处理](https://www.apache.org/legal/src-headers.html#3party)
- [ASF LICENSE 与 NOTICE 组装指导](https://infra.apache.org/licensing-howto.html)
- [议题 #2669](https://github.com/vera-agent/vera-agent/issues/2669)
- [拉取请求 #2695](https://github.com/vera-agent/vera-agent/pull/2695)
- [拉取请求 #2676](https://github.com/vera-agent/vera-agent/pull/2676)
- [拉取请求 #1255](https://github.com/vera-agent/vera-agent/pull/1255)
- [拉取请求 #1883](https://github.com/vera-agent/vera-agent/pull/1883)

## AI 协助披露

OpenAI Codex 重建了扫描证据，将固定源快照与恢复的扫描器输出进行比较，并起草了本报告及随附的署名变更。记录在案的人工贡献者必须审查并负责这些分类、准确性、来源、许可和提交决定。
