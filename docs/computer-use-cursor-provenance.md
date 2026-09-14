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

# Computer Use 光标溯源与独立替换

本文档记录 Vera 的 agent 光标叠加层的精确来源边界，以及为 Vera issue #3293 完成的独立替换。这份历史记录修正了 pull request #2676 的初版表述，但并未将 Computer Use 实现整体归类为源自被检视的二进制。

## 当前状态

当前光标不再保留本文档后文所述的专有二进制中转录而来的字形几何、热点位置、运动数值、close-enough 阈值、路径测量常量、核心评分或末端朝向行为。这些输入仅具历史意义。

替换值在贡献者检视被替换的值之前就已推导完成。完整的公开推导记录见：

https://github.com/vera-ai/vera/issues/3293#issuecomment-5371901326

该推导使用了四项 Vera 产品要求：

1. 在任意应用内容之上保持 agent 光标在 1x 缩放下清晰可读；
2. 在原生点击分发释放之前命中动作热点；
3. 长距离移动时优先选择最直的合法路线；以及
4. 位置与朝向在稳定时无明显过冲。

## 独立替换值

### 字形与动作热点

替换方案是在归一化的单位正方形内绘制一枚圆头飞镖。其尖端既是路径起点也是动作热点。`CursorEngine.pos` 仍是唯一的动作坐标，渲染时先将该坐标直接平移到本地画布 `(0, 0)`，再绘制尖端。

- `size = 20` CSS px；
- `shadowBlur = 3` CSS px；
- 尖端到着色边缘的最大允许量及 `boundsMargin = 20 + 3 = 23` CSS px；
- 起点 `(0.00, 0.00)`；
- 三次贝塞尔控制点 `(0.03, 0.23)`、`(0.11, 0.51)`，终点 `(0.20, 0.83)`；
- 直线 `(0.43, 0.63)`；
- 三次贝塞尔控制点 `(0.49, 0.57)`、`(0.57, 0.60)`，终点 `(0.63, 0.69)`；
- 直线 `(0.80, 1.00)`；
- 直线 `(1.00, 0.89)`；
- 三次贝塞尔控制点 `(0.86, 0.63)`、`(0.69, 0.40)`，终点 `(0.00, 0.00)`。

`CURSOR_GLYPH` 保留其公开的元组形状：每条曲线先存终点，再存两个控制点。PiP SVG 使用同一路径与同一本地原点热点。状态项 PNG 由该几何图形在透明背景上叠加 Vera 现有蓝色渐变确定性栅格化而成。在仓库根目录用 `node scripts/generate-cu-status-icons.mjs` 重新生成。

### 运动配置

`CURSOR_MOTION` 保留 30 字段的配置形状。其当前值及独立依据如下：

| 字段 | 替换值 | 推导依据 |
| --- | ---: | --- |
| `clickAngle` | `-π/4` | 规范的静止对角线朝向 |
| `candidateCount` | `9` | 奇数对称网格，保证存在零弧候选 |
| `boundsMargin` | `23` | 字形尺寸加阴影余量 |
| `startHandle` | `1/3` | 规范的直线三次贝塞尔控制柄 |
| `endpointHandle` | `1/3` | 到达时采用相同构造 |
| `arcSize` | `0.30` | 避让候选，但不鼓励桌面大范围扫掠 |
| `arcFlow` | `0.50` | 对称垂直位移 |
| `straightPathDistanceThreshold` | `60` | 三个字形宽度 |
| `springResponseScaler` | `1/2400 s/px` | 按距离缩放的反应，单位秒/像素 |
| `springResponseMin` | `0.18 s` | 反应下限 |
| `springResponseMax` | `0.72 s` | 反应上限 |
| `springDampingFraction` | `1.0` | 临界阻尼；位置无过冲 |
| `scootDistanceThreshold` | `60 px` | 三个字形宽度 |
| `scootPositionResponse` | `0.16 s` | 形变跟随主运动 |
| `scootPositionDampingFraction` | `1.0` | 位置无回弹 |
| `scootPositionSettleVelocity` | `2 px/s` | 每秒字形大小的十分之一 |
| `scootAxisResponse` | `0.12 s` | 轴向响应快于位置 |
| `scootAxisDampingFraction` | `1.0` | 轴向无过冲 |
| `scootBaseRotationResponse` | `0.18 s` | 与最短主响应一致 |
| `scootBaseRotationDampingFraction` | `1.0` | 基座旋转无回弹 |
| `scootStretchResponse` | `0.14 s` | 细微的形状响应 |
| `scootStretchDampingFraction` | `1.0` | 拉伸无回弹 |
| `scootStretchMin` | `0.92` | `1 - 0.08`，与最大 Y 向压扁一致 |
| `scootStretchPivotX` | `0.25` | 使前四分之一保持在热点附近 |
| `scootStretchXAmount` | `0.16` | 最大 16% 纵向拉伸 |
| `scootSquashYAmount` | `0.08` | X 向形变的一半 |
| `scootRotationResponse` | `0.16 s` | 跟随形变响应 |
| `scootRotationDampingFraction` | `1.0` | 旋转无过冲 |
| `scootRotationMax` | `π/8` | 22.5 度，静止对角线的一半 |
| `terminalTangentBlendStart` | `0.80` | 最后五分之一混入点击朝向 |

位置响应计算如下：

```text
response = clamp(distanceInPixels * (1 / 2400 secondsPerPixel), 0.18, 0.72)
```

### 路径测量与评分

`SCORE_SAMPLES = 33` 表示 33 个点（含两个端点）和 32 个等长参数区间。独立的核心里程为：

```text
detour      = max(0, measuredLength / directDistance - 1)
angleEnergy = mean(deltaHeading²)
maxAngle    = max(abs(deltaHeading)) / π
totalTurn   = sum(abs(deltaHeading)) / π
outOfBounds = 0 or 1
```

对于退化弦，测量长度为零时 detour 为零；直线距离为零而测量长度为正值时以无穷大评分拒绝。

独立的核心评分公式为：

```text
8 * detour
+ 1.5 * angleEnergy
+ 2 * maxAngle
+ 0.5 * totalTurn
+ 1,000,000 * outOfBounds
```

这些项均为无量纲正值。因此，可用时合法直线路径必然胜出，而离开视口是字典序级别的拒绝，而非外观偏好。按 issue #3293 的要求，Vera 早期的原始路径长度附加项与倒向到达惩罚仍保留在这一核心周围。

独立推导的评分器继续评估 Vera 现有的单段三次贝塞尔候选族。它不从历史产物导入任何候选生成器。

作为本次替换新增的 Vera 集成选择，九个候选的预算通过选择而非笛卡尔积分配。这使独立推导的九候选数与 Vera 保留的五路出发扇区协调一致。全新运动在直接出发时使用九个对称弧值。被打断的运动保留全部五个 `DEPARTURE_FAN` 权重：直接出发时五个对称弧（含零弧），其余四个出发权重各配一个零弧候选。该分配是围绕独立推导的奇数对称预算做出的实现选择，不属于该推导本身。

### 末端朝向

全新运动开始时正对路径目标。在进度 `[0.80, 1.00]` 区间，引擎计算从路径切线到 `clickAngle` 的最短带符号角差，并用下式插值：

```text
phase = clamp((progress - 0.80) / 0.20, 0, 1)
weight = phase² * (3 - 2 * phase)
heading = tangentAngle + shortestSignedDifference * weight
```

插值前对差值进行回绕，可防止跨越 `-π`/`π` 边界的绕远旋转。

### Close-enough 门限与呈现截止时间

独立的门限为：

```text
progress = 0.99999
distance = 2 CSS px
```

五个九的进度在 100,000 CSS 像素的路线上最多留下一个 CSS 像素，落在独立推导的 2px 距离门限之内。截止时间并非与这些值分别选取。

对于最慢的临界弹簧，引擎以其半隐式积分回放：

```text
response = 0.72 s
damping fraction = 1.0
step = 1 / 240 s
progress threshold = 0.99999
```

该门限在 1725ms 时达到。在受支持的最慢呈现节奏（每秒一帧）下，释放可在 2000ms 帧上被观察到。再加上 100ms 的 renderer/IPC 调度余量，得到：

```text
cursorPresentationReadyDeadlineMs() = 2100 ms
```

叠加层在提交运动时为引擎时钟播种，因此第一帧一帧/秒即推进了第一秒。当一次移动打断另一次移动时，旧路径先对齐到同一提交时间戳，替换路径再以该时间戳播种，防止替换前的时间重放进新路径。

持久的透明 `BrowserWindow` 禁用了 Electron 后台节流，因此其真实的 `requestAnimationFrame` 路径在未聚焦时不会进入仅后台的一帧/秒相位漂移。就绪状态仅在绘制后从该帧路径评估并上报。空闲时的 CPU 行为不变，因为引擎稳定后 renderer 便停止请求帧。

控制器继续从此函数取得就绪栅栏，因此其栅栏不会悄然低于推导出的截止时间。结果仍低于单独的 5000ms 死 renderer 兜底。

## 历史二进制检视记录

在 issue #3293 之前，Vera 保留着从此产物恢复出的精确输入：

- 应用：`~/.codex/computer-use/Codex Computer Use.app`；
- 可执行文件：`Contents/MacOS/SkyComputerUseService`；
- bundle 标识：`com.openai.sky.CUAService`；
- 签名构建日期：2026-07-16；
- SHA-256：`44320516c4c400fb5459b203498c78e4af318b0096464f16c4445a47f2b8b8f4`。

Pull request #1255 引入了源自二进制的字形、热点与运动值。Pull request #1883 引入了源自二进制的路径测量与评分器值。Pull request #2676 记录了该边界。专有产物不存储在本仓库中，且记录中的本地路径后来包含的是另一个签名构建。

那些旧输入仍可见于公开的 Git 历史中，此处仅作为历史溯源加以描述。当前光标行为不保留它们。Issue #3293 通过替换而非对既往事实的法律裁定来解决当前来源关口。

没有任何 OpenAI 源代码或可执行字节被加入本仓库或其发行物。

## MIT 许可的源码谱系

Vera 的第一个光标渲染器是对 `trycua/cua` 的 MIT 许可 `cursor-overlay` 的 TypeScript 改编，引入于 Vera 提交 `025d0c628a2162d0a7daf49e97d104c36a4431c6`。Vera 记录的固定上游提交为 `8c921b2b3bf13494724ead4f0a814d80c56a7e8b`。

后续工作替换了大部分运动与字形实现。MIT 谱系对渲染器的引入及周边叠加层设计仍然相关，但它不是上述独立值的来源。

## 保留的 Vera 原创或 Vera 调整行为

Issue #3293 有意保留周边 Vera 工作：

- `planCursorPath` 中的单段三次贝塞尔候选族；
- `MAX_DESIRED_ARC` 和 `DEPARTURE_FAN`；
- 原始路径长度代价与倒向到达评分项；
- 视口扩展与边缘行为；
- 帧时钟所有权与低帧率子步进；
- 目标窗口排序、语义元素中心呈现、取消、完成与呈现栅栏；
- Vera 的品牌调色板、点击脉冲、阴影处理与宿主集成。

最终结果仍是一个混合谱系的 Vera 实现：MIT 派生的渲染器基础、Vera 原创的产品行为，以及一套拥有公开独立推导的当前光标值。
