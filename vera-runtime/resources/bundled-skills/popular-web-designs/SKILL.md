---
name: popular-web-designs
description: 54 套真实设计系统（Stripe、Linear、Vercel）的 HTML/CSS 复刻。
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# Popular Web Designs

54 套真实世界的设计系统，随时可用于生成 HTML/CSS。每个模板都捕捉了一个网站的完整视觉语言：调色板、字体层级、组件样式、间距系统、阴影、响应式行为，以及附带精确 CSS 值的实用 Agent 提示。

## 相关设计技能

- **`claude-design`** — 用于设计*流程与品味*（界定需求简报、产出变体、验证本地 HTML 产物、避免 AI 设计烂俗）。当用户想要一个仿照知名品牌风格的精心设计页面时，与此技能搭配使用：`claude-design` 驱动工作流，本技能提供视觉词汇。
- **`design-md`** — 当交付物是正式的 DESIGN.md 令牌规范文件而非渲染产物时使用。

## 使用方法

1. 从下方目录中选择一个设计
2. 加载它：`skill_view(name="popular-web-designs", file_path="templates/<site>.md")`
3. 在生成 HTML 时使用设计令牌和组件规范
4. 搭配 `generative-widgets` 技能，通过 cloudflared 隧道提供结果

每个模板顶部包含一个 **Agent 实现说明** 块，内容包括：
- CDN 字体替代方案及 Google Fonts `<link>` 标签（可直接粘贴）
- 主字体和等宽字体的 CSS font-family 栈
- 提醒使用 `write_file` 创建 HTML、使用 `browser_vision` 进行验证

## HTML 生成模式

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <!-- 粘贴模板中 Agent 说明里的 Google Fonts <link> -->
  <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
  <style>
    /* 将模板的调色板应用为 CSS 自定义属性 */
    :root {
      --color-bg: #ffffff;
      --color-text: #171717;
      --color-accent: #533afd;
      /* ... 更多来自模板第 2 节 */
    }
    /* 应用模板第 3 节的字体设置 */
    body {
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--color-text);
      background: var(--color-bg);
    }
    /* 应用模板第 4 节的组件样式 */
    /* 应用模板第 5 节的布局 */
    /* 应用模板第 6 节的阴影 */
  </style>
</head>
<body>
  <!-- 使用模板中的组件规范构建 -->
</body>
</html>
```

用 `write_file` 写入文件，用 `generative-widgets` 工作流（cloudflared 隧道）提供服务，然后用 `browser_vision` 验证结果以确认视觉准确性。

## 字体替代参考

大多数网站使用无法通过 CDN 获取的专有字体。每个模板都映射到一个能保留设计特征的 Google Fonts 替代字体。常见映射：

| 专有字体 | CDN 替代 | 特征 |
|---|---|---|
| Geist / Geist Sans | Geist（Google Fonts 上可用） | 几何感、紧凑字间距 |
| Geist Mono | Geist Mono（Google Fonts 上可用） | 干净等宽、连字 |
| sohne-var（Stripe） | Source Sans 3 | 轻盈优雅 |
| Berkeley Mono | JetBrains Mono | 技术感等宽 |
| Airbnb Cereal VF | DM Sans | 圆润、友好的几何感 |
| Circular（Spotify） | DM Sans | 几何感、温暖 |
| figmaSans | Inter | 干净的人文主义风格 |
| Pin Sans（Pinterest） | DM Sans | 友好、圆润 |
| NVIDIA-EMEA | Inter（或 Arial 系统字体） | 工业感、干净 |
| CoinbaseDisplay/Sans | DM Sans | 几何感、可信赖 |
| UberMove | DM Sans | 粗体、紧凑 |
| HashiCorp Sans | Inter | 企业级、中性 |
| waldenburgNormal（Sanity） | Space Grotesk | 几何感、略微窄体 |
| IBM Plex Sans/Mono | IBM Plex Sans/Mono | Google Fonts 上可用 |
| Rubik（Sentry） | Rubik | Google Fonts 上可用 |

当模板的 CDN 字体与原始字体一致时（Inter、IBM Plex、Rubik、Geist），不存在替代损失。当使用替代字体时（如用 DM Sans 替代 Circular、用 Source Sans 3 替代 sohne-var），请严格遵循模板的字重、字号和字间距值——这些比具体的字体面更能承载视觉识别。

## 设计目录

### AI 与机器学习

| 模板 | 网站 | 风格 |
|---|---|---|
| `claude.md` | Anthropic Claude | 温暖陶土色点缀、干净编辑式布局 |
| `cohere.md` | Cohere | 鲜艳渐变、数据丰富的仪表盘美学 |
| `elevenlabs.md` | ElevenLabs | 暗色电影感 UI、音频波形美学 |
| `minimax.md` | Minimax | 大胆暗色界面搭配霓虹点缀 |
| `mistral.ai.md` | Mistral AI | 法式工程极简主义、紫色调 |
| `ollama.md` | Ollama | 终端优先、单色简约 |
| `opencode.ai.md` | OpenCode AI | 面向开发者的暗色主题、全等宽字体 |
| `replicate.md` | Replicate | 干净白色画布、代码优先 |
| `runwayml.md` | RunwayML | 电影感暗色 UI、媒体丰富的布局 |
| `together.ai.md` | Together AI | 技术感、蓝图风格设计 |
| `voltagent.md` | VoltAgent | 虚空黑画布、祖母绿点缀、终端原生 |
| `x.ai.md` | xAI | 鲜明单色、未来主义极简、全等宽字体 |

### 开发者工具与平台

| 模板 | 网站 | 风格 |
|---|---|---|
| `cursor.md` | Cursor | 流畅暗色界面、渐变点缀 |
| `expo.md` | Expo | 暗色主题、紧凑字间距、以代码为中心 |
| `linear.app.md` | Linear | 极致简约暗色模式、精准、紫色点缀 |
| `lovable.md` | Lovable | 趣味渐变、友好的开发者美学 |
| `mintlify.md` | Mintlify | 干净、绿色点缀、阅读优化 |
| `posthog.md` | PostHog | 趣味品牌风格、开发者友好的暗色 UI |
| `raycast.md` | Raycast | 流畅暗色铬质感、鲜艳渐变点缀 |
| `resend.md` | Resend | 极简暗色主题、等宽字体点缀 |
| `sentry.md` | Sentry | 暗色仪表盘、数据密集、粉紫点缀 |
| `supabase.md` | Supabase | 暗色祖母绿主题、代码优先的开发者工具 |
| `superhuman.md` | Superhuman | 高端暗色 UI、键盘优先、紫色辉光 |
| `vercel.md` | Vercel | 黑白精准、Geist 字体系统 |
| `warp.md` | Warp | 暗色 IDE 风格界面、基于块的命令 UI |
| `zapier.md` | Zapier | 温暖橙色、友好的插画驱动 |

### 基础设施与云

| 模板 | 网站 | 风格 |
|---|---|---|
| `clickhouse.md` | ClickHouse | 黄色点缀、技术文档风格 |
| `composio.md` | Composio | 现代暗色搭配多彩集成图标 |
| `hashicorp.md` | HashiCorp | 企业级干净、黑白配色 |
| `mongodb.md` | MongoDB | 绿叶品牌、开发者文档聚焦 |
| `sanity.md` | Sanity | 红色点缀、内容优先的编辑式布局 |
| `stripe.md` | Stripe | 标志性紫色渐变、字重 300 的优雅 |

### 设计与生产力

| 模板 | 网站 | 风格 |
|---|---|---|
| `airtable.md` | Airtable | 多彩、友好、结构化数据美学 |
| `cal.md` | Cal.com | 干净中性 UI、面向开发者的简约 |
| `clay.md` | Clay | 有机形状、柔和渐变、艺术指导布局 |
| `figma.md` | Figma | 鲜艳多色、趣味又专业 |
| `framer.md` | Framer | 大胆黑蓝配色、动效优先、设计前沿 |
| `intercom.md` | Intercom | 友好蓝色调、对话式 UI 模式 |
| `miro.md` | Miro | 明黄点缀、无限画布美学 |
| `notion.md` | Notion | 温暖极简、衬线标题、柔和表面 |
| `pinterest.md` | Pinterest | 红色点缀、瀑布流网格、图片优先布局 |
| `webflow.md` | Webflow | 蓝色点缀、精致的营销网站美学 |

### 金融科技与加密

| 模板 | 网站 | 风格 |
|---|---|---|
| `coinbase.md` | Coinbase | 干净的蓝色识别、信任导向、机构感 |
| `kraken.md` | Kraken | 紫色点缀暗色 UI、数据密集仪表盘 |
| `revolut.md` | Revolut | 流畅暗色界面、渐变卡片、金融科技精准 |
| `wise.md` | Wise | 明绿点缀、友好清晰 |

### 企业与消费

| 模板 | 网站 | 风格 |
|---|---|---|
| `airbnb.md` | Airbnb | 温暖珊瑚色点缀、摄影驱动、圆润 UI |
| `apple.md` | Apple | 高端留白、SF Pro、电影感图像 |
| `bmw.md` | BMW | 暗色高端表面、精密工程美学 |
| `ibm.md` | IBM | Carbon 设计系统、结构化蓝色调 |
| `nvidia.md` | NVIDIA | 绿黑能量、技术力量美学 |
| `spacex.md` | SpaceX | 鲜明黑白、全幅出血图像、未来主义 |
| `spotify.md` | Spotify | 暗底鲜艳绿色、粗体排版、专辑封面驱动 |
| `uber.md` | Uber | 大胆黑白、紧凑排版、都市能量 |

## 选择设计

将设计与内容匹配：

- **开发者工具 / 仪表盘：** Linear、Vercel、Supabase、Raycast、Sentry
- **文档 / 内容网站：** Mintlify、Notion、Sanity、MongoDB
- **营销 / 落地页：** Stripe、Framer、Apple、SpaceX
- **暗色模式 UI：** Linear、Cursor、ElevenLabs、Warp、Superhuman
- **浅色 / 干净 UI：** Vercel、Stripe、Notion、Cal.com、Replicate
- **趣味 / 友好：** PostHog、Figma、Lovable、Zapier、Miro
- **高端 / 奢华：** Apple、BMW、Stripe、Superhuman、Revolut
- **数据密集 / 仪表盘：** Sentry、Kraken、Cohere、ClickHouse
- **等宽 / 终端美学：** Ollama、OpenCode、x.ai、VoltAgent
