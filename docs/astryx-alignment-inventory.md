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

> **在文件级覆盖上已被取代：** 参见 [astryx-surface-file-inventory.md](./astryx-surface-file-inventory.md)（每个产品表面文件一行）。本文档仍是首次对齐轮次的族级 wiki 地图与修复日志。

# Astryx 对齐清单

把 [Astryx wiki](https://github.com/facebook/astryx/wiki) 约定映射到 Vera 产品表面。严重度：**blocker**（存在 Astryx 对应物时仍用原生控件 / 层级被破坏）· **polish**（尺寸偏差 px、密度）。

## Wiki 气味检查清单（可搜索）

| 区域 | 气味 | 首选 |
|------|-------|--------|
| 设计 · 间距 | 不在 `--space-*` 上的脱格 `px` | 间距令牌 |
| 设计 · 尺寸 | 固定控件高度 ≠ 28 / 32 / 36 | `size` / 密度 props |
| 设计 · 圆角 | 嵌套圆角不是 `outer − gap` | 角色圆角 |
| 设计 · 高度 | 裸 `box-shadow` / 魔法 z-index | 高度令牌 |
| API · 使用系统 | 有 Astryx 对应物仍用原生 `<button>` / `<input>` / `<select>` | `Button`、`TextInput`、`Selector`、`List`/`Item`、`EmptyState`、`Dialog`、`ToggleButton`、`Collapsible`、`SegmentedControl` |
| 主题 | 为阶梯角色使用一次性 hex | 桥 + 产品令牌 |
| 容器内边距 | 产品内边距与 `--container-padding-*` 对抗 | 让 Card/Section/Layout 拥有内嵌 |

## 表面族

### 设置外壳
| 表面 | 契合度 | 缺口 | 状态 |
|---------|-----|------|--------|
| `SettingsPage` / `SettingsSection` | 高 —— Heading/Text/HStack 开口行惯用法 | 套件为 minmax 列使用 `div`+grid（有记录） | 已对齐 |
| 设置模态 / 路由头 | 高 —— Dialog 模式 | — | 已对齐 |
| 设置行 / 可展开 | 中 | 行 chrome 的产品 CSS | polish |

### 设置页面
| 表面 | 缺口 | 状态 |
|---------|------|--------|
| General、Appearance、Data、Providers、Bot、Memory、Permission、Health、About、Usage、Web search、Projects、Subagent、Daily review | 主操作大多是 Astryx `Button`；需要处用 EmptyState | 已对齐 |
| Provider catalog / bot 概览 | `Item` 行 | 已对齐 |

### 模块中心
| 表面 | 缺口 | 状态 |
|---------|------|--------|
| `ModulePage`（Layout/Header/Content/Panel） | 厂商布局 | 已对齐 |
| Skills / MCP / Scheduled tasks / Daily review | EmptyState + List + Toolbar | 已对齐 |
| 模块列表骨架行 | `min-height: 42px` 偏离节奏（不是 page-bar） | **已修复 → 36** |

### Shell / 聊天 chrome
| 表面 | 缺口 | 状态 |
|---------|------|--------|
| App shell / 会话列表 | SideNav | 在禁止嵌套按钮处有意的原生兄弟 |
| Composer | 原生提示/取消按钮 | **已修复 → Button** |
| Workbar 标签页 | 原生 `role=tab` + dnd-kit | 有意为之（dnd + tablist；关闭是 IconButton） |
| Workbar 工具选择器 | 产品自写菜单语义与行 chrome | **已修复 → List + ListItem** |
| Inspector 失败过滤器 | 原生 toggle | **已修复 → ToggleButton** |
| Plan 执行面板 | 原生展开 toggle | **已修复 → Collapsible** |
| 标题栏身份 | BreadcrumbItem | 已对齐 |

### 对话框 / 覆盖层
| 表面 | 缺口 | 状态 |
|---------|------|--------|
| 外部会话导入 | 原生来源 + 行按钮 | **已修复 → SegmentedControl + Item** |
| 会话重命名 / 命令面板 | Dialog/Astryx | 已对齐 |

### 面板
| 表面 | 缺口 | 状态 |
|---------|------|--------|
| 任务台账 | 行最小高度 30/34 | **已修复 → 32** |
| 引用 / prompt rail chips | 原生展开/移除 | polish（chip 命中几何） |

## 本轮修复
- 控件高度节奏：任务台账行/触发器与模块列表骨架行。
- Composer 无模型 / 修订取消 → Astryx `Button`。
- Inspector 仅失败过滤器 → Astryx `ToggleButton`。
- 外部导入来源 + 会话选择 → `SegmentedControl` / `Item`。
- Plan 执行展开 → Astryx `Collapsible`。
- Workbar 工具选择器 → Astryx `List` + `ListItem`；可见描述与原生行交互。

## 剩余 polish（非 blocker）
- 引用 chips / prompt-rail ticks 保持产品形态的命中目标。
- Workbar 标签条为 dnd-kit + `role=tab` 保持自定义。
- SideNavItem endContent 上的嵌套按钮禁令（记录为有意为之）。
