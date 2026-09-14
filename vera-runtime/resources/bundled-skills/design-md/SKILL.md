---
name: design-md
description: '创作/校验/导出 Google DESIGN.md 令牌规范文件。'
category: '开发'
metadata:
  source: invt-ai-platform
---

# DESIGN.md 技能

DESIGN.md 是 Google 的开放规范（Apache-2.0 许可，`google-labs-code/design.md`），用于向编码 Agent 描述视觉标识体系。一个文件就融合了：

- **YAML 前置元数据** — 机器可读的设计令牌（规范性值）
- **Markdown 正文** — 人类可读的设计理由，按规范章节组织

令牌给出精确的值，而正文告诉 Agent *为什么*这些值存在以及如何应用它们。CLI（`npx @google/design.md`）负责校验结构 + WCAG 对比度、对版本进行差异对比以检测回归问题，并导出为 Tailwind 或 W3C DTCG JSON 格式。

## 何时使用此技能

- 用户要求生成 DESIGN.md 文件、设计令牌或设计系统规范
- 用户希望跨多个项目或工具保持一致的 UI/品牌风格
- 用户粘贴了一份现有的 DESIGN.md，并要求进行校验、差异对比、导出或扩展
- 用户希望将样式指南转换为 Agent 可消费的格式
- 用户希望对调色板进行对比度 / WCAG 无障碍验证

如果是纯粹寻找视觉灵感或布局示例，请改用 `popular-web-designs`。如果是从零开始设计一次性 HTML 制品（原型、演示文稿、落地页、组件实验室）时涉及*流程与品味*，请使用 `claude-design`。本技能专门针对*正式规范文件*本身。

## 文件结构

```md
---
version: alpha
name: Heritage
description: 建筑极简主义与新闻纪实气质的融合。
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: Public Sans
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body-md:
    fontFamily: Public Sans
    fontSize: 1rem
rounded:
  sm: 4px
  md: 8px
  lg: 16px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
---

## 概述

建筑极简主义与新闻纪实气质的融合……

## 颜色

- **主色 (#1A1C1E)：** 深墨色，用于标题和核心文本。
- **第三色 (#B8422E)：** "波士顿陶土色" — 交互操作的唯一驱动力。

## 字体排版

全部使用 Public Sans，小型全大写标签除外……

## 组件

`button-primary` 是页面上唯一的高强调度操作……
```

## 令牌类型

| 类型 | 格式 | 示例 |
|------|--------|---------|
| 颜色 | `#` + 十六进制 (sRGB) | `"#1A1C1E"` |
| 尺寸 | 数字 + 单位（`px`、`em`、`rem`） | `48px`、`-0.02em` |
| 令牌引用 | `{路径.到.令牌}` | `{colors.primary}` |
| 字体排版 | 对象，包含 `fontFamily`、`fontSize`、`fontWeight`、`lineHeight`、`letterSpacing`、`fontFeature`、`fontVariation` | 见上方示例 |

组件属性白名单：`backgroundColor`、`textColor`、`typography`、`rounded`、`padding`、`size`、`height`、`width`。变体（hover、active、pressed）是带有相关键名的**独立组件条目**（如 `button-primary-hover`），而非嵌套结构。

## 规范章节顺序

章节均为可选，但已存在的章节**必须**按以下顺序出现。重复的标题会导致文件被拒绝。

1. 概述（别名：品牌与风格）
2. 颜色
3. 字体排版
4. 布局（别名：布局与间距）
5. 海拔与深度（别名：海拔）
6. 形状
7. 组件
8. 该做与不该做

未知章节会被保留，不会报错。未知令牌名称如果值类型有效则接受。未知组件属性会产生警告。

## 工作流：编写新的 DESIGN.md

1. **询问用户**（或自行推断）品牌基调、强调色和字体排版方向。如果用户提供了网站、图片或氛围感，将其转化为上述令牌结构。
2. **在用户项目根目录中写入 `DESIGN.md`**，使用 `write_file`。务必包含 `name:` 和 `colors:`；其他章节可选但推荐添加。
3. **在 `components:` 章节中使用令牌引用**（如 `{colors.primary}`），而不是重复输入十六进制颜色值。保持调色板单一来源。
4. **进行校验**（见下文）。在返回前修复所有断开的引用或 WCAG 不合规问题。
5. **如果用户已有项目**，同时在文件旁边写入 Tailwind 或 DTCG 导出文件（`tailwind.theme.json`、`tokens.json`）。

## 工作流：校验 / 差异对比 / 导出

CLI 工具为 `@google/design.md`（Node）。使用 `npx` — 无需全局安装。

```bash
# 校验结构 + 令牌引用 + WCAG 对比度
npx -y @google/design.md lint DESIGN.md

# 比较两个版本，出现回归时失败退出（exit 1 = 回归）
npx -y @google/design.md diff DESIGN.md DESIGN-v2.md

# 导出为 Tailwind 主题 JSON
npx -y @google/design.md export --format tailwind DESIGN.md > tailwind.theme.json

# 导出为 W3C DTCG（设计令牌格式模块）JSON
npx -y @google/design.md export --format dtcg DESIGN.md > tokens.json

# 输出规范本身 — 适用于注入到 Agent 提示词中
npx -y @google/design.md spec --rules-only --format json
```

所有命令都接受 `-` 作为标准输入。`lint` 在出现错误时返回 exit 1。如果需要结构化地报告发现的问题，可使用 `--format json` 标志并解析输出。

### 校验规则参考（7 条规则所覆盖的内容）

- `broken-ref`（错误）— `{colors.missing}` 指向了不存在的令牌
- `duplicate-section`（错误）— 同一 `## 标题` 出现了两次
- `invalid-color`、`invalid-dimension`、`invalid-typography`（错误）
- `wcag-contrast`（警告/信息）— 组件 `textColor` 与 `backgroundColor` 的对比度相对于 WCAG AA（4.5:1）和 AAA（7:1）的达标情况
- `unknown-component-property`（警告）— 超出上述白名单范围

当用户关心无障碍性时，在总结中明确提及此项 — WCAG 发现是使用 CLI 最有分量的理由。

## 常见陷阱

- **不要嵌套组件变体。** `button-primary.hover` 是错误的；`button-primary-hover` 作为同级键才是正确的。
- **十六进制颜色必须是带引号的字符串。** 否则 YAML 会对 `#` 解析出错，或将 `#1A1C1E` 这类值异常截断。
- **负尺寸值也需要引号。** `letterSpacing: -0.02em` 会被解析为 YAML 流 — 应写为 `letterSpacing: "-0.02em"`。
- **章节顺序是强制的。** 如果用户给你的正文顺序是乱的，在保存之前按规范顺序重新排列。
- **`version: alpha` 是当前规范版本**（截至 2026 年 4 月）。规范标记为 alpha — 注意可能会有破坏性变更。
- **令牌引用按点分隔路径解析。** `{colors.primary}` 有效；`{primary}` 无效。

## 规范权威来源

- 仓库：https://github.com/google-labs-code/design.md（Apache-2.0）
- CLI：npm 上的 `@google/design.md`
- 生成的 DESIGN.md 文件的许可：遵循用户项目使用的许可；规范本身使用 Apache-2.0。
