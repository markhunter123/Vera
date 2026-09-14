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

# 参考实现 Settings —— 完整逆向工程记录（2026-06-23）

> 归档于 2026-07-13。这份逆向工程快照是溯源记录，不是当前的 Settings 合同。

由 4 个并行 Explore agent 在解压后的 bundle（`/tmp/qoder-asar/out/renderer/assets/`）上交叉核对。

本笔记记录参考实现的 Settings 模块，让未来的 Vera PR 无需重新挖掘即可对齐。注意命名卫生：不要在代码、提交或面向用户的文案中暴露参考产品的名称。

---

## 1. 外壳形态

Settings 是一个**占据整个工作区的全窗格模态框**，不是小的覆盖层（overlay sheet）。

- `role="dialog"` + `aria-modal="true"`
- 标记属性：`data-modal="agents-settings"`、`data-canvas-dialog="true"`、`data-settings-layout="page"`
- 外层外壳：
  ```
  flex h-full min-h-0 w-full flex-col overflow-hidden bg-background select-none
  ```
- 聊天界面的其余部分在微弱的背景衬底下保持可见；模态框不是悬浮在模糊遮罩之上——它占据整个画布。

### 双轨布局

| 区域 | 宽度 / 尺寸 | 说明 |
|----------|--------------------------------------|------------------------------------------|
| 导航栏 | `w-[256px] shrink-0` | 左侧，`bg-transparent`，全高 |
| 内容区 | `flex-1 min-w-0 overflow-hidden` | 右侧，在内部列上滚动 |
| 间距 | `var(--agents-content-area-gap)` 4px | 导航栏与内容面板之间的外边距 |

内容面板类名：`agents-settings-wide-content`：
```css
.agents-settings-wide-content {
  background: var(--agents-content-area-bg);
  margin: var(--agents-content-area-gap)
          var(--agents-content-area-gap)
          var(--agents-content-area-gap) 0;
  border-radius: var(--agents-content-area-radius); /* 6px */
}
```

内容主体内层包装（页面所在）：
```
mx-auto min-h-[200px] max-w-3xl pb-16 pt-10
```
`max-w-3xl` = 48rem / 768px。这是任何设置页主体的视觉阅读列宽。

### 响应式

| 断点 | 行为 |
|------------|-------------------------------------------------------|
| ≥ 1200px | 双轨（256px 导航栏 + 内容） |
| 900–1199px | 双轨，收紧 |
| < 900px | 紧凑模式：导航栏折叠；头部显示返回箭头 + 标题 |

---

## 2. 导航栏

导航栏是扁平的垂直列表（没有分组标题——完全扁平）。

### 展示给最终用户的项（按顺序）

1. `preferences` —— **Preferences（偏好设置）**（大型聚合页）
2. `profile` —— Profile / 账户
3. `system` —— **System（系统）**（刻意近乎空白的占位页）
4. `keyboard` —— 键盘快捷键
5. `vm` —— 安全工作区 / VM 模式
6. `experimental` —— 实验性开关
7. `permissions` —— 系统能力开关
8. `connector` —— 集成 / 连接器
9. `appshot` —— App 快照（仅 macOS，由 `platforms: ["darwin"]` 控制）

### 隐藏 / 仅开发用的标签页

`appearance`（通过 Preferences 页面本身处理）、`privacy`、`debug`、`hiddenConnector`、`awareness`、`appUpdate`、`models`、`customModels`、`commands`、`agents`、`worktrees`、`quickpick`、`voiceInput`、`wechat`、`beta`、`channels`、`legokit`、`archived` —— 全部为 `exposed: false`。

标签注册表位于 `index-C02cm0ok.js` 约偏移量 213400 处（查找 `Su=[]`）。

### 导航行配方

```html
<!-- inactive -->
<button class="squircle-md text-text-secondary/80
               hover:bg-[var(--settings-nav-row-selected-bg)]
               hover:text-text/80">
  <Icon size=… />
  <span>Label</span>
</button>

<!-- active -->
<button class="squircle-md
               bg-[var(--settings-nav-row-selected-bg)]
               text-text/80">
  …
</button>
```

- 图标库：Lucide
- 激活态是**填充**（不是边框 / 左侧条），`--settings-nav-row-selected-bg` = `var(--color-fill-secondary)`
- 排版：text-sm（14px），静止时常规字重；激活时不加重（由颜色/背景表达状态）
- 内边距（根据相邻行推断）：`px-4 py-3`
- 图标与标签之间的间距：`gap-3`
- 圆角：`squircle-md`（自定义圆角，不是纯 rounded-md）

---

## 3. 各标签页内容清单

### 3.1 Preferences（什么都装）

全局偏移约 76380–80000。这一个标签页承载了大部分最终用户控件：

| 控件 | 类型 | 说明 |
|----------------------------------|-----------------|-------------------------------------------------------------|
| 语言 | select | UI 区域设置 |
| 扩展思考 | switch | 更大的推理预算，禁用流式输出 |
| 登录时启动（autoLaunch） | switch | 自动启动 |
| 关闭窗口行为 | radio / select | 询问 / 最小化到托盘 / 退出 |
| 桌面通知 | switch | 操作系统原生通知 |
| 声音通知 | switch | 任务完成时播放提示音 |
| 包含 Co-Authored-By | switch | 向 git 提交追加 `Co-authored-by:` 尾注 |
| 快速切换（Ctrl/Cmd+Tab） | radio | Workspaces 与 Agents 之间切换 |
| 归档后自动跳转 | radio | 下一个 / 上一个 / 关闭 |
| 默认模式（新 agent） | radio | Agent / Plan |
| 预览模式（artifactPreview） | radio | 新窗口 / 右侧边栏 |
| 默认展开工具调用 | switch | 工具块折叠或展开 |
| 在 IM 频道中显示工具步骤 | switch | bot 回复界面是否包含工具调用子步骤 |
| 工具执行上限 | 数字输入 | 单轮超过 N 次工具调用时软暂停 |
| 保持系统唤醒（preventSleep） | switch | Agent 工作期间 |
| 网络代理 | proxy 块 | 系统 / 手动；URL 输入 + 测试按钮 + scheme 校验 |
| 聊天设置（子区） | composite | 主题亮度、界面风格、玻璃效果、字体、字号、聊天宽度 |

**关键洞察**：参考实现不会把「系统级」开关（autoLaunch / preventSleep / notifications / proxy / closeWindowAction）拆进单独的 System 标签页。它们与聊天/agent 开关一起放在一个超长的 Preferences 页面里。

### 3.2 System（系统）

只有标题，没有字段，是留给未来的占位页。该页面存在于导航中，但主体刻意留空 /「待定义」。通过遍历 bundle 确认。

### 3.3 Profile（个人资料）

两个部分：
- **头像**：字形（首字符或 emoji）+ 背景色（约 11 种色调的预设调色板）
- **账户与订阅**：邮箱（可复制）、账户 UID（可复制）、产品 UUID（可复制）、订阅等级（只读）、定价页链接、退出登录

### 3.4 外观（`appearance` i18n 键——生产中实际渲染在 Preferences 内部）

| 控件 | 类型 | 选项 |
|--------------------------|----------|-----------------------------------------------------------------|
| 界面主题 | select | 跟随系统 / 浅色 / 深色 / 浅色玻璃 / 浅色通透（win）/ 深色玻璃 / 深色通透（win）/ 经典深色 / 羊皮纸浅色 / 羊皮纸深色 / 来自编辑器 |
| 浅色变体 | select | 按模式的主题 |
| 深色变体 | select | 按模式的主题 |
| 侧边栏工作区图标 | switch | 侧边栏工作区列表中的项目字形 |
| 始终展开待办列表 | switch | 完整或紧凑的待办视图 |

### 3.5 键盘

- 跨所有快捷键的搜索框
- 每个操作一行，显示主绑定与备用绑定
- 「全部重置为默认值」
- 分类：通用 / 聊天（workspaces）/ Agents
  - 通用：显示快捷键 / 打开设置 / 切换侧边栏 / 撤销归档
  - 聊天：快速切换
  - Agents：创建新任务 / 搜索全部任务 / 在当前任务中搜索 / 上一个标签页 / 下一个标签页 / 聚焦输入框 / 切换输入焦点 / 发送 / 换行

### 3.6 VM（安全工作区）

简短描述：「你电脑上用于运行任务的专属空间——更快、更可靠、完全本地。」带启用/禁用开关。

### 3.7 实验性功能

Beta 功能开关。每个 flag 一行；清单在 renderer 组件中管理，在 bundle 中看不到字面数组。

### 3.8 权限

「QoderWork 在此 Mac 上需要的系统权限。」能力行（文件系统 / 网络 / 麦克风 / 屏幕录制 / 辅助功能）带「已授予 / 未授予」状态与「请求」按钮。

### 3.9 连接器

与外部应用的集成。内置连接器 / 市场连接器 / 自定义连接器。每行包含：品牌图标、状态、启用开关、「配置」按钮。

### 3.10 App 快照

仅 macOS。为聊天上下文捕获最前台应用的截图。需要辅助功能 + 屏幕录制权限。包含权限状态行与捕获预览。

---

## 4. 页面内重复出现的视觉模式

参考实现不会在控件组周围使用带边框的卡片容器。默认呈现是**在 `max-w-3xl` 列内的扁平行列表**。

### 4.0 内容列内边距 —— WAWQAQ 消息 `2c810f2d`（2026-06-23）

WAWQAQ 指出参考实现中的左右留白明显比 Vera 宽。第二次 RE 得到的具体数字：

- 内容列是 `mx-auto max-w-3xl pt-10 pb-16`（宽 768px，上 40px，下 64px）。列内没有显式应用 `px-N`——两侧留白来自列没有填满右侧面板。
- 在典型桌面窗口宽度下（约 1280px 视口、256px 导航栏），右侧面板约 1024px。768px 居中列两侧各留约 128px 留白。这就是「更宽内边距」效果。
- 每行内边距为 `px-5 py-4`（20px / 16px）。行本身没有边框、背景板或阴影——分隔完全靠间距。

**2026-06-23 发现的 Vera 差异**：
- `.settingsStructuredPage` 原来有 `gap: 16px`，但没有 `max-width` / `margin: 0 auto`——行会拉伸填满右侧面板。已改为 `max-width: 768px; margin: 0 auto; padding: 40px 24px 64px`。
- `.settingsFormRow` 原来有 `border-bottom: 1px solid var(--border)` 与 `padding: 6px 0`——两者都不对。参考实现只靠间距，且为 `px-5 py-4`。已改为 `padding: 16px 20px`，去掉 border-bottom。
- `.settingsRow` 原来与 `.providerCard` 共用外观（带边框、着色、浮起）。Provider 卡片保留它们的外观（它们本来就是卡片）；`.settingsRow` 已扁平化为 flex 行。
- 标签原来为 12px / 600 字重；已提升为 14px / 500。辅助文本 11px → 12px。与参考实现的 `text-sm font-medium` + `text-xs text-text-quaternary` 一致。

### 4.1 行

```
flex items-center gap-3 px-4 py-3   /* group */
  ├── label column
  │   ├── truncate text-sm font-medium text-text     (title)
  │   └── mt-0.5 truncate text-xs text-text-quaternary (hint)
  └── control (right-aligned)
```

- 每行默认无边框 / 无卡片背景
- 行与行之间仅靠间距实现视觉分隔（无 border-bottom）
- 悬停状态通过父级 `.group` 传递（例如显示更多菜单）

### 4.2 标签页内的子区标题

```
text-sm font-semibold text-text
mb-4
```

### 4.3 开关

- 约 20×20px 的包装器，`rounded-md`
- 开启态：`bg-primary/20 ring-1 ring-primary/40 scale-[0.97]`
- 关闭态：微弱的灰色填充（`bg-gray-100 dark:bg-neutral-600`）带内阴影
- 过渡：`transition-all duration-200`

### 4.4 输入框

```
w-full px-3 py-2 text-sm bg-background border rounded-md
border-border-tertiary/80
focus:outline-none focus:ring-2 focus:ring-primary/50
```
- 错误态：`border-error-border`
- 密码 / 图标后缀：`pr-9`

### 4.5 按钮

- 主按钮：`bg-primary text-primary-foreground`
- 次按钮：`bg-muted text-foreground`
- 描边：`border border-border text-foreground hover:bg-muted`
- 危险操作：`text-error hover:bg-error-bg`
- 纯图标尺寸：`size-7 rounded-md`（28px 方形）、`size-8 rounded-full`（32px 圆形）

### 4.6 标签 / 徽章

```
rounded bg-fill-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary
```

### 4.7 内容滚动

页面主体拥有自己的滚动：
```
min-h-0 flex-1 overflow-y-auto scrollbar-none
```
自定义滚动条被隐藏。内部内容列有 `pb-16` 底部内边距，保证最后一行不会贴住模态框边缘。

---

## 5. Settings 内部使用的 token

| Token | 值 |
|----------------------------------|----------------------------------------------------------------|
| `--agents-content-area-bg` | `var(--color-bg-container)` |
| `--agents-content-area-gap` | `4px` |
| `--agents-content-area-radius` | `12px` |
| `--agents-layout-bg` | `var(--surface-canvas)`（扁平中性外壳——**禁止**在这里绘制 172deg 渐变，见下方警告） |
| `--settings-nav-row-selected-bg` | `var(--color-fill-secondary)` |

> ⚠️ **禁止在外壳/布局背景上绘制 172deg 渐变。**
>
> 这里的 RE 笔记历史上声称 `--agents-layout-bg` 是
> `linear-gradient(172deg, var(--color-fill-tertiary) 19.61%, var(--color-bg-container) 81.35%)`。那个值是我们复制 bundle CSS 时产生的**伪影**，不是参考产品实际渲染的内容。
> WAWQAQ 已连续四次指出这一点（消息 `1e693dee` /
> `5d3b10e5` / `486b5611` / `4a1b8c13`）——「谁让你他妈的用渐变的啊？
> 参考实现就没有啊」。我们每次重新加回渐变，都是因为某份
> atlas/RE 笔记声称它才是正典。
>
> 源码侧强制：`.appFrame`、`html[data-os="darwin"] .vera-session-panel` 或浮动面板任何一个重新引入渐变 / border-right / 小于 12px 的圆角，`vera-desktop/src/main/__tests__/chat-chrome-no-gradient-contract.test.ts` 就会失败。如果未来的 RE 迭代发现参考产品确实会在*新的*位置绘制渐变，请在同一个 PR 中用新的例外更新合同测试，而不要悄悄移除断言。
>
> 在白色内容表面后面使用**扁平中性外壳**（`var(--surface-canvas)`）。
> 不要把手壳塌缩成与内容卡片一样的白色：那会去掉可见的下部圆角，
> 即使没有边框或渐变，bug 也会卷土重来。
>
> 渲染像素强制：捕获
> `sidebar-long-sessions/light-1280-motion` 后，运行
> `npm --workspace @vera/desktop run screenshots:chat-chrome:check`。
> 它会验证实际 PNG 存在可见的外壳/内容差异、没有深色单像素接缝，
> 且底部表面圆角可读。
>
> 表面圆角为 **12px**（历史上曾记作 6px）。6px 在几何上存在，
> 但在视觉上不可见——浮动内容卡片的底部圆角在同色外壳上读不出来。

Settings 内部消费的颜色 token：
- `--color-text`（主要文本）
- `--color-text-secondary`
- `--color-text-tertiary`（提示）
- `--color-text-quaternary`（弱化）
- `--color-border`（强分隔线）
- `--color-border-tertiary`（输入框边框）
- `--color-fill-secondary`（激活行填充）
- `--color-fill-tertiary`（标签背景）
- `--color-bg-container`（页面表面）
- `--color-primary`、`--color-primary/20`、`--color-primary/40`（焦点、开关开启、光环）

---

## 6. 路由、状态与行为

- 激活的标签页保存在 URL 中：`?view=settings&tab=preferences`。激活标签页不存 localStorage——URL 往返即可恢复页面。
- 深链 scheme：外部触发可以深链到特定标签页：`qoder-work://settings/preferences`。Vera 的对应物可以是 `vera://settings/<tab>`。
- 不带 `tab` 参数打开时的默认标签页：`preferences`。
- 模态框关闭方式：Esc 键 + 点击外部背景；焦点限制在 `[role="dialog"]` 内。
- 遥测：选择标签页时触发 `settings_tab_view`；`settings_heartbeat` 每 300 秒发送一次带 feature-flag 快照的心跳。
- 保存：按控件保存，没有显式的批量 /「保存」按钮。renderer 每次变更时派发 IPC 写入；失败通过 toast 呈现。

---

## 7. 对 Vera 的启示

这份 RE 之所以重要，是因为 WAWQAQ 的要求——「加一个 系统设置 分区」——几乎正确，但参考实现里更深层的真相是：

**参考实现不会把系统级开关分散到各自狭小的页面里。** 它把它们全部收进一个超长的 `Preferences` 页面，并留出一个近乎空白的 `system` 标签页供未来扩展。

Vera 现在的 Settings 有 17 个导航项（其中 `网络`、`健康`、`开放网关`、`语音模型`、`每日回顾`、`记忆` 是单用途页面，正是 WAWQAQ 针对 `网络` 指出的「浪费的单用途页面」模式的翻版）。

更接近参考实现的做法是**合并**，而不是再加一个分区。具体提案：

### 提议的合并后 Vera Settings 导航（目标：约 9 项）

| 分组 | 项目 | 承载内容 |
|-------------|-------------|------------------------------------------------------------|
| 基础 | 通用 | 聚合页：隐身模式、启动行为、新对话模式、默认模型、通知、网络代理、保持唤醒、自动更新、关闭窗口行为 |
| 基础 | 外观 | 个性化 + theme + palette + font（合并 主题 + 个性化） |
| AI | 模型 | Provider 连接 + OAuth + 各模型配置 |
| AI | 记忆与回顾 | 合并 `记忆` + `每日回顾` |
| AI | 语音与网关 | 合并 `语音模型` + `开放网关` |
| 集成 | 机器人对话 | Telegram / WeChat / Slack bot 配置 |
| 集成 | 联网搜索 | Tavily provider 配置 |
| 数据/系统 | 数据 | 导出 / 导入 / 清除 |
| 数据/系统 | 权限与能力 | 能力开关 + 文件系统白名单 |
| 其他 | 健康 | 诊断 / 状态 / 日志 |
| 其他 | 关于 | 版本 + 许可证 + 致谢 |

具体来说：**去掉独立的 `网络` 页面，把代理移入 `通用`**。这是 WAWQAQ 要求的最低限度，但可以在同一个 PR 里顺带按参考实现把 `主题 + 个性化` 合并进 `外观`，因为 `外观` 是参考实现对该分组的正式名称。

### 要照抄的设置页主体配方

任何设置页主体都切换到：
- `max-w-3xl mx-auto pt-10 pb-16` 内层列
- 扁平行列表（每行 `flex items-center gap-3 px-4 py-3`）
- 标题 `text-sm font-medium` + 提示 `text-xs text-text-quaternary`
- 行组周围没有带边框的卡片
- 子区标题：`text-sm font-semibold mb-4`
- 开关 / 输入框 / 标签按上文 §4

这就是 WAWQAQ 让我们研究的视觉上「参考实现真好看」的模式——页面不杂乱，因为行没有装饰，只有间距。

---

## 8. PR 计划建议

两个 PR，按顺序发布：

**PR-SETTINGS-ALIGN-IA-0** —— 信息架构合并
- 去掉独立的 `网络` 页面；把代理并入 通用 的「网络代理」子区
- 合并 `主题 + 个性化` → `外观`
- 合并 `记忆 + 每日回顾` → `记忆与回顾`
- 合并 `语音模型 + 开放网关` → `语音与网关`
- 更新 SETTINGS_NAV + 分区渲染 switch + 所有深链（`vera://settings/...`）
- 用合同测试固定：导航 id 白名单 + 深链映射

**PR-SETTINGS-PAGE-BODY-0** —— 视觉模式转换
- 把所有页面主体从 `settingsStructuredPage / SettingRow` 的卡片外观转换为扁平行 + `max-w-3xl` 配方
- 在 styles.css 中添加 `.vera-settings-row`、`.vera-settings-page` 原语
- 全面改造所有 SettingsPage 组件以使用它们

按这个顺序处理，这样我们在打磨页面主体时信息架构就不会再变动。
