---
name: baoyu-comic
description: '知识漫画：教育科普、人物传记、教程图解。'
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# 知识漫画创作器

改编自 [baoyu-comic](https://github.com/JimLiu/baoyu-skills)，适配 agent Agent 的工具生态。

创作原创知识漫画，支持灵活的艺术风格 × 基调组合。

## 适用场景

当用户要求创作知识/教育漫画、传记漫画、教程漫画，或使用"知识漫画""教育漫画""Logicomix 风格"等术语时触发此技能。用户提供内容（文本、文件路径、URL 或主题），并可选择性指定艺术风格、基调、布局、画面比例或语言。

## 参考图片

agent 的 `image_generate` 工具是**纯提示词**模式——它接受文本提示词和画面比例，返回图片 URL。该工具**不**接受参考图片。当用户提供参考图片时，用它来**提取文字特征**并嵌入到每页提示词中：

**接收**：当用户提供时接受文件路径（或在对话中粘贴图片）。
- 文件路径 → 复制到 `refs/NN-ref-{slug}.{ext}`，与漫画输出放在一起以保留来源
- 粘贴图片且无路径 → 通过 `clarify` 询问用户路径，或将风格特征以文字形式口头提取作为文本回退方案
- 无参考图片 → 跳过本节

**使用模式**（每条参考）：

| 用法 | 效果 |
|-------|--------|
| `style` | 提取风格特征（线条处理、纹理、氛围）并追加到每页的提示词正文中 |
| `palette` | 提取十六进制颜色并追加到每页的提示词正文中 |
| `scene` | 提取场景构图或主题备注并追加到相关页面的提示词中 |

**当有参考图片时，在每页提示词 frontmatter 中记录**：

```yaml
references:
  - ref_id: 01
    filename: 01-ref-scene.png
    usage: style
    traits: "柔和的大地色调，边缘柔和的墨染效果，低对比度背景"
```

角色一致性由 `characters/characters.md` 中的**文字描述**驱动（在步骤 3 中编写），这些描述会被内嵌到每页提示词中（步骤 5）。步骤 7.1 中生成的可选 PNG 角色设定图是供人审阅的产物，并非 `image_generate` 的输入。

## 选项

### 视觉维度

| 选项 | 值 | 说明 |
|--------|--------|-------------|
| 艺术风格 | ligne-claire（默认）、manga、realistic、ink-brush、chalk、minimalist | 艺术风格 / 渲染技法 |
| 基调 | neutral（默认）、warm、dramatic、romantic、energetic、vintage、action | 氛围 / 情绪 |
| 布局 | standard（默认）、cinematic、dense、splash、mixed、webtoon、four-panel | 分镜排列方式 |
| 画面比例 | 3:4（默认，竖版）、4:3（横版）、16:9（宽屏） | 页面宽高比 |
| 语言 | auto（默认）、zh、en、ja 等 | 输出语言 |
| 参考图片 | 文件路径 | 用于风格 / 调色板特征提取的参考图片（不传递给图片模型）。参见上方[参考图片](#参考图片)。 |

### 部分工作流选项

| 选项 | 说明 |
|--------|-------------|
| 仅分镜脚本 | 仅生成分镜脚本，跳过提示词和图片 |
| 仅提示词 | 生成分镜脚本 + 提示词，跳过图片 |
| 仅图片 | 从已有提示词目录生成图片 |
| 重新生成 N | 仅重新生成指定页面（如 `3` 或 `2,5,8`） |

详情见：[references/partial-workflows.md](references/partial-workflows.md)

### 艺术风格、基调与预设目录

- **艺术风格**（6 种）：`ligne-claire`、`manga`、`realistic`、`ink-brush`、`chalk`、`minimalist`。完整定义见 `references/art-styles/<style>.md`。
- **基调**（7 种）：`neutral`、`warm`、`dramatic`、`romantic`、`energetic`、`vintage`、`action`。完整定义见 `references/tones/<tone>.md`。
- **预设**（5 种），包含超出简单风格+基调组合的特殊规则：

  | 预设 | 等效组合 | 特色 |
  |--------|-----------|------|
  | `ohmsha` | manga + neutral | 视觉隐喻，无大头对话，装置揭秘 |
  | `wuxia` | ink-brush + action | 真气效果，战斗画面，意境渲染 |
  | `shoujo` | manga + romantic | 装饰元素，眼部细节，浪漫节拍 |
  | `concept-story` | manga + warm | 视觉符号系统，成长弧线，对话与动作平衡 |
  | `four-panel` | minimalist + neutral + four-panel 布局 | 起承转合结构，黑白+点缀色，火柴人角色 |

  完整规则见 `references/presets/<preset>.md`——选中预设后加载对应文件。

- **兼容性矩阵**和**内容信号 → 预设**表格位于 [references/auto-selection.md](references/auto-selection.md)。在步骤 2 推荐组合前先阅读该文件。

## 文件结构

输出目录：`comic/{topic-slug}/`
- Slug：主题的 2-4 个词 kebab-case（如 `alan-turing-bio`）
- 冲突：追加时间戳（如 `turing-story-20260118-143052`）

**内容**：
| 文件 | 说明 |
|------|-------------|
| `source-{slug}.md` | 保存的源内容（kebab-case slug 与输出目录一致） |
| `analysis.md` | 内容分析 |
| `storyboard.md` | 分镜脚本，含分镜拆解 |
| `characters/characters.md` | 角色定义 |
| `characters/characters.png` | 角色参考设定图（从 `image_generate` 下载） |
| `prompts/NN-{cover\|page}-[slug].md` | 生成提示词 |
| `NN-{cover\|page}-[slug].png` | 生成的图片（从 `image_generate` 下载） |
| `refs/NN-ref-{slug}.{ext}` | 用户提供的参考图片（可选，用于保留来源） |

## 语言处理

**检测优先级**：
1. 用户指定的语言（显式选项）
2. 用户对话语言
3. 源内容语言

**规则**：在所有交互中使用用户的输入语言：
- 分镜大纲与场景描述
- 图片生成提示词
- 用户选项与确认
- 进度更新、问题、错误、摘要

技术术语保留英文。

## 工作流

### 进度清单

```
漫画进度：
- [ ] 步骤 1：设置与分析
  - [ ] 1.1 分析内容
  - [ ] 1.2 检查已有目录
- [ ] 步骤 2：确认 - 风格与选项 ⚠️ 必需
- [ ] 步骤 3：生成分镜脚本 + 角色
- [ ] 步骤 4：审阅大纲（条件性）
- [ ] 步骤 5：生成提示词
- [ ] 步骤 6：审阅提示词（条件性）
- [ ] 步骤 7：生成图片
  - [ ] 7.1 生成角色设定图（如需要）→ characters/characters.png
  - [ ] 7.2 生成页面（角色描述嵌入提示词中）
- [ ] 步骤 8：完成报告
```

### 流程

```
输入 → 分析 → [检查已有？] → [确认：风格 + 审阅] → 分镜脚本 → [审阅？] → 提示词 → [审阅？] → 图片 → 完成
```

### 步骤摘要

| 步骤 | 操作 | 关键输出 |
|------|--------|------------|
| 1.1 | 分析内容 | `analysis.md`、`source-{slug}.md` |
| 1.2 | 检查已有目录 | 处理冲突 |
| 2 | 确认风格、重点、受众、审阅 | 用户偏好 |
| 3 | 生成分镜脚本 + 角色 | `storyboard.md`、`characters/` |
| 4 | 审阅大纲（如要求） | 用户批准 |
| 5 | 生成提示词 | `prompts/*.md` |
| 6 | 审阅提示词（如要求） | 用户批准 |
| 7.1 | 生成角色设定图（如需要） | `characters/characters.png` |
| 7.2 | 生成页面 | `*.png` 文件 |
| 8 | 完成报告 | 摘要 |

### 用户提问

使用 `clarify` 工具确认选项。由于 `clarify` 每次只处理一个问题，先问最重要的问题，然后依次进行。完整步骤 2 问题集见 [references/workflow.md](references/workflow.md)。

**超时处理（关键）**：`clarify` 可能返回 `"The user did not provide a response within the time limit. Use your best judgement to make the choice and proceed."`——这**并不**意味着用户同意全部采用默认值。

- 将其视为**仅针对那一个问题**的默认值。继续依次询问步骤 2 中剩余的问题；每个问题都是独立的同意节点。
- **在下一条消息中显式告知用户默认选择**，让他们有机会纠正：例如 `"风格：已默认采用 ohmsha 预设（clarify 超时）。如需切换请告知。"`——未告知的默认值与从未提问无异。
- 不要在某次超时后将步骤 2 压缩为一次"全部采用默认值"处理。如果用户真的不在，他们对所有五个问题都会同样不回应——但他们回来后可以纠正可见的默认值，却无法纠正不可见的。

### 步骤 7：图片生成

使用 agent 内置的 `image_generate` 工具进行所有图片渲染。其参数仅接受 `prompt` 和 `aspect_ratio`（`landscape` | `portrait` | `square`）；它**返回 URL**，而非本地文件。因此每个生成的页面或角色设定图都必须下载到输出目录。

**提示词文件要求（硬性）**：在调用 `image_generate` **之前**，将每张图片的完整、最终提示词写入 `prompts/` 下的独立文件（命名：`NN-{type}-[slug].md`）。提示词文件是复现记录。

**画面比例映射**——分镜脚本的 `aspect_ratio` 字段映射到 `image_generate` 的格式如下：

| 分镜比例 | `image_generate` 格式 |
|------------------|-------------------------|
| `3:4`、`9:16`、`2:3` | `portrait` |
| `4:3`、`16:9`、`3:2` | `landscape` |
| `1:1` | `square` |

**下载步骤**——每次 `image_generate` 调用之后：
1. 从工具结果中读取 URL
2. 使用**绝对**输出路径获取图片字节，例如
   `curl -fsSL "<url>" -o /abs/path/to/comic/<slug>/NN-page-<slug>.png`
3. 在继续下一页之前验证文件在该确切路径下存在且非空

**永远不要依赖 Shell 的 CWD 持久性来使用 `-o` 路径。**终端工具的持久 shell CWD 可能在批次之间发生变化（会话过期、`TERMINAL_LIFETIME_SECONDS`、`cd` 失败导致停留在错误目录）。`curl -o relative/path.png` 是一个无声的陷阱：如果 CWD 已经漂移，文件会被写入别处且不报错。**始终向 `-o` 传入完全限定的绝对路径**，或向终端工具传入 `workdir=<abs path>`。2026 年 4 月事故：一部 10 页漫画的第 06-09 页被写入了仓库根目录而非 `comic/<slug>/`，因为第 3 批次继承了第 2 批次过期的 CWD，而 `curl -o 06-page-skills.png` 写入了错误目录。Agent 随后花了数轮声称文件存在于实际不存在的位置。

**7.1 角色设定图**——当漫画为多页且有重复出现的角色时生成（输出至 `characters/characters.png`，画面比例 `landscape`）。简单预设（如 four-panel minimalist）或单页漫画则跳过。调用 `image_generate` 之前，提示词文件 `characters/characters.md` 必须存在。渲染出的 PNG 是**供人审阅的产物**（让用户能直观验证角色设计），也是后续重新生成或手动编辑提示词的参考——它**不**驱动步骤 7.2。页面提示词已在步骤 5 中根据 `characters/characters.md` 中的**文字描述**编写完毕；`image_generate` 不接受图片作为视觉输入。

**7.2 页面**——在调用 `image_generate` 之前，每页的提示词**必须**已存在于 `prompts/NN-{cover|page}-[slug].md`。由于 `image_generate` 是纯提示词模式，角色一致性通过**在步骤 5 中将角色描述（取自 `characters/characters.md`）内嵌到每页提示词中**来保证。无论步骤 7.1 是否生成了 PNG 设定图，内嵌是统一执行的；PNG 仅作为审阅/重新生成辅助工具。

**备份规则**：已有 `prompts/…md` 和 `…png` 文件 → 重新生成前重命名，添加 `-backup-YYYYMMDD-HHMMSS` 后缀。

完整的分步工作流（分析、分镜脚本、审阅关卡、重新生成变体）：[references/workflow.md](references/workflow.md)。

## 参考资料

**核心模板**：
- [analysis-framework.md](references/analysis-framework.md) - 深度内容分析
- [character-template.md](references/character-template.md) - 角色定义格式
- [storyboard-template.md](references/storyboard-template.md) - 分镜脚本结构
- [ohmsha-guide.md](references/ohmsha-guide.md) - Ohmsha 漫画专题

**风格定义**：
- `references/art-styles/` - 艺术风格（ligne-claire、manga、realistic、ink-brush、chalk、minimalist）
- `references/tones/` - 基调（neutral、warm、dramatic、romantic、energetic、vintage、action）
- `references/presets/` - 含特殊规则的预设（ohmsha、wuxia、shoujo、concept-story、four-panel）
- `references/layouts/` - 布局（standard、cinematic、dense、splash、mixed、webtoon、four-panel）

**工作流**：
- [workflow.md](references/workflow.md) - 完整工作流详情
- [auto-selection.md](references/auto-selection.md) - 内容信号分析
- [partial-workflows.md](references/partial-workflows.md) - 部分工作流选项

## 页面修改

| 操作 | 步骤 |
|--------|-------|
| **编辑** | **先更新提示词文件** → 重新生成图片 → 下载新 PNG |
| **新增** | 在对应位置创建提示词 → 嵌入角色描述后生成 → 重新编号后续页面 → 更新分镜脚本 |
| **删除** | 移除文件 → 重新编号后续页面 → 更新分镜脚本 |

**重要**：更新页面时，**始终先**更新提示词文件（`prompts/NN-{cover|page}-[slug].md`）再重新生成。这确保更改可记录、可复现。

## 常见陷阱

- 图片生成：每页 10-30 秒；失败时自动重试一次
- **务必下载** `image_generate` 返回的 URL 到本地 PNG——下游工具（以及用户的审阅）期望输出目录中的文件，而非临时 URL
- **`curl -o` 使用绝对路径**——永远不要依赖跨批次的持久 shell CWD。无声陷阱：文件落入错误目录，后续在预期路径上 `ls` 显示空无一物。详见步骤 7"下载步骤"。
- 对敏感公众人物使用风格化替代形象
- **步骤 2 必须确认**——不可跳过
- **步骤 4/6 为条件性**——仅在用户在步骤 2 中要求时执行
- **步骤 7.1 角色设定图**——推荐用于多页漫画，简单预设可选。PNG 是审阅/重新生成辅助工具；页面提示词（在步骤 5 中编写）使用的是 `characters/characters.md` 中的文字描述，而非 PNG。`image_generate` 不接受图片作为视觉输入
- **剥离敏感信息**——在写入任何输出文件之前扫描源内容中的 API 密钥、令牌或凭据
