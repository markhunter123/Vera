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

# Storybook 保真度约定

适用于 `vera-desktop/stories` 与 `vera-ui/stories` 中的每一个 `Product/*` story。`Primitives/*` 与 `Design System/*` 豁免：它们展示的是组件的状态，而非产品表面，也没有任何用户路径能到达 StatTile 强调效果。

## 每个产品 story 都对应一个真实用户可达的状态

Storybook 是像素工作发生的地方，因此其 story 被视为产品外观的真相来源。这只有在每个 story 都是 app 实际渲染的状态时才成立。

#1433 中的两个发现——135px 的 hero 偏移与一处被破坏的垂直居中——是对照一个组合了 app 从未渲染状态的 story 测量的。两者在构建后的 app 中都无法复现。该 story 对组件的描述没有错；错的是对产品的描述，而每一次针对它做的测量都白费了。

因此，每个 story 正上方都带一条 `// Real path:` 注释，说明用户如何到达该状态：

```tsx
// Real path: sidebar → 扩展 → 技能, with skills installed.
export const Populated: Story = { … }
```

这种注解是刻意使用散文形式的。它的价值在于有人追查过这条路径并把它写了下来；机械式存在性检查同样容易被一个看起来合理的谎言满足。只有顺着调用链审阅的审阅者才能判断它是否为真。

第一批注解中有两条是错的，而且都是靠读而不是靠运行任何东西抓出来的：一条经由某个 builder 命名了一条无法产生该状态的路径（`CommandPaletteDisabledCommand`），另一条为一个 frame 命名了两个 host，而实际上只有其中之一。请把句子写得足够窄，使其可以证伪——host、builder、门禁——因为一句含糊到永远为真的话毫无价值。

## 每个状态一个 story，而非每个变体一个 story

一个 story 靠渲染出其他 story 不渲染的像素来赢得其位置。页面的第二层级——替换列表的路由层级、与后方屏幕不共享任何内容的表单——是它自己的状态，即使一次点击就能到达，也应有自己的 story。屏幕上已有状态的更窄版本则不是。

两个事实决定这一切，而两者都曾被猜错过一次：

- **story 渲染在哪里。** CI 以 1280 宽度、浅色模式把每个 story 精确挂载一次。它不维护 viewport、主题或截图矩阵。响应式与主题行为属于聚焦的组件契约或真实桌面 E2E harness。
- **`play` 是否到达该状态。** 本地 Storybook 可以使用 `play` 把 story 驱动到审阅者需要看到的状态。CI 故意以 `embed=true` 挂载 story，因此不会执行这些交互，也不会把它们当作产品测试。

多余的 story 仍然有代价：浏览侧边栏的审阅者看不出哪个条目是页面，而重复项每次运行都会重渲同一批像素，同时宣称一些它们并未增加的覆盖。当某个状态重要却渲染不出新东西时，把它固定到某个会运行的地方——`vera-ui` 测试或 e2e 旅程。

## frame 很重要，不只是组件

一个把正确组件挂载进错误包装器里的 story 仍然是不可到达的。如果 app 把某个表面包装在一个拥有其高度、内边距或对齐方式的类里，story 也必须使用那个包装器——否则每一次对照 story 的几何比较，测量的都是 story 自己的脚手架。

导入包装器，而不是重打它的类。手抄的链与手抄的约定块一样会漂移，而且漂移得悄无声息：`onboarding.stories.tsx` 曾被重写为"与 app 的链逐类一致"，而这次重写颠倒了两个嵌套层级并丢掉了一个 32px 的头部。只写出真正无法导入的部分，并在注释中说明是哪一部分。

当一个组件有两个 host 时，一个 frame 不可能同时是两者。`capability-audit-strip.stories.tsx` 把技能与定时任务命名为通向同一个在 skills frame 中构建的 story 的路径；定时任务页面把同一条 strip 挂载在 1024px clamp 内，且没有 `.vera-module-main` 祖先，因此那条页面永远得不到的 `:has(> …)` 网格规则，成了在那里所做的每一次测量的一部分。要么构建第二个 frame，要么在注解中说明该 story 是哪个 host、另一个 host 改变了什么。指出分歧很便宜；一个静默平均两个 frame 的 story 比没有 story 更糟。

## 推导 fixture，而非断言它

如果 runtime 会计算某个字段，就问 runtime 要。一个把分类器本来会返回的值硬编码进 story 的 story，是在断言一个事实而不是展示一个事实，而当分类器变动时不会有任何东西失败。

## `play` 函数是本地审阅驱动，不是 CI 测试

渲染冒烟使用 Storybook 的嵌入模式，它会挂载 story 但禁用自动播放。这让 Storybook 这条道只负责一件事：每个有生产背书的 story 必须能无 runtime、控制台或页面错误地渲染。它不会把键盘、指针、焦点、几何或状态转换交互变成第二套桌面 E2E 套件。

把行为与计算样式契约放到能说出它们检查什么的地方——`vera-ui` 测试或真实 Electron E2E 旅程。只有当本地审阅者需要帮助导航到某个视觉状态时才使用 `play`；不要把产品断言放进去。

## 什么都不渲染的 story 不是 story

靠异常来报告的组件在健康状态下返回 `null`。三个 `capability-audit-strip` story 在信心满满的注解下通过了全零计数并渲染出空白面板。"该元素不在页面上"不需要 story；删掉它，并在剩余 story 解释该元素何时出现的地方说明这一点。

## 当 app 与 story 不一致时，其中一个是错的

修复 story 或删除它。绝不让某个表面的"app 版本"与"story 版本"同时存活；第二个会无声地腐烂，并带着审阅者一起。

## 并排 story 是脚手架

当某个 story 故意把几个状态并排放在一起供审阅时，在注解中说明。这种排列是一种审阅辅助；每个面板都是可达状态，而那一行本身不是任何人会看到的屏幕。
