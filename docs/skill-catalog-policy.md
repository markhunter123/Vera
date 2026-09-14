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

# Skill 目录策略

Vera 把技能正文排除在常驻系统提示词之外。提示词只包含一个有界的目录；当任务匹配某个技能时，只读的 `Skill` 工具会加载完整指令。

发现过程同时产出完整清单和胜出目录。每个有效副本都有一个带作用域的 `ref`（例如 `project:vera:writer` 或 `user:agents:writer`）。重复的 id 保留在清单中供检查，但只有最高优先级的副本才有资格进入运行时目录。

目录按以下顺序确定性选择：

1. 按来源优先级顺序发现技能目录。项目级路径优先于工作区兼容路径，工作区兼容路径优先于用户级路径。重复 id 采用先到先得。同一目录内的技能按显示名称排序。
2. 排除已禁用的技能。
3. 当宿主提供能力时，排除显式 `required-tools` 或 `required-capabilities` 不可用的技能。`allowed-tools` 仅作参考，绝不授予权限。
4. 把用户固定的技能放在最前，然后保持来源优先级和稳定的显示名称/ref 排序。
5. 按所得顺序添加目录条目，直到达到所选模型的目录预算。预算为其上下文窗口的 2%，钳制在 4,000–8,000 估算 token 之间，按每 token 四个字符换算。如果上下文窗口不可用，使用向后兼容的 `MAX_SKILLS_PROMPT_CHARS = 18000` 字符预算。

下限让有用目录在小上下文模型上可用。上限防止大上下文模型把目录变成无界的常驻成本。因为更换模型可能改变选中的目录，模型上下文窗口是显式的提示词输入，而不是技能扫描器内部的隐式提供商查找。

当预算省略某些条目时，提示词只包含一个常量大小的计数，而不是无界的 id 列表。省略只影响目录广告：已启用且宿主兼容的被省略技能仍可通过有界的、仅元数据的 `SkillSearch` 工具被发现，并可通过 `Skill` 工具按精确 ref、id 或名称加载。技能指令仍受其单独的懒加载正文限制约束。

`selectSkillsForContext` 在选中目录之外还返回一个 `SkillSelectionReport`。它为每个清单条目记录一项决策（`advertised`、`budget`、`disabled`、`invalid`、`host_incompatible` 或 `shadowed`）以及被广告的排名。Desktop 为其 Context Inspector 按项目缓存最后一次提示词构建报告；在提示词构建之前，它显示确定性预览。

Runtime 偏好使用 `.vera/skills-state.json` 模式 v2：

```json
{
  "schemaVersion": 2,
  "skills": {
    "workspace:legacy:writer": {
      "enabled": true,
      "pinned": true,
      "updatedAt": "2026-07-22T00:00:00.000Z"
    }
  }
}
```

读取器保持与模式 v1 id 键兼容。Desktop 只有在 id 解析为单个清单条目时才自动迁移。如果该 id 存在于多个作用域中，模式 v2 会在 `migration.needsReview` 下保留旧默认值，直到用户做出显式的 ref 级选择；它绝不猜测旧偏好指向哪个副本。Skills Context Inspector 把每个受影响的副本显示为 `Needs review`；切换或固定作用于其精确 ref，只有所有歧义副本都有显式偏好后，标记才会清除。

捆绑来源不是对本地工作区内容的执行权威。从 `BUNDLED_SKILL_CATALOG` 移除条目会停止 Vera 分发或安装该来源，并使较旧的捆绑锁以 `metadata_error` 校验失败。升级不会删除、重写或静默禁用已安装的 `skills/<id>` 目录。如果该本地副本在其他方面有效且已启用，Runtime 会继续把它视为用户提供的内容，它在常规权限和宿主能力规则下保持可调用。用户可以显式禁用或删除本地副本。

配置的发现根也是诊断契约的一部分。可选根缺失是正常情况，不产生警告。符号链接/非目录根、包含范围逃逸或不可读的根会产生有界的 `SkillDiscoveryDiagnostic`（`blocked_path` 或 `read_failed`），并出现在 Desktop 清单中。它绝不能坍缩成无法区分的空目录。

## 显式调用契约

新的 Desktop 选择存储并提交 `listInvocableSkills` 返回的稳定 `ref`。旧的 `skillIds` 线上字段名仍然被接受，可以包含精确 ref 或旧 id；`/skill:<id>` 对键入式 CLI/Desktop 输入仍然受支持。发送时的解析是权威且确定的：先精确 ref，然后 id，再名称。

Desktop 和 CLI 都使用 `prepareSkillInvocationMessage`：

- 成功的请求注入有界的 Skill 正文，并在交接给提供商之前移除调用标记；
- 部分失败保留成功的技能并报告每个失败；
- 如果所有显式请求都失败，不创建提供商轮次；
- 如果组合的结构化和文本输入超过 50 个不同请求，准备以一条有界的 `too_many_requests` 诊断信息失败关闭；Runtime 不解析任何部分请求集，也不创建提供商轮次；
- 在限制内，每个不同请求返回一条有界的 `SkillInvocationReceipt`，包含 `invocation`、成功/失败、成功加载的精确 ref/scope/来源、截断和失败原因。回执不包含用户提示词、搜索查询或技能指令。

模型 `Skill` 工具加载使用相同的回执投影作为运行跟踪数据，带有 `invocation: model_tool`；这些投影是可持久化的 AgentRun 跟踪事件。显式客户端回执使用 `invocation: explicit`，有意作为客户端本地、临时的准备诊断：它们返回给提交客户端，但不随会话恢复，也不与持久化运行关联。失败的跟踪投影只保留请求长度，不保留请求文本。这使结果形态可比较，而不会创建新的内容收集通道，也不会暗示轮次前诊断是持久化的审计轨迹。

提示词构建、`SkillSearch` 和 `Skill` 发出诊断性运行跟踪事件。搜索遥测存储计数和查询长度，而不是原始查询文本。影子评估器最多保留当前轮次的前 20 个 ref；当搜索过的技能随后被加载时，加载事件记录其排名和 Top-1/Top-5/Top-20 命中标志。这衡量排名质量，而不收集技能指令或用户查询内容。

## 治理收尾边界

当 Runtime、Desktop 和 CLI 契约测试覆盖重复/被遮蔽的 id、无效元数据、已禁用和宿主不兼容的技能、提示词预算省略、稳定 ref 显式调用、全部失败不创建轮次的行为、迁移评审和发现来源诊断时，本策略结束本地 Skill 治理工作。

远程市场和自动更新、自修改/进化技能、全屏 TUI 管理器、基于嵌入的排名和分析仪表板是独立的产品举措。它们不是安全、确定的本地 Skill 生命周期的先决条件。
