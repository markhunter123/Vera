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

# 经济机制基准 —— synthesis cache

跟踪 issue：[#481](https://github.com/vera-agent/vera-agent/issues/481) ·
切片：[#578](https://github.com/vera-agent/vera-agent/issues/578)

这是经济机制基准日志的第一条条目。它测量**合成缓存（synthesis cache）**——现在它已接入无头 Harbor cell。

## 该机制做什么

当上下文预算修剪并**归档**一个旧工具结果时，稍后需要它的重放通常会**重新水合完整的归档 payload**。合成缓存则在归档首次被取回时持久化一个紧凑的*synthesis block*（摘要 + 覆盖 + 来源引用），并在后续重放中**就地**注入该 block 以替代原始 payload。节省量是 `hydrated_archive_tokens − synthesis_block_tokens`，在每次复用该 block 的重放中回收。

runtime 一直实现了该机制（`AiSdkBackend` 消费 `loadSynthesisCache` / `writeSynthesisCache` + `contextBudget.synthesisCache` 策略）。桌面端接好了线；无头端没有。本切片添加无头接线与下面的测量。

## 结果 —— 确定性 A/B

因为该效果是请求投影的确定性函数，它针对**mock 模型**（无网络，可在 CI 中复现）而非活 LLM 测量。同一重放被投影两次；模型实际收到的 prompt 就是真相来源。

| 臂 | 重放 prompt（令牌） | Δ 对比基线 |
| --- | ---: | ---: |
| **baseline** —— 重新水合归档工具结果 | 2818 | — |
| **arm** —— 注入 synthesis block | 764 | **−2054（−72.9%）** |

场景：一个约 2.4 KB 的已归档 `Read` 工具结果被修剪，然后在下一回合恢复。Baseline 水合完整正文；arm 换成其 synthesis block。`charsPerToken = 1`，因此 prompt 字符数就是直接的令牌估计。

复现：

```bash
npm run build --workspace @vera/runtime
node --test --test-name-pattern="synthesis cache cuts replay tokens" \
  vera-runtime/dist/__tests__/ai-sdk-backend.test.js
# → [synthesis-cache A/B] baseline=2818 arm=764 saved=2054 (72.9%)
```

确切百分比随归档 payload 体积与 block 体积之比缩放；测试断言一个下限（`>40%`），因此它保持为有意义的回归护栏，而非脆弱的黄金数字。

## 实况激活证据（Harbor）

`terminal-bench-sample` / `sqlite-with-gcov` 上的一次实况自主运行（`deepseek-v4-pro`，2 次尝试 + 先前尝试上下文重放）确认接线在真实路径上是**端到端激活**的。来自 `task-run.json → budget.contextBudget`：

```json
{
  "synthesisCacheEnabled": true,
  "synthesisCacheMode": "fallback_archive_retrieval",
  "archiveRetrievalMode": "eager",
  "synthesisCacheWriteSkipped": 1,
  "synthesisCacheWriteSkippedReasonCounts": { "source_missing": 1 },
  "retrievedArchiveToolResults": 0,
  "keptTurns": 1
}
```

策略是活的，**写门禁每一步都被触达并评估**——它只记录 `source_missing`，因为没有取回过可合成的已归档工具结果。

## 为什么实况成本 / 通过率 A/B 被推迟

写路径需要归档取回**取回一个先前归档的工具结果**（`retrievedArchiveToolResults > 0`）。归档发生在**回合**级别：陈旧修剪归档*更早回合*的工具结果。一个 Terminal-Bench 任务运行——即使带重放的自主运行——也折叠成实际上**一个回合**（`keptTurns: 1`，单回合内数千个事件），因此没有更早的回合可归档、没有可取回的东西、也没有合成来源。这是机制触发条件（多回合历史，如交互式桌面 app 中的那样）与基准单长回合形态之间的结构性错配——不是接线缺陷。

一旦有多回合、跨回合先归档后取回的 Harbor 工作负载可用，就会添加实况成本/通过率/步数条目。那次运行的 arm 环境：

```bash
VERA_CONTEXT_ACTIVE_TOOL_RESULT_PRUNE=off \
VERA_CONTEXT_STALE_TOOL_RESULT_PRUNE=on \
VERA_CONTEXT_MAX_HISTORY_ESTIMATED_TOKENS=6000 \
VERA_CONTEXT_ARCHIVE_RETRIEVAL=on VERA_CONTEXT_ARCHIVE_RETRIEVAL_MODE=eager \
VERA_CONTEXT_SYNTHESIS_CACHE=on VERA_CONTEXT_SYNTHESIS_CACHE_MODE=read_write
```

这些键在 `runtime-policy-ab-run` 的 arm 允许清单上（由 `HARBOR_CELL_CONTEXT_ENV_KEYS` 推导），因此一旦工作负载存在，arm 即可进行 A/B 切换。
