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

# Composer 提及弹窗（`@` 文件 / `/` 技能）—— v1 规范

日期：2026-07-14
分支：`feat/composer-mentions`

## 已发布内容

在聊天 composer 中（在词边界处）输入 `@` 或 `/` 会打开一个弹窗：

- `@` → workspace 文件引用。对照 `workspace:searchFiles`（仓库中用 git `ls-files`，否则用有界 readdir 遍历）实况过滤。选择文件会插入纯文本令牌 `@<relativePath> `（带 `@` 与一个尾随空格）。
- `/` → 技能引用。在客户端对照启用的技能列表过滤。选择技能会用 `使用 <skillName> 技能：` 替换 `/query` 令牌——这正是 `useSkillInChat`（app-shell.tsx）中的官方约定。这是人在环中：它只填充 composer，绝不自动发送。

## 竞品模型 vs 我们的 v1 模型

**竞品（QoderWork / WorkBuddy，来自反编译 bundle）：** composer 是 `contenteditable` 表面。提及变成*原子 chip*——一个携带类型化线上令牌（`@[file:/abs/path]`、`@[skill:id]`）的不可编辑内联节点，runtime 从消息中解析它。退格删除整个 chip；渲染标签与线上令牌是解耦的。

**我们的 v1：** composer 是*不受控的原生 `<textarea>`*（`vera-ui/src/composer.tsx`；文本存在于 DOM 而非 React 状态中）。v1 不迁移到 `contenteditable` + chip 模型，而是把**纯文本令牌**直接插入 textarea 值：

- 文件 → `@<relativePath> `
- 技能 → `使用 <skillName> 技能：`

我们的 agent runtime 已经通过其工具按路径读取文件，因此裸路径令牌就是足够的上下文——不需要 `@[file:…]` 线上格式、不需要 chip 节点、不需要任何 runtime 变更。弹窗是纯 composer 本地 UI。

## 触发检测（纯函数，单元测试钉死）

`vera-ui/src/chat-input-behavior.ts` 中的 `detectMentionTrigger(value, caret)`（测试在 `vera-ui/src/__tests__/chat-input-behavior.test.ts`）：

- 触发符前一个字符必须是输入开头或空白，这条边界规则定义了*什么算*触发：路径内的 `/`（`@src/app`）或电子邮件内的 `@`（`user@host`）不是触发，只是查询文本。检测从 caret 向左扫描**最近的一个边界锚定的** `@`/`/`（这是对真实触发应用"取更近者"规则）。
- `@` 查询：在 `\n` 或双空格 `"  "` 上无效（允许单空格——文件名有空格）。
- `/` 查询：在任何空白上无效（单令牌）。
- 返回 `{ trigger, query, start }`，其中 **`start` 是触发符本身的下标**。

匹配器 `mentionQueryMatches(query, text)`：对按空白切分的令牌做不区分大小写的子串 AND。

## 与综合规范的偏差

1. **插入拼接范围。** 规范文本说"替换 `[start-1, caret)`"，它假设 `start` 指向*刚过*触发符的位置。我们被单元测试钉死的 `detectMentionTrigger` 返回 `start` = 触发符下标，因此 Composer 替换 `[start, caret)`（触发符包含在内）。净行为相同（触发符被替换）；只是字段含义更清晰。

2. **边界锚定的最近触发（不是裸 `lastIndexOf`）。** 规范字面上的"最后的 `@` 和最后的 `/`，更近者胜"会让路径内的 `/`（如 `@src/app`）成为更近的触发；由于它不满足边界检查，你一输入斜杠整个弹窗就会关闭——破坏 `@` 的主要用途（文件路径）。因为规范明确希望 `@` 查询能容纳斜杠与空格，边界规则在*选择*触发符时应用：只有边界锚定的 `@`/`/` 才是候选，最近的这类候选获胜。非边界的 `@`/`/` 被视为查询文本。由 `chat-input-behavior` 测试钉死（`@src/app` → `@` 且查询 `src/app`）。

## v2 升级路径

如果/当需要更丰富的引用（显示标签 ≠ 插入值、原子删除、结构化线上令牌、`@`-提及符号/URL）时：

1. 把 composer 迁移到 `contenteditable`（或受控的富编辑器）。
2. 把提及作为携带类型化令牌的原子内联 chip 节点插入（`@[file:…]`、`@[skill:…]`）。
3. 发送时把 chips 序列化成线上令牌；教会 runtime 解析它们。
4. 弹窗用 caret-rect 锚定（v1 在 textarea 上方底部锚定；caret-rect 测量明确不在范围内）。
