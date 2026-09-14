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

# Astryx 全表面审计

日期：2026-08-09  
分支：`feat/astryx-surface-alignment`  
范围：`vera-desktop/src/renderer/**` 与 `vera-ui/src/**` 下的每个产品表面（183 个清单文件）。

本轮**阅读并分析**了设置页面/模块、shell/chat/workbar/面板、模块中心、vera-ui 组合与产品 CSS——而不只是清单脚本。

## 结论

| 层 | 状态 |
|-------|--------|
| 原生 `<button>` / `<input>` / `<select>` / `<textarea>` | **清零**（产品 TSX） |
| 清单阻塞项 | **0** |
| 空 / 加载 / 错误契约 | 本轮后**大体对齐** |
| 模块套件（Skills / Plan / Daily / MCP） | **已对齐** |
| 设置套件（`SettingsPage` / `SettingsSection`） | **已对齐**（providers 多层是有意为之） |
| 剩余债务 | CSS 控件 chrome 覆盖、plan/graph plate 高度、ChatReasoning 实验室 eject、Deep Research 进度卡 |

## 已审阅的表面

### 设置（所有 `*-page.tsx` + 主要模块）

已对齐：about、appearance、general、data、memory、projects、subagent、web-search、health、permission、usage、bot 概览/详情/onboarding/wechat、providers 多层、catalog、oauth、连接详情、personalization、password-input、skeleton、路由头、可展开行。

### Shell / 面板

核心已对齐：app-shell 系列、chat-message-surface、chat-composer-region、chat-workbar、session-workbar（tab 用 Button）、browser、terminal、review、inspector、导入对话框、命令面板、onboarding、mcp-page、侧聊确认、error-boundary。

### 模块 / vera-ui

已对齐：skills-panel、scheduled-task-*、daily-review-panel、module-pages、composer、chat-view（loading 现在用 Spinner）、prompt rail、引用 chip、会话侧边栏/历史/列表、search-modal、model/permission 选择器、mermaid、toast、tool-activity shell。

## 本轮修复

| 区域 | 变更 |
|------|--------|
| plan-mode | error → `Banner` |
| quote-companion | error → `Banner`；preparing → `Spinner` |
| task-ledger | error → `Banner` |
| web-search | 实时 error → `Banner`；无结果 → `EmptyState` |
| memory 设置 | 警告提示 → `Banner`；移除死 CSS |
| daily-review 设置 | loading → `SettingsSkeletonStack` |
| 权限中心 | 错误包进 `SettingsPage` |
| provider oauth | error → `Banner` |
| custom pet | empty → `EmptyState isCompact` |
| 制品预览 | FailureCard / Unsupported → `Banner` |
| mcp 删除 | `variant="destructive"`（无内联颜色） |
| agent-graph 空态 | 紧凑 EmptyState，无混合层级图标 |
| chat-view | `messageLoading` → 居中 `Spinner` |

## 有意例外（未经产品决策不要"修复"）

1. **`astryx-chat-reasoning.tsx`** —— eject 的 Astryx 实验室 ChatReasoning；在稳定同类落地前保留官方 `role="button"` 头。
2. **Providers 多层** —— catalog/setup/detail 是 SettingsPage 内的嵌套路由，不是独立的 SettingsSection 页面。
3. **Usage 分析布局** —— 指标/标签页，不是设置行。
4. **Tool / agent / web-search 预览卡** —— 产品记录内容 chrome，不是通用控件。
5. **DeepResearchProgressPanel** —— 产品进度组合；套件化是一项专门的设计任务。
6. **Quote chip / 回合页脚 CSS** —— 仍是 Astryx 控件上的产品几何覆盖；逐步缩减 chrome。
7. **Logo 44 / swatch 34 / session-context 40** —— 装饰性或条带高度，不是控件节奏 28/32/36。
8. **ChatReasoning / markdown 密度契约** —— 有记录的产品覆盖。

## 剩余积压（按优先级）

### P1 —— 视觉系统

- plan-mode / agent-graph plate：避免 fill + border + 裸 shadow 叠层；优先抬高阶梯或单一 elevation 令牌。
- plan-mode 状态 wash → 语义 `--*-wash` 令牌。
- quote companion 合成器 elevation → 令牌。

### P2 —— primitives 一致性

- browser 工具栏 → Astryx `Toolbar`。
- workbar 启动器快捷键 → `Kbd`。
- 键盘帮助标题 → `Heading`/`Text`。
- web 工具结果链接 → Astryx `Link`。
- daily-review 指标 → 可选的 `StatTile`。

### P3 —— CSS chrome 债务

- 缩减 `.vera-quote-chip-remove` / `.vera-turn-footer-action` / 血统 badge 覆盖。
- 未使用则退役死 tool-terminal CSS。
- 盘点打磨 logo/swatch 高度的误报。

## 方法

1. 重新生成路径清单（183 个文件）。
2. 模式扫描：原生控件、role=button、手写空态、role=alert。
3. 并行深度阅读审计：settings · shell · vera-ui。
4. 依据这些审计实现 P0/P1 语义缺口。
5. 对 `@vera/ui` + 桌面 renderer 运行 typecheck。
