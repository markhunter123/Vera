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

# 搜索服务威胁模型

> 归档于 2026-07-13。本文档记录 PR-SEARCH-0/1.5 契约边界，而非当前搜索产品实现。源码与聚焦测试拥有活动的契约。

PR-SEARCH-0 是一个仅契约的包。它不得添加真实 provider、浏览器引擎、renderer 网络调用、缓存写入器或运行时搜索执行路径。

PR-SEARCH-1.5（本修订）添加 `SearchResultTarget` 封闭判别联合（目前只有 `{ kind: 'thread'; sessionId: string; turnId?: string }`），使来源特定的导航提示保持类型化。添加新变体（memory / activity 等）是显式的契约变更。线程导航刻意**不**使用 `vera://session/<id>`——`vera-ui/src/vera-uri.ts:24` 在真正的会话导航契约出现之前推迟该 scheme。Renderers 消费 `SearchResult.target` 进行导航；`SearchResult.url` 保留给 `web` / `web_fetch` 外部结果。

## 来源分离

搜索不是单一来源。Vera 必须让这些来源保持类型化并明显分离：

- `thread`：本地会话/线程文本搜索。
- `memory`：本地或 provider 背书的语义记忆搜索。
- `activity`：未来的 OCR/活动搜索，由屏幕录制与保留设置门禁。
- `tool`：工具发现，受现有工具权限模式约束。
- `web`：通过显式 provider 的外部网络搜索。
- `web_fetch`：URL 获取/提取，视为活动的不可信内容。

本地私有来源（`thread`、`memory`、`activity`）不得被静默混入外部 `web` 结果。UI 与工具输出应显示来源种类。

## 资产

- 搜索查询文本；
- 结果标题、URL、片段（snippet）、摘要与 markdown；
- cookie 与浏览器会话状态；
- provider 凭据与 base URL；
- 聊天历史、记忆与未来的 OCR/活动文本；
- 缓存条目与嵌入；
- 注入 LLM 上下文的引用索引。

## 边界

1. Renderer 到 main：renderer 只能通过类型化 IPC 请求搜索。
2. Main 到 provider/站点：查询/结果数据可能离开本机。
3. 浏览器页面到 app：HTML/JS/CSS 是不可信的活动内容。
4. 结果到 renderer：不渲染原始 HTML。
5. 本地私有存储到 LLM：memory/activity 结果只能在显式来源语义下被 prompt 注入。
6. 缓存/持久化：结果与嵌入可以变成长期存活的本地数据。

## 网络搜索前的必需门禁

- 在 provider 调用之前执行 `normalizeSearchQuery`、`normalizeSearchLimit`、`normalizeSearchDomainList` 与 `normalizeSearchUrl`。
- URL scheme 允许清单：只有 `http:` 与 `https:`。
- URL 获取之前的重定向/私有网络策略。
- 域名允许/阻止后缀匹配；阻止优先。
- 结果与总输出字节上限。
- AbortSignal 与墙钟超时。
- 遥测中不含查询/片段/markdown 正文。
- 带 TTL、刷新绕过、默认不缓存已认证页面的缓存策略。
- 浏览器模式默认必须使用隔离分区；不复用 defaultSession cookie。
- CAPTCHA/挑战返回 `needs_human_browser`，而不是无限期隐藏浏览器等待。

## 不要从参考实现复制什么

- 把隐藏的 Google 抓取作为默认搜索服务。
- `defaultSession` 浏览器/cookie 复用。
- 从调试窗口把 cookie 同步进搜索/获取会话。
- 没有类型化 payload、用户操作与审计日志的 cookie 导入/导出。
- 在 app 中渲染原始 HTML。
- 一个混入本地 thread/memory/activity 与外部 web 的未类型化结果列表。

## 最小测试矩阵

- 查询修剪、空拒绝、类型拒绝、长度上限；
- limit 默认/钳制/拒绝；
- 域名规范化、去重、后缀匹配；
- URL scheme 允许清单与跟踪参数剥离；
- latest/today/now/今天/最新 查询的新鲜度重写；
- 对 historical/archive/since/过去 查询不重写；
- 一旦执行存在，引用索引单调；
- 一旦执行存在，超时/中止返回结构化错误；
- 一旦 IPC 存在，renderer 没有用于搜索的直接网络原语；
- 一旦执行存在，遥测省略片段与 markdown 正文。
