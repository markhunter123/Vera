---
name: architecture-diagram
description: '暗色主题 SVG 架构图/云架构/基础设施图，输出为 HTML。'
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# 架构图技能

生成专业的暗色主题技术架构图，以独立 HTML 文件形式呈现，内嵌 SVG 图形。无需外部工具、无需 API 密钥、无需渲染库——只需编写 HTML 文件并在浏览器中打开即可。

## 适用范围

**最适合：**
- 软件系统架构（前端 / 后端 / 数据库层）
- 云基础设施（VPC、区域、子网、托管服务）
- 微服务 / 服务网格拓扑
- 数据库 + API 地图、部署图
- 任何技术基础设施相关的主题，且适合暗色网格背景的审美风格

**以下场景优先考虑其他方案：**
- 物理、化学、数学、生物或其他科学类主题
- 物理对象（车辆、硬件、解剖图、剖面图）
- 平面图、叙事旅程、教育/教科书风格的视觉呈现
- 手绘白板草图（可考虑 `excalidraw`）
- 动画演示（可考虑动画技能）

如果有更专业的技能适用于当前主题，请优先使用。如果没有匹配的技能，本技能也可作为通用 SVG 图表备选方案——只不过输出会带有下文所述的暗色技术美学风格。

基于 [Cocoon AI 的 architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator)（MIT 许可）。

## 工作流

1. 用户描述其系统架构（组件、连接、技术栈）
2. 按照下方的设计体系生成 HTML 文件
3. 使用 `write_file` 保存为 `.html` 文件（例如 `~/architecture-diagram.html`）
4. **如果用户希望在聊天中查看/分享图表（Web 控制台、企业微信、钉钉、飞书、Telegram 等）：调用 `render_html_image(filePath="<html 文件路径>", filename="<名称>")`** 并返回它生成的 markdown 链接。IM 渠道只能原生投递栅格化图片，因此需要 PNG 格式才能使图表以内联方式显示，而不是死链或文件附件。
5. 否则，用户直接在浏览器中打开 `.html` 文件——离线运行，无依赖。

### 输出位置

将图表保存到用户指定的路径，或默认保存到当前工作目录：
```
./[项目名称]-architecture.html
```

### 通过聊天 / IM 渠道交付

当当前渠道不是本地浏览器会话时，在 `write_file` 之后紧接着执行：

```
render_html_image(filePath="./architecture-diagram.html", filename="architecture")
```

这将返回一个带有 `image/png` MIME 类型的 `/api/v1/files/generated/<id>` URL。渠道层检测到图片 MIME 后会将 PNG 作为原生图片消息上传（从而在企业微信 / 钉钉 / 飞书 / Telegram / Web 中以内联方式渲染）。如果没有这一步，`.html` 制品到达 IM 渠道时要么是无效的 markdown 链接，要么顶多是一个无法预览的文件附件。

### 本地预览

保存后，用户可以直接打开 `.html` 文件：
```bash
# macOS
open ./my-architecture.html
# Linux
xdg-open ./my-architecture.html
```

## 设计体系与视觉语言

### 调色板（语义映射）

使用特定的 `rgba` 填充和 hex 描边来区分类别组件：

| 组件类型 | 填充 (rgba) | 描边 (Hex) |
| :--- | :--- | :--- |
| **前端** | `rgba(8, 51, 68, 0.4)` | `#22d3ee` (cyan-400) |
| **后端** | `rgba(6, 78, 59, 0.4)` | `#34d399` (emerald-400) |
| **数据库** | `rgba(76, 29, 149, 0.4)` | `#a78bfa` (violet-400) |
| **AWS/云** | `rgba(120, 53, 15, 0.3)` | `#fbbf24` (amber-400) |
| **安全** | `rgba(136, 19, 55, 0.4)` | `#fb7185` (rose-400) |
| **消息总线** | `rgba(251, 146, 60, 0.3)` | `#fb923c` (orange-400) |
| **外部** | `rgba(30, 41, 59, 0.5)` | `#94a3b8` (slate-400) |

### 排版与背景
- **字体：** JetBrains Mono（等宽字体），从 Google Fonts 加载
- **字号：** 12px（名称）、9px（子标签）、8px（注释）、7px（微小标签）
- **背景：** Slate-950 (`#020617`)，带有微妙的 40px 网格图案

```svg
<!-- 背景网格图案 -->
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5"/>
</pattern>
```

## 技术实现细节

### 组件渲染
组件为圆角矩形（`rx="6"`），描边宽度 1.5px。为防止箭头透过半透明填充显示，使用**双矩形遮罩技术**：
1. 绘制一个不透明背景矩形（`#0f172a`）
2. 在其上绘制半透明的带样式矩形

### 连接规则
- **Z 轴顺序：** 在 SVG 中尽早绘制箭头（在网格之后），使其渲染在组件框后面
- **箭头：** 通过 SVG marker 定义
- **安全流：** 使用 rose 色的虚线（`#fb7185`）
- **边界：**
  - *安全组：* 虚线（`4,4`），rose 色
  - *区域：* 大虚线（`8,4`），amber 色，`rx="12"`

### 间距与布局逻辑
- **标准高度：** 60px（服务）；80-120px（大型组件）
- **垂直间距：** 组件之间至少 40px
- **消息总线：** 必须放置在各服务之间的间隙中，不能与服务重叠
- **图例位置：** **关键。** 必须放置在所有边界框之外。计算所有边界中最底的 Y 坐标，将图例放置在其下方至少 20px 处。

## 文档结构

生成的 HTML 文件遵循四部分布局：
1. **头部：** 带有脉冲圆点指示器和副标题的标题
2. **主 SVG：** 包含在圆角边框卡片内的图表
3. **摘要卡片：** 图表下方的三卡片网格，用于展示高层次细节
4. **页脚：** 最简元数据

### 信息卡片模式
```html
<div class="card">
  <div class="card-header">
    <div class="card-dot cyan"></div>
    <h3>标题</h3>
  </div>
  <ul>
    <li>• 条目一</li>
    <li>• 条目二</li>
  </ul>
</div>
```

## 输出要求
- **单文件：** 一个自包含的 `.html` 文件
- **无外部依赖：** 所有 CSS 和 SVG 必须内联（Google Fonts 除外）
- **无 JavaScript：** 动画（如脉冲圆点）使用纯 CSS
- **兼容性：** 必须在任何现代 Web 浏览器中正确渲染

## 模板参考

加载完整的 HTML 模板以获取精确结构、CSS 和 SVG 组件示例：

```
skill_view(name="architecture-diagram", file_path="templates/template.html")
```

该模板包含每种组件类型（前端、后端、数据库、云、安全）的工作示例、箭头样式（标准、虚线、曲线）、安全组、区域边界和图例——生成图表时请将其作为结构参考。
