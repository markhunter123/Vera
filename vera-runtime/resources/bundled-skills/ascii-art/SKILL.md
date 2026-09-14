---
name: ascii-art
description: ASCII 艺术：pyfiglet 字符画、cowsay、boxes 框线、图片转 ASCII。
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# ASCII 艺术技能

多种工具满足不同的 ASCII 艺术需求。所有工具均为本地 CLI 程序或免费 REST API——无需 API 密钥。

## 工具 1：文字横幅（pyfiglet——本地）

将文字渲染为大型 ASCII 艺术横幅。内置 571 种字体。

### 安装

```bash
pip install pyfiglet --break-system-packages -q
```

### 用法

```bash
python3 -m pyfiglet "YOUR TEXT" -f slant
python3 -m pyfiglet "TEXT" -f doom -w 80    # 设置宽度
python3 -m pyfiglet --list_fonts             # 列出全部 571 种字体
```

### 推荐字体

| 风格 | 字体 | 最适合 |
|-------|------|----------|
| 简洁现代 | `slant` | 项目名称、标题 |
| 粗犷块状 | `doom` | 标题、Logo |
| 大号易读 | `big` | 横幅 |
| 经典横幅 | `banner3` | 宽屏展示 |
| 紧凑 | `small` | 副标题 |
| 赛博朋克 | `cyberlarge` | 科技主题 |
| 3D 效果 | `3-d` | 启动画面 |
| 哥特风 | `gothic` | 戏剧化文字 |

### 小贴士

- 预览 2-3 种字体，让用户挑选最喜欢的
- 短文字（1-8 个字符）搭配 `doom` 或 `block` 等细节丰富的字体效果最佳
- 长文字搭配 `small` 或 `mini` 等紧凑字体效果更好

## 工具 2：文字横幅（asciified API——远程，无需安装）

将文字转换为 ASCII 艺术的免费 REST API。250+ 种 FIGlet 字体。直接返回纯文本——无需解析。当 pyfiglet 未安装或需要快速替代方案时使用。

### 用法（通过终端 curl）

```bash
# 基础文字横幅（默认字体）
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello+World"

# 指定字体
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Slant"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Doom"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Star+Wars"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=3-D"
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=Hello&font=Banner3"

# 列出所有可用字体（返回 JSON 数组）
curl -s "https://asciified.thelicato.io/api/v2/fonts"
```

### 小贴士

- 将 text 参数中的空格用 `+` 进行 URL 编码
- 响应是纯文本 ASCII 艺术——无 JSON 包装，可直接展示
- 字体名称区分大小写；使用 fonts 端点获取准确名称
- 任何装有 curl 的终端都可以使用——无需 Python 或 pip

## 工具 3：Cowsay（消息艺术）

经典的将文字包裹在 ASCII 角色对话气泡中的工具。

### 安装

```bash
sudo apt install cowsay -y    # Debian/Ubuntu
# brew install cowsay         # macOS
```

### 用法

```bash
cowsay "Hello World"
cowsay -f tux "Linux rules"       # 企鹅 Tux
cowsay -f dragon "Rawr!"          # 龙
cowsay -f stegosaurus "Roar!"     # 剑龙
cowthink "Hmm..."                  # 思考气泡
cowsay -l                          # 列出所有角色
```

### 可用角色（50+）

`beavis.zen`、`bong`、`bunny`、`cheese`、`daemon`、`default`、`dragon`、
`dragon-and-cow`、`elephant`、`eyes`、`flaming-skull`、`ghostbusters`、
`hellokitty`、`kiss`、`kitty`、`koala`、`luke-koala`、`mech-and-cow`、
`meow`、`moofasa`、`moose`、`ren`、`sheep`、`skeleton`、`small`、
`stegosaurus`、`stimpy`、`supermilker`、`surgery`、`three-eyes`、
`turkey`、`turtle`、`tux`、`udder`、`vader`、`vader-koala`、`www`

### 眼睛/舌头修饰符

```bash
cowsay -b "Borg"       # =_= 眼
cowsay -d "Dead"       # x_x 眼
cowsay -g "Greedy"     # $_$ 眼
cowsay -p "Paranoid"   # @_@ 眼
cowsay -s "Stoned"     # *_* 眼
cowsay -w "Wired"      # O_O 眼
cowsay -e "OO" "Msg"   # 自定义眼睛
cowsay -T "U " "Msg"   # 自定义舌头
```

## 工具 4：Boxes（装饰边框）

为任意文字绘制装饰性 ASCII 艺术边框/框架。内置 70+ 种设计。

### 安装

```bash
sudo apt install boxes -y    # Debian/Ubuntu
# brew install boxes         # macOS
```

### 用法

```bash
echo "Hello World" | boxes                    # 默认框
echo "Hello World" | boxes -d stone           # 石头边框
echo "Hello World" | boxes -d parchment       # 羊皮卷轴
echo "Hello World" | boxes -d cat             # 猫咪边框
echo "Hello World" | boxes -d dog             # 狗狗边框
echo "Hello World" | boxes -d unicornsay      # 独角兽
echo "Hello World" | boxes -d diamonds        # 菱形图案
echo "Hello World" | boxes -d c-cmt           # C 语言风格注释
echo "Hello World" | boxes -d html-cmt        # HTML 注释
echo "Hello World" | boxes -a c               # 居中文字
boxes -l                                       # 列出全部 70+ 种设计
```

### 与 pyfiglet 或 asciified 组合使用

```bash
python3 -m pyfiglet "INVT" -f slant | boxes -d stone
# 或者不装 pyfiglet：
curl -s "https://asciified.thelicato.io/api/v2/ascii?text=INVT&font=Slant" | boxes -d stone
```

## 工具 5：TOIlet（彩色文字艺术）

类似 pyfiglet，但带有 ANSI 颜色效果和视觉滤镜。终端视觉盛宴利器。

### 安装

```bash
sudo apt install toilet toilet-fonts -y    # Debian/Ubuntu
# brew install toilet                      # macOS
```

### 用法

```bash
toilet "Hello World"                    # 基础文字艺术
toilet -f bigmono12 "Hello"            # 指定字体
toilet --gay "Rainbow!"                 # 彩虹配色
toilet --metal "Metal!"                 # 金属效果
toilet -F border "Bordered"             # 添加边框
toilet -F border --gay "Fancy!"         # 组合效果
toilet -f pagga "Block"                 # 块状字体（toilet 独有）
toilet -F list                          # 列出可用滤镜
```

### 滤镜

`crop`、`gay`（彩虹）、`metal`、`flip`、`flop`、`180`、`left`、`right`、`border`

**注意**：toilet 输出的颜色使用 ANSI 转义码——在终端中可用，但在某些环境中可能无法正常渲染（如纯文本文件、部分聊天平台）。

## 工具 6：图片转 ASCII 艺术

将图片（PNG、JPEG、GIF、WEBP）转换为 ASCII 艺术。

### 方案 A：ascii-image-converter（推荐，现代化）

```bash
# 安装
sudo snap install ascii-image-converter
# 或：go install github.com/TheZoraiz/ascii-image-converter@latest
```

```bash
ascii-image-converter image.png                  # 基础用法
ascii-image-converter image.png -C               # 彩色输出
ascii-image-converter image.png -d 60,30         # 设置尺寸
ascii-image-converter image.png -b               # 盲文字符
ascii-image-converter image.png -n               # 反色/反转
ascii-image-converter https://url/image.jpg      # 直接使用 URL
ascii-image-converter image.png --save-txt out   # 保存为文本
```

### 方案 B：jp2a（轻量，仅支持 JPEG）

```bash
sudo apt install jp2a -y
jp2a --width=80 image.jpg
jp2a --colors image.jpg              # 彩色版
```

## 工具 7：搜索现成 ASCII 艺术

从网上搜索精选的 ASCII 艺术。配合 `curl` 在终端中使用。

### 来源 A：ascii.co.uk（推荐用于现成艺术作品）

按主题整理的大量经典 ASCII 艺术集合。艺术内容位于 HTML `<pre>` 标签内。用 curl 获取页面，再用一小段 Python 代码提取艺术内容。

**URL 模式：** `https://ascii.co.uk/art/{主题}`

**第 1 步——获取页面：**

```bash
curl -s 'https://ascii.co.uk/art/cat' -o /tmp/ascii_art.html
```

**第 2 步——从 pre 标签提取艺术内容：**

```python
import re, html
with open('/tmp/ascii_art.html') as f:
    text = f.read()
arts = re.findall(r'<pre[^>]*>(.*?)</pre>', text, re.DOTALL)
for art in arts:
    clean = re.sub(r'<[^>]+>', '', art)
    clean = html.unescape(clean).strip()
    if len(clean) > 30:
        print(clean)
        print('\n---\n')
```

**可用主题**（用作 URL 路径）：
- 动物：`cat`、`dog`、`horse`、`bird`、`fish`、`dragon`、`snake`、`rabbit`、`elephant`、`dolphin`、`butterfly`、`owl`、`wolf`、`bear`、`penguin`、`turtle`
- 物品：`car`、`ship`、`airplane`、`rocket`、`guitar`、`computer`、`coffee`、`beer`、`cake`、`house`、`castle`、`sword`、`crown`、`key`
- 自然：`tree`、`flower`、`sun`、`moon`、`star`、`mountain`、`ocean`、`rainbow`
- 角色：`skull`、`robot`、`angel`、`wizard`、`pirate`、`ninja`、`alien`
- 节日：`christmas`、`halloween`、`valentine`

**小贴士：**
- 保留作者的签名/署名——这是重要的礼仪
- 每页可能有多幅作品——挑选最佳的一幅给用户
- 通过 curl 稳定获取，无需 JavaScript

### 来源 B：GitHub Octocat API（彩蛋）

返回一个随机的 GitHub Octocat 并附上一句睿智名言。无需认证。

```bash
curl -s https://api.github.com/octocat
```

## 工具 8：趣味 ASCII 工具（通过 curl）

以下免费服务直接返回 ASCII 艺术——适合增加趣味性。

### ASCII 艺术二维码

```bash
curl -s "qrenco.de/Hello+World"
curl -s "qrenco.de/https://example.com"
```

### ASCII 艺术天气

```bash
curl -s "wttr.in/London"          # 完整天气报告，带 ASCII 图形
curl -s "wttr.in/Moon"            # ASCII 艺术月相
curl -s "v2.wttr.in/London"       # 详细版本
```

## 工具 9：LLM 生成自定义艺术（备用方案）

当以上工具无法满足需求时，使用以下 Unicode 字符直接生成 ASCII 艺术：

### 字符调色板

**制表符：** `╔ ╗ ╚ ╝ ║ ═ ╠ ╣ ╦ ╩ ╬ ┌ ┐ └ ┘ │ ─ ├ ┤ ┬ ┴ ┼ ╭ ╮ ╰ ╯`

**方块元素：** `░ ▒ ▓ █ ▄ ▀ ▌ ▐ ▖ ▗ ▘ ▝ ▚ ▞`

**几何与符号：** `◆ ◇ ◈ ● ○ ◉ ■ □ ▲ △ ▼ ▽ ★ ☆ ✦ ✧ ◀ ▶ ◁ ▷ ⬡ ⬢ ⌂`

### 规则

- 最大宽度：每行 60 个字符（终端安全）
- 最大高度：横幅 15 行，场景 25 行
- 仅限等宽字体：输出必须在固定宽度字体下正确渲染

## 决策流程

1. **文字做横幅** → 安装了 pyfiglet 就用它，否则用 asciified API（通过 curl）
2. **把消息包装在趣味角色艺术中** → cowsay
3. **添加装饰边框/框架** → boxes（可与 pyfiglet/asciified 组合）
4. **特定主题的艺术**（猫、火箭、龙）→ ascii.co.uk（通过 curl + 解析）
5. **把图片转 ASCII** → ascii-image-converter 或 jp2a
6. **二维码** → qrenco.de（通过 curl）
7. **天气/月亮艺术** → wttr.in（通过 curl）
8. **自定义/创意内容** → LLM 生成，配合 Unicode 调色板
9. **任何工具未安装** → 安装它，或回退到下一个选项
