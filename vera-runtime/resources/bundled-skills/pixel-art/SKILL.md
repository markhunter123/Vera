---
name: pixel-art
description: '像素艺术创作，支持怀旧调色板（NES、Game Boy、PICO-8 风格）。'
category: '设计创作'
metadata:
  source: invt-ai-platform
---

# 像素艺术

将任意图片转换为复古像素艺术，并可选择为其配上时代风格的特效（雨、萤火虫、雪、余烬），制作成短视频 MP4 或 GIF。

本技能附带两个脚本：

- `scripts/pixel_art.py` — 照片 → 像素艺术 PNG（Floyd-Steinberg 抖动算法）
- `scripts/pixel_art_video.py` — 像素艺术 PNG → 动画 MP4（+ 可选 GIF）

每个脚本既可导入使用，也可直接运行。当你需要还原特定时代的色彩时，预设会锁定到对应硬件调色板（NES、Game Boy、PICO-8 等）；如果你追求街机/SNES 风格，也可以使用自适应的 N 色量化。

## 适用场景

- 用户想将原始图片转换为复古像素艺术
- 用户要求 NES / Game Boy / PICO-8 / C64 / 街机 / SNES 风格
- 用户想要一段循环动画（雨天场景、夜空、飘雪等）
- 海报、专辑封面、社交平台图片、精灵图、角色、头像

## 工作流程

生成之前，先和用户确认风格。不同预设的输出效果差异很大，重新生成成本也高。

### 第 1 步 — 提供风格选项

调用 `clarify`，展示 4 种有代表性的预设。根据用户的具体需求选择合适的集合，不要一次性把所有 14 种预设全列出来。

当用户意图不清时，展示默认菜单：

```python
clarify(
    question="Which pixel-art style do you want?",
    choices=[
        "arcade — bold, chunky 80s cabinet feel (16 colors, 8px)",
        "nes — Nintendo 8-bit hardware palette (54 colors, 8px)",
        "gameboy — 4-shade green Game Boy DMG",
        "snes — cleaner 16-bit look (32 colors, 4px)",
    ],
)
```

当用户已经明确指定了某个时代（如"80 年代街机"、"Gameboy"），直接跳过 `clarify`，使用对应的预设。

### 第 2 步 — 提供动画选项（可选）

如果用户要的是视频/GIF，或者输出加些动效会更好，询问想要哪个场景：

```python
clarify(
    question="Want to animate it? Pick a scene or skip.",
    choices=[
        "night — stars + fireflies + leaves",
        "urban — rain + neon pulse",
        "snow — falling snowflakes",
        "skip — just the image",
    ],
)
```

**不要**连续调用 `clarify` 超过两次。一次选风格，一次选场景（如果要做动画的话）。如果用户在消息中已经明确指定了风格和场景，则完全跳过 `clarify`。

### 第 3 步 — 生成

先运行 `pixel_art()`；如果用户要求动画，则在结果上接着调用 `pixel_art_video()`。

## 预设目录

| 预设 | 时代 | 调色板 | 像素块 | 最适合 |
|--------|-----|---------|-------|----------|
| `arcade` | 80 年代街机 | 自适应 16 色 | 8px | 粗犷海报、主视觉 |
| `snes` | 16 位机 | 自适应 32 色 | 4px | 角色、精细场景 |
| `nes` | 8 位机 | NES (54 色) | 8px | 纯正 NES 风格 |
| `gameboy` | DMG 掌机 | 4 阶绿色 | 8px | 单色 Game Boy |
| `gameboy_pocket` | Pocket 掌机 | 4 阶灰色 | 8px | 单色 GB Pocket |
| `pico8` | PICO-8 | 16 固定色 | 6px | 幻想主机风格 |
| `c64` | Commodore 64 | 16 固定色 | 8px | 8 位家用电脑 |
| `apple2` | Apple II 高分辨率 | 6 固定色 | 10px | 极致复古，6 色 |
| `teletext` | BBC Teletext | 8 种纯色 | 10px | 粗粒原色 |
| `mspaint` | Windows 画图 | 24 固定色 | 8px | 怀旧桌面 |
| `mono_green` | CRT 荧光绿 | 2 阶绿色 | 6px | 终端/CRT 美学 |
| `mono_amber` | CRT 琥珀色 | 2 阶琥珀色 | 6px | 琥珀色显示器风格 |
| `neon` | 赛博朋克 | 10 种霓虹色 | 6px | 蒸汽波/赛博 |
| `pastel` | 柔和粉彩 | 10 种粉彩色 | 6px | 卡哇伊 / 温柔风 |

命名调色板位于 `scripts/palettes.py`（完整列表见 `references/palettes.md`——共 28 种命名调色板）。任何预设都可以被覆盖：

```python
pixel_art("in.png", "out.png", preset="snes", palette="PICO_8", block=6)
```

## 场景目录（用于视频）

| 场景 | 特效 |
|-------|---------|
| `night` | 闪烁星星 + 萤火虫 + 飘落树叶 |
| `dusk` | 萤火虫 + 闪光粒子 |
| `tavern` | 尘埃微粒 + 温暖闪光 |
| `indoor` | 尘埃微粒 |
| `urban` | 雨水 + 霓虹脉冲 |
| `nature` | 树叶 + 萤火虫 |
| `magic` | 闪光粒子 + 萤火虫 |
| `storm` | 雨水 + 闪电 |
| `underwater` | 气泡 + 微光粒子 |
| `fire` | 余烬 + 闪光粒子 |
| `snow` | 雪花 + 闪光粒子 |
| `desert` | 热浪 + 沙尘 |

## 调用方式

### Python（导入）

```python
import sys
sys.path.insert(0, "/home/teknium/.invt/skills/creative/pixel-art/scripts")
from pixel_art import pixel_art
from pixel_art_video import pixel_art_video

# 1. 转换为像素艺术
pixel_art("/path/to/photo.jpg", "/tmp/pixel.png", preset="nes")

# 2. 动画化（可选）
pixel_art_video(
    "/tmp/pixel.png",
    "/tmp/pixel.mp4",
    scene="night",
    duration=6,
    fps=15,
    seed=42,
    export_gif=True,
)
```

### CLI

```bash
cd /home/teknium/.invt/skills/creative/pixel-art/scripts

python pixel_art.py in.jpg out.png --preset gameboy
python pixel_art.py in.jpg out.png --preset snes --palette PICO_8 --block 6

python pixel_art_video.py out.png out.mp4 --scene night --duration 6 --gif
```

## 管线原理

**像素转换：**
1. 增强对比度/色彩/锐度（调色板越小，增强力度越大）
2. 色调分离，在量化前简化色调区域
3. 按 `block` 参数降采样，使用 `Image.NEAREST`（硬边缘像素，不做插值）
4. 使用 Floyd-Steinberg 抖动进行量化——针对自适应 N 色调色板或命名硬件调色板
5. 使用 `Image.NEAREST` 升采样回原尺寸

在降采样**之后**再做量化，能让抖动与最终像素网格对齐。如果在降采样之前量化，误差扩散会浪费在那些会随着降采样消失的细节上。

**视频叠加：**
- 每帧拷贝基底帧（静态背景）
- 逐帧叠加无状态粒子绘制（每个特效一个独立函数）
- 通过 ffmpeg `libx264 -pix_fmt yuv420p -crf 18` 编码
- 可选 GIF 输出，通过 `palettegen` + `paletteuse`

## 依赖

- Python 3.9+
- Pillow（`pip install Pillow`）
- ffmpeg 在 PATH 中（仅在需要视频时需要——Agent 会自行安装此包）

## 常见陷阱

- 调色板键名区分大小写（`"NES"`、`"PICO_8"`、`"GAMEBOY_ORIGINAL"`）。
- 极小的源图（宽度 <100px）在 8-10px 像素块下会崩掉。如果源图太小，先放大它。
- `block` 或 `palette` 使用小数值会导致量化出错——请确保它们为正整数。
- 动画粒子数量是针对约 640×480 画布调校的。对非常大的图像，可能需要用不同种子做第二次生成来调整密度。
- `mono_green` / `mono_amber` 会强制 `color=0.0`（去饱和度）。如果你覆盖并保留了色彩，2 色调色板可能在平滑区域产生条纹。
- `clarify` 循环：每轮最多调用两次（风格，然后场景）。不要连续向用户抛出更多选项。

## 验证

- PNG 文件在输出路径创建成功
- 能肉眼看到符合预设像素块大小的清晰方块像素
- 颜色数量与预设匹配（肉眼判断或运行 `Image.open(p).getcolors()`）
- 视频为有效 MP4（`ffprobe` 能打开），大小非零

## 致谢

命名硬件调色板以及 `pixel_art_video.py` 中的程序化动画循环移植自 [pixel-art-studio](https://github.com/Synero/pixel-art-studio)（MIT 协议）。详见本技能目录下的 `ATTRIBUTION.md`。
