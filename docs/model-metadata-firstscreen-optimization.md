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

# perf(desktop)：从 renderer 启动路径中移除 models.dev 元数据

<details open>
<summary><strong>English</strong></summary>

## 问题

大多数用户只配置少数几个 provider，但 Vera 当前会在启动时加载全部 provider 和数百个模型的元数据。这些数据应留在主进程权威边界之内，renderer 只接收当前界面所需的轻量投影。

桌面端 AppShell 的启动路径静态加载 `vera-core/src/model-metadata.generated.ts`。这份 models.dev 快照当前约 520 KB / 13,988 行，包含约 44 个 provider 和数百个模型的完整元数据。

以 2026-08-04 的 renderer 构建实测：

| 产物 | 大小 |
|---|---:|
| `model-metadata.generated.ts` 源文件 | 520 KB |
| 含元数据的 `EmptyState-*.js` 共享 chunk | 644 KB |
| `model-catalog-choices-*.js` chunk | 98 KB |
| `index-*.js` 入口 | 253 KB |
| 29 个 modulepreload chunk 合计 | 1,769 KB |

`EmptyState-*.js` chunk 中包含 312 处匹配 `claude-opus`、`gpt-5.`、`gemini-2.` 等模型名的引用，证实快照已进入启动产物。Electron 从本地读取这些文件，因此主要成本是 renderer 主线程的解析与执行，而非网络 I/O。

有五条独立的运行时 import 路径使元数据在启动时可达：

1. `thinkingVariantsForModel` → `model-thinking.ts` → `model-metadata.ts`
2. `buildChatModelChoices` → `model-catalog-choices.ts` → `model-catalog.ts`
3. `@vera/ui` 的 `modelMenuGroups` → `PROVIDER_DEFAULTS`
4. `provider-display.tsx` → `PROVIDER_DEFAULTS`
5. `OnboardingHero` → `RECOMMENDED_PROVIDER_TYPES`

每条路径最终都会到达 `model-metadata.generated.ts`。只移除其中一条路径，或将元数据分配到 Vite `manualChunks` 条目，都无法解除静态启动依赖。

首屏只需要模型选项、对应的 thinking levels、provider heading 标签，以及四个首次引导 provider 的本地展示文案。pricing、context window、完整 capabilities、lifecycle 信息等富元数据只被懒加载的 SettingsModal 使用。

## 期望结果

复用现有的 `onboarding:getSnapshot` 路径。主进程已加载元数据，应由它向 renderer 提供轻量启动投影：

- 可用的 chat model choices；
- 每个 connection/model 对应的 thinking levels；
- model menu heading 使用的 provider fallback labels。

Renderer 消费该投影，不再在启动时读取 model catalog 或元数据。connection 变化继续使用现有 `connections:event → onboarding snapshot refresh` 流程；无需新增 IPC channel。

会话健康提示在事件触发的刷新进行期间使用上一份完成的快照，随后从该次拉取更新；它不等待另一轮 invalidation。凭据查找失败保守地投影为 `hasSecret: false`。这取代了 renderer 之前在 probe 报错时乐观回退为 `true` 的做法，使无法读取的凭据进入现有修复路径，而不是隐藏一次很可能发生的发送失败。

从启动路径中移除剩余的 provider registry 依赖：

- `modelMenuGroups` 从启动投影获取所需 label，不再读取 `PROVIDER_DEFAULTS`。
- `providerDisplay` 使用现有且类型完整的 `PROVIDER_DISPLAY_COPY`；跨版本未知 type 回退到 type 字符串和通用本地描述，而非 `PROVIDER_DEFAULTS`。
- OnboardingHero 从一个小型、不依赖元数据的产品常量或等效轻量投影获取其四个首次运行 provider 类型，不再在运行时导入 `RECOMMENDED_PROVIDER_TYPES`。

完整元数据仍对主进程和懒加载的 SettingsModal 可用。元数据代码生成流程保持不变。

验收标准：

- 启动入口及其所有静态传递依赖均不包含 `model-metadata.generated.ts`、`model-metadata.ts`、`provider-registry.ts`、`model-catalog.ts` 和 `model-thinking.ts`。
- 启动路径不再静态依赖 renderer 的 `model-catalog-choices.ts` 或 `chat-model-selection.ts`。
- 在启动 chunk 中检索 `claude-opus|gpt-5\.|gemini-2\.` 返回零结果；完整元数据只存在于设置页懒加载路径。
- 模型选项、heading、provider logo 以及 active/new-chat thinking levels 保持正确。
- OnboardingHero 仍显示四个推荐 provider 的名称、描述和 logo。
- 添加、更改或移除 connection 后，model choices 和 thinking levels 通过 snapshot 流程刷新。
- SettingsModal 中的模型管理、Daily Review 和 provider catalog 行为不回归。
- 前后测量记录十次冷启动的中位数和启动 JavaScript 解析/执行时间，以验证真实改进。

## 备选方案或变通方法

- **Vite `manualChunks`：** 只改变文件归属，不切断静态 import 路径，因此元数据 chunk 仍会在启动时加载并执行。
- **新增 `connections:listModelChoices` IPC channel：** 重复了现有已预取、随 connection 失效的 onboarding snapshot 流程。
- **缩减或修改 models.dev 代码生成快照：** 主进程和设置页仍需要完整数据；问题在于消费路径，而非生成方式。
- **在 snapshot 中发送 provider 描述和徽标：** renderer 已有编译时覆盖全部 `ProviderType` 的本地化展示文案。

</details>

<details>
<summary><strong>简体中文</strong></summary>

## 问题

大多数用户只配置少数几个 provider，但 Vera 当前会在启动时加载全部 provider 和数百个模型的元数据。完整目录应留在 main process 的权威边界内，renderer 只接收当前界面所需的轻量投影。

桌面端 AppShell 的首屏静态依赖会加载 `vera-core/src/model-metadata.generated.ts`。该文件由 `scripts/sync-model-metadata.mjs` 从 models.dev 生成，当前约 520 KB、13,988 行，包含约 44 个 provider 和数百个模型的完整元数据。

2026-08-04 的 renderer 构建实测：

| 产物 | 大小 |
|---|---:|
| `model-metadata.generated.ts` 源文件 | 520 KB |
| 含元数据的 `EmptyState-*.js` 共享 chunk | 644 KB |
| `model-catalog-choices-*.js` chunk | 98 KB |
| `index-*.js` 入口 | 253 KB |
| 29 个 modulepreload chunk 合计 | 1,769 KB |

`EmptyState-*.js` 中可检出 312 处 `claude-opus`、`gpt-5.`、`gemini-2.` 等模型名引用，说明完整快照已进入首屏产物。Electron 从本地磁盘读取这些文件，主要问题不是网络请求，而是 renderer 主线程需要同步解析和执行这批首屏并不需要的数据。

目前有五条独立的首屏运行时依赖链可以触达完整元数据：

1. `thinkingVariantsForModel` → `model-thinking.ts` → `model-metadata.ts`
2. `buildChatModelChoices` → `model-catalog-choices.ts` → `model-catalog.ts`
3. `@vera/ui` 的 `modelMenuGroups` → `PROVIDER_DEFAULTS`
4. `provider-display.tsx` → `PROVIDER_DEFAULTS`
5. `OnboardingHero` → `RECOMMENDED_PROVIDER_TYPES`

这些链最终都会进入 `model-metadata.generated.ts`。只处理其中一条或使用 Vite `manualChunks` 都不会解除首屏静态依赖。

首屏实际只需要模型选项、对应的 thinking levels、provider heading label，以及 4 个首次引导 provider 的本地展示信息。pricing、context window、完整 capabilities、lifecycle 等富元数据只在懒加载的 SettingsModal 中使用。

## 期望结果

复用现有 `onboarding:getSnapshot`，由已经加载元数据的 main process 向 renderer 提供首屏所需的轻量投影：

- 可用的 chat model choices；
- 各 connection/model 对应的 thinking levels；
- model menu heading 所需的 provider fallback label。

Renderer 使用 snapshot 数据渲染首屏，不再自行读取 model catalog 或 model metadata。connection 发生变化时，继续复用现有 `connections:event → onboarding snapshot refresh` 更新投影，不新增 IPC channel。

Session health notice 在 event 触发的异步刷新完成前继续使用上一份 snapshot，当前 pull 返回后立即更新，不需要再等下一轮 invalidation。Credential lookup 失败时会保守投影为 `hasSecret: false`；这取代了 renderer 旧逻辑在 probe 报错时乐观返回 `true` 的行为，使凭据无法读取时进入已有修复路径，而不是隐藏一次很可能失败的发送。

同时切断其余 provider registry 依赖：

- `modelMenuGroups` 从首屏投影获取所需 label，不再直接读取 `PROVIDER_DEFAULTS`。
- `providerDisplay` 使用已有且类型完整的 `PROVIDER_DISPLAY_COPY`；遇到跨版本未知 type 时直接显示 type 和通用本地描述，不再 fallback 到 `PROVIDER_DEFAULTS`。
- OnboardingHero 的 4 个首次引导 provider 使用不依赖 provider registry 的小型产品常量或等价轻量投影，不再运行时引用 `RECOMMENDED_PROVIDER_TYPES`。

完整元数据继续保留在 main process 和懒加载的 SettingsModal 中，codegen 流程保持不变。

验收标准：

- 首屏入口及其所有静态传递依赖不包含 `model-metadata.generated.ts`、`model-metadata.ts`、`provider-registry.ts`、`model-catalog.ts` 或 `model-thinking.ts`。
- 首屏不再静态依赖 renderer 的 `model-catalog-choices.ts` 和 `chat-model-selection.ts`。
- 构建产物的首屏 chunk 中检索 `claude-opus|gpt-5\.|gemini-2\.` 为 0；完整元数据只存在于设置页懒加载路径。
- model picker 的模型、heading、provider logo，以及 active/new-chat thinking level 选项保持正确。
- OnboardingHero 正常显示 4 个推荐 provider 的名称、描述和 logo。
- connection 增删改后，model choices 和 thinking levels 随 snapshot 刷新。
- SettingsModal 中的模型管理、Daily Review 和 provider catalog 功能不回归。
- 记录改动前后 10 次冷启动中位数，以及首屏 JavaScript 解析/执行时间，验证优化是否产生实际收益。

## 备选方案或变通方法

- **Vite `manualChunks`**：只能改变模块所属文件，不能切断静态 import；首屏仍会加载并执行元数据 chunk。
- **新增 `connections:listModelChoices` IPC**：现有 onboarding snapshot 已经在首屏预取，并监听 connection 变更；新 channel 会重复现有机制。
- **修改或缩减 models.dev codegen 快照**：设置页和 main process 仍需要完整元数据；问题在消费位置，不在生成方式。
- **把 provider description/badge 放入 snapshot**：renderer 已有编译时覆盖全部 `ProviderType` 的本地文案，重复传输没有必要。

</details>
