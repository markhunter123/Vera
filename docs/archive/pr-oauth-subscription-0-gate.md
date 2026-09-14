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

# PR-OAUTH-SUBSCRIPTION-0 门禁

> 于 2026-07-13 归档。该门禁早于当前的订阅发送路径；当前行为由源码、测试和 `SECURITY.md` 负责。

范围：仅限 Claude 订阅认证、账户状态和配额显示。聊天发送路径保持阻塞，直到后续的运行时冒烟 PR。

## 产品决策

- 仅限 Claude 订阅。Codex、Gemini 和 Copilot 是独立的 PR。
- 设置位置为 `账号`；模型设置仅消费就绪状态。
- 遮蔽（cloaked）的 Claude Code 请求头默认关闭，必须保持在 `VERA_CLAUDE_SUBSCRIPTION_CLOAK=1` 之后。
- 配额 v1 仅显示提供商端点返回的值：窗口利用率和获取时间。

## 阻塞门禁

- 令牌保留在主进程中。渲染器、preload 和共享 UI 不得暴露 `access_token`、`refresh_token`、`id_token` 或其 camelCase 变体。
- 令牌持久化要求 Electron `safeStorage` 加密和文件权限 `0o600`。如果加密不可用，登录以失败关闭，而不是写入明文。
- PKCE verifier 和 OAuth state 仅限主进程。粘贴代码的完成流程必须校验 TTL、严格结构和 state，然后在令牌交换网络调用之前消费待处理的认证。
- 当两个值不同时，令牌交换请求必须发送粘贴的 OAuth state，而不是 PKCE verifier。
- 刷新失败会设置 `refresh_failed`，不会自动删除令牌文件。
- 在订阅发送路径实现并经过运行时冒烟测试之前，`oauth_token` 提供者不得传递 `isConnectionReady` / `requireReadyConnection`。
- 遮蔽模块必须与默认请求路径隔离。默认代码不得静态导入遮蔽的请求辅助函数。
- 账户 UI 不得宣称操作就绪。已认证仅意味着账户/配额可见。

## 登出撤销门禁

PR-OAUTH-SUBSCRIPTION-0 要求本地清除：

- 删除本地令牌文件。文件缺失（`ENOENT`）视为已清除。
- 清除内存中的令牌、个人资料、配额、待处理授权和诊断状态。
- 如果本地删除失败，返回 `storage_failed`；UI 不得显示登出成功。

本 PR 不要求远程 OAuth 撤销，因为截至 2026-05-28，Anthropic 尚未公开 RFC 7009 撤销端点。参考实现的 `ld.logout` 路径也仅做本地清除（本地参考摘录）。不要调用非公开或猜测的撤销端点。

如果 Anthropic 发布撤销端点，添加 `PR-OAUTH-SUBSCRIPTION-LOGOUT-REVOKE-0`，包含远程撤销、本地清除回退语义和负向测试。
