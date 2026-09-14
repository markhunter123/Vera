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

# @vera/ui

Vera 桌面 app 的共享 UI 层。Astryx 是通用组件的权威；Vera 保留产品特定的组合与状态。该包被 `vera-desktop` 的 renderer 消费，而 preload 桥只导入类型。

已发布的 Astryx API 是一个固定的依赖边界。新消费者适配它的分类体系，而不是重造已退役的 Vera API 或样式化其内部 DOM；现有 renderer 覆盖是已承认的过渡状态，记录在 `vera-desktop/src/renderer/README.md` 中。

## 层地图

四个导出表面，按查看顺序：

| 表面 | 职责 | 状态 |
|---|---|---|
| `src/index.ts` 中的 `@astryxdesign/core` 再导出 | 通用设计系统组件，如 Button、TextInput、TextArea、CheckboxInput、RadioList 与 Switch。 | 目标权威 |
| `src/primitives/` | 不重复 Astryx 组件的 Vera 特定组合。 | 产品特定 |
| `src/ui.tsx` | 共享产品组合与无兼容包袱的导出。 | 稳定 |
| `src/*.tsx` / `src/*.ts`（顶层） | 功能组件 + 纯逻辑（如 `chat-view.tsx`、`composer.tsx`、`sandbox-boundary-prompt.tsx`、`session-list-panel.tsx`，外加 `materialize.ts`、`redact.ts` 之类的纯辅助）。 | 稳定 |
| `src/components.tsx` | 上述功能组件的再导出 barrel（ChatView、Composer、SandboxBoundaryPrompt、…）。 | 稳定 |

`src/index.ts` 是包 barrel。它遵循**off-barrel 约定**：一些样式表与各表面辅助刻意*不*再导出，因此它们保持可改名/可移除而不会破坏公开 API。一个符号在拥有**跨包消费者或明确的公开 API 需求**（而非仅仅第二个包内消费者）时才赢得 barrel 导出。不要投机地加入 barrel。本 README 是 barrel 提升规则的真相来源。

## 消费

```ts
import { Badge, Button, ChatView, Composer, PageHeader, useToast } from '@vera/ui';
```

子路径导出（在 `package.json` `exports` 中声明）：`@vera/ui/artifact-preview-registry`、`@vera/ui/assistant-stream`、`@vera/ui/icons` 与 `@vera/ui/vera-uri`。（`@vera/ui/icons` 再导出 Lucide 符号；model-provider 品牌 logo 在 renderer 的 `settings/provider-*` 中，不在这里——bot-provider logo 在 `@vera/ui` 的 `bot-brand-logo` 中。）

新 renderer CSS 只拥有产品布局容器。它不得针对 Astryx 内部元素、角色、slot 或生成的类来重做组件 chrome。

## 新代码放哪里

- **通用组件需求** → 使用最接近的已发布 Astryx 分类体系；当旧形态不适用时，重新设计 Vera 消费者。
- **不可约的产品控件** → 添加最小的产品命名原生或 Astryx 组合；不要创建通用兼容 primitive。
- **新功能组件** → 顶层 `src/<name>.tsx`，保持为相对导入，直到它拥有跨包消费者或明确的公开 API 需求；然后从 `src/components.tsx` 再导出它（`index.ts` 做 `export * from './components.js'`，因此它会自动落到 barrel 上）。
- **不要**在 Astryx 公开 props 能表达需求时添加各表面手写 CSS recipe。如果不能，重新设计消费者；只为不可约的产品交互保留产品拥有的控件。
- **不要**在没有跨包消费者或明确公开 API 需求的情况下把符号再导出到 barrel；即使有多个包内消费者，也保持相对导入（跨包消费者无法使用相对导入——`previewVariants` 正是为此被再导出）。

## 契约与护栏

产品设计意图位于 `DESIGN.md`。

组件行为、ARIA、键盘、tone 与令牌契约由源码、行为测试、聚焦的 `scripts/check-*.mjs` 命令、审阅与渲染表面验证强制执行。`docs/frontend-css-governance.md` 拥有剩余的跨领域 CSS 规则。

选定的 primitives 与功能有 stories（`stories/`）与单元测试（`src/__tests__/`）；覆盖是部分的，而非穷尽的。构建/测试入口点是根目录 `package.json` 中的 npm scripts（参见顶层 `README.md`）。
