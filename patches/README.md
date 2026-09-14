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

# patches

通过 `scripts/apply-dependency-patches.mjs`（`patch-package --error-on-fail`）在根 `postinstall` 时应用。升级被修补的依赖后，重新运行 `npx patch-package <name>`，使文件名与已安装版本保持一致。

保持此目录精简。优先采用使用依赖已发布 API 的产品代码；仅对阻碍发布且无法在调用方绕过的 bug 打补丁。

## `node-pty@1.2.0-beta.15`

在 Unix 上，`CustomWriteStream` 通过 libuv 提交原始文件描述符写入。这些写入可能在 PTY 退出后仍然存活，并在描述符被复用后指向无关文件。该补丁让写入在 node-pty 的非阻塞 PTY master 上保持同步，在重试前检查 `fstat` 指纹，在尝试之间让出控制权，并在原生退出屏障处取消队列。参见 #2978。

当 node-pty 发布等效的 Unix 写入生命周期修复时删除。

## `@ai-sdk/provider-utils@5.0.28`

为复用或省略 `index` / `id` 的网关（Ollama 风格、Anthropic→OpenAI 转换器）提供流式工具调用关联。参见 #1967 / #1976 和 `vera-runtime/src/__tests__/model-factory-tool-call-index.test.ts`。

当该防护在未打补丁的包上通过测试时删除。

## `@astryxdesign/core@0.5.0`

五个已发布的组件接缝（seam）会丢失宿主持有的状态或语义：

- `ChatLayout` 需要一个对话身份，用于重置滚动/未读状态，而无需重新挂载其 composer 插槽或丢弃进行中的草稿。
- `ChatLayout` 拥有自动跟随（auto-follow）能力，但没有提供任何方式来表达"这次滚动是有意的导航，请释放它"。其滚动方向解锁无法推断这一点：它会把任何携带 `scrollHeight` 变化的滚动事件当作调整大小的产物而丢弃，而宿主在滚动到某轮对话之前先挂载该轮对话，恰好就会产生这种情况。没有该接缝时，提示栏跳入未挂载的对话轮次后会被直接拖回底部（#2923），且任何调用方都无法修复——逐帧重新对准可以赢得挂载，但随后会输给比它活得久的跟随弹簧（follow spring）。`ChatLayoutContextValue` 上的 `unlockAutoFollow` 公开了该 hook 已有的 `unlock`。
- `ChatToolCalls` 需要一个稳定的行槽位，用于产品样式和 E2E 几何布局。
- `List` 必须把其发布的 `aria-label` 传递给渲染出的列表元素。
- `SideNavItem` 需要在其导航控件和嵌套项之间有一个可交互的 `trailingAction` 兄弟元素。`endContent` 渲染在主控件内部，而 `SideNavItem` 外部的兄弟元素只能位于项目控件之前或在其全部任务之后；两者都无法产生任务栏使用的视觉 Tab 顺序。
- `DropdownMenuItem` 必须把 `aria-busy` 传递给其行。组合器的 Skills 入口在 Skill 目录刷新期间保持外观稳定并暂缓激活；没有该属性时，行会向辅助技术播报"可用"，却静默忽略该动作。

流式文本和 Markdown 暴露了一个显式的 `settledText` 接缝，使渲染器能够验证并推进已呈现的精确前缀，而无需重放。对于真正的新流，默认行为仍是渐进式呈现；被改写或后续到来的文本仍然从解析可见的边界开始显示和淡出。

当相应行为在 Astryx 中发布后，删除每个补丁块。
