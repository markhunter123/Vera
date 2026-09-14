---
name: spike
description: '快速验证实验：在正式开发前用一次性代码验证想法可行性。'
category: '开发'
metadata:
  source: invt-ai-platform
---

# Spike（快速验证实验）

当用户想在正式投入开发之前**试水一个想法**时使用此技能——验证可行性、比较不同方案、或发现再多调研也回答不了的未知问题。Spike 本身就是一次性的。用完即弃，它的价值在于解答问题，不在于代码本身。

当用户说出以下类似内容时加载此技能："让我试试这个"、"我想看看 X 能不能用"、"spike 一下"、"在我正式做 Y 之前"、"快速原型 Z"、"这到底行不行？"、"对比一下 A 和 B"。

## 不应使用此技能的情况

- 答案可以通过阅读文档或代码直接得出——只做调研就好，不用动手写
- 这是在走生产路径——改用 `writing-plans` / `plan`
- 想法已经被验证过了——直接跳到实现阶段

## 如果用户安装了完整的 GSD 系统

如果 `gsd-spike` 作为同级 skill 存在（通过 `npx get-shit-done-cc --the agent` 安装），当用户想要完整的 GSD 工作流时，优先使用 **`gsd-spike`**：提供持久化的 `.planning/spikes/` 状态、跨会话的 MANIFEST 跟踪、Given/When/Then 判定格式，以及与 GSD 其他部分集成的提交模式。本 skill 是轻量级的独立版本，适用于没有（或不想用）完整系统的用户。

## 核心方法

无论规模大小，每个 spike 都遵循这个循环：

```
分解 → 调研 → 构建 → 判定
  ↑______________________↓
       根据发现迭代
```

### 1. 分解

将用户的想法拆分为 **2-5 个独立的可行性问题**。每个问题就是一个 spike。用 Given/When/Then 框架以表格形式呈现：

| # | Spike | 验证内容（Given/When/Then） | 风险 |
|---|-------|---------------------------|------|
| 001 | websocket-streaming | Given 一个 WS 连接，When LLM 流式输出 token，Then 客户端在 < 100ms 内收到分块 | 高 |
| 002a | pdf-parse-pdfjs | Given 一个多页 PDF，When 用 pdfjs 解析，Then 能提取结构化文本 | 中 |
| 002b | pdf-parse-camelot | Given 一个多页 PDF，When 用 camelot 解析，Then 能提取结构化文本 | 中 |

**Spike 类型：**
- **标准型** —— 一种方案回答一个问题
- **对比型** —— 同一个问题，不同方案（共享编号，用 `a`/`b`/`c` 字母后缀区分）

**好的 spike 问题：** 有可观察输出的具体可行性验证。
**差的 spike 问题：** 太宽泛、没有可观察输出、或仅仅是"去读读 X 的文档"。

**按风险排序。** 最有可能毙掉这个想法的 spike 先执行。如果最难的部分跑不通，就没必要去验证简单的部分。

**跳过分解** 仅限于用户已经非常清楚要 spike 什么并且明确表态的情况。此时直接将他们的想法作为一个单独的 spike。

### 2. 对齐（针对多 spike 的想法）

展示 spike 表格。问一句："按这个顺序全部构建，还是需要调整？" 在你动笔写任何代码之前，让用户有机会删减、重排或重新定义问题。

### 3. 调研（每个 spike 构建前）

Spike 不是零调研——你需要调研到足够选择正确方案的程度，然后再动手构建。每个 spike：

1. **简述。** 2-3 句话：这个 spike 是什么、为什么重要、关键风险。
2. **列出竞争方案**（如果确实存在选择空间）：

   | 方案 | 工具/库 | 优点 | 缺点 | 状态 |
   |------|--------|------|------|------|
   | ... | ... | ... | ... | 维护中 / 已废弃 / beta |

3. **选定一个。** 说明理由。如果有 2 个以上方案都可信，在同一个 spike 内构建快速变体来比较。
4. **跳过调研** 仅适用于纯逻辑、无外部依赖的情况。

调研步骤中使用 agent 工具：

- `web_search("python websocket streaming libraries 2025")` —— 查找候选方案
- `web_extract(urls=["https://websockets.readthedocs.io/..."])` —— 阅读实际文档（返回 markdown）
- `terminal("pip show websockets | grep Version")` —— 检查项目 venv 中已安装的版本

对于没有文档页面的库，通过 `read_file` 克隆并阅读其 `README.md` / `examples/`。Context7 MCP（如果用户配置了）也是很好的信息来源——先用 `mcp_*_resolve-library-id` 再用 `mcp_*_query-docs`。

### 4. 构建

每个 spike 一个目录。保持独立。

```
spikes/
├── 001-websocket-streaming/
│   ├── README.md
│   └── main.py
├── 002a-pdf-parse-pdfjs/
│   ├── README.md
│   └── parse.js
└── 002b-pdf-parse-camelot/
    ├── README.md
    └── parse.py
```

**尽量产出用户可以交互的东西。** Spike 最失败的情况就是唯一的输出只有一行写着"成功了"的日志。用户需要**感受到** spike 跑通了。默认选择，按优先级排序：

1. 一个可运行的 CLI，接受输入并打印可观察的输出
2. 一个展示行为的最小化 HTML 页面
3. 一个只有一个端点的小型 Web 服务
4. 一个单元测试，用可识别的断言来验证问题

**深度优先于速度。** 永远不要只跑通一次 happy-path 就说"成功了"。要测试边界情况。追踪令人意外的发现。只有诚实的调查才能得出可信的判定。

**尽量避免**（除非 spike 明确需要）：复杂的包管理、构建工具/打包器、Docker、env 文件、配置系统。全部硬编码——这是个 spike。

**构建单个 spike** —— 典型的工具调用顺序：

```
terminal("mkdir -p spikes/001-websocket-streaming")
write_file("spikes/001-websocket-streaming/README.md", "# 001: websocket-streaming\n\n...")
write_file("spikes/001-websocket-streaming/main.py", "...")
terminal("cd spikes/001-websocket-streaming && python3 main.py")
# 观察输出，迭代。
```

**并行对比型 spike（002a / 002b）—— 委派执行。** 当两个方案可以并行运行，且都需要真正的工程实现（不是 10 行代码的原型），用 `delegate_task` 分派：

```
delegate_task(tasks=[
    {"goal": "构建 002a-pdf-parse-pdfjs: ...", "toolsets": ["terminal", "file", "web"]},
    {"goal": "构建 002b-pdf-parse-camelot: ...", "toolsets": ["terminal", "file", "web"]},
])
```

每个子 agent 返回各自的判定；你负责撰写最终的正面对比。

### 5. 判定

每个 spike 的 `README.md` 以以下内容收尾：

```markdown
## 判定：已验证 | 部分验证 | 未通过

### 哪些有效
- ...

### 哪些无效
- ...

### 意外发现
- ...

### 对正式构建的建议
- ...
```

**已验证** = 核心问题得到了肯定的回答，且附有证据。
**部分验证** = 在 X、Y、Z 等约束条件下可行——逐一记录。
**未通过** = 不可行，原因如下。这也是一个成功的 spike。

## 对比型 spike

当两个方案回答同一个问题（002a / 002b）时，**连续构建**它们，然后在最后做正面对比：

```markdown
## 正面对比：pdfjs vs camelot

| 维度 | pdfjs（002a） | camelot（002b） |
|------|-------------|----------------|
| 提取质量 | 9/10，结构化 | 7/10，仅表格 |
| 配置复杂度 | npm install，一行搞定 | pip + ghostscript |
| 100 页 PDF 性能 | 3s | 18s |
| 是否处理旋转文本 | 否 | 是 |

**胜出者：** 就我们的用例而言，pdfjs 胜出。如果之后需要以表格为主的提取，camelot 更合适。
```

## 前沿模式（选择下一个要 spike 的内容）

如果已有 spike 存在，用户问"我接下来应该 spike 什么？"，遍历已有目录并寻找：

- **集成风险** —— 两个已验证的 spike 涉及同一资源，但是各自独立测试的
- **数据交接** —— spike A 的输出被假定为与 spike B 的输入兼容，但从未证实
- **愿景中的缺口** —— 预设但未验证的能力
- **替代方案** —— 针对部分验证或未通过的 spike，从不同角度切入的方案

提出 2-4 个候选，用 Given/When/Then 格式描述。让用户选择。

## 输出

- 在仓库根目录创建 `spikes/`（如果用户使用 GSD 约定则用 `.planning/spikes/`）
- 每个 spike 一个目录：`NNN-描述性名称/`
- 每个 spike 的 `README.md` 记录问题、方案、结果、判定
- 保持代码为一次性用途——如果一个 spike 需要花 2 天"清理后用于生产"，那它就是个糟糕的 spike

## 来源说明

改编自 GSD（Get Shit Done）项目的 `/gsd-spike` 工作流——MIT © 2025 Lex Christopherson（[gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)）。完整的 GSD 系统提供持久化的 spike 状态、MANIFEST 跟踪以及与更广泛的规约驱动开发管线的集成；通过 `npx get-shit-done-cc --the agent --global` 安装。
