---
name: sketch
description: '快速 HTML 原型稿：生成 2-3 个设计变体对比选择。'
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# Sketch

当用户想在**确定方案之前先看看设计方向**时使用此技能——将 UI/UX 想法以可丢弃的 HTML 原型稿形式探索。核心目标是生成 2-3 个可交互的变体，让用户能并排对比不同的视觉方向，而不是产出可交付的代码。

当用户说"帮我草绘这个界面"、"给我看看 X 可能长什么样"、"对比布局 A 和 B"、"给这个 UI 出 2-3 个方案"、"让我看看几个变体"、"在我动手之前先出个原型稿"时，加载此技能。

## 何时不使用

- 用户要的是生产级组件 — 用 `claude-design` 或正经构建
- 用户要的是精修的单次 HTML 产物（落地页、演示页）— `claude-design`
- 用户要的是图表 — `excalidraw`、`architecture-diagram`
- 设计已经锁定 — 直接构建即可

## 如果用户安装了完整的 GSD 系统

如果 `gsd-sketch` 作为同级技能出现（通过 `npx get-shit-done-cc --the agent` 安装），优先使用 **`gsd-sketch`** 以获得完整工作流：持久的 `.planning/sketches/` 目录配 MANIFEST、前沿模式分析、跨历史草稿的一致性审查，以及与 GSD 其余部分的集成。本技能是轻量独立版本——不依赖状态机制的一次性草绘。

## 核心方法

```
需求收集  →  变体生成  →  正面对比  →  选出胜者（或迭代）
```

### 1. 需求收集（用户已给足信息时可跳过）

生成变体前，获取三样东西——一次问一个，别一股脑全问：

1. **感觉。** "这个界面该给人什么感觉？形容词、情绪、氛围。"——*"沉稳、杂志风、像 Linear"* 比 *"极简"* 传达的信息多得多。
2. **参考。** "哪些 App、网站或产品能体现你想象中的感觉？"——实际参考胜过抽象描述。
3. **核心动作。** "用户在这个界面上唯一最重要的事是什么？"——所有变体都应为此服务；做不到就是花架子。

每个回答之后简要回应，再问下一个。如果用户一开始就把三个都说清楚了，直接跳到变体生成。

### 2. 变体（2-3 个，不做 1 个，极少 4 个以上）

一次性产出 **2-3 个变体**。每个变体是一个完整的独立 HTML 文件。不要描述变体——直接构建。重点是对比。

每个变体应采取**不同的设计立场**，而非像素值的微调。三个好的变体轴线：

- **密度：** 紧凑 / 通透 / 超高密度（选两个对立极点）
- **重心：** 内容优先 / 行动优先 / 工具优先
- **美学：** 杂志风 / 实用主义 / 趣味感
- **布局：** 单栏 / 侧边栏 / 分屏
- **承载形式：** 卡片式 / 裸内容式 / 文档式

选定一条轴线，从两端拉开差距。两个只在强调色上不同的变体是浪费时间——用户根本分不出区别。

**变体命名：** 描述立场，而非编号。

```
sketches/
├── 001-沉稳杂志风/
│   ├── index.html
│   └── README.md
├── 001-实用高密风/
│   ├── index.html
│   └── README.md
└── 001-趣味分屏风/
    ├── index.html
    └── README.md
```

### 3. 做成真正的 HTML

每个变体是一个**单个自包含的 HTML 文件**：

- 内联 `<style>` — 无构建步骤，无外部 CSS
- 系统字体或通过 `<link>` 引入一个 Google Font
- 可通过 CDN 使用 Tailwind（`<script src="https://cdn.tailwindcss.com"></script>`）
- 真实感的假内容 — 真实句子、真实姓名，不用 "Lorem ipsum"
- **可交互**：链接可点击，悬停有反馈，至少一个状态切换（打开/关闭、筛选、切换开关）。一个冻结的静态图片比一个粗糙但能动起来的原型更糟糕。

在浏览器中打开。如果看起来有问题，修好再给用户看。

**视觉验证变体 — 使用 Agent 的浏览器工具。** 别写完 HTML 就指望它渲染正常；加载每个变体并亲自查看：

```
browser_navigate(url="file:///absolute/path/to/sketches/001-沉稳杂志风/index.html")
browser_vision(question="这个布局看起来干净可读吗？有没有明显的 bug（文字重叠、无样式元素、图片损坏）？")
```

`browser_vision` 返回页面上实际内容的 AI 描述以及截图路径——能捕获纯源码检查发现不了的布局 bug（例如字体导入静默失败、flex 容器塌陷）。修复并重新导航，直到每个变体看起来正常。

**默认 CSS reset + 系统字体栈**，快速起步：

```html
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                 "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #1a1a1a;
    background: #fafafa;
    line-height: 1.5;
  }
</style>
```

### 4. 变体 README

每个变体的 `README.md` 回答以下内容：

```markdown
## 变体：{立场名称}

### 设计立场
一句话说明驱动此变体的原则。

### 关键选择
- 布局：...
- 排版：...
- 色彩：...
- 交互：...

### 权衡取舍
- 擅长：...
- 短板：...

### 最适合
- 此变体实际服务的用户类型或用例场景
```

### 5. 正面对比

所有变体构建完成后，以对比形式呈现。不要只是罗列——**要有观点**：

```markdown
## 首页的三个方案

| 维度 | 沉稳杂志风 | 实用高密风 | 趣味分屏风 |
|------|-----------|-----------|-----------|
| 密度 | 低 | 高 | 中 |
| 主要操作可见性 | 低 | 高 | 中 |
| 可扫读性 | 高 | 中 | 低 |
| 感觉 | 沉稳、可信赖 | 锐利、工具感 | 亲切、有活力 |

**我的看法：** 实用高密风适合重度用户，沉稳杂志风适合内容导向的受众。趣味分屏风最弱——试图兼顾两者，结果两边都不靠。
```

让用户选出胜者，或将两个合并成混合方案，或要求再来一轮。

## 主题化（当项目已有视觉体系时）

如果用户已有主题（颜色、字体、Token），将共享 Token 放入 `sketches/themes/tokens.css`，并在每个变体中 `@import` 引入。Token 尽量精简：

```css
/* sketches/themes/tokens.css */
:root {
  --color-bg: #fafafa;
  --color-fg: #1a1a1a;
  --color-accent: #0066ff;
  --color-muted: #666;
  --radius: 8px;
  --font-display: "Inter", sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, sans-serif;
}
```

对一次性草稿别过度 Token 化——三个颜色加一个字体通常够了。

## 交互底线

草稿够格的交互标准是用户能：

1. **点击一个主要操作**，有可见反馈（状态变化、弹窗、toast、导航示意）
2. **看到一个有意义的状态切换**（筛选列表、切换模式、打开/关闭面板）
3. **悬停可识别的触发区域**（按钮、行、标签页）

超过这个标准就是对一次性产物的过度设计。未达标的就只是一张截图。

## 前沿模式（决定下一个画什么）

如果草稿已存在且用户问"接下来该画什么？"：

- **一致性缺口** — 两个来自不同草稿的获胜变体做了独立选择，尚未被整合到一起
- **未草绘的界面** — 被引用但从未被探索的页面
- **状态覆盖** — 快乐路径已草绘，但空态 / 加载中 / 错误态 / 1000 条数据态还没画
- **响应式缺口** — 仅验证了一个视口尺寸；在移动端 / 超宽屏上还行不行？
- **交互模式** — 静态布局有了；过渡动画、拖拽、滚动行为还没做

提出 2-4 个有名字的候选方向。让用户选择。

## 输出

- 在仓库根目录创建 `sketches/`（如果用户遵循 GSD 约定则用 `.planning/sketches/`）
- 每个变体一个子目录：`NNN-立场名称/index.html` + `README.md`
- 告诉用户如何打开：macOS 用 `open sketches/001-沉稳杂志风/index.html`，Linux 用 `xdg-open`，Windows 用 `start`
- 保持变体可丢弃——一个让你觉得必须保留的草稿应该升级为真正的项目代码，而非作为资产留存

**单个变体的典型工具调用序列：**

```
terminal("mkdir -p sketches/001-沉稳杂志风")
write_file("sketches/001-沉稳杂志风/index.html", "<!doctype html>...")
write_file("sketches/001-沉稳杂志风/README.md", "## 变体：沉稳杂志风\n...")
browser_navigate(url="file://$(pwd)/sketches/001-沉稳杂志风/index.html")
browser_vision(question="这个看起来怎么样？有没有明显的布局问题？")
```

每个变体重复此流程，然后呈现对比表格。

## 出处

改编自 GSD（Get Shit Done）项目的 `/gsd-sketch` 工作流 — MIT © 2025 Lex Christopherson（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）。完整 GSD 系统提供持久草稿状态、主题/变体模式参考和一致性审查工作流；通过 `npx get-shit-done-cc --the agent --global` 安装。
