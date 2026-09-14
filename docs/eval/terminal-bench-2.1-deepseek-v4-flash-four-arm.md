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

# Terminal-Bench 2.1 —— DeepSeek V4 Flash：Vera vs Codex vs Claude Code vs Reasonix

本报告围绕同一个 DeepSeek V4 Flash 模型，在全部 89 个 Terminal-Bench 2.1 任务上对比四个 agent harness。每个 arm 都在任务容器内运行，使用相同的 executor、相同的任务原生截止时间策略和相同的软件包镜像，因此 arm 之间唯一变化的变量就是 harness 本身。

**运行 id：** `deepseek-v4-flash-4arm-tbench-2.1-full-v1`

**指标：** 由官方任务验证器评定的端到端 pass@1

**状态：** `completed_with_gaps` —— 353/356 个 cell 由模型评分；三个未评分的 cell 是 Reasonix 的基础设施与管道故障，经重试策略后仍然失败

**逐任务结果：** [`terminal-bench-2.1-deepseek-v4-flash-four-arm.csv`](./terminal-bench-2.1-deepseek-v4-flash-four-arm.csv)

该实验在 [issue #1970](https://github.com/vera-agent/vera-agent/issues/1970) 中跟踪。

## TL;DR

- **Codex 通过 70/89（78.65%），Vera 65/89（73.03%），Claude Code 57/89（64.04%），Reasonix 55/89（61.80%）。**
- **Codex 与 Vera 的差距在统计上不显著。** 19 个不一致任务对中，Codex 赢 12 个、Vera 赢 7 个；精确双侧 McNemar 检验给出 **p = 0.359**。六组两两对比中只有两组达到显著：Codex 对 Claude Code（p = 0.0072）和 Codex 对 Reasonix（p = 0.0026）。
- **一次独立的早期运行也支持这一结论，包括不显著这一点。** 在同样的 89 个任务上，它给出 Codex 67、Vera 60、Claude Code 57，其中 Codex–Vera 为 p = 0.210。Codex 是两次运行中配置完全相同的唯一 arm，而**它的任务中有 19% 在两次运行之间结果翻转，净分数只变动了 3**——这就是任何「五个任务」级别的结论必须跨过的噪声底限。
- **Vera 是每次通过最便宜的 arm，为 $0.03215**，低于 Codex（$0.03339）、Reasonix（$0.04051）和 Claude Code（$0.04800），同时也是中位 cell 上最快的 arm（332.8 秒对 Codex 的 411.7 秒）。
- 在没有任何 arm 耗尽预算的 60 个任务子集上，头部的排序发生反转：**Claude Code 90.00%，Codex 88.33%，Vera 86.67%，Reasonix 75.00%。** Claude Code 有最高的条件通过率，却有最差的总分，因为它在 24/89（26.97%）的任务上耗尽了预算——是其他任何 arm 的两倍以上。
- 四个 arm 中有三个一旦完成任务，解题质量非常接近。标题性的差距主要由 arm 能否在截止时间内完成驱动，而不是由它能否解题驱动。

## 结果

端到端 pass@1 是首要结果。预算耗尽的 cell 在其分母中仍计为评分失败。

| Arm | Pass@1 | 通过 / 评估 | 预算耗尽 | 验证失败 | 未评分 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Codex | **78.65%** | 70 / 89 | 9 | 10 | 0 |
| Vera | **73.03%** | 65 / 89 | 11 | 13 | 0 |
| Claude Code | **64.04%** | 57 / 89 | 24 | 8 | 0 |
| Reasonix | **61.80%** | 55 / 89 | 13 | 18 | 3 |

Reasonix 是唯一有未评分 cell 的 arm：两次基础设施故障和一次管道故障经重试策略后仍然失败。其 pass@1 按全部 89 个任务报告；按它实际完成的 86 个任务计算，通过率为 63.95%。另外三个 arm 的基础设施故障数为零。

## 两两显著性

每次对比都对不一致的任务对使用精确双侧 McNemar 检验，把 89 个 benchmark 任务作为配对单元。

| 对比 | 仅 A 通过 | 仅 B 通过 | 不一致对 | p |
| --- | ---: | ---: | ---: | ---: |
| Codex vs Reasonix | 19 | 4 | 23 | **0.0026** |
| Codex vs Claude Code | 17 | 4 | 21 | **0.0072** |
| Vera vs Reasonix | 17 | 7 | 24 | 0.0639 |
| Vera vs Claude Code | 13 | 5 | 18 | 0.0963 |
| Vera vs Codex | 7 | 12 | 19 | 0.3593 |
| Claude Code vs Reasonix | 15 | 13 | 28 | 0.8506 |

只有两个涉及 Codex 的对比跨过了 0.05 阈值。**Codex 领先 Vera 的五个任务落在该套件噪声可产生的范围内**：配对结果为 58 个共同通过、7 个仅 Vera、12 个仅 Codex、12 个共同失败。Vera 相对 Claude Code 和 Reasonix 的优势方向一致，但同样未达显著。

这只是关于固定 89 任务 Terminal-Bench 2.1 套件上一次冻结运行的证据。它不能证明其他任务分布、其他模型或重复运行上的普遍排序。

## 独有结果

**仅 Vera 通过，7 个：** `extract-elf`、`feal-differential-cryptanalysis`、`kv-store-grpc`、`protein-assembly`、`qemu-alpine-ssh`、`regex-chess`、`sanitize-git-repo`

**仅 Codex 通过，12 个：** `cancel-async-tasks`、`code-from-image`、`configure-git-webserver`、`dna-assembly`、`dna-insert`、`fix-git`、`largest-eigenval`、`make-mips-interpreter`、`mteb-leaderboard`、`pytorch-model-recovery`、`torch-pipeline-parallelism`、`write-compressor`

两组在性质上不同，而不只是数量上。在 Vera 独自获胜的全部 7 个任务上，Codex 都产出了候选结果而验证器拒绝了它——没有一个是截止时间失败。在 Codex 独自获胜的 12 个任务上，Vera 的失败分为 **8 个验证失败对 4 个预算耗尽**。因此三分之二的差距来自错误答案而非未完成的工作，这与下面单次请求的耗时形态单独预测的正好相反。

每个任务的完整已受理通过与失败结果及失败类别都在旁边的 [CSV](./terminal-bench-2.1-deepseek-v4-flash-four-arm.csv) 中；提示词、载荷、轨迹与验证器输出未提交。

## 诊断分解

这些指标用于诊断观测到的差距出现在哪里。两者都不能替代端到端 pass@1。

| 诊断项 | Vera | Codex | Claude Code | Reasonix |
| --- | ---: | ---: | ---: | ---: |
| 非预算条件通过率 | 52/60 (86.67%) | 53/60 (88.33%) | **54/60 (90.00%)** | 45/60 (75.00%) |
| 预算耗尽率 | 11/89 (12.36%) | 9/89 (10.11%) | **24/89 (26.97%)** | 13/89 (14.61%) |

条件分母排除任何*任一* arm 耗尽预算的任务，给四个 arm 留下相同的 60 个任务。它不是「不限时通过率」：剩余任务仍在各自原始的任务原生截止时间内运行，且被排除的集合并非随机——它偏向难题。

两行讲述的是不同的故事。在条件子集上，Vera、Codex 和 Claude Code 彼此相差不超过 3.33 个百分点，前三名的排序与标题结果相反。在标题结果中拉开差距的是第二行：Claude Code 在超过四分之一的套件任务上耗尽预算，是 Codex 的两倍多。

这些观察拆解了差距；本次运行没有确立其原因。

## 按结果归一化的成本经济

每次通过成本把记录的用量按成功的 benchmark 结果归一化。它包含评分失败上的开销。

| Arm | 总成本 | 通过数 | 每次通过成本 |
| --- | ---: | ---: | ---: |
| Vera | $2.0895 | 65 | **$0.03215** |
| Codex | $2.3376 | 70 | $0.03339 |
| Reasonix | $2.2281 | 55 | $0.04051 |
| Claude Code | $2.7363 | 57 | $0.04800 |

Vera 在 pass@1 上排名第二，却是每次通过最便宜的。相对 Codex 的优势为 3.7%；与 Claude Code 的差距为 49%。未做等价性检验，因此这些只是单次运行的描述性点估计。

该结果背后的资源足迹：

| 资源诊断 | Vera | Codex | Claude Code | Reasonix |
| --- | ---: | ---: | ---: | ---: |
| 输入 token | 181,448,639 | 295,168,443 | 244,477,053 | 240,741,904 |
| 缓存输入 token | 177,684,352 | 291,031,168 | 240,396,288 | 237,451,776 |
| 输入中缓存命中占比 | 97.93% | 98.60% | 98.33% | 98.63% |
| 输出 token | 3,546,226 | 3,081,715 | 4,991,091 | 3,663,490 |

Vera 用 Codex **61% 的输入 token** 达到了其 93% 的分数。由于 DeepSeek 对缓存命中的定价为非缓存输入的 2%，这一差异在账单中的占比小于在 token 数中的占比，但正是这个机制让 Vera 在更高的输出量下总花费更低。

用量由解析 provider SSE 流的 per-cell 宿主代理计量。收到终态事件后关闭连接的客户端很常见——Reasonix 有 40% 的请求以这种方式结束——其用量会被保留。整个运行中，412 个 Reasonix 请求里只有 2 个没有记录的用量。

成本是基于 manifest 中冻结的定价身份、考虑缓存的 API 等价估算：每百万非缓存输入 token $0.145、每百万缓存命中输入 token $0.0029、每百万输出 token $0.29。它们不是账单发票。

## 单次请求形态

四个 harness 在如何花费任务预算上差异显著。

四列都来自宿主代理的单次请求遥测，因此彼此可比。

| Arm | 每 cell 请求数 | 每请求输出 token | 每请求推理 token | 每请求秒数 |
| --- | ---: | ---: | ---: | ---: |
| Codex | 44.3 | 781 | 543 | 9.1 |
| Reasonix | 41.6 | 1,000 | 745 | 11.5 |
| Vera | 37.4 | 1,064 | 778 | 10.7 |
| Claude Code | 32.8 | 1,708 | 未单列 | 18.2 |

Codex 步数最多而每步最小；Claude Code 步数最少而每步最大最慢。Vera 介于两者之间，每次请求的推理量是 Codex 的 1.43 倍。Anthropic 的协议不单列推理 token，所以 Claude Code 的推理列为空而不是零。

在 cell 层面，这产生了独特的时长形态：

| Arm | cell 中位数 | cell 均值 | cell p90 | 消耗任务截止时间的中位占比 |
| --- | ---: | ---: | ---: | ---: |
| Vera | **332.8 s** | 693.1 s | 1800.0 s | 0.309 |
| Codex | 411.7 s | 582.8 s | 1334.9 s | 0.303 |
| Reasonix | 428.7 s | 658.2 s | 1577.5 s | 0.363 |
| Claude Code | 544.7 s | 840.2 s | 1800.6 s | 0.416 |

Vera 的中位 cell 最快、均值第二慢。这两个统计量并不矛盾：在典型任务上 Vera 最先完成，消耗的截止时间占比与 Codex 基本相同（0.309 对 0.303），而均值被一批跑满截止时间的较重尾部 cell 拉高。

在硬截止时间下，这种形态在尾部产生后果。在 `write-compressor` 上（任务原生 agent 预算 900 秒），Vera 在模型内花了 890 秒、工具仅 6 秒，20 次请求后耗尽预算；Codex 用 66 次请求在 540 秒内完成了同一任务。更密集的步骤让从错误转向中恢复的余地更小。

## 跨运行稳定性

更早一次覆盖同样 89 个任务、同一模型（`deepseek-v4-flash-3arm-tbench-2.1-full-v7`）的三臂运行为 Codex、Vera 和 Claude Code 提供了一次独立重复。它早于本分支：Vera 在宿主侧运行、未应用软件包镜像，其 Claude Code arm 因基础设施故障损失 17 个 cell。只有 Codex arm 在两次运行中配置相同。

| Arm | 三臂运行 | 四臂运行 | 结果翻转的任务数 |
| --- | ---: | ---: | ---: |
| Codex | 67/89 (75.28%) | 70/89 (78.65%) | 17 (19.10%) |
| Vera | 60/89 (67.42%) | 65/89 (73.03%) | 19 (21.35%) |
| Claude Code | 57/89 (64.04%) | 57/89 (64.04%) | 18 (20.22%) |

Codex 行是可解读的那一行，也是本报告最有用的数字。其配置未变，两次运行都没有记录基础设施故障，然而**两次运行之间有 19% 的任务结果翻转，而净分数只变动了 3**。这套件大约五分之一的结论由运行间差异决定，而非被测 harness 的任何属性。

这就是解读 Codex–Vera 五个任务差距时必须参照的尺度，它与显著性检验一致：三臂运行中同样的对比给出 15 个仅 Codex 对 8 个仅 Vera，**p = 0.210**——再次不显著，再次偏向 Codex。两次独立的完整运行都让 Codex 名义上领先 Vera，而两者都无法区分它们。

Vera 与 Claude Code 行不能这样解读。Vera 的运行位置与软件包来源在两次运行间都变了，所以它的 +5 把这些变化与方差混在一起。Claude Code 相同的标题数字掩盖了不同的分母：其三臂运行中有 17 个 cell 从未评分。

## 本次运行证明了 Vera 的哪些方面

以本次运行支持的结论陈述，并附上各自的证据。

1. **在解题质量上 Vera 与 Codex 旗鼓相当，且该套件无法区分二者。** 65 对 70 的通过数，p = 0.359，对照实测 19% 的跨运行翻转率。两次独立完整运行都让 Codex 名义上领先，且两者都不显著。
2. **Vera 是每个成功任务最经济的 arm。** 每次通过 $0.03215，为四个 arm 中最低，且只用了 Codex 61% 的输入 token。Codex 以高出 12% 的总花费买到额外的五个通过。
3. **Vera 是中位 cell 上最快的 arm。** 332.8 秒对 Codex 的 411.7 秒、Reasonix 的 428.7 秒、Claude Code 的 544.7 秒，同时消耗与 Codex 相同的任务截止时间中位占比。
4. **Vera 的执行干净利落。** 全部 89 个任务零基础设施故障、零重试受理、零未评分 cell——只有 Codex 同样做到。Claude Code 需要一次重试，Reasonix 需要五次，其中三次仍然失败。
5. **Vera 赢时赢在正确性上。** Vera 通过而 Codex 失败的全部 7 个任务都是 Codex 的验证失败，而非 Codex 的截止时间失败。

本次运行**没有**证明的是：Vera 优于 Codex、上述任何优势能经得起重复，或上文机制导致了这些结果。这里的每个结论都是对一次冻结运行的描述。

## Vera 下一步改进的方向

失败分解指向的位置与单看耗时故事指向的位置不同。

**第一，Codex 能答对的任务上的解题正确性。** 在 Codex 通过而 Vera 未通过的 12 个任务中，**8 个是验证失败，只有 4 个是截止时间失败**。Vera 产出了候选结果、提交了它，而官方验证器拒绝了它。这是两个桶里较大的一个，而且不是速度问题。这些任务列在 [独有结果](#exclusive-outcomes) 之下，每个在归档运行中都有完整轨迹；逐任务阅读这 8 个是本数据集支持的最高价值的下一步调查。

**第二，硬截止时间下每步的推理量。** Vera 每次请求消耗 778 个推理 token，而 Codex 为 543 个，且步数更少、更密集。在 Vera 输给截止时间的四个任务上这一点是决定性的——`write-compressor` 把 900 秒的 99% 花在模型内部。开放问题是因果性的，这里没有回答：同一个模型、同一个 `max` 推理强度下，在 Vera 的脚手架中产生的推理文本明显多于在 Codex 的脚手架中，而两种候选解释（循环重复与上下文增长）已对照三臂轨迹检查并排除。跟踪继续在 [issue #1970](https://github.com/vera-agent/vera-agent/issues/1970) 中进行。

**第三，把截止时间意识当作策略而不是超时。** Vera 的中位 cell 消耗其任务截止时间的 0.309，所以预算总体并不紧张；11 个耗尽的 cell 是尾部而非趋势。一个能检测到自己身处尾部、并转向更便宜、更频繁的验证步骤的 harness，可以把截止时间失败转化为有评分的尝试，同时不改变典型情况。本次运行测量了尾部，但没有评估任何此类策略。

**第四，在把这些当作定论之前需要更多重复。** 19% 的跨运行翻转率意味着单次运行无法验证价值低于约十个任务的改动。上述任何一项都应该用重复来衡量，而不是再来一次完整运行。

## 冻结的配置

| 维度 | 值 |
| --- | --- |
| Benchmark | Terminal-Bench 2.1，修订版本 `d49e28f1e4ddd13d289e85a5f312a66750951932`；全部 89 个任务 |
| 任务来源指纹 | `sha256:456826aa4c47ed309716c964c96d2a3acc998764ebc84f3e8449c807d74bd4e7` |
| 运行指纹 | `sha256:869d39bb82d61462afabec5ccc6d9560c9aa19287041a1d46f6c5d7c66fd3fb4` |
| 工具链指纹 | `sha256:7b21118862eb823a7af9c7d90ead64ef459f8a353b7aebae1b164dde6166eb60` |
| 模型 | 四个 arm 均通过 DeepSeek provider 使用 `deepseek-v4-flash` |
| 推理强度 | 四个 arm 均为 `max` |
| 重复次数 | 1 |
| 指标 | 官方验证器的配对 pass@1 |
| 截止时间策略 | 任务原生 agent 超时 ×1；30 秒 agent 结算宽限；900 秒外层搭建与拆除宽限 |
| 任务原生预算 | 48 个任务 900 秒、17 个 1800 秒、13 个 3600 秒、5 个 1200 秒、2 个 2400 秒，另有 600 秒、750 秒、7200 秒、12000 秒各一个 |
| 尝试策略 | 每个 arm/任务一次被接受的模型尝试；只有基础设施失效的受理可以被替换 |
| 执行位置 | 四个 arm 都在任务容器内执行 |
| 配对执行 | 6 个任务组并发，组内 arm 并行，最多 24 个 cell 并发 |
| 任务顺序 | 基于种子 `terminal-bench-2.1:deepseek-v4-flash:harness-comparison:v1` 的 `sha256-rank-v1` |
| 软件包镜像 | 每个 arm 都把 `archive.ubuntu.com` 与 `security.ubuntu.com` 重定向到 `mirrors.tencentyun.com` |
| 计费模式 | 按用量计量，使用上面冻结的 DeepSeek V4 Flash 定价身份 |
| Vera arm | `vera_agent:VeraAgent`；`openai-chat`；外部系统提示 `default-headless`；continuation 关闭；在 2,048 估算 token 阈值下剪除活动与过期的工具结果；语义压缩关闭；`harbor-local` 隔离 |
| Codex arm | `codex_agent:VeraCodexAgent` 0.146.0；`openai-responses`；无外部系统提示；`container-full-access` 权限 |
| Claude Code arm | `claude_code_agent:VeraClaudeCodeAgent` 2.1.220；`anthropic-messages`；无外部系统提示；`bypassPermissions` |
| Reasonix arm | `reasonix_agent:VeraReasonixAgent` 1.19.4；`openai-chat`；`stream-json` 输出；无外部系统提示；`auto` 权限 |

重定向 apt 是方差控制措施，不是性能辅助。同一条命令从同一宿主出发，因落到的上游路径不同，耗时可能是 16 秒或 300 秒，而这个噪声会记到恰好需要更多软件包的那个 agent 头上。镜像地址进入 manifest 指纹，因此带不带镜像的运行是不同的实验。

这是同模型下的 harness 对比，不是孤立的模型评测，也不是同系统/同工具的消融。各 arm 保留其原生 agent 指令、工具行为、上下文管理与执行循环。有两个不对称值得明确点名：Vera 是唯一携带外部系统提示的 arm（`default-headless`，其他 arm 都不发送），Vera 也是唯一运行基于上下文预算的工具结果剪除策略的 arm。观测到的差异应归因于被对比的 harness 系统整体；本次运行不把单个 harness 差异排成因果。

## 结果核算

控制器 WAL 记录了 **362 次 Agent 受理**，对应 356 个计划 cell：356 次初始受理加上六次基础设施重试。这些重试覆盖一个 Claude Code cell（`custom-memory-heap-crash`，随后完成）和五个 Reasonix cell（`cancel-async-tasks`、`filter-js-from-html`、`fix-ocaml-gc` 完成；`adaptive-rejection-sampler` 与 `regex-chess` 再次失败）。没有 cell 收到第三次受理。Reasonix 的 `pytorch-model-recovery` 在管道层失败，未重试。

Vera 与 Codex 各收到恰好 89 次受理，零重试、零基础设施故障。

最终账本为 353 个 `task_completed`、8 个 `task_infra_failed` 和 1 个 `task_plumbing_failed` 事件，其中存活的三个失败即上文报告的未评分 cell。

## 局限

- 该套件有两次运行，但只有 Codex arm 在两次中配置相同；本报告的对比依托四臂配置的一次运行。鉴于上文测得的 19% 跨运行翻转率，这种量级的差异不应被任何单次运行视为定论。
- 任务原生截止时间是一个实质性参数，不是中性参数。它对 Claude Code 约束最紧（26.97% 耗尽），放宽后很可能改变排序。
- Reasonix 贡献了三个未评分 cell，因此它的对比依托 86 个共享任务而非 89 个。
- Vera 携带其他三个 arm 没有的外部系统提示与工具结果剪除策略。这是已记录的线上 harness 不对称，不是受控变量，且本次运行没有关闭剪除或关闭提示的对照组。
- 每次通过成本使用按计量用量套用的 provider 列表定价，而非已出账发票。
- 两两 McNemar 检验未做多重比较校正。对六组对比应用 Bonferroni 校正后阈值变为 0.0083；Codex 的两个结果仍能通过（0.0026 与 0.0072），其他对比则远未接近。
- 对 Codex 的推理总量，单次请求遥测与 harness 的 token 汇总不一致（214 万对 157 万 token）；两者对 Vera 一致。原因未查明，因此本报告不做跨来源的总量断言，只在遥测来源内部比较单次请求数字。
- 未配置外部 Oracle 注册表快照，因此全部 89 个任务都缺少 Oracle 标注。官方 Terminal-Bench 验证器仍是评分权威。

## 完整性

冻结的本地证据与已提交结果投影的 SHA-256 哈希：

| 来源 | SHA-256 |
| --- | --- |
| `harness-ab-manifest.json` | `aaa3099b365cff01658405d0fc0777aa3c719e8e4cb73627d23bfc124767e3cc` |
| `harness-cohort-report.json` | `52dff9d3212cbcc9bc927dd0cb280aded72f757e310e75de77f27242e130087e` |
| `harness-cohort-report.csv` | `bd04d3d0bbb3c2e9d0594d061e1ffc4cd1ba0706e21ddad9f95057415f7d3c2e` |
| 完整运行归档 `four-arm-full-v1.tgz` | `0816483e35ae2cb85d283c7ee8d74af7e929d8b4898eca4cce877a1341832e95` |
| 已提交的结果 CSV | `d0a65eed5c3f8803271819797b292b39c4deaf59178ffbc21595299b740ccfc7` |

## 工件索引

本地、git 排除，位于 `vera-eval/experiments/harness-ab/terminal-bench-2.1/` 下：

| 工件 | 路径 |
| --- | --- |
| 四臂运行归档 | `deepseek-v4-flash-4arm-tbench-2.1-full-v1-20260805/four-arm-full-v1.tgz` |
| 生成的 cohort 报告 | `deepseek-v4-flash-4arm-tbench-2.1-full-v1-20260805/harness-cohort-report.{json,csv,md}` |
| 不可变 manifest | `deepseek-v4-flash-4arm-tbench-2.1-full-v1-20260805/harness-ab-manifest.json` |
| 控制器 WAL 与尝试记录 | `deepseek-v4-flash-4arm-tbench-2.1-full-v1-20260805/extracted/*/controller/results.jsonl{,.attempts.jsonl}` |
| 三臂参考运行 | `deepseek-v4-flash-3arm-tbench-2.1-full-20260804/` |
| 三臂逐任务深度分析 | `deepseek-v4-flash-3arm-tbench-2.1-full-20260804/deepdive/` |

已提交的 CSV 只包含选定的最终通过与失败及失败类别投影；提示词、轨迹、provider 载荷、原始日志与 trace 不对外发布。
