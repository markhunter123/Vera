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

# Terminal-Bench 2.1 — Vera 对比 Kimi Code（v11）

在 Terminal-Bench 2.1 上以同一模型进行配对 harness A/B 测试，两侧使用相同模型。本文档记录 v11 完整运行：已接受的结果及其遴选方式、为什么两边的绝对分数都是吞吐受限的下界，以及相对差距的成因。

**运行 id：** `k3-vera-vs-kimi-code-tbench-2.1-full-v11`
**本地产物（git 排除）：** `~/.vera/eval/runs/k3-vera-vs-kimi-code-tbench-2.1-full-v11/`
**指标：** 按 Harbor reward 计 pass@1
**状态：** `completed_with_gaps`（恢复后 178/178 个 cell 已接受并按模型评分；缺少 oracle 证据）
**逐任务结果：** [`terminal-bench-2.1-vera-vs-kimi-code-v11.csv`](./terminal-bench-2.1-vera-vs-kimi-code-v11.csv)

## 摘要（TL;DR）

- **头条结论（已接受结果）：** Vera **62/89（69.7%）**，Kimi Code **53/89（59.6%）**——同一模型（`k3`）在 **max** 思考强度下，且两侧都保留思考历史。Kimi Code 的头条数字经过操作员调整：机械式的首次验证器计数为 **50/89**（见"结果"）。
- **两个绝对分数都是下界，不是模型的天花板。** 有效解码吞吐约 34–37 输出 tok/s，且首 token 延迟很高；89 个任务中有 28 个（Vera）/ 33 个（Kimi Code）在任务原生截止时间被中途杀停；被杀任务通过率仅 14% / 15%。按时完成的任务通过率为 **95.1%**（Vera）和 **85.7%**（Kimi Code），而同一 KimiCode harness 的官方公布值为 **88.3%**。在健康吞吐下，Vera 很可能达到或超过该参考值，Kimi Code 也大概率落在其附近（见下文推算）——届时 Terminal-Bench 2.1 在前沿水平上已接近饱和。
- **+10.1 个百分点的相对差距（Vera 占优）源于 harness 不对称性，** 而非思考强度、思考保留或网络。主要设置差异是 Vera 的**上下文预算工具结果剪枝**（开启且实测生效）、空 system 提示加狭窄的前台工具集，对比 Kimi Code 的完整产品 CLI（约 20KB system、完整工具面）。按时完成的任务之间差距依然存在（95.1% vs 85.7%）。差异仅列举，不按分数成因排序。

## 结果

已接受的最终结果（经下方经审计的恢复层之后）：

| 遴选方式 | Vera | Kimi Code | Kimi Code − Vera |
| --- | ---: | ---: | ---: |
| 已接受的最终结果 | 62/89（69.7%） | 53/89（59.6%） | −9 个任务（−10.1 pp） |
| 机械式首次结构化验证器 | 62/89（69.7%） | 50/89（56.2%） | −12 个任务（−13.5 pp） |
| 参考：官方 Kimi K3 + KimiCode harness（[技术博客](https://www.kimi.com/blog/kimi-k3)，访问于 2026-07-19） | — | 88.3% | — |

配对结果（已接受）：Vera 独占通过 **12**，Kimi Code 独占通过 **3**，双方均通过 **50**，双方均失败 **24**（打平 74 对）。

这是单次重复运行（`reps = 1`）。所有数字都是对一次冻结运行的描述性观测，不是统计显著性的估计。

## 结果核算

已接受的数据集在记录恢复许可（admission）后，按臂/任务 cell 选取最后一次结构化验证器结果。attempts WAL 包含 **203 条许可**：178 条初始 + **25 条恢复**（Vera 12，Kimi Code 13）。

| 记录的恢复原因 | 许可数 | 改变选中通过/失败结果 |
| --- | ---: | ---: |
| `operator_authorized_infrastructure_interruption` | 13 | 0 |
| `operator_authorized_terminal_infrastructure_failure` | 9 | 0 |
| `operator_authorized_verifier_infrastructure_misclassification` | 3 | 3 |

三处改变分数的恢复全部发生在 Kimi Code 臂——`prove-plus-comm`、`hf-model-inference` 和 `pypi-server` 各自先记录了结构化验证器失败，随后被操作员以基础设施误分类为由作废，并在其替代许可上通过。WAL 为每一项记录了作废原因和先前 admission id；冻结的运行目录已不再保留被取代的 trial 目录，因此作废与替代结果可验证，但操作员最初的判断无法独立重建。

生成报告中的 "178/178 attempted, 0 infraFailedCells" 描述的是已接受的最终数据集——既不是物理许可数，也不代表运行期间没有基础设施故障。运行状态为 `completed_with_gaps`，因为 Vera 的 `adaptive-rejection-sampler` cell 缺少最终用量数据；因此经济性聚合覆盖 88/89 个计量任务对。

## 吞吐量：为什么绝对分数是下界

智能体预算为任务原生（超时倍率 1）：89 个任务中 48 个为 900 秒，其余分布在 600 秒到 12,000 秒之间。两条臂都在预算到达时触发杀停——Vera cell 提前约 30 秒收尾，Kimi Code cell 则运行到截止时间（中位数超时 0.6 秒）。两条臂的解码速度都远低于这些预算所需：

| | Vera | Kimi Code |
| --- | ---: | ---: |
| 有效输出 tok/s（总体） | ~37（估算） | 34.0（实测） |
| 有效输出 tok/s（任务中位数） | ~44（估算） | 35.4 |
| 截止时间被杀任务数 | 28 / 89 | 33 / 89 |
| 被杀任务通过率 | 14.3%（4/28） | 15.2%（5/33） |
| 按时完成通过率 | **95.1%（58/61）** | **85.7%（48/56）** |

截止时间被杀的任务仍会验证；少数通过是因为预算耗尽时交付物已经就位。

测量说明。Kimi Code 的数字来自逐请求的 provider 代理遥测：1,300 条记录中有 1,267 个请求带正生成时长，9.5 小时测量生成中输出 116 万 token。Vera 路径没有请求级遥测，其数字由 runtime 事件流跨度估算（每次生成脉冲的首尾 partial 事件：13.8 小时内 186 万 token）——请按近似值对待。

共享代理路径上的首 token 延迟非常重：中位数 13.7 秒，p90 62.9 秒，单请求最差 1,023 秒。每个任务约 14 次模型请求，仅首 token 等待一项在中位数情况下就消耗 15 分钟预算中的约 3 分钟。机制很简单：约 35 tok/s 时，一个任务在 15 分钟预算内（扣除工具时间和等待）只能产出约 3 万输出 token，因此长周期任务会在生成中途饿死——同样的饥饿在 1,800–3,600 秒预算下也会杀任务。

**推算。** 官方 88.3% 正是我们 Kimi Code 臂所用的同一产品 harness（KimiCode、max 推理强度）报告的值。我们按时完成的子集通过率为 95.1%（Vera）和 85.7%（Kimi Code）；在两侧都按时完成的 49 个任务上，通过率为 95.9% 和 89.8%。在健康吞吐下，Vera 很可能达到或超过官方分数，Kimi Code 也大概率落在其附近。这些子集偏向较短任务，因此不断言精确的反事实——健康网络下的重跑才是决定性检验。

**基准余量。** 官方前沿分数已被压缩：当前排行榜前两名分数为 88.8% 和 88.3%（[llm-stats](https://llm-stats.com/benchmarks/terminal-bench-2.1)，访问于 2026-07-19），而我们不受吞吐约束的子集通过率为 85.7–95.9%。对于前沿"模型 + harness"系统而言，Terminal-Bench 2.1 已几乎没有可区分的余量——未来的对比需要更难的基准才能获得更多信号。

## 设置

| 维度 | 值 |
| --- | --- |
| 基准 | Terminal-Bench 2.1，revision `d49e28f1`（89 个显式任务 id；4 个指定试点任务） |
| 模型 | `kimi-coding-plan` / `k3` |
| 思考强度 | 两侧均为 `max` |
| 思考保留 | 对齐：上一轮思考保留给后续请求（Vera：provider 原生的 signed-thinking 回放；Kimi Code：产品默认全保留） |
| 智能体时间预算 | 任务原生智能体超时 ×1（48/89 个任务为 900 秒；其余 600–12,000 秒）；外层 setup/teardown 宽限 900 秒 |
| 重复次数 | 1 |
| 外部 `VERA_SYSTEM_PROMPT` | 两侧均为空（见下文不对称性 1） |
| 尝试策略 | 两侧均为 `single`；经审计的恢复层排除被基础设施作废的许可 |
| Vera 臂 | `vera_agent:VeraAgent`；宿主 runtime LLM，工具桥接进任务容器；continuation 关闭；**上下文预算开启**：对活动 + 过期工具结果在 2048 估算 token 处剪枝，语义压缩关闭 |
| Kimi Code 臂 | 容器内的 `kimi_code_agent:VeraKimiCodeAgent` 0.26.0（官方 CLI、print 模式、`stream-json`、`prompt-auto`）；**无 Vera 上下文预算策略** |
| 定价档位 | 账户套餐冻结，记录成本 $0（token 计数仍然有意义） |
| 并发 | 2 个任务对，最多 4 个并发臂尝试；同一对的 A/B 臂运行在同一条 provider 代理路径上 |

## 对相对差距已排除的因素

- **思考强度与保留。** 两侧都请求 max 强度，且都在多步工具循环中保留上一轮思考。不要把这个差距解读为"Vera 思考得更深"或"只有一边保留了思考历史"。Vera 在流式思考时可能显示 `reasoningTokens = 0`，而 Kimi 代理把大量输出计入 reasoning——这些是计量/投影差异，不是对齐问题。
- **网络。** 两臂在同一劣化路径上并发运行，墙钟时间基本持平：均值约 1030 秒 vs 约 1045 秒，中位数约 753 秒 vs 约 901 秒，总计约 25.5 小时 vs 约 25.8 小时；Vera 在 65/89 个任务上用时更短，截止杀停 28 vs 33。网络解释绝对水平，不解释相对差距。
- **Vera 重型任务自检。** 固定的构建包含无头重型任务自检机制（plan/evidence 工具加一个有界终局门），但默认关闭且本次未启用：89 个 trial 配置中没有任何 `--heavy-task` / `VERA_HEAVY_TASK_MODE`，89 个 Vera cell 的 system 提示哈希完全一致，每个完成的 cell 对 provider 可见的工具数为 7（带重型任务工具应为 11），且任何 transcript 中都没有自检工具调用或终局门事件。因此 +10.1 pp 差距不能归因于 Vera 侧的自验证。启用重型任务模式是处理"验证差 / 交付不完整 / 过早停止"失败桶的一个合理后续杠杆。

## 差异何在：harness 不对称性

以下为 v11 中存在的主要产品/harness 设置差异。它们被列为 +10.1 pp 背后的对齐差距，**而非**排序后的因果链——本次运行没有单因素消融。按时完成的任务间差距依然存在（95.1% vs 85.7%），因此不是差异化超时的产物。

1. **上下文预算工具结果剪枝（仅 Vera——一项主要 harness 设置）。** Vera 以 2048 估算 token 为阈值对活动 + 过期工具结果剪枝（语义压缩关闭）。在每次后续模型步骤前，provider 可见消息列表中过大的*当前轮*工具结果会被改写，从而不会以完整大小重新发送。Kimi Code 的 print 模式路径**没有**等价的 Vera 上下文预算策略，其 transcript 中也没有结构化剪枝计量。这是两臂之间最大的有意的 runtime 策略差异之一。

   本次运行实测（仅统计完成的 cell；中止的 cell 不产出剪枝诊断，因此计数是下界）：
   - 策略开启：**89/89** 个 Vera cell
   - 活动剪枝诊断：**21/57** 个完成 cell（**21/89** 总体）
   - **576** 次活动改写应用；后续步骤中不重发约 **187 万**估算 token（约占 Vera 累计输入的 4.4%）
   - 过期剪枝记录 **0** 次事件
   - 节省最多的任务：`video-processing`（约 47.1 万）、`custom-memory-heap-crash`（约 26.2 万）、`build-pov-ray`（约 20.3 万）
   - 测量到的最终 `contextRemaining` 保持在约 0.95M 以上——在该解码/超时机制下未观察到溢出救援
   - 在完成 cell 中，有剪枝诊断与无剪枝诊断的通过率基本持平（20/21 vs 34/36）；没有关闭剪枝的对照组，因此此处不估计分数影响。请将剪枝视为**已记录的、实际生效的 harness 不对称性**，而不是 +9 个独占胜利的已证实解释。

2. **系统提示。** Vera 发送空 system 字符串。Kimi Code 仍然引导其产品主智能体画像——约 20KB 的交互式编码智能体指令——即使外部环境变量为空。

3. **工具面与 shell 语义。** Vera 无头模式：狭窄的文件/shell 工具集，Bash 为前台执行。Kimi Code print 默认：完整产品工具列表（tasks、cron、agent/swarm、plan/goal 系列、web），带产品 Bash/后台行为。原生 print 路径没有面向用户的"最小主工具"开关。

4. **完成契约。** Kimi 的产品系统倾向于在完成或受阻时告知用户；Vera 依赖任务指令加工具 schema。

后台 Bash 是真实的能力差异，但不是分数故事：在 12 个 Vera 独占通过中，只有两个 Kimi Code 轨迹使用了 `run_in_background`，一个使用了 `Task*` 工具。大多数独占失败看起来是普通的前台错误——验证差、交付不完整、过早停止。

## 独占结果

**仅 Vera（12）：** `build-pov-ray`、`configure-git-webserver`、`crack-7z-hash`、`financial-document-processor`、`fix-code-vulnerability`、`gpt2-codegolf`、`mcmc-sampling-stan`、`overfull-hbox`、`regex-chess`、`schemelike-metacircular-eval`、`torch-pipeline-parallelism`、`video-processing`

**仅 Kimi Code（3）：** `feal-linear-cryptanalysis`、`mteb-retrieve`、`tune-mjcf`

每个任务的完整已接受通过/失败结果在相邻的 [CSV](./terminal-bench-2.1-vera-vs-kimi-code-v11.csv) 中；提示词、载荷、轨迹和验证器输出未提交。

## Token 经济

在冻结的账户套餐档位下，两侧记录的美元成本均为 **$0**——这只是记账占位符，不是真实成本的估计；请比较 token，而不是美元。

| 88 个计量任务对上的 token 用量 | Vera | Kimi Code |
| --- | ---: | ---: |
| 总计 | 43.96M | 47.77M |
| 缓存输入 | 37.57M | 44.03M |
| 未缓存输入 | 4.53M | 2.58M |
| 输出 | 1.86M | 1.16M |

Kimi Code 更高的缓存输入与其更大的产品系统面和更长的上下文一致，不是不同的强度设置。Vera 的实时工具结果剪枝（不对称性 1）在完成 cell 上记录了约 187 万估算 token 未重发——这是该策略的经济性下限效应，不是账单差额。

将官方 K3 API 挂牌价（$0.30/MTok 缓存命中输入、$3.00/MTok 缓存未命中输入、$15.00/MTok 输出）应用到 88 个计量任务对：

| 挂牌价估算 | Vera | Kimi Code |
| --- | ---: | ---: |
| 缓存输入 | $11.27 | $13.21 |
| 未缓存输入 | $13.58 | $7.73 |
| 输出 | $27.87 | $17.47 |
| **总计** | **$52.72** | **$38.40** |
| 每任务 | $0.60 | $0.44 |
| 每个已接受通过 | $0.85 | $0.72 |

这些是记录用量的挂牌价等价物，不是实际费用——本次运行在订阅账户套餐下按 $0 计量。Vera 使用的总 token 更少，但挂牌价成本更高，因为输出 token 在价目表上占比最重，而它多产出了 60% 的输出 token；Kimi Code 的优势在于其庞大且廉价的缓存输入。

## 注意事项

- 一次冻结运行，`reps = 1`：描述性，非统计性。
- Kimi Code 53/89 的头条数字依赖三次操作员记录的验证器作废；包含 50/89 首次验证器敏感性分析，使调整可见而非隐式。
- 这是共享模型的 harness / 产品智能体对比，不是"同一智能体、同一系统、同一工具"的模型对决。Kimi Code 上，外部 system 环境为空 ≠ 产品系统为空。
- 没有任何单一产品旋钮被证明能解释净 +9；原因被分为"已排除"与"不对称"两类，未排序。
- 针对官方 88.3% 的推算基于按时完成子集，该子集偏向较短任务且两臂不同；健康网络下的重跑是决定性检验。
- 缺少 oracle 注册表配置：没有 oracle 支撑的分歧层。
- 记录的 $0 成本不得解读为免费或经济性对等；请使用 token 表。
- 原始运行产物保留在本地并被 git 排除；本文档只提交聚合叙述和脱敏最简的结果 CSV。

## 完整性

冻结证据文件（本地、git 排除）与已提交 CSV 的 SHA-256：

| 来源 | SHA-256 |
| --- | --- |
| `harness-ab-manifest.json` | `8ffe15ca48348b10aacde90b569c88b598bfd5bd961540fe77896566b8245258` |
| `harness-ab-report.json` | `83742970810c2ce864b35fba40180ebe41bdda28efe2f6954a376b3d04653269` |
| `controller/results.jsonl` | `a094d6096e7f5d519f10b65ff64984c46f561313eed8726f2aaefacdbb4270ce` |
| `controller/results.jsonl.attempts.jsonl` | `975222c4800d2cc65924116f423fc8ea7327b470de559eaefb6381319e9c209c` |
| 已提交结果 CSV | `e7a2e76f883ab8672e72d347b66cf3392965b4e3e21fbac75eb4a9622af849c8` |

## 产物指针

| 产物 | 路径 |
| --- | --- |
| Harness 报告（JSON） | `~/.vera/eval/runs/k3-vera-vs-kimi-code-tbench-2.1-full-v11/harness-ab-report.json` |
| Harness 报告（Markdown） | `~/.vera/eval/runs/k3-vera-vs-kimi-code-tbench-2.1-full-v11/harness-ab-report.md` |
| 运行清单 | `~/.vera/eval/runs/k3-vera-vs-kimi-code-tbench-2.1-full-v11/harness-ab-manifest.json` |
| 控制器 WAL（最终 + 尝试） | `.../controller/results.jsonl`、`.../controller/results.jsonl.attempts.jsonl` |
| 逐请求遥测（Kimi Code 臂） | `.../jobs/<run>/ab-kimi-code-r0-<task>/<task>/provider-request-telemetry.json` |
| 逐 cell 桥接输出（两臂） | `.../jobs/<run>/ab-{vera\|kimi-code}-r0-<task>/<task>/trial/<trial>/agent/vera-cell-output.json` |
