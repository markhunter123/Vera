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

# @vera/eval

`@vera/eval` 负责实验语义。它不执行 Vera，也不构造 Runtime 对象。

```text
Experiment → Cells → Attempts → Results
                    ↓
       Runtime Host executes Vera subjects
```

一个 Experiment（实验）组合一个 benchmark、一个 executor、全部 subject、全部任务、一个重复次数、一个共享预算、一个验证器，以及冻结的任务组并发上限。Cell 是 `task × repetition × subject` 的笛卡尔积。同一任务重复轮次中的所有 subject arm 同时启动；相互独立的任务组最多并行运行到声明上限。一次 repetition 是一个新的实验样本；一次基础设施重试会向同一个 cell 追加一个替代 attempt；continuation 仍由 Runtime Host 内部处理。每个 subject 只声明其 cell 会收到的凭据环境变量名。

通过公共 CLI 运行完整展开的 spec：

```sh
vera eval run experiment.json --out .vera-eval/run-001
```

使用 `--cell <cell-id>` 替换一个失败或结果不确定的 cell。attempt 日志只追加，结果选择始终取最早的有效 attempt。

开始一次 trial（试验）之前，公共 CLI 会校验所选 executor 的机器路径、随附的 relay 文件、固定的 Harbor 或 Pier Python 发行版，以及 Docker 环境下的 Docker daemon 可用性。缺失或不匹配的前置条件会以配置的环境变量名和预期框架版本报告；CLI 不会启动 trial，也不会安装外部软件。subject 专属的 toolchain 验证仍属于 subject 准备的一部分，同样在任何 trial 开始前完成。

内置的 Harbor 与 Pier executor 使用同一个 relay Agent。框架准备任务环境，relay 从 `Agent.run()` 恰好调用一个 Eval subject，框架运行其原生验证器与 finalizer。Harbor 和 Pier 使用彼此独立、显式固定版本的 Python 环境，因为它们的 Agent 与任务合同不同。

Vera subject 请求 Runtime Host 客户端在专属的 Host 根目录中运行一次受其所有的执行。Session、Turn、Goal 与 continuation 语义保留在 Runtime Host 内部。外部 subject 声明命令与参数，并可添加非机密环境值、声明凭据的 target-to-source 绑定，以及显式的结果合同。省略的凭据绑定按声明的名称原样使用。通用 `exit-code` 合同丢弃非结构化的 stdout，并记录 null 用量与成本。结构化 `protocol-v1` 合同仅限于随附的外部 wrapper 使用，这样共享 relay 才能把有界的结果帧与 Harbor/Pier 合并后的进程输出分开；cohort 专属 wrapper 不会获得 Runtime 权限。

结果内核只包含分数、归一化用量、可归属成本、时长、状态与工件。所有语义设置都放在 spec 中；环境变量仅用于凭据和机器本地路径。

已提交的 Terminal-Bench 2.1 四臂 cohort 是 `experiments/terminal-bench-2.1-deepseek-v4-flash-four-arm.json`。它冻结了 provider 端点、框架版本、容器路径与只读挂载策略。将每个声明的 machine-path 环境变量设置为可信的已准备目录，并设置声明的 API-key 凭据。机器本地路径只用于选择工件；它们不改变实验语义，也不作为密码学身份方案呈现。

单臂 DeepSeek Harness cohort 是 `experiments/terminal-bench-2.1-deepseek-v4-flash-deepseek-harness.json`。该 harness 不附带 benchmark runner：其 `BENCHMARK.md` 指定已提交的 `examples/jsonrpc-agent` 最小组合，并要求每个任务一个 workspace 与一个 session id。`harbor/deepseek-harness-profile/` 就是这个组合，作为完整的 harness profile 携带，其 manifest 不声明任何 bundle。由于树是在空条目列表之上组合出来的，模型能观察到的每个条目都在一个文件中命名，上游 bundle 新增插件无法扩大这个 arm 的工具面，而缺失服务是启动失败而非静默降级。该组合已对照上游逐请求验证：工具名相同、工具 schema 逐字节相同、系统提示逐字节相同、消息序列相同。唯一的偏差（已记录在文件中）是 reasoning 被固定为 max，因为适配器默认值在线上会解析为 `reasoning_effort=high`。

只能在完整的 Git checkout 中用 `node scripts/prepare-deepseek-harness-toolchain.mjs --out <dir> --write` 构建该 arm 的 toolchain。`harbor/deepseek-harness-toolchain/` 下可选 toolchain 的运行时 manifest 与经审阅的 lockfile 被有意排除在 ASF 源码归档之外，因为其外部运行时依赖闭包不是源码发布输入。它运行在固定的 `linux/amd64` 容器内，因为该组合依赖 `node-pty`，而 `node-pty` 不发布 Linux 预编译产物；构建会把该容器的 Node 复制进 toolchain，使被执行路径能在挂载根目录内解析。依赖使用 `harbor/deepseek-harness-toolchain/` 中经审阅的 lockfile 通过 `npm ci` 安装，因此一个 harness 版本不会静默意味着两棵不同的树。记录的 fingerprint 是 `checksums.sha256` 的摘要，该文件列出构建放入树中的每一个普通文件；验证从磁盘上的 manifest 重新计算该摘要，而不是读取树自行报告的值。因此 `src/toolchain-verification.ts` 中的常量固定 manifest，而 manifest 固定其列出的每个文件的内容。它不固定树的闭包：验证遍历 manifest 而非目录，所以之后添加到挂载 toolchain 的文件既不会被命名，也不会被拒绝。这就是 `verifyToolchainDirectory` 对所有八个 arm 的既有行为，且属于该行为。原生模块在构建期间编译，无需在另一台机器上逐字节一致，所以重建仍可能产生新 fingerprint；`--write` 会重新固定它，验证在两者一致前保持 fail-closed（失败即拒绝）。`--out` 从零重建：它必须指向一个目录，且该目录要么为空，要么是此前构建的该 toolchain。

`experiments/terminal-bench-2.1-deepseek-v4-flash-vera-vs-deepseek-harness.json` 在同一任务组中运行 Vera 与 harness arm，因此每个任务在同一时刻各启动一个容器，而不是在不同时机比较两次运行。该 spec 的两个属性不来自框架，需要由解读其结果的人自行负责。

配对不会被保留。任务组是一个执行单元：cell 按 `task × repetition` 分组以调度并发，但结果选择按 cell 进行，没有可选 attempt 的 cell 会自行从结果映射中剔除。因此丢失一个 arm 只会让另一个 arm 的观测以未配对样本的形式留在数据中，而不是删除整个配对。丢失也不是随机的——容器的存活时间越长、发出的请求越多，attempt 越可能丢失——所以未配对观测会系统性地偏向更早完成的 arm。比较两个 arm 意味着按 `task.id` 重新配对并丢弃未配对观测，而不是对每个 arm 幸存的 cell 取平均。

两个 arm 都受同一策略约束：`egressProxy` 是 executor 配置，subject 无法覆盖它，且该 spec 中没有 subject 声明它。这一点的证明力受两方面限制。URL 策略是已知污染面的 blocklist（黑名单），因此它针对的是偶然撞上答案页的 subject，而不是刻意寻找答案页的 subject；issue #2976 与 #2977 描述了审计路径之外仍存在的通道。而且同等策略意味着同等机会，而非同等使用——arm 是否触及残留通道取决于该 arm 的行为，而这正是本实验的自变量。由于这些通道按定义未经审计，arm 之间使用的差异无论如何都不会出现在证据中。

单臂结果与多臂 cohort 不来自同一次运行。任务组为一个任务保留全部 subject，所以每增加一个 arm 就增加一个容器：八臂 cohort 在声明的上限下达到 128 个并发 trial，而该 spec 提高自己的上限，使 89 个 cell 在相当的机器负载下运行。它们仍然是不同时机下的独立运行，这是任何设置都无法改变的。

外部 provider 计量不依赖 subject 干净退出。wrapper 的代理在每次请求开始时、结算时以及 provider 声明 admission（受理）的时刻写入 `agent/<profile>.provider-usage.json`，先将临时文件 chmod 为 `0644`，再重命名到位，这样读者要么看到一整个快照，要么看到上一个已可读的快照。恢复逻辑最多读取 64 KiB 且只读取普通文件，并且只有当快照的 HMAC 与宿主签发的 relay 结果 token 匹配时才接受该快照。用符号链接、超大写入或 schema 合法的伪造 JSON 替换该路径的 subject 无法向宿主投喂数据。Admission 在观测到它的时刻记录，而不是在请求完成时记录，因为无论本进程能否活到看见流结束，模型工作都已完成并计费。当结果帧缺失——wrapper 是被杀掉的而不是被要求停止的——executor 从该文件恢复用量。因此，在已受理模型工作之后被切断的运行会被计为失败的 subject，而不会作为基础设施故障重试。

最后这条规则读的是证据而不是症状，因此它只适用于证据支持的地方，别处不适用。执行返回了的 subject——relay 观察到它退出，只是结果帧缺失——确实按自身意愿停止了，所以已受理的模型工作使它成为记录在案的失败，而不是需要以相同成本重跑的 cell。执行调用*抛出了异常*的 subject 是另一种情况：relay、executor 或宿主进程失败，且它可能从未启动。这种情况下，已受理的工作仍会被记录并归因，但不会把一次基础设施故障变成零分。

checkpoint 只携带代理观测到的内容：用量、代理是否已结算，以及请求、in-flight（进行中）、已受理和用量请求的计数。结算状态必须记录，因为任何计数组合都推不出它——两次请求之间写入的 checkpoint 同样没有任何 in-flight 内容——而声称已完成的过期文件会把一次运行成本的一小部分报告为已结算数字。数字是否完整、多少个已受理请求缺少用量、这次运行花了多少钱，都由双方共同调用的同一个函数从这些原始事实计算得出，因此两个进程不可能持有同一值的两个版本。成本只在数字完整时才报告；部分 token 数保留为下界，因为由它推导出的成本进入结果内核后无法与已结算数字区分。

wrapper 的进程退出码映射其语义状态：仅当 subject 完成时才为零。只要结果帧可读，executor 就优先使用结果帧；只有当帧本身不携带状态时才回退到退出码。没有任何其他地方依赖它做决定，但两者绝不能说法不一。

耗尽框架超时的 subject 会以 `subject_failed` 报告，且其验证器 reward（奖励分）保持完整。reward 是结果；状态记录的是运行被切断而非自行完成。只有缺失 reward 才是基础设施故障。

Vera benchmark subject 冻结版本化的 Session profile。`headless-coding-v1` 持久化在 Session header 中，因此后续 turn 与后端重建都保持同一合同。它固定系统提示，禁用产品身份/个性化/技能/工作区记忆提示片段，只允许 `Bash`、`Read`、`Write`、`Edit`、`Glob`、`Grep` 与 `apply_patch` 作为工具候选，并暴露不带 `run_in_background` 或 `pty` 的纯前台 Bash schema。provider 专属路由仍然优先：DeepSeek Responses 暴露 `apply_patch` 而非 `Write` 与 `Edit`，Runtime 拥有的 `ArchiveRead` 仍可用于归档的工具结果。真实的 `hosted.execution.start` 回归测试为第一个主 provider 请求的 developer 提示和完整工具 schema 固定 SHA-256 哈希。

每个 benchmark subject 都会从 provider 可见的工具列表中移除 `WebSearch`、`WebFetch` 与 `FetchURL`。Vera 通过其 Hosted Execution profile 强制执行这一点；外部 harness 则经由 Eval 计量代理，该代理从 JSON 请求中结构性移除指定名称的及 provider 原生的 web 工具。Shell 联网保持启用。配置的 HTTPS egress 代理只拦截 benchmark 与公开解题的污染 URL，包括归一化或递归包装的 `terminal-bench` 引用、固定的 benchmark 修订版本、任务注册表、benchmark 仓库、公开轨迹与已知的补丁镜像。通用的 `terminal-bench` 匹配分别搜索 host 与路径，因此只在主机名中命名的污染面同样会被拦截，且任何规则都无法跨这两个字段的边界匹配。只有 Harbor 应用命名空间策略，因此声明了 `egressProxy` 的 pier executor spec 在解码时即被拒绝，而不是带着已配置代理却无强制措施地运行。已提交的 Compose overlay 为每个 cell 提供独立的 MITM 代理、CA、有界审计日志与健康门。代理保持其 confdir 与审计日志私有，只把 `mitmproxy-ca-cert.pem` 与 `proxy-ipv4` 发布进 subject 以只读方式挂载的纯证书卷，因此 CA 私钥与审计日志永远不会进入 subject 命名空间。在 `Agent.run()` 期间，Harbor 的 Docker egress sidecar 应用仅包含该代理服务的 nftables 白名单；因此即使命令取消代理变量或请求 `--noproxy`，subject 的直接出网仍会被拒绝。命名空间策略接受发往该代理的 TCP 与发往命名空间本地地址的流量，拒绝其余一切，包括 ICMP。拒绝而非重定向其余流量，也关闭了 subject 从更早阶段继承的连接：重定向是一条 NAT 规则，而 NAT 只在连接的第一个数据包上求值。命名空间本地豁免使 loopback provider 代理保持可达。Docker 内嵌的 `127.0.0.11` 解析器被拒绝，因为它会把不属于它的名字转发给宿主的上游解析器。引擎在过滤钩子之前把 `:53` DNAT 到另一个本地端口，因此规则匹配的是地址而不是仅该端口。代理把其 IPv4 发布进证书卷；relay 在 subject 启动前把 `vera-eval-mitmproxy` 固定到 `/etc/hosts`，因此 DNS 关闭后 `HTTPS_PROXY` 仍可解析。策略不豁免任何数据包标记：sidecar 与 subject 共享网络命名空间，所以 sidecar 能设置的标记 subject 同样能设置，而且 gost 在这种模式下本来就不转发任何东西。由于共享命名空间还意味着策略只能约束 IP 输出钩子能看到的内容，overlay 会丢弃 `NET_RAW`——否则它授予的 `AF_PACKET` 套接字可以写入钩子之下；任务自己的 Compose 可以把该能力加回来，且 `cap_add` 胜过 overlay 的 `cap_drop`，因此策略生效后，relay 会读取 subject 可能提升或重新获取能力所依据的每一个能力集合（含 bounding set），只要其中任何一个带有 `NET_RAW` 或 `NET_ADMIN`，就拒绝启动 subject。丢弃与门只针对 subject 本身，不针对命名空间：任务声明的同级服务以默认能力集加入同一命名空间，因此声明了同级服务的任务比不声明的任务隔离程度更低。当 subject 不在应用策略的命名空间中时，同一个门也会拒绝：Harbor 在 sidecar 内部应用策略，但尊重任务在 subject 服务上的自有网络，否则声明了它的任务会让 subject 处于无策略状态。证据就是命名空间身份本身：门读取 subject 以及 Harbor 安装策略所在服务中的 `/proc/self/ns/net`，并要求两者指向同一命名空间。门通过任务镜像自身的用户态读取该证据，因此它证明的是任务并非意外丢失隔离，而非任务无法撒谎；一个会撒谎的任务镜像本来就能控制 cell 中的一切。门所约束的是 subject——subject 只有在门通过之后才会启动。Harbor 任务下载与验证阶段保留其原生网络策略。运行 cohort 之前，先根据 `harbor/egress-proxy/Dockerfile` 构建固定的 `vera-eval-egress-proxy:12.2.3` 镜像。`VERA_EVAL_EGRESS_NAMESPACE_TEST=1 python3 harbor/test_cell_egress_namespace.py` 会拉起 overlay 与已提交的策略，并在真实的 cell 命名空间中断言该合同；它需要 Docker daemon 与出站网络，否则自动跳过。官方 CI 不设置该变量：真实 cell 需要一个能加载已提交 `table inet` 规则集（`NFT_FIB_INET`）的内核，而 Docker Desktop 与默认 runner 不提供该能力。规则文本——包括 `127.0.0.11` 在 `fib daddr type local accept` 之前被拒绝——由 `lifecycle-boundaries.test.ts` 与 Harbor 合同测试锁定。这个 URL 策略是已知 benchmark 与公开解题污染面的 blocklist，不是针对刻意杜撰的查询通道的完整防线。它按 blocklist 对 HTTP(S) 请求与 `CONNECT` 主机分类，并杀掉回退到裸 TCP 的隧道。收集到的 Vera 运行时文件与 egress 审计日志以带字节数与 SHA-256 摘要的形式体现在 attempt 工件中。

验证器评分的是任务被留下的环境，因此自行退出的 subject 会保留它启动的一切、报告的一切。relay 不会在那一刻拆除 subject 的进程组：没有任何东西在等待这些进程——执行调用已经返回——所以拆除不会解除任何阻塞，而且它会在即将被测量的对象上动手，对 Eval 判定为失败的 subject 动手而不对其余 subject 动手。取消与框架超时仍会静默进程，因为那两种情况下 subject 尚未停止，trial 是被放弃而不是被评分。同一条规则同样约束 agent 框架：DeepSeek Harness 拥有一棵持久 PTY 树并在关闭时杀死所有后代，因此经过 Eval 修补的 DSH 子进程会在 `DSH_PRESERVE_BACKGROUND_PROCESSES`（Eval 始终设置）下跳过该次击杀。

无论如何，进程组都不是 subject 进程的可靠句柄。`forkpty` 使 shell 成为会话领导者，而交互式 shell 会把每个后台任务放进自己的进程组，因此通过 PTY 启动的服务与 relay 记录的进程组之间隔了两层——这是实测而非假设。任何依赖向该进程组发信号的规则，都会对某些 agent 框架成立、对另一些静默失效。

DeepSeek Harness 的 Eval profile 还将其持久 Bash 的截止时间延长到超出 Terminal-Bench 最长的原生 subject 超时，因此 benchmark 仍是权威截止时间，本地五分钟工具超时无法在验证前打断 `apt` 或 `dpkg`。每个 subject 都在执行环境中以 `DEBIAN_FRONTEND=noninteractive` 与 `TZ=Etc/UTC` 运行，因为在无人值守容器中，交互式软件包提示与挂起命令无法区分，而这是容器本身的属性，与具体某个 arm 无关。

本地镜像标签仍是机器部署标识而非注册表摘要；摘要固定（digest pinning）在 issue #2953 中跟踪。

实验目录包含冻结的 `experiment.json` 与只追加的 attempt 记录。不存在第二个可变的 results 文件。遗留的 `.writer.lock` 说明上一次写入未完成；只有在证明不存在任何残留的写入进程之后才能删除它。
