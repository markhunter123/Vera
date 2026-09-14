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

# 变更日志

## 未发布

## 0.2.0 - 未发布

### 新增

- 新增 `/transcript`，可在不依赖终端滚动缓冲区的情况下浏览长 TUI 会话，支持按行、按页以及首/末跳转。

### 变更

- 将类型化的 `request()` 设为 Runtime Host 直接操作 API 的唯一形式；移除直接连接和重连连接上的 17 个转发别名，同时保留状态校验、订阅、能力、监听器、生命周期和关闭行为。
- 将 RuntimeRunner/Flow/Invocation 外壳折叠进 `RuntimeKernel`；后端分发、终态合并、stop/drain 和持久续跑接纳现在有单一生产属主，不可变请求快照在 AgentRun 接纳和后端分发处继续强制，SessionEvent 到 RuntimeEvent 的转换保持为纯映射器。
- 在单个 Runtime 持有的策略下统一上下文管理。`VERA_CONTEXT_*` 环境变量覆盖不再调整或禁用压缩和工具结果修剪；模型可见的归档占位符改为通过有界的 `ArchiveRead` 调用按需读取，而非急切水合。升级时忽略此前受支持的覆盖：若工具结果修剪被设为 `off`，修剪将重新启用，目前没有受支持的替代退出方式。

## 0.1.11 - 2026-08-18

### 亮点

- 将 Runtime Host 从本地执行服务扩展为多个已连接 Host、远程项目注册、实时 run 状态和归档会话生命周期的共享权威（#3097、#3145、#3079、#3074、#3151）。
- 新增可安装的 Vera CLI 包及其受保护的分阶段 npm 发布流水线，包括跨平台产物和 Eval 校验（#3169、#3173、#3185、#3188、#3192、#3197、#3200、#3201）。
- 新增代理型 Windows AppContainer 沙箱支持，并收紧本地 IPC 归属和 ACL 执行（#2961、#3179、#3182）。
- 新增 Work Board 存储基础、Host 范围的任务创建、提示历史补全和首次运行视口包含（#3028、#3122、#1874、#3195）。
- 新增原生 Desktop 和 TUI 区域设置权威，以及 Qwen3.8 Max Token 计划支持（#2686、#2691、#3157）。

### 可靠性与开发者体验

- 跨刷新保留进行中的 turn，并通过 Runtime Host 投影权威的实时执行状态（#3189、#3079）。
- 让恢复的任务免受并发移除影响，将忙碌竞争的发送排队为 steering，限制摘要器输入，并退役过时的压缩和兼容路径（#3056、#3032、#3113、#3128、#2742）。
- 加固 MCP 重新发现、provider 失败诊断、限流处理、会话流完成和定时任务归属（#2989、#2675、#3115、#2682、#2655）。
- 新增公平的多臂 Eval 基础设施和 DeepSeek Harness 基准臂，同时将被试计量与框架核算隔离（#2668、#2971、#3176）。
- 加强 Windows 安装程序、崩溃恢复、远程服务重启和发布产物覆盖（#2650、#2562、#3186、#2941）。

### 修复

- 在原生 Windows 和 Windows Terminal 会话上默认禁用 TUI 任务栏进度 keepalive，因为重复的 OSC 9;4 更新可能让 Explorer 的任务栏无响应。`VERA_TASKBAR_PROGRESS=1` 恢复此前行为，`VERA_TASKBAR_PROGRESS=0` 显式禁用它。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发，为 Windows x64 以未签名的 NSIS 安装程序和 ZIP 分发，在同一发布运行中构建并验证。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.10 - 2026-08-10

### 亮点

- 围绕持久归属和恢复重建 Runtime Host：客户端现在可跨 Host 重启重连，不兼容的 Host epoch 干净退役，被驱逐的会话流在不丢失进行中对话的情况下恢复（#2613、#2618、#2630、#2633）。
- 新增远程能力 provider 模式，并阻止 agent 图监督器生成不必要的唤醒（#2625、#2626）。
- 让变更面板以 Git 为权威，恢复斜杠命令发现，公开归档会话，并新增关于页的更新检查（#2610、#2612、#2573、#2629）。
- 为存储新增受管理的依赖产物权威，并将 DeepSeek V4 Flash 编辑路由到 ApplyPatch（#2485、#2606）。

### 可靠性与开发者体验

- 恢复卡住的 xAI 登录尝试和陈旧连接删除，保持设置控制的会话 chrome 隐藏，将子 agent 渲染为紧凑行，并使 workbar 选择器与 Astryx 对齐（#2615、#2617、#2619、#2632）。
- 移除过时的 Runtime Host 过渡残留，并保留存储水合崩溃夹具（#2635、#2576）。
- 通过将基线限定在受影响面并门控昂贵的存储覆盖，减少 Windows CI 工作量，同时重试瞬时 Electron 下载（#2599、#2637、#2594）。
- 更新随包 Computer Use 和 WebContent 依赖固定版本，包括 frame reflow 修复（#2627、#2631、#2638）。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发，为 Windows x64 以未签名的 NSIS 安装程序和 ZIP 分发，在同一发布运行中构建并验证。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.9 - 2026-08-09

### 亮点

- 完成 Runtime Host M5 生产切换（#2420），随后建立本地独立服务（#2583）、认证 WebSocket 访问（#2591）和 Host 拥有的项目目录权威（#2603）。
- 端到端新增外部会话导入：共享基础（#2500）、Codex 会话适配器（#2502）和 Desktop 导入流程（#2507）。
- 从基础到完整主题清扫和细节打磨交付 Visual System 2.0（#2525、#2536、#2538），将高流量 chrome 与 Astryx 原语对齐（#2580），并关闭剩余的 elevation、节奏和原语审查债务（#2593）。
- 将任务提交就绪性变为共享产品契约（#2498），在 Desktop 中公开（#2519），新增 CLI preflight（#2524），并在提交时消费就绪结果（#2523）。
- 以可移植终端输入（#2526）、语义终端鼠标输入（#2533）、交互式 shell 控件（#2561）和 OpenAI 原生 ApplyPatch（#2532）扩展实现 agent 能力。
- 用 QuickJS 替换 CodeMode `Self` 评估器（#2549）。

### 可靠性与开发者体验

- Runtime 恢复现在处理空闲和不完整的 provider 流（#2535、#2604），在溢出后保留压缩投影（#2602），保留导入会话上下文（#2579），并在 Plan 模式中保持完整访问可用（#2581）。
- 稳定 Runtime Host 会话生命周期竞态（#2548），新增客户端请求背压（#2539），让任务拒绝可操作（#2527），在工作区移动后恢复 CLI 会话（#2531），并让重命名的 Claude 模型 id 在目录刷新间保持稳定（#2482）。
- 成熟化生成文件 workbar（#2506），让生成文件保持在用户控制下（#2585），跨重挂载恢复 composer 草稿（#2584），从错误 toast 公开诊断（#2540），并新增按连接定制模型请求（#2565）。
- 用影响门控和单个端到端作业削减 CI 墙钟时间（#2589），将 Storybook 缩减为渲染冒烟（#2582），并扩大 Windows 进程、命名管道、产物、工作区和崩溃恢复覆盖。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发，为 Windows x64 以未签名的 NSIS 安装程序和 ZIP 分发，在同一发布运行中构建并验证。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.8 - 2026-08-08

### 亮点

- 新增 Codex 风格侧边对话：从当前对话分出一个侧线程，带回答案（#2428）。
- 为项目提供一流的设置页：管理 Vera 认识的每个项目，选择新对话默认打开的项目（显式默认优先于上次使用；composer 仍可按对话切换）（#2446），从行菜单重命名和显示项目（#2447），并在实体列表组件上承载该列表，带文件夹锚点和保留尾部的路径截断（#2451）。
- 关闭用户报告的三处自助缺口：模型页可在 默认 徽标处设置默认连接（#2421），新对话采用可配置的默认思考级别，composer 菜单显示 模型默认 而非误导性的 默认（#2430），外观 页的结构、分组和文案被纳入设置惯用法（#2343）。
- 端到端引入自定义宠物：带原子存储的包契约（#2422）、安全包导入（#2423）、包库（#2427）、持久化选择（#2437）、设置中的管理（#2440）、渲染（#2442）和运行时状态驱动的动画（#2444）。
- 为 OpenCode Free 默认启用 Mimo 和 DeepSeek 免费模型（#2431），并在创建时播种其默认目录（#2443）。
- 端到端移除产品 Voice 模块（#2426）。
- 关闭 Runtime Host M4 就绪缺口（#2419）。

### 可靠性与开发者体验

- Windows：串行化根标记修复（#2438），稳定便携路径测试（#2395），为裸 Git 夹具启用长路径（#2435），归一化 CI 进程身份（#2334），并刷新测试跳过清单（#2434）。
- 存储：移除其 cwd 之外的工作树（#2424）。
- 将桌面 UI 组件重命名为 kebab-case（#2417），完成两项 CI 清理并重新格式化未格式化的部分（#2432），在修复 sqlite 警告噪音的同时削减低价值 guard 和 CSS 契约套件（#2425）。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发，为 Windows x64 以未签名的 NSIS 安装程序和 ZIP 分发，在同一发布运行中构建并验证。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.7 - 2026-08-07

### 亮点

- 重建 composer 附件体验：分阶段附件是带工具提示元数据和灯箱的 Token 芯片（#2393），带预览缩略图和文件卡片（#2367）。
- 统一应用的状态语言：状态的含义现在在单处命名（#2397），设置面陈述语义而非颜色（#2401），迁移以删除自身桥接完成（#2403）——每个状态点都来自单一定义，五个原先“活跃蓝”的信息点归于其真实的安静状态。
- 新增有界长期记忆提取（#2117）和运行时 `WebFetch` 工具（#2362）。
- 将 CLI 迁移到 Runtime Host：`vera run`（#2337）和 TUI 会话（#2308），并扫描已完成 run 的轨迹用于检索（#2319）。
- 在整个进行中的 turn 期间保持运行状态行（#2356），从流工具而非侧边栏打开链接的子 agent（#2383），恢复 transcript 的 markdown 节奏（#2348），将聊天 meta 行交回 Astryx 原语（#2358），并为空的失败 turn 公开恢复（#2381）。
- 在共享 ModulePage 外壳上重建扩展模块页（#2266），以 Astryx 原生概览引领会话追踪（#2289），并将工作区选择器统一到 composer 的 ghost-menu 家族（#2287）。
- 窗口标题栏标明会话的项目和名称（#2327），Pinned 和 Recent 分组头携带新任务触发器（#2364）。
- 升级 Astryx 0.2.0 → 0.3.0（#2288），将 lucide-react 统一到单一主版本（#2275），新增依赖审计泳道（#2223），并发布随包 Git runtime 的源码素材（#2235）。

### 可靠性与开发者体验

- Provider 传输：加固增量 OpenAI Responses（#2247），不再把截断的 provider 流报告为完成的 turn（#2297），向 Responses 线上发送它读取的选项并读取它返回的推理（#2328），在它中止待处理问题时干净收尾（#2257），并限制超大先前 turn（#2378）。
- 会话与存储：让会话复制重试幂等（#2398），跨 schema 升级保留操作状态（#2361），将遗留 JSONL 会话 transcript 导入 SQLite（#2263），在租约撤销后关闭用量存储（#2365），让活动会话加入可重放安全（#2368），并按 agent id 校验 swarm 恢复（#2375）。
- 聊天与 UI 细节：输入期间保持引用层几何稳定（#2377），且仅对已确认的选择显示（#2350），让工具 diff 在折叠组上带计数可读（#2300），让提示轨道在 macOS 上可点击（#2338），在 provider 目录中使用标准 Tab 顺序（#2306），并从精选目录提供带真实错误原因的 Claude OAuth 模型（#2336）。
- Desktop 平台：将开发构建的 userData 根与发布隔离（#2292），关闭 xAI OAuth 回调连接并重试繁忙端口（#2302），强制无元数据的 renderer 启动边界（#2176），并移除无消费者的更新下载桥接（#2326），同时让更新操作占用一个槽位而非一行（#2320）。
- Runtime 与 headless：压缩并净化 agent 工具契约（#2349），将过期的探针预算归类为超时（#2344），在推送时决定工具调用事件的账本泳道（#2240），将请求延迟与存活分离（#2392），测量 Vera runtime 实际拨号的线路（#2286），并将构建输出挂载到任务容器而非仓库根（#2298）。
- 跨套件削减低价值和冗余测试（#2404、#2406），并让排序断言独立于固定墙钟预算（#2304）。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发，为 Windows x64 以未签名的 NSIS 安装程序和 ZIP 分发，在同一发布运行中构建并验证。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.6 - 2026-08-06

### 亮点

- 用 Bot 适配器（#2192）、候选组合（#2194）和完整的 opt-in 对等性（#2216）扩展 Runtime Host：恢复 Desktop Computer Use 能力（#2233）及其展示对等性（#2254），并为连接效果解析 OAuth 令牌（#2246）。
- 新增 runtime 中的受限 CodeMode 执行（#1648），并让 Edit/Write/FormatJson 为两个渲染器发出 `file_diff` 结果（#2264），使工具输出在 Desktop 和 CLI 上渲染一致。
- 为受管理工作区随包并验证一个封闭的 Git runtime（#2199），并将受管理工作区读取门控在属主绑定的 Runtime Host 执行之后（#2129）。
- 在存储中实现 Session Bundle 文件系统编解码器（#2013）。
- 将工具详情面板重建为具有单一类型尺度和真实 diff 颜色的单一界面（#2227），在活动 turn 期间保持可见（#2244），保持工具调用组折叠直至读者打开（#2226），并保持 composer 模型/思考选择器在 turn 中途保持挂载，统一为 ghost 菜单（#2230）。
- 将提示锚定轨道固定到 Astryx 聊天滚动端口（#2161）并赋予其动效（#2215），移除分支选择器并在 Selector 上重建项目选择器（#2217），并本地化自 #1795 以来采用的 Astryx chrome（#2202）。
- 让 Vera 基准臂在其竞争者运行处运行（#2177），将受管理 shell 会话绑定到容器内工具面（#2258），并记录四臂 Terminal-Bench 2.1 比较（#2208）。
- 固定 GitHub Actions 并配置 Dependabot（#2212），新增非阻塞 Windows 基线泳道（#2173），并在重新移植工具调用追踪器补丁的同时升级 AI SDK（#2193）。

### 性能

- 增量流式 OpenAI Responses（#2238），合并部分流持久化（#2157），渐进式挂载切换到的 transcript（#2191），并在渐进填充前播种 transcript 几何（#2237）。

### 可靠性与开发者体验

- 强制 swarm 失败边界（#2203），保持 PTY 工具结果 JSON 安全（#2209），重放 provider 面向的 MCP 参数（#2243），跨 provider 步骤保留推理（#2249），并让工具结果归档能力不可分割（#2255）。
- 跨 renderer 重载保留新任务（#2174），为发现的 Codex OAuth 模型公开思考级别（#2250），完成 macOS 退出生命周期（#2251），清除底部和按对话的“新消息”指示器（#2211），并替换不健康的 opencode-free 引导模型（#2166）。
- 修复 定时任务 重建带来的五处回归（#2261）。
- 让模态对话框远离窗口拖拽区域（#2210），从 Astryx 图标注册表绘制推理 chevron（#2228），保留 Astryx List 可访问名称（#2225），从引用芯片显示剥离 ATX 标题标记（#2214），移除死掉的 `[data-trow]` 聊天规则（#2231），将切换到的会话落位到其最新 turn 而非飞过去（#2239），并限制渐进填充空闲，使长 transcript 安定（#2259）。
- 对齐 Models 页头和后退按钮（#2198），并用可调整大小的助手语气文本区对齐设置聊天默认列（#2256）。
- 让附件拖放就绪在 e2e 中原子化（#2229），并将共享的 `sanitizeUnicodeText` 提取到 core（#2190）。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发，为 Windows x64 以未签名的 NSIS 安装程序和 ZIP 分发，在同一发布运行中构建并验证。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.5 - 2026-08-05

### 亮点

- 新增 provider 原生 Web 搜索：一个 `WebSearch` 路由层，选择当前模型 provider 或显式 Tavily 执行，带 OpenAI 和 Anthropic 实现、持久重放、引用元数据和隐私模式覆盖，覆盖 Desktop、CLI、Runtime Host 和 opt-in Headless Harbor（#2152）。
- 将 Runtime Host 归属扩展到 Plan turn 转换（#2169）、Plan runtime 状态（#2082）、每日回顾 runtime（#2113）、深度研究状态（#2099）和派生的会话效果（#2066），并新增其 Desktop 客户端基础（#2134）：会话适配器（#2140）、目录（#2143）和执行（#2149）IPC、会话域（#2164）、有效定价投影（#2073）及其定价适配器（#2148），以及 Desktop 回馈给 Host 的原生浏览器和 Computer Use 能力（#2178）。
- 指令现在先从 `~/.vera/AGENTS.md`（或 `CLAUDE.md`/`GEMINI.md`）加载，再加载项目自身的，因此设置一次的偏好适用于每个工作区（#2183）。
- 随包一个针对所发布语义动作面定制的英文 Computer Use Skill，仅在存在可用 Computer Use 后端时自动安装，且不覆盖修改过或不受信任的副本（#2147）。
- 让应用更新后台化并感知任务：发现和下载现在位于 Electron main，重启/安装由 main 拥有的活动快照守卫，该快照确认会中断多少任务（#1992）。
- 恢复原生应用菜单并统一平台命令路由（#2098）。
- 将受管理工作区执行门控在属主绑定、短期的权威范围之后（#2106），并用持久 Git 收据封存基线接纳（#1872），因此只有在存储根、工作区绑定和规范 head 描述同一 Git 状态时，能力才可用。
- 继续 Settings 的 Astryx 改造：每个能力都有自己的披露（#2100），已定稿的值保持为行，直到你要求编辑（#2139），用一个可展开行组件替代两个（#2141），没有人能操作的规格和行话被移除（#2118、#2116、#2120）；项目文件离开 Settings（#2081），杂物抽屉清空进 workbar 切换（#2123），项目和分支加入 composer 页脚控件行（#2168）。Usage（#2024）和 Skills（#1973）随后跟进，再有三个界面：「计划提醒」和「每日回顾」变成一张密集的行加检查器页，而非两个不相关的实现（#2155），会话 workbar 移除手写外壳和静默解析为 fallback 的令牌（#2158），MCP 页收敛到单一主操作（#2035）。
- 让 Inspector 追踪按读者实际询问的内容过滤（#2115），并关闭追踪面板上遗留的后续事项（#2041）。

### 性能

- 懒挂载侧边栏会话树（#2021）。
- 移除 swarm 账本全扫描热路径（#2040）。

### 可靠性与开发者体验

- 修复分支工具上被复制的工具权威事实（#2061），跨过滤部分保留流存活（#2124），在头部而非正文 EOF 处返回代理响应（#2159），落定 stop 声称的终态事实（#2078），并在单一 realpath 空间（#2059）中让执行边界成为唯一文件路径权威（#2087）。
- 让实时会话创建单飞（#2135），释放已定稿 bot 的输入监听器（#2150），立即兑现默认权限模式（#2109），重置不兼容的操作状态（#2122），在 bundled dev 中解析权限覆盖层资产（#2045），并为 Runtime Host 控制端点遵守 TMPDIR（#2160）。
- 限制 Headless 拆除并标记输出重放（#2151），回收作用域命令的重放（#2146），让 Harbor 归档 id 保持在 ref 语法内（#2130），停止将本仓库的树交给评分的竞争者臂（#2121）并把其单元格误报为基础设施失败（#2090），让权威奖励在缺失 agent 自我报告时存活（#2112），让 Vera 的结算窗口在 Harbor 边界可达（#2107、#2114），遵守命令超时下限（#2110），为容器内臂解析 `host.docker.internal`（#2062），将 `canonicalJson` 统一为单一序列化器（#2005），将 AHE 快照指向移动后的工作区指令来源（#2092），新增 Reasonix 基准臂（#2079），并将 A/B 配对并发上限提高到 16（#2075）。
- 重新水合界面从未收到的未回答用户问题（#2086），并让思考强度跟随 Kimi/StepFun/MiniMax 编码计划上所选级别（#2067）。
- 打磨 shell 和聊天界面：用于选择引用操作的半透明弹出层（#2154），居中的空聊天 hero（#2153），与侧边栏图标列对齐的交通灯（#2144），停止在暗色模式重绘第三种色调的折叠轨道（#2187），每个设置节一个 920px 内容列（#2080），停止在 Astryx Item 边角弯曲的行发丝线（#2111），最后几个裸锚点改用 Astryx Link（#2138），本地化的必填/选填字段标记（#2184），通过 Astryx `useHotkeys` 的全局快捷键（#2091），以及 Astryx `clickAction` 拥有进行中的按钮状态（#2089）。
- 修复 定时任务 检查器使其距任何行两个 Tab 停靠位（#2185），并用不同的 `createdAt` 播种定时任务（#2186）。
- 新增 a11y 审计，标记 role 无法承载名称的元素上的 `aria-label`（#2108），并建立 Windows 支持基线（#2156）。
- 在 runtime 测试中用显式屏障替换固定等待（#2162），在测试运行器中拥有临时命名空间（#2068），隔离开发引导环境（#2131），在侧边栏重命名 spec 中播种真实项目（#2022），消除 Desktop 冒烟误报（#2101），稳定 Skill 草稿恢复（#2137）和可调用 Skill 投影（#2105），用 Git plumbing 构建无效 UTF-8 路径（#2097），证明冒烟 harness 依赖的 Storybook 自动播放契约（#2071），并修复并行失败后从未运行的串行工作区批次（#2136）。

### 移除

- 移除死存储模块（#2104）、无消费者的 Desktop IPC 桥接面（#2065）以及死 shell CSS 配方，连同隐藏它们的 check-dead-css 盲区（#2070）。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发。
- 新增 Windows x64：NSIS 安装程序和 ZIP，在同一发布运行中于 Windows 上构建并验证（#2182）。此构建尚未代码签名，因此 Windows SmartScreen 会在首次启动时警告。
- 随包 Computer Use skill 随应用发布，但 Computer Use 执行器仍排除在本发布之外。

## 0.1.4 - 2026-08-04

### 亮点

- 围绕实际运行的执行器 `vera-cu` 重建 Computer Use：重写模型读取的内容（观察、动作面、拒绝），让 agent 光标落在其瞄准处，镜像驱动窗口而非争抢屏幕，并让模型读回它发出的调用。
- 为驱动计算机提供独立对话行，机器锁定时停止 run，运行时保持机器唤醒。
- 让 SQLite 成为存储中的唯一操作权威，将项目目录移入操作数据库，并收敛并发的新鲜 WAL 初始化。
- 将 Runtime Host 归属扩展到输入和产物准备、交互式会话动作、安全边界继续权威和沙箱边界交互。
- 新增作为 workbar Inspector 标签页的会话追踪，跨两个账本投影。
- 新增带独立设置页的可配置子 agent 模型路由，并将 agent swarm 并发提高到 32 路。
- 为 Markdown 新增 Mermaid 渲染。
- 将 Codex OAuth 切换到 ChatGPT 设备码流程，并新增 Grok PKCE。

### 性能

- 增量流式 transcript，而非每 token 重新推导。
- 按每个界面读取的粒度订阅会话 UI 状态，并停止空闲会话事件健康轮询重渲染整个外壳。

### 可靠性与开发者体验

- 修复 turn 执行作用域隔离、针对实时别名的流式工具调用 delta 解析、网关跳过索引 0 时丢弃的流式工具调用、无工具的子摘要，以及由其他版本写入的 AgentRun 账本。
- 让 macOS 开发权限授予可靠，并让开发 TCC 授予在 opt-in 后持久，同时让启动说明哪一步未返回。
- 告诉被拒绝的工具调用接下来该做什么，而不只是哪里出错。
- 从 models.dev 推理选项推导思考强度控件，并统一 cron 表达式权威。
- 继续跨 Settings、子 agent 页、扩展页、定时任务、skill 芯片和空状态，以及 composer 模型和语音控件的 Astryx 改造。
- 将所有 headless 基准臂置于同一工具面和模型预算下，为 Harbor 归档工具结果注册 `ArchiveRead`，并要求经校验的验证者评分。
- 将 CI 路由到重套件和一致性审计的专用泳道，并对照记录轨迹测量 Computer Use 渲染变更。

### 移除

- 在 `vera-cu` 成为 Computer Use 执行器后移除 `cua-driver`。
- 移除孤立的 runtime 工具和 Cursor 订阅集成。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发。
- Computer Use 仍排除在本发布之外。

## 0.1.3 - 2026-08-03

### 亮点

- 将 Runtime Host 归属扩展到托管的子 agent、Agent Graph 执行、Web 研究、目标、自动化、OAuth 注册、会话生命周期、runtime 资源和实时执行检查。
- 以结构化操作员交接、非阻塞监督器 turn、持久子摘要和会话绑定的 graph 退役加强 Graph 和 Swarm 协调。
- 将 Desktop shell、设置、Composer、会话界面、排版、导航、调整大小和常用控件迁移到 Astryx 0.2.0。
- 新增 SQLite 支持的本地记忆、受管理 Git 工作区、经校验的操作备份、规范模型调用计量，以及确认的 agent 自配置工具。
- 新增 `opencode-free` 作为零凭证默认 provider，并改进 Runtime Host OAuth 支持的执行。

### 可靠性与开发者体验

- 修复 Electron 开发和打包启动失败、引导快照交接、Runtime 生命周期竞态、PTY 背压、剪贴板写入，以及若干 Graph、Headless 和 UI 回归。
- 削减低信号、重复、源码形态和快乐路径测试；按受影响面路由 CI 套件；并保持构建、typecheck、Storybook 和 E2E 门控完好。

### 移除

- 移除桌面 Open Gateway HTTP/SSE 服务器及其 Settings 和 IPC 界面。模型 provider、OpenAI 兼容连接、Vercel AI Gateway 和 bot 事件网关不变。
- 在 Graph 和 Swarm 拥有多 agent 协调后，移除被取代的 Expert Team 模式及其 Notes 时代架构产物。
- 退役不再有活动调用方的遗留存储写入导出和 Astryx 兼容适配器。

### 分发

- 为 Apple Silicon macOS 以已签名、已公证的 DMG 和 ZIP 分发。
- Computer Use 仍排除在本发布之外。

## 0.1.2 - 2026-07-31

### Runtime 内核抽取

本变更集将 runtime 执行路径从一个大型隐式 `SessionManager` / `AiSdkBackend` 流程转为内部 runtime 内核形态。它保持现有桌面、renderer、IPC、会话 JSONL、设置和 bot 界面稳定，同时将模型、工具、追踪、run 账本和启动恢复职责移到显式内部边界之后。

| 领域 | 摘要 |
| --- | --- |
| 工具运行时 | 围绕工具输入校验、权限检查、看门狗暂停/恢复、中止传播、遥测、产物记录和失败分类提取内部 `ToolRuntime`。 |
| 模型适配器 | 提取最小 `ModelAdapter`，使 provider 流/错误/用量归一化不再直接存在于后端编排外壳中。 |
| Runtime 追踪 | 为模型、工具、权限、中止和用量里程碑新增尽力而为的 `RunTrace` 事件，不改变 renderer 可见的 `SessionEvent` 行为。 |
| AgentRun 账本 | 在 `sessions/<sessionId>/runs/<runId>/run.json` 加 `events.jsonl` 上新增核心 `AgentRun` 类型和文件支持的 `AgentRunStore`。 |
| AgentRun 执行 | 将繁重的 turn 执行生命周期从 `SessionManager.sendMessage()` 移入内部 `AgentRun.execute()`，包括用户消息追加、后端流驱动、状态投影、中止/失败处理和持久追踪写入。 |
| 启动恢复 | 让 `recoverInterruptedSessions()` 在可用时优先使用 AgentRun 账本，修复陈旧的非终态 run，并为更旧会话保留遗留消息/turn 状态回退。 |

参见 `docs/archive/runtime-kernel.md` 了解历史设计理由、边界和验证细节。

### 加固阶段 1-5

本变更集汇集 Rive 深度阅读后续工作的前五个维护加固阶段。

| 阶段 | 领域 | 摘要 |
| --- | --- | --- |
| 1 | Runtime 权限与用量处理 | 让流看门狗暂停/恢复计费对并发工具调用稳健，新增权限超时处理，集成 Office 文档中止传播，并修复缓存/推理 token 用量提取。 |
| 2 | 会话 JSONL 恢复 | 通过独立解析消息行恢复含损坏 JSONL 行的会话，将落地的损坏行公开为 `system_note`，并丢弃畸形的截断尾部行。 |
| 3 | Bot 与 OpenGateway 滥用控制 | 新增 bot 入站速率和会话绑定限制，限制 bot 去重状态，强制 bot 绑定会话进入 `explore`，并带空闲清理封顶 OpenGateway SSE 连接。 |
| 4 | 凭据存储密钥类型扩展 | 扩展加密凭据存储以支持 bot 令牌、bot 应用密钥、代理密码、网关令牌和 Tavily API 密钥，同时保留遗留 API 密钥/OAuth 令牌密钥格式。 |
| 5 | 连接凭据 IPC 输入加固 | 在存储、凭据或 provider 副作用之前，为 renderer 控制的连接 slug 和 API 密钥新增共享主进程校验。 |

### 活动工具结果修剪默认开启

`activeToolResultPrune`（当前 turn 的大型工具结果修剪）现在在桌面和 headless 上默认启用。超过 2048 估计 token 阈值的工具结果会被归档，并在下一个 provider 可见请求中替换为仅元数据的占位符（artifact id + 内容哈希）；原始负载保留在归档中，不会丢失。在桌面上，它在已默认开启的 `semanticCompact` 摘要步骤之前运行。在 headless 上，占位符直接进入下一个 provider 步骤（无默认压缩/检索），#340 中的基准 A/B 证据表明这在 10pp 边际内不劣，同时节省约 31.6% 成本。

可用 `VERA_CONTEXT_ACTIVE_TOOL_RESULT_PRUNE=off` 退出（两侧皆可）。用 `VERA_CONTEXT_ACTIVE_TOOL_RESULT_MAX_ESTIMATED_TOKENS` 调节阈值，用 `VERA_CONTEXT_ACTIVE_TOOL_RESULT_MIN_STEP_NUMBER` 调节起始步骤。

### 验证

- 针对 activeToolResultPrune 默认开启、退出和环境开关的 headless 与桌面上下文预算测试。
- Runtime 包 typecheck/构建和完整 runtime 测试套件。
- Desktop main 构建/typecheck。
- 存储包构建和 AgentRun store 测试。
- Runtime 包 typecheck/构建和聚焦 runtime 测试。
- 存储包构建和聚焦 session-store 测试。
- Desktop main 构建/typecheck 和聚焦 bot/OpenGateway、凭据存储、设置/Web 搜索、连接 IPC、OAuth 和模型 provider 回归套件。
- 每个推送阶段前运行 `git diff --check`。
