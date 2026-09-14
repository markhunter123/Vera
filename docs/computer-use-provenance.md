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

# Computer Use 溯源

Vera 的 Computer Use 界面以三种实质不同的方式建立在他人工作的基础之上。这里把它们分开，因为义务不同：按许可再分发、对许可源码的改编或参考使用，以及为兼容性检视专有实现。

从宏观层面看，Vera 的 Computer Use 实现受到了 MIT 许可的 `trycua/cua` 与 `iFurySt/open-codex-computer-use` 项目，以及与 Codex Desktop 实现及其外部可见行为的比较的影响。Vera 通过自己的测试、安全边界与产品要求对这些输入进行了整合与调整。

上述概括并不合并下文中的来源类别。许可源码、行为观察、从二进制恢复的确切事实与 Vera 原创工作保持分离，因为它们的证据与发布评审义务不同。

路径属于 Vera，除非它们带有上游仓库名，如 `open-codex-computer-use/...`。

每个条目都写明取了什么、落在哪里、证据是什么。当你新增或修改借用来的设计时，在此处添加一行，并把同样的说明放进承载它的文件 — 文件内注释在有人问起的那一刻回答"为什么这个常量是 200？"，而本文件从项目整体上回答"我们建立在什么之上？"。

## 1. 按许可再分发

随 Vera 产物一同发布。要求许可文本与版权声明随之携带。

| 组件 | 许可 | 声明存放位置 |
|---|---|---|
| npm 依赖 | 多种 | `vera-desktop/resources/licenses/npm/`，由 `scripts/generate-third-party-notices.mjs` 生成，并在构建时由 `scripts/check-third-party-notices.mjs` 逐字节检查 |

Vera 只有一个 Computer Use 执行器 `vera-cu`。它由 `scripts/computer-use.mjs` 中的 `prepare` 命令从 Vera 自有源码构建，并按摘要固定在 `vera-desktop/bundled-tools.json` 中。它没有签名，因此不被分发：其 `distributionReady` 为 false，且 `scripts/verify-macos-arm64-dmg.mjs` 禁止其路径出现在打包构建中。Vera 产物中没有随 Computer Use 分发的第三方内容，这就是上表只有一行的原因。

Vera 过去运行的第三方执行器 cua-driver 已连同其内置声明一并移除。本仓库树中没有东西会派生它或链接它。

`vera-cu` 本身是 MIT 许可的 `iFurySt/open-codex-computer-use`（§2）的分支，因此当它真正发布时，那份声明会随之携带。

## 2. 被改编或作为参考阅读的许可源码

MIT 许可的源码既被用作实现起点，也被用作设计参考。下表中的行区分改编与纯参考使用。

### trycua/cua

MIT。Vera 最初的鼠标渲染器是对公开 `cursor-overlay` crate 的 TypeScript 改编，引入于 Vera 提交 `025d0c628a2162d0a7daf49e97d104c36a4431c6`。Vera 捆绑的 cua-driver 清单记录的固定上游源码为提交 `8c921b2b3bf13494724ead4f0a814d80c56a7e8b`。

Vera 后来替换并扩展了规划器、时序、热点、渲染与呈现生命周期。当前源码仍属于那个有记录的谱系，尽管旧的 cua-driver 可执行文件及其内置声明已不再发布。

### iFurySt/open-codex-computer-use 及其分支 QwenLM/open-computer-use

两者都是 MIT 许可，© 2026 Leo。Codex Computer Use 作为 MCP server 的独立重实现。

对于下面的行，本仓库没有复制任何源码；取走的是格式、决定或归档的测量值。给出署名是因为它承重，而非 MIT 对思想的要求。

| 取走的 | 落在 | 说明 |
|---|---|---|
| Codex 真实 `get_app_state` 结果的归档捕获 | `vera-runtime/src/computer-use-tools.ts` | 位于他们的 `open-codex-computer-use/artifacts/tool-comparisons/20260417-focus-behavior/`。正是它把 Vera 对 Codex 观察格式的模型从推断变成了观测样本。 |
| 每元素一行的观察形态：缩进表示包含关系，仅非默认时写状态 | 同一文件 | Vera 的版本在头部保留 `observation_id`（帧绑定在这里是协议，在那里是行文），并保留元素几何（Codex 没有需要它的坐标动作面；Vera 的默认禁用而非缺失）。 |
| 只写状态中有信息量的一半 — `disabled`，从不写 `enabled` | 同一文件 | 他们的 `summarizeTraits`。 |
| 从元素公布的动作列表中过滤掉 `AXPress`，因为按下正是 `click` 做的事 | 尚未落地 — 等待 `trycua/cua#2622` 暴露按元素的 AX 动作 | 他们的 `meaningfulActions`。 |
| 权限引导模式：把引导面板锚定到系统设置窗口、跟踪它，并区分需要重启应用的授权 | 尚未落地 — 供 `feat/permission-onboarding` 工作使用 | 他们的 `open-codex-computer-use/apps/OpenComputerUse/Sources/OpenComputerUse/PermissionOnboardingApp.swift`。 |
| 在仓库内归档并排工具捕获作为证据 | 实践，不是代码 | 值得为 Vera 自己的 Codex 对比采纳。 |
| 私有的 SkyLight 合成聚焦/后台点击配方 | Vera 的 `vera-cu` 执行器，固定在 `vera-desktop/bundled-tools.json` 中 | 独立派生自同样的 MIT cua-driver/yabai 配方；执行器保留其署名与声明。WebContent 路径使用宿主窗口和单次私有发布，而不是通用的双发布兼容路线。 |

从本仓库树中移除 cua-driver 二进制不会改变那条路径的任何东西：借来的是已发布的配方，不是产物或专有的 Codex 实现。

## 3. 为兼容性检视的专有实现

对签名的 Codex Desktop Computer Use 可执行文件进行了静态检视。Vera 不包含或再分发任何 OpenAI 源代码或可执行文件，但从二进制恢复的具体几何、数值常量与控制流事实被转录进了鼠标实现。这是对所列事实的主张，不是对 Computer Use 实现整体源自二进制的声称。

这次检视提供证据，不提供许可授予。Pull requests #1255 和 #1883 准确记录了所列的大部分二进制恢复输入，但 #1883 的"逐项对照"表述比当前的混合评分器更宽泛。详细产物、保留事实与 Vera 原创的偏离记录在 `docs/computer-use-cursor-provenance.md`。

| 从二进制恢复或观察到的事实 | 影响的范围 |
|---|---|
| 精确的鼠标几何、中心热点、运动配置、close-enough 阈值、路径测量与核心评分权重 | `vera-desktop/src/renderer/computer-use-overlay/engine/cursor-engine.ts` |
| 叠加层层级策略 — 被遮挡的目标提升鼠标而不是隐藏它 | 同一文件，以及 `vera-desktop/src/main/computer-use/cursor-overlay-window.ts` |
| 观察文本形态 | `vera-runtime/src/computer-use-tools.ts`，由 §2 中的归档捕获佐证 |
| OOP WebContent 定位、保留元素唯一 refetch 与 renderer 进程代次防护 | 在固定的 `vera-cu` 源码中重新实现；本仓库在 `vera-desktop/bundled-tools.json` 中记录确切源码提交与二进制摘要 |
| 跨修订的稳定 AX id、有序的无变更/移除/插入/更新呈现，以及全树回退 | 在固定的 `vera-cu` 源码与 `vera-runtime/src/computer-use-observation-text.ts` 中重新实现；完整的当前树仍是权威，分发仍使用全新的 snapshot token |

Vera 刻意偏离之处，偏离说明写在偏离发生的位置而不是这里，以便让正在修改那段代码的人看到。
