---
name: pretext
description: '使用 @chenglou/pretext 构建创意浏览器演示——无 DOM 文本布局，适用于 ASCII 艺术、环绕障碍物的排版流、文字几何游戏、动态排版与文字驱动的生成艺术。产出单文件 HTML 演示。'
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# Pretext 创意演示

## 概述

[`@chenglou/pretext`](https://github.com/chenglou/pretext) 是一个由 Cheng Lou（React 核心团队、ReasonML、Midjourney）编写的 15KB 零依赖 TypeScript 库，专注于**脱离 DOM 的多行文本测量与布局**。它只做一件事：给定 `(text, font, width)`，返回换行位置、每行宽度、每个字素的位置以及总高度——全部通过 canvas 测量，无回流。

听起来像是底层工具。但它远不止于此。因为它快速且基于几何，它是一个**创意原语**：你可以让段落以 60fps 围绕移动的精灵回流，构建关卡几何由真实文字构成的游戏，让 ASCII 标志穿梭于散文中，利用精确到每个字素的起始位置将文字炸成粒子，或者打包自适应多行 UI 而无需任何 `getBoundingClientRect` 抖动。

这个技能存在的意义是让 Agent 能用它制作**酷炫的演示**——那种会被人们发到 X 上的东西。可参考 `pretext.cool` 和 `chenglou.me/pretext` 上的社区演示合集。

## 适用场景

以下情况请使用：
- 一个"pretext 演示"/"酷炫的 pretext 东西"/"文字即 X"
- 文字围绕移动形状流动（首屏区域、编辑排版、动态长文页面）
- 使用**真实词语或散文**的 ASCII 艺术效果，而非等宽光栅
- 游戏场地/障碍物/砖块由文字构成的游戏（字母俄罗斯方块、散文打砖块）
- 逐字形物理的动感排版（破碎、散开、聚集、流动）
- 排版生成艺术，尤其涉及非拉丁文字或混合文字
- 多行"自适应收缩"UI（刚好容纳文本的最小容器宽度）
- 任何需要在渲染前就知道换行位置的事情

以下情况不要用：
- CSS 已经能解决布局的静态 SVG/HTML 页面——直接用 CSS
- 富文本编辑器、通用内联格式化引擎（pretext 刻意保持窄范围）
- 图像转文字（使用 `ascii-art` / `ascii-video` 技能）
- 与文字无关的纯 canvas 生成艺术——使用 `p5js`

## 创意标准

这是浏览器中渲染的视觉艺术。Pretext 返回数字；**你来**画东西。

- **别交付一个"hello world"演示。** `hello-orb-flow.html` 模板只是*起点*。每个交付的演示必须添加有意的颜色、动态、构图，以及一个用户没提但会欣赏的视觉细节。
- **深色背景，暖色核心，考究的调色板。** 经典的琥珀色配黑色（CRT/终端风格）很好，冷白配深灰（编辑风格）和低饱和粉彩（risograph 风格）也不错。选定一种并贯彻到底。
- **比例字体才是重点。** Pretext 的整个氛围就是"非等宽"——尽情发挥。使用 Iowan Old Style、Inter、JetBrains Mono、Helvetica Neue，或一款可变字体。永远不要用默认无衬线字体。
- **真实来源/文本，而不是 Lorem Ipsum。** 语料库应该有含义。短宣言、诗歌、真实源代码、一篇现成的文字、库自身的 README——永远不要 `lorem ipsum`。
- **首帧即精品。** 没有加载状态，没有空白帧。演示在打开的那一刻就必须看起来能交付。

## 技术栈

每个演示一个自包含的 HTML 文件。无需构建步骤。

| 层 | 工具 | 用途 |
|-------|------|---------|
| 核心 | `@chenglou/pretext`（通过 `esm.sh` CDN） | 文本测量 + 行布局 |
| 渲染 | HTML5 Canvas 2D | 字形渲染、每帧合成 |
| 分段 | `Intl.Segmenter`（内置） | 表情符号 / 中日韩文字 / 组合标记的字素拆分 |
| 交互 | 原生 DOM 事件 | 鼠标 / 触摸 / 滚轮——无框架 |

```html
<script type="module">
import {
  prepare, layout,                   // 用例 1：简单高度
  prepareWithSegments, layoutWithLines,  // 用例 2a：固定宽度行
  layoutNextLineRange, materializeLineRange, // 用例 2b：流式 / 可变宽度
  measureLineStats, walkLineRanges,  // 无需字符串分配的统计
} from "https://esm.sh/@chenglou/pretext@0.0.6";
</script>
```

固定版本号。撰写时为 `@0.0.6`——如果演示行为异常，请前往 [npm](https://www.npmjs.com/package/@chenglou/pretext) 检查最新版本。

## 两大用例

几乎所有场景都可以归为这两种模式之一。请掌握两者。

### 用例 1 — 测量，然后用 CSS/DOM 渲染

```js
const prepared = prepare(text, "16px Inter");
const { height, lineCount } = layout(prepared, 320, 20);
```

你仍然让浏览器来绘制文字。Pretext 只告诉你在给定宽度下这个盒子会有多高，**无需**读取 DOM。适用于：
- 行内包含自动换行文本的虚拟列表
- 需要精确卡片高度的瀑布流布局
- "这个标签放得下吗？"的开发阶段检查
- 防止远程文本加载时的布局偏移

**务必保持 `font` 和 `letterSpacing` 与 CSS 完全同步。** canvas 的 `ctx.font` 格式（例如 `"16px Inter"`、`"500 17px 'JetBrains Mono'"`）必须与渲染的 CSS 一致，否则测量会漂移。

### 用例 2 — 测量*并*自己渲染

```js
const prepared = prepareWithSegments(text, FONT);
const { lines } = layoutWithLines(prepared, 320, 26);
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].text, 0, i * 26);
}
```

这是创意工作所在。你掌控绘制过程，因此可以：
- 渲染到 canvas、SVG、WebGL 或任何坐标系
- 对每个字形施加变换（旋转、抖动、缩放、透明度）
- 将行元数据（宽度、字素位置）用作几何数据

对于**每行宽度可变**的排列（文字围绕形状、文字在环形带中、文字在非矩形列中）：

```js
let cursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;
while (true) {
  const lineWidth = widthAtY(y);  // 你的函数：当前 y 位置通道有多宽？
  const range = layoutNextLineRange(prepared, cursor, lineWidth);
  if (!range) break;
  const line = materializeLineRange(prepared, range);
  ctx.fillText(line.text, leftEdgeAtY(y), y);
  cursor = range.end;
  y += lineHeight;
}
```

这是整个库中最重要的模式。它解锁了"文字围绕拖拽精灵流动"——那个在 X 上病毒式传播的演示。

### 值得了解的辅助函数

- `measureLineStats(prepared, maxWidth)` → `{ lineCount, maxLineWidth }` —— 最宽行的宽度，即多行自适应收缩宽度。
- `walkLineRanges(prepared, maxWidth, callback)` —— 遍历行而不分配字符串。当你不需要字符本身，只需对字素进行统计/物理运算时使用。
- `@chenglou/pretext/rich-inline` —— 同样的系统，但用于混合字体 / 标签 / @提及的段落。从子路径导入。

## 演示配方模式

社区演示合集（见 `references/patterns.md`）可归纳为几个强大的模式。从中选一个并发挥——除非被要求，否则不要发明新类别。

| 模式 | 核心 API | 示例创意 |
|---|---|---|
| **环绕障碍物回流** | `layoutNextLineRange` + 每行宽度函数 | 编辑段落围绕拖拽的光标精灵分流 |
| **文字即几何的游戏** | `layoutWithLines` + 每行碰撞矩形 | 每个砖块是一个被测量的单词的打砖块游戏 |
| **破碎 / 粒子** | `walkLineRanges` → 每字素 (x,y) → 物理 | 点击后句子炸成字母 |
| **ASCII 障碍物排版** | `layoutNextLineRange` + 每行障碍物跨度测量 | 位图 ASCII 标志、形状变形，以及可拖拽的线框物体，让文字围绕其实际几何形状展开 |
| **编辑排版多栏** | 每栏 `layoutNextLineRange` + 共享光标 | 带动画引文的杂志跨页 |
| **动感文字** | `layoutWithLines` + 每行随时间变换 | 星球大战滚动字幕、波浪、弹跳、故障效果 |
| **多行自适应收缩** | `measureLineStats` | 自动调整到最紧凑容器的引用卡片 |

可运行的起步文件见 `templates/donut-orbit.html` 和 `templates/hello-orb-flow.html`。

## 工作流程

1. **根据用户的简要需求从上方表格中选择一个模式。**
2. **从模板开始：**
   - `templates/hello-orb-flow.html` —— 文字围绕移动球体重排（环绕障碍物回流模式）
   - `templates/donut-orbit.html` —— 进阶示例：测量的 ASCII 标志障碍物、可拖拽线框球体/立方体、变形形状场、可选中的 DOM 文本以及仅供开发使用的控件
   - `write_file` 到 `/tmp/` 或用户工作区中的一个新 `.html` 文件。
3. **将语料库替换**为与需求贴合的文本。真实散文，10-100 句，不要 Lorem。
4. **调校美学**——字体、调色板、构图、交互。这是真正的工作；别跳过。
5. **本地验证**：
   ```sh
   cd <html文件所在目录> && python3 -m http.server 8765
   # 然后在浏览器打开 http://localhost:8765/<文件名>.html
   ```
6. **检查控制台**——如果 `prepareWithSegments` 传入了错误的字体字符串，pretext 会抛出错误；`Intl.Segmenter` 在每个现代浏览器中都可用。
7. **给用户展示文件路径**，而不只是代码——他们想要打开它。

## 性能注意事项

- `prepare()` / `prepareWithSegments()` 是昂贵的调用。每个文本+字体组合只需调用**一次**。缓存句柄。
- 尺寸变化时，只需重新运行 `layout()` / `layoutWithLines()`——永远不要重新 prepare。
- 对于文本不变但几何变化的逐帧动画，`layoutNextLineRange` 在紧凑循环中对正常长度的段落来说足够廉价，可以在 60fps 下每帧运行。
- 当逐帧渲染 ASCII 遮罩时，维护一个单元格缓冲区（`Uint8Array`/定型数组），从单元格或投影几何推导出每行障碍物跨度测量值，合并跨度，然后在绘制文本之前将这些跨度传入 `layoutNextLineRange`。
- 保持视觉动画和布局动画耦合。如果球体变形为立方体，用同一个值同时驱动渲染的单元格缓冲区和障碍物跨度；否则演示看起来像是贴上去的，而不是物理回流。
- 对于淡入淡出，优先使用图层透明度而非改变字形强度或障碍物缩放。将瞬态 ASCII 精灵放在独立的 canvas 上，用 CSS/GSAP 透明度来淡入淡出 canvas，这样几何不会看起来在收缩。
- Canvas 的 `ctx.font` 设置出乎意料地慢；如果字体不变，每帧设置**一次**，而不是每次 `fillText` 调用都设置。

## 常见陷阱

1. **CSS/canvas 字体字符串漂移。** `ctx.font = "16px Inter"` 测量了，但 CSS 写的是 `font-family: Inter, sans-serif; font-size: 16px`。如果 Inter 加载成功则没问题。但如果 Inter 404，CSS 会回退到 sans-serif，测量结果会漂移 5-20%。始终 `preload` 字体或使用 web-safe 字体族。

2. **在动画循环内重复 prepare。** 只有 `layout*` 是廉价的。每帧重新调用 `prepare` 会拖垮性能。将 prepared 句柄保持在模块作用域中。

3. **忘记用 `Intl.Segmenter` 进行字素拆分。** 表情符号、组合标记、中日韩文字——`"é".split("")` 会得到两个字符。在采样单个可见字形时，使用 `new Intl.Segmenter(undefined, { granularity: "grapheme" })`。

4. **`break: 'never'` 的 chip 没有 `extraWidth`。** 在 `rich-inline` 中，如果你对原子 chip/@提及使用了 `break: 'never'`，还必须提供 `extraWidth` 给 pill 的内边距——否则 chip 的边框会溢出容器。

5. **从 `unpkg` 使用 `@chenglou/pretext`，仅有 TypeScript 入口。** 使用 `esm.sh`——它会将 TS 导出编译为浏览器可用的 ESM。`unpkg` 会 404 或提供原始 TS。

6. **等宽回退悄悄抹杀了全部意义。** 看到等宽效果的用户，通常是他们的 CSS `font-family` 回退到了 `monospace`。通过 DevTools 验证实际渲染的字体。

7. **围绕形状排列时跳过行 vs 调整宽度。** 如果当前行通道太窄放不下一行，*跳过该行*（`y += lineHeight; continue;`），而不是向 `layoutNextLineRange` 传入一个极小的 maxWidth——pretext 会返回一个看起来断裂的单字素行。

8. **交付一个冷启动的演示。** 默认的首帧看起来像教程级别。添加：暗角、微妙的扫描线、空闲自动动画、一个精心挑选的交互响应（拖拽、悬停、滚动、点击）。缺少这些，"酷炫的 pretext 演示"就变成了"实习生复刻 README"。

## 验证清单

- [ ] 演示是单个自包含的 `.html` 文件——双击或用 `python3 -m http.server` 即可打开
- [ ] `@chenglou/pretext` 通过 `esm.sh` 导入，带锁定版本号
- [ ] 语料库是真实散文，非 lorem ipsum，且与演示概念匹配
- [ ] 传入 `prepare` 的字体字符串与 CSS 字体完全一致
- [ ] `prepare()` / `prepareWithSegments()` 只调用一次，不是每帧调用
- [ ] 深色背景 + 考究的调色板——不是默认的白色 canvas
- [ ] 至少一个交互响应（拖拽 / 悬停 / 滚动 / 点击）或空闲自动动画
- [ ] 已用 `python3 -m http.server` 本地测试，确认无控制台错误
- [ ] 在中等配置笔记本上达到 60fps（或记录了优雅降级方案）
- [ ] 一个用户没提的"额外用心"细节

## 参考资料：社区演示

以下可供克隆以获取灵感/模式（均为 MIT 或类似许可，来自 [pretext.cool](https://www.pretext.cool/)）：

- **Pretext Breaker** — 单词砖块打砖块 — `github.com/rinesh/pretext-breaker`
- **Tetris × Pretext** — `github.com/shinichimochizuki/tetris-pretext`
- **Dragon animation** — `github.com/qtakmalay/PreTextExperiments`
- **Somnai editorial engine** — `github.com/somnai-dreams/pretext-demos`
- **Bad Apple!! ASCII** — `github.com/frmlinn/bad-apple-pretext`
- **Drag-sprite reflow** — `github.com/dokobot/pretext-demo`
- **Alarmy editorial clock** — `github.com/SmisLee/alarmy-pretext-demo`

官方实验场：[chenglou.me/pretext](https://chenglou.me/pretext/)——手风琴、气泡、动态布局、编辑引擎、对齐方式对比、瀑布流、Markdown 聊天、富文本笔记。
