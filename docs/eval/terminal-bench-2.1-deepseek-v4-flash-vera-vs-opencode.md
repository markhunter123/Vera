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

# Terminal-Bench 2.1 — DeepSeek V4 Flash：Vera 对比 OpenCode

本报告在全部 89 个 Terminal-Bench 2.1 任务上，将 Vera 与 OpenCode 作为围绕同一 DeepSeek V4 Flash 模型的两个 agent 框架进行对比。它记录了冻结的实验、已接受的结果、配对推断、按结果归一化的成本，以及为产出完全评分的数据集所需的恢复决策。

**运行 id：** `deepseek-v4-flash-vera-vs-opencode-tbench-2.1-full-v7`

**本地产物（git 排除）：** `~/.vera/eval/runs/deepseek-v4-flash-vera-vs-opencode-tbench-2.1-full-v7/`

**指标：** 由官方任务验证器评定的端到端 pass@1

**状态：** `completed` — 178/178 个单元格完成模型评分，无未评分的基建单元格，无缺失的最终 usage

**逐任务结果：** [`terminal-bench-2.1-deepseek-v4-flash-vera-vs-opencode.csv`](./terminal-bench-2.1-deepseek-v4-flash-vera-vs-opencode.csv)

## 摘要

- **Vera 通过 61/89 个任务（68.54%）；OpenCode 通过 49/89（55.06%）。** Vera 领先 12 个任务，即 13.48 个百分点。
- 配对结果是 16 个仅 Vera 通过、4 个仅 OpenCode 通过、69 个平局。对 20 个不一致配对做精确双侧 McNemar 检验得 **p = 0.0118**。这是针对固定 89 任务 Terminal-Bench 2.1 套件的证据，并非在其他任务分布上存在普适优势的证明。
- 已接受数据集中每个通过任务的 API 等价成本实测基本相同：**Vera 为 $0.03172，OpenCode 为 $0.03171**。未做成本等价性检验，因此这是描述性的点估计，而非统计上的等价性声明。
- 两项诊断指标随附于端到端 pass@1 之后，但不取代它。在剔除任一侧耗尽预算的配对后得到的共享 61 对子集上，Vera 通过 52/61（85.25%），OpenCode 通过 46/61（75.41%）。预算耗尽影响了 15/89 个 Vera 单元格（16.85%）与 24/89 个 OpenCode 单元格（26.97%）。这些观测分解了最终差距的构成；本次运行不识别其因果机制。

## 结果

端到端 pass@1 是主要结果。预算耗尽的单元格在其分母中仍计为评分的失败。

| 主要结果 | Vera | OpenCode | Vera − OpenCode |
| --- | ---: | ---: | ---: |
| 端到端 pass@1 | **61/89（68.54%）** | **49/89（55.06%）** | **+12 个任务（+13.48 pp）** |

配对结果表：

| | OpenCode 通过 | OpenCode 失败 | 合计 |
| --- | ---: | ---: | ---: |
| Vera 通过 | 45 | 16 | 61 |
| Vera 失败 | 4 | 24 | 28 |
| 合计 | 49 | 40 | 89 |

对于精确 McNemar 检验，原假设给不一致配对的两个方向赋予相等概率。在 16 个仅 Vera 与 4 个仅 OpenCode 的结果下，双侧精确二项概率为 `2 × P[Binomial(20, 0.5) ≤ 4] = 0.0118179`。该检验将 89 个基准任务视为配对单位。由于这是对单一固定套件的一次冻结运行，该 p 值不应被解读为对其他基准、任务分布、provider 条件或重复运行的保证。

## 诊断性分解

以下指标诊断观测到的端到端差距出现在何处；二者都不是替代性的主成绩。

| 诊断指标 | Vera | OpenCode | Vera − OpenCode |
| --- | ---: | ---: | ---: |
| 非预算条件通过率 | 52/61（85.25%） | 46/61（75.41%） | +9.84 pp |
| 预算耗尽率 | 15/89（16.85%） | 24/89（26.97%） | −10.11 pp |

条件分母在任一侧为 `budget_exhausted` 时剔除整个配对，使两侧保留相同的 61 个任务。它不是"不限时通过率"：剩余任务仍在原有预算下运行，且被剔除的集合并非随机。条件通过率与预算耗尽率的同步差异表明，两个维度都伴随端到端结果出现。它们本身并不能将模型解题质量、推理速度或 agent 轮次效率隔离为原因。

## 按结果归一化的成本

每次通过的成本是主要的经济分母，因为它按成功的基准结果归一化已记录的 usage。它包含所有已接受评分失败上的花费，但不包含已被取代的、基建无效而撤下的入场（admission）。

| 经济结果 | Vera | OpenCode |
| --- | ---: | ---: |
| 已接受数据集中每次通过的 API 等价成本 | **$0.031718** | **$0.031712** |
| 通过的任务数 | 61 | 49 |

观测到的差异小于每次通过 $0.000007，即 0.02%。在本次单次运行所能支撑的精度下，两个点估计实际上相同。这不是统计上的成本等价结果：该实验只有一次重复，且对每次通过的成本没有不确定性模型。

为完整性起见，该按结果归一化结果背后的资源占用如下：

| 资源诊断 | Vera | OpenCode |
| --- | ---: | ---: |
| 已接受评分单元格成本 | $1.934813 | $1.553888 |
| 每个评分单元格成本 | $0.021739 | $0.017459 |
| 总 token 数 | 173,281,686 | 115,523,680 |
| 缓存命中的输入 token | 166,618,240 | 110,226,048 |
| 未缓存的输入 token | 3,315,719 | 2,083,315 |
| 输出 token | 3,347,727 | 3,214,317 |
| 输入中缓存命中占比 | 98.05% | 98.15% |

OpenCode 的单单元格占用更低，但它产出的通过数也更少。因此较低的总花费并不会成为观测到的单位成功成本优势。本报告将资源占用与按结果归一化的成本分开呈现，而不把它们合并为综合得分。

成本是感知缓存的 API 等价估计，依据 manifest 中冻结的定价恒等式：每百万未缓存输入 token $0.145、每百万缓存命中输入 token $0.0029、每百万输出 token $0.29。它们不是计费账单。

## 冻结的实验设置

| 维度 | 值 |
| --- | --- |
| 基准 | Terminal-Bench 2.1，revision `d49e28f1e4ddd13d289e85a5f312a66750951932`；全部 89 个任务 |
| 任务树指纹 | `sha256:456826aa4c47ed309716c964c96d2a3acc998764ebc84f3e8449c807d74bd4e7` |
| 运行指纹 | `sha256:d18bc4c5ab0dd15161f48838ab0fa4a7a9ba2654f6008afe36d3d398fdf5fff3` |
| 模型 | 双臂均经 DeepSeek provider 使用 `deepseek-v4-flash` |
| 推理强度 | 双臂均为 `max` |
| 重复次数 | 1 |
| 指标 | 配对 pass@1 |
| 尝试策略 | 每臂/每任务一次已接受的模型尝试；仅基建无效的入场可被替换 |
| 时限策略 | 任务原生 agent 超时 ×1；900 秒的额外 setup 与 teardown 宽限 |
| 配对执行 | 最多并发 4 个任务对；配对内 Vera 与 OpenCode 并行启动；最多并发 8 个单元格 |
| 外部 system prompt | 双臂均为空 |
| Vera 臂 | `vera_agent:VeraAgent`；continuation 关闭；在 2,048 预估 token 阈值下启用 active 与 stale 工具结果裁剪；semantic compact 关闭 |
| OpenCode 臂 | `opencode_agent:VeraOpenCodeAgent` 1.17.18；pure mode；自动权限；`max` 变体 |
| 计费模式 | 按用量计费，使用上文冻结的 DeepSeek V4 Flash 定价恒等式 |

这是同模型的框架对比，不是孤立的模型评估，也不是同系统/同工具的消融实验。两条臂保留其原生 agent 指令、工具行为、上下文管理与执行循环。因此观测到的差异应归因于被对比的框架系统整体；本次运行不将单个框架差异排序为原因。

## 结果核算与恢复

已接受数据集在不可变的运行指纹下，为每个臂/任务单元格选取最新授权的终端结果。尝试 WAL 包含 **183 次 Agent 入场**：178 次初始入场加 5 次单一基建重试。这些重试覆盖 4 个 Vera 单元格（`winning-avg-corewars`、`polyglot-rust-c`、`path-tracing`、`qemu-startup`）与 1 个 OpenCode 单元格（`polyglot-rust-c`）。没有任何单元格获得第三次 Agent 入场。

裁定台账（adjudication ledger）包含 25 条仅涉及分类的修正，不改变通过/失败结果：24 个 OpenCode 单元格凭权威的 Harbor `AgentTimeoutError` 证据从 `verification_failed` 归一化为评分内的 `budget_exhausted`；OpenCode 的 `rstan-to-pystan` 在大量执行并取得官方验证器结果后，从框架基建失败归一化为评分内的候选运行时/资源失败。两个执行前失败的 Vera 单元格在获得各自一次允许的替换入场之前，被重新分类为未评分的基建失败。

最终的 OpenCode `polyglot-rust-c` 入场完成了全部 5 次 provider 请求、记录了完整 usage、写出并本地编译了所要求的候选，随后因任务容器无法访问 Ubuntu 归档而两次遭遇验证器 setup 基建失败。容器被删除，但该单文件候选在第二次入场的轨迹中被持久且完整地表示。候选被逐字节重建（`sha256:dfa4c4cd3b41744e6fd4f971ca544075cc305d625bcd4b515b8ba559438c2cd3`），并仅通过未改动的官方验证器、在被 pin 的 `linux/amd64` 任务镜像中、以原始的 1 CPU / 2 GiB 限额重放。官方测试通过并返回 reward 1。这次恢复在不再次调用模型的情况下，将该单元格从未评分的基建失败转为通过；Agent 入场次数仍为两次。

恢复层是只追加的：被取代的事件保留在 WAL 中，裁定记录标识其源事件，最终仅验证器的重放拥有独立的本地证据 manifest。已提交的 CSV 只包含选定的最终通过/失败与失败类别投影；prompt、轨迹、provider 载荷、原始日志与本地能力不公开。

## 注意事项

- 这是对固定 89 任务套件的一次重复。精确配对 p 值描述的是该套件上的不对称性，并不确立普适优越性。
- 两条臂共享模型、provider、任务顺序、指令、验证器、时限策略与基建重试策略，但有意保留各自的框架原生行为。这不是单变量组件消融。
- 非预算条件通过率是选择条件下的诊断性指标。它不能被解读为不限时的反事实。
- 预算耗尽记录的是：一个有效候选机会到达基准时限后获得了官方验证器结果。它本身不区分 provider 延迟、模型生成长度、工具耗时或 agent 策略。
- 每次通过的成本是基于记录 usage 与冻结 API 等价价格的已接受数据集点估计。它包含评分内的失败，但不含被取代的基建无效入场——后者的完整计量并非总是可得。"实际上相同"描述的是观测值，而非正式的等价区间或实验运行总成本。
- 未配置外部 Oracle registry 快照。全部 89 个任务都缺少 Oracle 注解；官方 Terminal-Bench 验证器仍是评分权威。
- 5 次基建无效的 Agent 入场在同一有界策略下被替换，1 个已完成的候选需要仅验证器的重放。上述恢复均已披露，因为省略它们会使最终覆盖率与分数无法重建。

## 完整性

冻结的本地证据与已提交结果投影的 SHA-256 哈希：

| 来源 | SHA-256 |
| --- | --- |
| `harness-ab-manifest.json` | `c364730ac5e3db4ff8a6cf0b22a50b4e4f953ee05d090dc69415cb9012376e9c` |
| `harness-ab-report.json` | `bd616091c18bed6ad8d4bfe7534c7f4d6a6861c01b1c6f383d408b39673f922b` |
| `controller/results.jsonl` | `19764b90cbebddeb05c20d58be8760bfdabac1bf99e1c15a0528c0f934cd9835` |
| `controller/results.jsonl.attempts.jsonl` | `4878ca5b612d20d87a28066456ddcdc32a5c0bb105940cb0e6ef270a2355c7ab` |
| `controller/adjudications.jsonl` | `7253f3cf043cf5079428b704baf3ee30b8c259a4dc806704cb7016914a4cd667` |
| 仅验证器重放 `evidence.json` | `93b786d4305452bf1f1ef15f5474f5902bc979255e89c61f5669581caab5178b` |
| 已提交的结果 CSV | `a1f52e1fbb4463ed1f9a6d591dd50aa8eaff67dbb825d05a36213d0d3a25e766` |

## 产物指引

| 产物 | 本地路径 |
| --- | --- |
| 生成的报告 | `~/.vera/eval/runs/deepseek-v4-flash-vera-vs-opencode-tbench-2.1-full-v7/harness-ab-report.{json,csv,md}` |
| 不可变 manifest | `~/.vera/eval/runs/deepseek-v4-flash-vera-vs-opencode-tbench-2.1-full-v7/harness-ab-manifest.json` |
| 控制器 WAL | `.../controller/results.jsonl` 与 `.../controller/results.jsonl.attempts.jsonl` |
| 裁定台账 | `.../controller/adjudications.jsonl` |
| 验证器重放证据 | `.../controller/verifier-replays/ab-opencode-r0-polyglot-rust-c-attempt-2/evidence.json` |

实验在 [issue #1680](https://github.com/vera-agent/vera-agent/issues/1680) 中跟踪。
