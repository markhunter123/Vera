---
name: skill-authoring
description: '编写 SKILL.md 技能文件：frontmatter 规范、校验限制、结构模板。'
category: '开发'
metadata:
  source: invt-ai-platform
---

# 编写 Invt 技能

## 概述

技能是一个 `SKILL.md` 文件 —— YAML frontmatter 加一个可复用指令的 markdown 正文。SKILL.md 可以存放在两种位置，对应不同的创建路径：

1. **内置（仓库内）：** `invt-ai-platform-server/src/main/resources/skills/<name>/SKILL.md` —— 已提交，随服务器 JAR 一起发布。每次启动时 `BuiltinSkillSeedService` 会扫描 `classpath*:skills/*/SKILL.md`，解析每个 frontmatter，并以 `name` 为键 upsert 一条记录到 `mate_skill` 表中。SKILL.md 是唯一真相来源 —— 不需要 SQL seed 条目。
2. **自定义（运行时）：** 由 Agent 或用户通过 `skill_manage` 工具创建。存储为 `mate_skill` 表中的一行，`skill_type=custom`，并导出到工作区 `~/.invt/skills/<name>/`。不提交，按安装实例独立存在。

本技能涵盖两种方式。请注意，`skill_manage` 不会写入仓库内的 `skills/` 目录 —— 内置技能通过直接编写文件并重启来创作。

## 适用场景

- 你要添加一个应随 Invt 一起发布的可复用工作流 → 内置。
- 你要编辑 `invt-ai-platform-server/src/main/resources/skills/` 下已有的内置技能。
- Agent 完成了一个复杂任务，想要固化其方法 → 自定义，通过 `skill_manage`。
- 你要审核一个 SKILL.md 的 frontmatter 和结构是否正确。

**不适用于：** 记录使用某个技能时发现的零散技巧（这属于 `record_lesson` / 每个技能的 LESSONS.md），或跨技能的记忆笔记（`remember`）。本技能关注的是编写技能文档本身。

## 必需的 Frontmatter

Frontmatter 由 `SkillFrontmatterParser` 解析：用正则 (`^---\s*\n(.*?)\n---\s*\n(.*)$`) 切分出围栏块，然后由 SnakeYAML 将其加载为一个映射。硬性要求：

- 以 `---` 作为**第一个字节**开头 —— 不能有空行，不能有 BOM。
- 后面跟一个闭合的 `---` 行，然后是正文。正文必须非空。
- 围栏之间的内容能解析为 YAML 映射。
- `name` 必须存在 —— 它是 upsert 的键。`BuiltinSkillSeedService` 会跳过任何没有 `name` 的 SKILL.md。
- `description` 必须存在 —— 单行。

如果 frontmatter 正则匹配失败，解析器会将整个文件视为正文且 `name` 为空，内置技能会在 seed 时被静默跳过。一个可加载的技能始终具有格式良好的 frontmatter。

## 大小与命名限制

- **技能内容：** ≤ 100,000 字符（`MAX_CONTENT_CHARS`，约 25k tokens）—— 由 `skill_manage` 对自定义技能强制执行。内置技能不做硬性检查，但应遵循同样的上限。
- **名称：** 必须匹配 `^[a-z0-9][a-z0-9._-]{0,63}$` —— 小写字母和数字加 `-` `_` `.`，以字母或数字开头，≤ 64 字符。`skill_manage` 在验证前会将名称转为小写。
- **描述：** 保持单行。同类技能的描述在 40-70 字符之间 —— 一个紧凑的触发短语，而非段落。
- **同类技能**在 `resources/skills/` 中的规模在 6-15k 字符之间。以此为目标；超过约 20k 时，将细节拆分到 `references/*.md`。

## 与同类保持一致的 Frontmatter

每个已发布的技能都遵循以下形态：

```yaml
---
name: my-skill-name
description: '一行：它做什么，何时触发。'
version: 1.0.0
tags:
- short
- descriptive
- tags
author: ported
---
```

`BuiltinSkillSeedService` 会投射到 `mate_skill` 行的字段：

| 字段 | 作用 | 缺失时的默认值 |
|---|---|---|
| `name` | upsert 键，技能标识 | —（必需） |
| `description` | 在技能列表中展示 | 空 |
| `version` | `mate_skill.version` | `1.0.0` |
| `icon` | emoji，或 `/skill-assets/...` 路径 | `🛠️` |
| `author` | 署名 | `Invt` |
| `tags` | YAML 列表或 CSV 字符串 | 技能名称 |
| `nameZh` / `nameEn` | 双语展示名称 | 无 |
| `optional: true` | seed 时技能**默认禁用**—— 用户从技能页面手动开启 | `false`（启用） |
| `dependencies.tools` | 所需工具 ID → `config_json.requiredTools` | 无 |
| `platforms` | 例如 `[linux, macos, windows]` | 无 |

`version` / `author` / `tags` 并非校验器强制要求，但每个同类技能都带有这些字段 —— 缺失会让技能看起来不够完善。对于重量级技能（付费 CLI 依赖、外部 OAuth、小众集成），使用 `optional: true`，让它们默认不启用，由用户主动激活。

## 技能结构

已发布技能大致遵循：

```
# <标题>

## 概述          — 一到两段：做什么以及为什么。
## 适用场景       — 触发条件列表，外加"不适用于："的反向触发。
## <主题章节>     — 速查表、具体命令、具体配方
                   （mvn test、invt-ai-platform-server/ 下的路径等）。
## 常见陷阱       — 编号的错误及对应的修复方案。
## 验证清单       — 操作后检查的 checkbox 列表。
```

并非每个章节都是强制性的，但 `概述` + `适用场景` + 可操作的正文 + `常见陷阱` 是让技能读起来像一个同类技能的最低要求。

## 目录布局

```
invt-ai-platform-server/src/main/resources/skills/<skill-name>/SKILL.md
```

`skills/` 目录树是**扁平**的 —— 没有分类子目录。seed 的 glob `classpath*:skills/*/SKILL.md` 只匹配恰好一层深度，因此嵌套在分类目录下的技能将永远不会被扫描到。目录名应当等于 frontmatter 中的 `name`。辅助文件放在 `references/` 和 `scripts/` 子目录中（见下文）。

## 内置工作流（仓库内）

1. **调研同类技能：** `ls invt-ai-platform-server/src/main/resources/skills/` 并阅读 2-3 个与你主题相近的 SKILL.md 文件 —— 匹配其语气和结构。
2. **创建** `skills/<name>/SKILL.md`，使用文件工具。
3. **验证** frontmatter 能否正确解析 —— 见下方清单。
4. **重启服务器。** `BuiltinSkillSeedService` 仅在启动时 seed 新行；运行中的服务器不会看到它。该服务在 SKILL.md 的大小/mtime 未变化时也会跳过重新 seed，因此重新构建 JAR 才能使更改生效。
5. **提交** 新的 `skills/<name>/` 目录。不需要 SQL seed 变更 —— SKILL.md 是唯一真相来源，取代了每个技能单独的 `INSERT INTO mate_skill`。

## 自定义工作流（skill_manage）

Agent 和用户通过 `skill_manage` 工具创建运行时技能 —— 动作包括 `create | edit | patch | delete`：

- `create` —— 从完整的 SKILL.md 内容创建新技能。重复名称会被拒绝。
- `edit` —— 对自定义技能进行全文覆写。
- `patch` —— 查找替换某个章节（`oldText` → `newText`）。
- `delete` —— 卸载（逻辑删除加上工作区归档）。

注意事项：

- 每次写入在保存前都会经过**安全扫描**（`SkillSecurityService`）—— 危险模式会被拒绝并附带原因。内置 SKILL.md 文件不会被扫描；它们是受信任的已提交源文件。
- `edit` / `patch` / `delete` **拒绝内置技能**（"cannot edit builtin skill"）。要修改内置技能，需编辑资源文件并重启。
- 自定义技能即时生效 —— 工具会重新运行解析器管线 —— 因此无需重启。

## 辅助文件

除 `SKILL.md` 外，技能目录还可以包含：

- `references/*.md` —— 正文链接到的长篇材料。用于将 SKILL.md 控制在约 20k 字符以内。
- `scripts/*` —— 技能调用的可执行辅助脚本。
- `templates/`、`assets/` —— 部分内置技能使用（HTML 模板、图片等）。

`SkillFileAccessPolicy` 仅解析 `references/` 和 `scripts/` 下的运行时路径，并拒绝 `..` 穿透或绝对路径 —— 将运行时读取的文件放在这两个目录中。

## 常见陷阱

1. **`---` 前有前导空白。** frontmatter 正则锚定在 `^---`；一个空行或 BOM 会导致整个文件被解析为正文且 `name` 为空，内置技能会被静默跳过。
2. **期望运行中的服务器能看到新的内置技能。** `BuiltinSkillSeedService` 仅在启动时 seed。重启 —— 或者，为了快速迭代，通过 `skill_manage` 创建自定义技能，它会即时生效。
3. **尝试对内置技能使用 `skill_manage edit`。** 会被拒绝。内置技能是已提交的源文件 —— 编辑文件并重启。
4. **为新内置技能添加 `INSERT INTO mate_skill`。** 不必要且不推荐 —— SKILL.md 是唯一真相来源，seed 服务会按 `name` 进行 upsert。
5. **描述过于通用。** "调试问题"太弱。同类技能的描述应指明*触发条件* —— "四阶段根因调试：先理解 bug 再修复"优于"调试问题"。
6. **在技能正文中提及外部项目名称或内部 RFC。** 客观描述其功能。已发布内容陈述它*做什么*，而非想法来自哪里 —— `author: ported` 是改编技能的中性署名方式。
7. **技能内容超过 100k 字符。** `skill_manage` 会直接拒绝；将细节拆分到 `references/`。
8. **目录名与 `name` 不匹配。** upsert 的键是 frontmatter 中的 `name`，但目录名不一致会让阅读目录树的人感到困惑。保持二者一致。

## 验证清单

- [ ] 文件位于 `invt-ai-platform-server/src/main/resources/skills/<name>/SKILL.md`（内置）；目录名等于 frontmatter 中的 `name`
- [ ] Frontmatter 从第 0 字节以 `---` 开始，以 `---` 行闭合，正文非空
- [ ] `name` 匹配 `^[a-z0-9][a-z0-9._-]{0,63}$`；`description` 为单行
- [ ] `version`、`tags`、`author` 均已填写（与同类保持一致）
- [ ] 文件总大小 ≤ 100,000 字符（目标 6-15k；超过约 20k 时拆分到 `references/`）
- [ ] 结构：`# 标题` → `## 概述` → `## 适用场景` → 可操作的正文 → `## 常见陷阱` → `## 验证清单`
- [ ] 正文中无外部项目名称或 RFC 编号
- [ ] 内置：服务器已重启，`BuiltinSkillSeedService` 已 seed 该行；新的 `skills/<name>/` 目录已提交
- [ ] 自定义：通过 `skill_manage` 创建，安全扫描报告为 PASSED
