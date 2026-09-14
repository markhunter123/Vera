---
name: Vera
description: A companion command center for completing real work with agents.
colors:
  brand-mark: "#71a8fd"
  accent-light: "oklch(0.70 0.135 250)"
  accent-dark: "oklch(0.74 0.15 250)"
  primary: "oklch(0.52 0.135 250)"
  accent-solid-dark: "oklch(0.76 0.15 250)"
  on-accent-light: "#ffffff"
  on-accent-dark: "#171717"
  surface-raised-light: "oklch(1 0 0)"
  surface-base-light: "oklch(0.975 0 0)"
  surface-sunken-light: "oklch(0.945 0 0)"
  ink-light: "oklch(0.17 0.005 286)"
  surface-raised-dark: "oklch(0.205 0.004 286)"
  surface-overlay-dark: "oklch(0.225 0.004 286)"
  surface-base-dark: "oklch(0.18 0.004 286)"
  surface-sunken-dark: "oklch(0.14 0.004 286)"
  ink-dark: "oklch(0.95 0.004 286)"
  info-light: "oklch(0.50 0.13 240)"
  info-dark: "oklch(0.74 0.13 240)"
  success-light: "oklch(0.50 0.17 145)"
  success-dark: "oklch(0.60 0.17 145)"
  warning-light: "oklch(0.50 0.18 55)"
  warning-dark: "oklch(0.66 0.18 55)"
  destructive-light: "oklch(0.50 0.24 28)"
  destructive-dark: "oklch(0.70 0.19 22)"
typography:
  display-1: { fontSize: "28px", fontWeight: 400, lineHeight: 1.4286 }
  display-2: { fontSize: "25px", fontWeight: 400, lineHeight: 1.44 }
  display-3: { fontSize: "22px", fontWeight: 400, lineHeight: 1.4545 }
  heading-1: { fontSize: "20px", fontWeight: 600, lineHeight: 1.4 }
  heading-2: { fontSize: "18px", fontWeight: 600, lineHeight: 1.5556 }
  heading-3: { fontSize: "16px", fontWeight: 600, lineHeight: 1.5 }
  heading-4: { fontSize: "14px", fontWeight: 600, lineHeight: 1.4286 }
  heading-5: { fontSize: "12px", fontWeight: 600, lineHeight: 1.6667 }
  body: { fontSize: "14px", fontWeight: 400, lineHeight: 1.4286 }
  label: { fontSize: "14px", fontWeight: 500, lineHeight: 1.4286 }
  supporting: { fontSize: "12px", fontWeight: 400, lineHeight: 1.6667 }
  code: { fontSize: "14px", fontWeight: 400, lineHeight: 1.4286 }
  badge-label: { fontSize: "12px", fontWeight: 500, lineHeight: 1.6667 }
rounded:
  control: "6px"
  card: "10px"
  container: "12px"
  pill: "999px"
spacing: { space-0-5: "2px", space-1: "4px", space-1-5: "6px", space-2: "8px", space-2-5: "10px", space-3: "12px", space-4: "16px", space-5: "20px", space-6: "24px", space-8: "32px", space-10: "40px", space-12: "48px", space-16: "64px" }
components:
  button-default: { typography: "{typography.label}", rounded: "{rounded.card}", padding: "8px 12px", height: "32px" }
  button-primary-light: { backgroundColor: "{colors.primary}", textColor: "{colors.on-accent-light}", typography: "{typography.label}", rounded: "{rounded.card}", height: "32px" }
  button-primary-dark: { backgroundColor: "{colors.accent-solid-dark}", textColor: "{colors.on-accent-dark}", typography: "{typography.label}", rounded: "{rounded.card}", height: "32px" }
  input-default: { typography: "{typography.body}", rounded: "{rounded.card}", height: "32px" }
  badge: { typography: "{typography.badge-label}", rounded: "{rounded.pill}", padding: "0 8px", height: "20px" }
  card-default: { rounded: "{rounded.container}", padding: "12px" }
---
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

# 设计系统：Vera

## 1. 概述

**创意北极星：「同伴指挥中心」（The Companion Command Center）**

Vera 是一个用于与智能体一起指挥、监督并完成真实工作的桌面工作区。任务始终处于核心位置；活动、权限、失败、恢复和生成的工作都保持可检查，而不会把窗口变成一个监控仪表盘。

系统平静、原生、紧凑：在阅读与决策处留白充裕，在需要对比之处密度紧凑。人性化来自有用的语言与连贯性，而非模拟的人格。

本文档管辖默认的浅色与深色主题。可选调色板可以改变 canvas、ink、accent 与语义色，但必须保留它们的角色、对比度与层级。

**权威：** `vera-desktop/src/renderer/astryx-theme/veraTheme.ts` 拥有字体（type）、中性色重映射和主题级组件覆盖；`vera-desktop/src/renderer/vera-tokens.css` 拥有产品调色板、间距、圆角与产品动效；Astryx 拥有基础几何、状态与内部动效；产品源码拥有 Vera 特有的组合。生成的 `vera-desktop/src/renderer/astryx-theme/vera.css` 不是编辑权威。进入 Astryx 的桥接不只是一个文件：`veraTheme.ts` 重映射中性色栈，`vera-tokens.css` 桥接 accent 家族，`astryx-mount.css` 承载限定于命名容器的文本/图标/边框接缝。改变一个基础元素的绘制内容，意味着要检查全部三个文件。

frontmatter 是当前默认主题的快照。当它与源码或契约测试不一致时，以源码和测试为准，且本文档必须刷新。

## 2. 面层（Surfaces）

深度是一把梯子，不是装饰。每个背景都归入四个语义层级之一，均由 `--background` 累加偏移派生——调色板只覆盖 `--background`，梯子随之延伸。注意 `--background` 是卡片填充色，不是页面颜色；旧的面层名称是这些层级的别名，而该映射存在于 `vera-tokens.css`。

| 层级 | Token | 角色 |
|---|---|---|
| sunken | `--surface-sunken` | 板面内部凹陷的 chrome |
| base | `--surface-base` | 外壳地面：侧边栏 + 板面后的 canvas |
| raised | `--surface-raised` | 卡片、内容板、阅读面 |
| overlay | `--surface-overlay` | 菜单、popover、对话框、toast |

**高度法则。** 高度在两种模式中都单调映射到亮度，阅读面总是占据其模式中最亮的层级。在浅色模式中，梯子顶端为纯白，因此 `raised` 与 `overlay` 共享填充，overlay 的分离交给浮动配方（§5）。浅色模式中「越高 = 越暗」被永久禁止——它会让抬升阴影与填充自相矛盾。

**canvas 退让法则**（负责人决策 2026-06-20）。canvas 是灰色的；内容面是白色的。外壳地面是两种颜色：侧边栏与 canvas 共享 `base`，内容板位于 `raised` 上。canvas 与板面之间的对比是主要的分离手段。

**纸张。** `--surface-paper` 刻意放在梯子之外，且没有深色覆盖。它承载我们既不编写也不可反转其对比度的内容：沙箱化的 HTML 产物 iframe 与 PDF 嵌入，以及二维码——在这些场景中深色在浅色之上是扫码要求而非偏好。它不是第五个层级，应用 chrome 绝不使用它。

## 3. Ink

正文恰好使用三个层级——`--foreground`、`--foreground-secondary`、`--muted-foreground`——以均匀约 2 倍的对比度节奏间隔于 `--surface-raised` 之上，每一个在两种模式下都满足 WCAG AA。任何新层级都必须保持该节奏与该底线。

- **三层级阅读法则。** 正文使用 primary、secondary 或 muted。中性淡色是面层，不是额外的文本层级。`--foreground-dimmed` 已退役——它的调用点直接使用 secondary——并且绝不允许带着自己的定义回归（有契约测试）。
- **单一色彩空间法则。** token 家族内的每个派生都使用一种色彩空间（ink 用 `oklch`，有契约测试）。混用 `srgb` 与 `oklch` 派生会产生「同样的字面值，不同的数值」漂移，而梯子是最严重的地方，因为它的每一级只在相互参照时才有意义。
- **Astryx 的 `secondary` 不是这把梯子的 secondary。** `Text color="secondary"` 读取 `--color-text-secondary`，它解析为 `astryx-mount.css` 所桥接容器之外的固定中性字面值，以及容器之内的 `--muted-foreground`。两者都不是 `--foreground-secondary`。一个词，三种结果——所以按 token 选择 ink 层级，并把基础元素的 color 属性视为它自己的词汇。
- **链接使用实色 accent 层级**（`--accent-solid`），绝不使用原始 `--accent`——accent 标识交互，而实色层级是唯一在每种调色板上都满足文本对比度的 accent 变体。选区淡色或描边不是链接文本，由 `--accent` 派生——从链接名称派生面层，会让文本对比度规则悄无声息地支配一个背景。

## 4. 边框

三种强度，各司其职，像 ink 梯子一样以约 1.6 倍间隔：

- `--border-soft`（6% ink）：板面内部安静的分离——导轨、填充无法承载的行分隔线。
- `--border`（10% ink）：区域之间的结构性边界。
- `--border-strong`（16% ink）：强调 chrome——选中与激活描边、强调区域边界和滚动条滑块（§9）。它不是「拿不准时用的边框」，也不是通用用途的强调中性色：任何想要该强度中性**色调**的东西使用 `--foreground-alpha-16`。用 `background` 画出的细线仍然是边框，并保持边框身份。
- `--ring-soft` 是 1px 的环，以 soft 层级自己的 6% alpha 用 box-shadow（`0 0 0 1px`）绘制。它属于本章而非 §5：token 按职责归类，而非按它碰巧使用的 CSS 属性；边框上一个阴影形状的名称会吸引想要抬升效果的调用点。

**单一手段法则。** 每条边界只选一种分隔手段：填充层级、线条或阴影——绝不在同一条边上叠加。

## 5. 抬升（Elevation）

默认面层是平的。深度首先来自面层梯子，然后是一条线，只有当元素真正浮于平面之上时才是阴影。

- 三级，以职责命名：`--elevation-raised`、`--elevation-overlay`、`--elevation-drag`。产品 CSS 用这些名称，而不是底下的主题刻度——一个在调用点毫无意义的阴影名称，正是让刻度闲置数月而一个原始原子承担了全部工作的原因。
- **浮动配方。** 每个浮层面层（菜单、popover、对话框、toast）都是：`--surface-overlay` 填充 + `--border-soft` 环 + `--elevation-overlay` + `overflow: hidden` + 容器圆角。没有浮层自创配方，包括 Astryx 自己的共享层表面——它通过一个只提供钩子类名而不提供任何值的厂商补丁被约束在配方内，条款记录于 `patches/README.md`。提示气泡不在范围内：瞬时标签不是承载内容的面层。
- 深色模式在阴影之前依赖色调与环。霓虹边缘和万物抬升的风格被禁止。
- 原生外壳的 vibrancy 效果只允许用于指定的材质；通用毛玻璃效果不允许。

**单一工作平面法则。** 分隔线划分职责；卡片和阴影不把工作区分割成仪表盘网格。

## 6. 圆角

任何可交互的东西都不是方形。一把梯子，按盒高单调分配：

| 圆角 | Vera 层级 | Astryx 层级 | 分配对象 |
|---|---|---|---|
| 6px | control | inner | 标签块、键帽、嵌套内嵌，以及产品绘制的紧凑控件 |
| 10px | card | element | 卡片、卡片式行、列表容器；Astryx `Button`、`Input`、`SegmentedControl` |
| 12px | container | container | 模态框、面板、浮层面层；Astryx `Card`、`Dialog`、`DropdownMenu` |
| 28px | chat | chat | 对话面作为一个整体形状：用户气泡、助手气泡、输入区 dock。由 `ChatMessageBubble` 与 `ChatComposer` 自身从 Astryx 的 `--radius-chat` 取用；产品 CSS 绝不重述它 |
| full | pill（999px） | full（9999px） | 徽标、药丸、圆形控件 |

- **双名称法则。** 这是一把梯子下的两套词汇，名称从不一一对应：Vera 的 `control` 是 Astryx 的 `inner`，Vera 的 `card` 是 Astryx 的 `element`，Vera 的 `modal` 是 Astryx 的 `container`。从盒子（尺寸）反推层级，绝不由听起来对的 token 名称决定。成对的值今天一致，但它们是独立的字面值，不是别名——Astryx 升级可能悄然移动其中一侧，所以不匹配是真实的失效模式，而非不可能。chat 这一级是产品不指定的唯一层级：`ChatMessageBubble` 与 `ChatComposer` 都自行解析 `--radius-chat`，这正是气泡与输入区 dock 圆角一致的来由，也解释了为什么在产品代码中设置气泡圆角或非默认 `density` 会悄无声息地破坏这一对。Astryx 的 `--radius-page` 携带相同的 28px 字面值，但它是不同的 token，没有 Vera 层级，也没有产品消费者；为匹配对话面而伸手去用它，等于发明新的一级。
- **出血法则。** `border-radius: 0` 只允许用于真正的全出血行——元素在两侧与容器齐平。圆角与间隙一起变化：如果有呼吸空间，就要有圆角。
- **比例标识。** 产品绘制的图标板使用按比例拥有的圆角（盒边长的约 25–27%），以文字记录，因为 Stitch 只接受绝对值单位。

## 7. 排版

使用系统 UI 字体栈，并明确指定平台级 CJK 回退；Geist Variable 是最后回退。代码使用 Geist Mono Variable、JetBrains Mono，然后是平台等宽字体。中文与拉丁文必须读起来像同一个界面。

- **Display 1–3：** 罕见的大型陈述与空状态锚点。
- **Heading 1–6：** 页面、面板、章节与紧凑标题的层级，下至 11px 半粗的一级。
- **Body：** 对话与常规阅读。
- **Large：** 正文尺寸的引语，半粗——唯一高于 body 却不是标题的角色。
- **Label：** 控件与交互标签。
- **Supporting：** 元数据与紧凑的次要文本。
- **Code：** 代码、路径、命令、标识符和机器证据。

**用角色，不用轴向法则。** 选择 Astryx 文本角色，或由它组合出的 Vera 角色。绝不在产品调用点直接拼装字面字体、字号、字重或行高。

**四像素行法则。** 文本行框落在 4px 网格上。等宽字体是技术性的，绝不用于装饰。

**单一度量法则。** 行长是一个排版决策，因此应用只有一个阅读栏和一个对应 token：`--vera-reading-measure`。由容器持有它——一轮对话、输入区、一份报告——没有任何组件自带度量，因为组件内部的度量是它的容器无法覆盖的。一个栏上的两个度量，在读者看来就是两个右边距。

## 8. 颜色规范

调色板是冷中性、安静的；颜色按规范生成，而非凭肉眼挑选。

- **品牌标识**固定为 `#71a8fd`；它标识 Vera，绝不是通用的 CTA 颜色。
- **交互 accent** 跟随活动调色板，用于焦点、选中和实时状态；**链接和 accent 着色文本使用实色层级**（§3）。Astryx 自有的语义组件是例外——`Badge` 与 `StatusDot` 携带从中性主题继承的固定字面值，既不跟随调色板，也不跟随下面的家族。
- **状态家族**——`--info`、`--success`、`--warning`、`--destructive`——是生成的，不是挑选的：每个模式一个亮度，每种色相保持自己的彩度，每个成员都满足 AA。模式内部的残余对比度差异是色相物理——在相同亮度下，黄色比蓝色承载更多亮度——压平它会抛弃让它们成为一个家族的共享亮度前提。四个都在每个模式的一个代码块中声明，因为当 warning 与其兄弟相隔三十行时，它丢失了深色覆盖并在未被注意的情况下跌破 AA。一个约 90% 色域彩度的更响亮色带只用于 8px 状态圆点：圆点必须一眼可读，淡色不得喧哗。这些是颜色；状态**意味着**什么是另一套词汇（§9）。
- **淡色面层**（行与横幅后的状态淡色）由相同的状态色相派生；调用点手工拼写 `oklch()` 状态淡色被禁止——消费整个家族。家族是 `--{status}-wash`（0.08 填充）与 `--{status}-wash-border`（0.24，约为填充的 3 倍），每个成员都用 `oklch(from var(--{status}) ...)` 派生，使状态再生成贯通其中。**strong** 层级（0.12 / 0.40）只用于数据销毁或用户无法撤销的动作的警告，别无他用——它不是想要关注的通知所用的响亮选项。调色板色样不是淡色：色样的职责是展示调色板的真实颜色，所以其字面值保持不变。即使某一级还没有消费者，家族也保持完整：有洞的家族会把下一位作者推回手工拼写 alpha——这正是那十四个漂移值的病因。
- **身份色**（头像、渠道标记）处于 4.2–4.8:1 的对比度带内；弱化状态的去饱和发生在恒定的 OKLab 亮度下。

**信号而非纹理法则。** accent 传达动作或状态。绝不将它用作背景铺色、渐变、光晕，或作为层级的替代品。

## 9. 组件

使用 Astryx 基础元素作为默认接缝。新工作通过已发布的 props、token 与稳定的 `themeProps` 扩展点组合产品意义；内部 DOM 覆盖是公认的过渡状态，不是先例。

- **控件：** Vera 使用 20/24/28/32/36/40px 的高度标尺，32px 为默认值；Astryx 拥有 28/32/36px 变体。hover 保持克制；按下可使用 `scale(0.98)`；键盘焦点始终可见。每个控件至多一个反色（填充）元素。hover 淡色恰好两条道：产品行与控件使用 `--state-hover-bg`；必须与 Astryx 内部保持同步的 chrome 使用 `--color-overlay-hover`。手工混合的 hover alpha 是漂移。
- **字段：** 标签、描述与校验属于字段基础元素；输入焦点属于其控件。通过所属控件的 tooltip 保持禁用原因可被发现；不要在裸露的输入框周围重建字段 chrome。
- **徽标与状态：** Badge 高 20px，药丸形。按含义选择变体，而非按色相。
- **状态词汇：** 一个状态意味着什么，只命名一次，在 `vera-ui/src/status-vocabulary.ts` 中，每个状态圆点都通过它解析颜色——面层绝不把自己的领域状态映射到颜色上。语义是 `success`（已被证明健康）、`active`（系统正在工作）、`attention`（等待人处理）、`error`（当前已损坏）、`neutral`（已确定的事实）；把 `active` 与 `attention` 合并，正是这套词汇存在所要防止的错误。它刻意没有 `info`——两个调用方对它含义相反——但这是关于**圆点语义**的陈述，而非关于仍在使用中的 `--info` 颜色。注意 Astryx 的 `Badge` 与 `StatusDot` 渲染固定的继承字面值，所以 Astryx 的 `info` 药丸与 Vera 的 `--info` 是两个只是看起来像的无关蓝色；圆点的颜色不来自 §8 的家族。
- **计数器：** 计数比其标签小一级、更安静（辅助角色、弱化 ink、`tabular-nums`），并随父元素的激活状态回到全强度 ink。绝不超过它所计数的标签的粗度。
- **滚动条：** 应用级唯一配方——6px 药丸（10px 命中区域，2px 透明内缩），滑块使用 `--border-strong`，hover 时深一级，无绘制轨道。面层可以隐藏自己的滚动条；没有一个可以重排它。
- **卡片：** Astryx Card 使用容器圆角、12px 默认内边距，静止时无抬升。Astryx 组件拥有自己的几何。
- **工作区：** 对话、工具活动、产物、浏览器状态和生成的文件始终与产生它们的任务保持关联。助手消息保持安静、无头像。
- **自定义同伴：** 桌面宠物是唯一的吉祥物例外：用户提供、默认禁用、纯装饰、指针穿透、对辅助技术隐藏，并感知 reduced-motion。它绝不传达必需状态，也不替智能体发声。

## 10. 空状态与加载状态

缺失与等待都是真实内容的状态，两者都由 Astryx 基础元素组合——绝不手工拼造。

### 空状态：三个层级，一个组件

每个空状态都是 Astryx `EmptyState`；层级是参数组合，不是新组件、包装器或重造其布局的产品 CSS。层级数量为三且并非随意，因为组件的 props 恰好提供两个真正的步骤——添加描述与添加动作。这就是规范的反膨胀锁：第四个层级是一个组件变更提案，而非随意决定。

| 层级 | 用途 | `icon` | `description` | `actions` | `isCompact` |
|---|---|---|---|---|---|
| 1 内联 | 某个板块的局部缺失 | 无 | 无 | 无 | 是 |
| 2 面板 | 整个列表/面板/检查器为空 | 有 | 有 | 无 | 否 |
| 3 首次运行 | 页面存在的理由尚未发生 | 有 | 有 | 恰好一个 | 否 |

- **第 1 级不带图标。** 两套参照系统独立地在此收敛：局部缺失不得被放大为事件——正是这一点让三个层级保持为三（第 1 级放上图标后，它与第 2 级之间就只剩一个描述之差）。
- **没有第 4 级。** 没有第二个按钮、没有额外链接、动作下方没有帮助说明。其他值得一提的都放进 `description`。
- **没有插图。** `icon` 槽位只接受图标字形——绝不接受插图、大图形或品牌标识。
- **搜索/筛选空状态始终携带清除动作**（`ghost` + `sm`），无论哪个层级。这是可用性，不是装饰：用户处于自己造成的状态，必须能够退出。典型例子是 MCP 市场（marketplace）的无匹配状态。用 ghost/小尺寸，因为清除是一次退出，不是页面的主要动作。
- **标题是不带句号的名词短语**；`description` 承载完整句子，可以复述用户的查询。`headingLevel` 跟随文档大纲层级（与 §9 相邻；已在排版章节的层级中批准），绝不用钉死的数字。
- 聊天首次运行 hero 是经过批准的例外：提示建议 hero 在设计上超出第 3 级的单一动作，并拥有自己的布局；其他任何东西都没有。

### 加载：预留给就绪状态的几何

加载状态占据就绪内容将要占据的同一个盒子——加载就是处于未就绪状态的同一个盒子，不是填充物。硬性标准：从加载切换到就绪产生零布局偏移。这可以截图验证，并按此评审。

三种互斥形式，按结构可预测性选择——绝不按预期速度：

| 形式 | 何时 | 几何 |
|---|---|---|
| 骨架屏 | 结构可预测（已知的行/卡片） | 条高编码类型（10/12/16）；行数是该面层实测的就绪状态常量，绝不是全局默认值——一行骨架屏在到达时会撑大页面，违反上述标准 |
| 旋转指示器 | 结构不可预测（单个结果、大小未知的主体） | 只有三种放置：内联（元数据图标大小）、页面居中大尺寸、或卡片内一行安静的弱化文字（仅限块级不可预测内容——列表始终使用骨架屏） |
| `isLoading` | 忙碌按钮与可按下控件 | 始终使用 Astryx prop——没有手工替换的标签、图标，或禁用加旋转指示器的重建 |

- 一个区域绝不同时显示骨架屏与旋转指示器。
- 一个没人读取的状态属性比没有更糟——它会让下一位读者相信反馈已经存在。把状态标记（`data-pending` 及其同类）接入可见反馈，或者删除它们。

## 11. 该做的与不该做的

### 该做：

- **要**让任务、智能体状态、权限、失败、恢复和产出的工作保持显而易见。
- **要**以紧凑控件和利于对比的密度保留充裕的阅读空间。
- **要**扩展 Astryx 基础元素与已确立的 Vera 组合位。
- **要**保留键盘焦点、禁用原因、加载与错误状态，以及 reduced-motion 行为。
- **要**把可选调色板清单保留在源码中，同时保持文档化的角色与对比度。

### 不该做（禁止清单——部分条目有契约测试，其余在评审中拦截）：

- **不要**在调用点写裸的 `oklch()` 状态颜色，或手工拼写状态淡色——消费整个家族（§8）。
- **不要**在非全出血行上使用 `border-radius: 0`（§6）。
- **不要**在空状态图标槽位放插图、在第 3 级单一动作之外添加任何东西，或交付没有可见反馈的状态属性（§10）。
- **不要**硬编码 `background: white` 或任何字面面层颜色——解析一个梯子层级（§2），或当内容的自身对比度不归我们控制（外部文档、二维码）且反色会破坏内容而非重排内容时，使用 `--surface-paper`。
- **不要**在单个控件中放置超过一个反色元素。
- **不要**在一个 token 家族内混用 `srgb` 与 `oklch` 派生（§3）。
- **不要**让浅色模式的「更高」变暗（§2）、在一条边上堆叠两种分隔（§4），或发明浮层配方（§5）。
- **不要**使用通用 AI 渐变、发光边框、闪光、装饰性「思考」，或默认毛玻璃效果。
- **不要**通过吉祥物、虚假情绪、过度的头像或聊天装饰把智能体拟人化；可选的用户自供宠物是唯一例外。
- **不要**把每个区域都变成卡片，或把每个状态都变成彩色药丸。
- **不要**引入另一个 accent、间距标尺、圆角层级、图标体系、文本轴向、阅读度量或并行组件路径（§7）。
- **不要**把基础元素内部实现、进度、版本、调色板清单或面层清单复制进本文档。
