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

# Computer Use 语义 UI 覆盖

状态：Vera Desktop 的 Computer Use 目标、状态、焦点、动作与效果语义的维护中源码与运行时清单。

本文档定义"已覆盖"对 Computer Use 可操作性意味着什么。一个页面仅仅能渲染、或每个按钮都有非空名称，并不算完成。关键表面必须暴露一个不含歧义的目标、状态、键盘/焦点行为以及可观察的效果。

该门禁不是完整 WCAG 合规或完整辅助技术行为的声明。特别是，live-region 与播报（announcement）完整性不在此测量；它们需要单独的辅助功能测试。

## 自动化表面清单

| 表面 | 运行时状态 | 语义动作与效果 |
|---|---|---|
| 设置 | 每个当前顶层导航条目都从运行中的 UI 枚举；provider 列表/详情/目录/添加、subagent 编辑器、memory 已填充、权限诊断、import 空/就绪、用量变体、Daily Review 选择器与窄态在 Storybook 中 | 导航暴露 `aria-current`；聚焦的嵌套 story 演练对话框、disclosure、选择器与编辑器 |
| 扩展 | 技能空/已安装/内置/更新/禁用/窄态/检查器；MCP 设置/市场/已配置/检查器/编辑器/失败/窄态 | 页面选择、检查器/编辑器打开与可操作节点身份 |
| 计划任务 | 空/已配置/长/窄态/任务检查器；Daily Review 加载/错误/刷新中/报告 | 任务选择、对话框焦点、选择器状态与报告动作 |
| 对话外壳 | 新任务、已定稿对话、流式传输、权限等待、原生对话、模式、上下文与内联补全 | Composer 提交效果、每个任务与每个回合的独特动作、当前区域与 workbar 选择 |
| Workbar | 启动器加侧聊、变更、活动终端、浏览器 chrome、文件、任务与 trace 状态 | 选中标签页、终端输入到达 PTY 桥、浏览器导航到达浏览器桥 |
| 对话框与覆盖层 | 重命名、计划任务表单、Mermaid 全屏、侧聊关闭、onboarding QR、WeChat QR、Runtime Host SSH 与远程目录选择器 | 对话框命名/焦点、重命名回调、关闭确认、SSH 输入、目录导航与注册 |
| 生成内容 | Markdown、工具输出、附件、Mermaid 与 HTML 制品 iframe | 限域复制动作、全屏对话框与沙箱 iframe 语义 |
| 嵌入浏览器页面 | 环回 fixture 上的活动 `WebContentsView` | 通过生产浏览器桥的独立 observe → 语义引用 → 填写/点击 → 业务效果冒烟 |

Storybook 目录对其源码定义的条目是穷尽的，冒烟 runner 为关键运行时边界携带必需的 Computer Use story 清单。Electron 辅助功能测试动态枚举设置导航，然后覆盖模块、全局覆盖层、对话与所有 workbar 入口点。

## AX 完成门禁

每个被测量的最终状态在以下情况下失败：

- AX 树暴露零节点，包括只包含被忽略的 Chromium 源码记录的树；
- 没有名称的可操作节点；
- 两个可操作节点具有相同的角色、名称与语义作用域；
- 多于一个主 `main` 地标；
- 没有名称的对话框；
- checkbox、radio、switch、菜单 checkbox/radio、option、tab、combobox、slider 或 spinbutton 缺少其必需的状态/值；
- 焦点落在 inert 或 `aria-hidden` 表面内；
- 可见的模态对话框没有持有焦点。

关键 story 与 Electron 旅程额外断言动作特定效果。覆盖层旅程会等待先前被点名的那条对话框关闭后，再打开并审计下一条。仅凭传输成功或泛化对话框匹配不被接受。

重复的消息与回答动作使用有界可见文本摘录加上一个稳定的人类可读时间戳。不透明的存储 ID 仍是机器数据，不作为面向用户的区分项读出。

## 平台边界

- Renderer 与同进程 iframe 语义通过 Chromium 的完整 AX 树验证。
- 嵌入浏览器内容是一个独立的 `WebContentsView`；它通过其生产语义快照/动作桥验证，不会被虚假地声称是 renderer 树的一部分。
- xterm 表面以 `screenReaderMode` 运行，并有活动的 PTY 与 SSH 输入 fixture。
- 第三方页面标记、Chromium 的 PDF 插件、原生文件对话框与操作系统权限对话框仍归各自平台/provider 所有。Vera 验证这些表面周围它自己拥有的控件，并在外部目标不可用或含歧义时 fail closed。
- 原生 macOS AX 与 Windows UIA 打包 app 抽查仍是发布门禁；Linux CI 不能替代这些平台树。

## 性能契约

产品不新增辅助功能依赖、生产 AX/DOM 遍历器、全局 `MutationObserver`、定时器、轮询循环、OCR 模型或隐藏的重复 agent UI。语义名称与状态由现有 React 渲染发出。所有全树遍历、重复检测与清单强制只在测试与开发者工具中运行。现有的懒加载模块、workbar 与对话框加载保持不变。
