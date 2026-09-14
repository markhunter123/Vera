---
name: writing-plans
description: '编写实施计划：拆解为小粒度任务、文件路径与代码指引。'
category: '开发'
metadata:
  source: invt-ai-platform
---

# 编写实施计划

## 概述

编写全面的实施计划，假设实施者对代码库零了解且品味堪忧。记录他们所需的一切：要修改哪些文件、完整代码、测试命令、需查阅的文档、如何验证。给他们粒度够小的任务。DRY、YAGNI、TDD。频繁提交。

假设实施者是熟练的开发者，但对工具集或问题领域几乎一无所知。假设他们不太擅长测试设计。

**核心原则：** 好的计划让实施变得一目了然。如果有人需要猜测，那计划就是不完整的。

## 适用场景

**在以下场景之前务必使用：**
- 实施多步骤功能
- 拆解复杂需求
- 通过子代理驱动开发委派给子代理

**不要跳过以下情况：**
- 功能看似简单（假设会导致 bug）
- 你打算自己实施（未来的你需要指导）
- 独立工作（文档很重要）

## 小粒度任务拆分

**每个任务 = 2-5 分钟的专注工作。**

每一步都是一个动作：
- "写一个会失败的测试" — 一步
- "运行它确认它会失败" — 一步
- "实现最小化代码让测试通过" — 一步
- "运行测试确认它们通过" — 一步
- "提交" — 一步

**太大：**
```markdown
### 任务 1: 构建认证系统
[跨5个文件的 50 行代码]
```

**大小合适：**
```markdown
### 任务 1: 创建带 email 字段的 User 模型
[10 行，1 个文件]

### 任务 2: 给 User 添加 password_hash 字段
[8 行，1 个文件]

### 任务 3: 创建密码哈希工具
[15 行，1 个文件]
```

## 计划文档结构

### 头部（必填）

每个计划必须以以下内容开头：

```markdown
# [功能名称] 实施计划

> **面向代理：** 使用 subagent-driven-development 技能逐任务实施本计划。

**目标：** [一句话描述构建什么]

**架构：** [2-3 句关于技术方案的描述]

**技术栈：** [关键技术/库]

---
```

### 任务结构

每个任务遵循以下格式：

````markdown
### 任务 N: [描述性名称]

**目标：** 本任务完成什么（一句话）

**文件：**
- 创建：`exact/path/to/new_file.py`
- 修改：`exact/path/to/existing.py:45-67`（如果知道行号）
- 测试：`tests/path/to/test_file.py`

**步骤 1：编写会失败的测试**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**步骤 2：运行测试确认失败**

运行：`pytest tests/path/test.py::test_specific_behavior -v`
预期：FAIL — "function not defined"

**步骤 3：编写最小化实现**

```python
def function(input):
    return expected
```

**步骤 4：运行测试确认通过**

运行：`pytest tests/path/test.py::test_specific_behavior -v`
预期：PASS

**步骤 5：提交**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## 编写流程

### 步骤 1：理解需求

阅读并理解：
- 功能需求
- 设计文档或用户描述
- 验收标准
- 约束条件

### 步骤 2：探索代码库

使用代理工具了解项目：

```python
# 了解项目结构
search_files("*.py", target="files", path="src/")

# 查看类似功能
search_files("similar_pattern", path="src/", file_glob="*.py")

# 检查已有测试
search_files("*.py", target="files", path="tests/")

# 阅读关键文件
read_file("src/app.py")
```

### 步骤 3：设计方案

决定：
- 架构模式
- 文件组织
- 需要的依赖
- 测试策略

### 步骤 4：编写任务

按顺序创建任务：
1. 搭建/基础设施
2. 核心功能（每项都用 TDD）
3. 边界情况
4. 集成
5. 清理/文档

### 步骤 5：添加完整细节

每个任务都要包含：
- **精确的文件路径**（不是"配置文件"，而是 `src/config/settings.py`）
- **完整的代码示例**（不是"添加验证"，而是实际代码）
- **精确的命令**及预期输出
- **验证步骤**以证明任务有效

### 步骤 6：审查计划

检查：
- [ ] 任务顺序合理且有逻辑
- [ ] 每个任务粒度合适（2-5 分钟）
- [ ] 文件路径精确
- [ ] 代码示例完整（可直接复制粘贴）
- [ ] 命令精确并附预期输出
- [ ] 没有缺失上下文
- [ ] 应用了 DRY、YAGNI、TDD 原则

### 步骤 7：保存计划

```bash
mkdir -p docs/plans
# 保存计划到 docs/plans/YYYY-MM-DD-feature-name.md
git add docs/plans/
git commit -m "docs: add implementation plan for [feature]"
```

## 原则

### DRY（不要重复自己）

**差：** 在 3 个地方复制粘贴验证逻辑
**好：** 提取验证函数，到处复用

### YAGNI（你不会需要它的）

**差：** 为未来需求添加"灵活性"
**好：** 只实现当前需要的

```python
# 差 — 违反 YAGNI
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
        self.preferences = {}  # 现在不需要！
        self.metadata = {}     # 现在不需要！

# 好 — YAGNI
class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
```

### TDD（测试驱动开发）

每个产出代码的任务都应该包含完整的 TDD 循环：
1. 编写会失败的测试
2. 运行确认失败
3. 编写最小化代码
4. 运行确认通过

详见 `test-driven-development` 技能。

### 频繁提交

每完成一个任务就提交：
```bash
git add [files]
git commit -m "type: description"
```

## 常见错误

### 模糊的任务

**差：** "添加认证"
**好：** "创建带 email 和 password_hash 字段的 User 模型"

### 不完整的代码

**差：** "步骤 1：添加验证函数"
**好：** "步骤 1：添加验证函数" 后面跟着完整的函数代码

### 缺失验证

**差：** "步骤 3：测试它能用"
**好：** "步骤 3：运行 `pytest tests/test_auth.py -v`，预期：3 passed"

### 缺失文件路径

**差：** "创建模型文件"
**好：** "创建：`src/models/user.py`"

## 执行交接

保存计划后，提供执行方案：

**"计划已完成并保存。准备使用 subagent-driven-development 执行——我将为每个任务派发一个全新的子代理，并进行两阶段审查（先审查规范合规性，再审查代码质量）。是否继续？"**

执行时，使用 `subagent-driven-development` 技能：
- 每个任务用全新 `delegate_task` 并附完整上下文
- 每个任务后进行规范合规性审查
- 规范通过后进行代码质量审查
- 两项审查都批准后才继续

## 谨记

```
小粒度任务（每个 2-5 分钟）
精确的文件路径
完整的代码（可直接复制粘贴）
精确的命令及预期输出
验证步骤
DRY、YAGNI、TDD
频繁提交
```

**好的计划让实施变得一目了然。**
