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

# OpenAI Responses 增量传输

## 1. 问题与不变量

长时间工具循环目前每一步都重建并上传完整的 provider 历史。持久的 Runtime 事件台账仍然是真相来源，但 OpenAI Responses 传输可以复用一个回合作用域的 WebSocket，只发送上一个响应之后的后缀。

该优化绝不能改变逻辑请求。仅当当前 Vera 消息列表恰好满足以下条件时，续接（continuation）才合格：

1. 上一个请求的消息；
2. 随后是 Vera 对上一个 provider 步骤的持久重放投影；
3. 随后是至少一条新消息。

否则适配器发送完整请求并开启一条新的续接链。

provider 响应 id 在适配器边界被观察到，但语义响应消息不会从 `sdk.response.messages` 复制。客户端工具持久落定后，Runtime 从事件台账重新加载该步骤，并用下一个请求将使用的同一投影完成续接基线。投影不匹配时 fail closed 为完整请求。

## 2. 归属与生命周期

- `ModelAdapter` 拥有语义续接状态，按回合 id 为键，因此并发回合绝不共享一条链。
- OpenAI Responses 传输拥有匹配的 WebSocket 与线上请求/响应状态。
- 会话 id 提供稳定的 `prompt_cache_key`；显式的调用方值优先。
- 持久历史保持完整。只有 provider 边界的线上投影是增量的。
- 每个活动车道（lane）在回合结束前至多保留一条完整线上请求/输出基线与一条语义请求/响应基线。这些快照故意不做字节上限：图像繁重的请求在回合期间可能保留数兆字节，以便 HTTP 重试可以重建完整历史。`endLane`/`close` 同步释放它们；添加字节上限会用更低的峰值内存换取该恢复保证，需要单独的策略决策。

## 3. 失败矩阵

| 条件 | 行为 |
| --- | --- |
| 首个请求或消息前缀不匹配 | 通过 WebSocket 发送完整请求 |
| 请求选项/模型/工具变更 | 完整请求；替换链基线 |
| 响应 id 缺失/过期 | 清空链；Runtime 重试从持久完整历史开始 |
| WebSocket 连接失败 | 完整 HTTP 请求；跨回合五分钟内抑制新的 socket 尝试 |
| 冷却在临时使用 HTTP 的车道上到期 | 用完整历史重试 WebSocket，然后在该 socket 上恢复 delta 续接 |
| socket 关闭或流失败 | 清空链，启动重试冷却，让 Runtime 从完整历史重试 |
| 因输出令牌截断以外的原因而 `response.incomplete` | 暴露 provider 失败，而非静默的成功回合 |
| 同一回合尝试并发请求 | 竞争方使用完整 HTTP 请求 |
| 中止/取消 | 关闭 socket 并清空链 |
| 模型获取携带不可变的网络代理快照 | WebSocket 使用同一代理与 bypass 列表；直接旧式 fetch 接线没有可继承的代理快照 |
| OAuth 订阅或 Chat Completions 模型 | 现有传输，不变 |

## 4. 测试计划

- 单元测试精确的语义前缀/delta 选择与每一个不匹配回退。
- 单元测试稳定的缓存键合并，不覆盖显式 provider 选项。
- 演练一个本地 WebSocket 服务器，验证连接复用、`previous_response_id`、仅 delta 输入与 SSE 转换。
- 演练完整的适配器/后端循环，使推理步骤被持久化、重放，并用作下一条 delta 基线，而不是对照 SDK 响应表示。
- 验证 WebSocket 设置失败时重建并发送完整 HTTP 请求。
- 验证流中途关闭、二进制帧与陈旧续接状态可重试；中止保持不可重试，且不启动跨回合冷却。
- 验证繁忙车道 HTTP 回退、非截断的不完整响应与空闲 socket 协议错误，且不用固定时长睡眠。
- 验证失败冷却在回合清理后存活、确定性到期，且不清除已健康的并发车道；冷却期间使用的车道在到期后恢复。
- 运行 Runtime typecheck 与聚焦测试，然后运行与 diff 相称的仓库验证。

## 5. 可观测性与发布

现有 provider-attempt 遥测已经记录请求字节、延迟、到首令牌的时间与缓存使用。发布可以按 provider 步骤比较这些字段。WebSocket 仅限于 API 密钥 OpenAI Responses 适配器；direct、HTTP(S)-proxy 与 SOCKS5 路由沿用现有传输快照。每一条失败路径都保留完整的 HTTP 回退。OAuth 订阅传输保持在它们感知刷新的 HTTP 路径上。

## 6. 验证结果

- Runtime TypeScript 构建通过。
- 聚焦的续接、适配器/后端契约、WebSocket 失败与 provider 分类测试：34 个通过。
- HTTP 代理行为通过一个已认证的本地 CONNECT 代理端到端演练。
- SOCKS5 选择与共享 bypass 列表路由在传输边界覆盖。
- Runtime 全量验证：3,217 个测试，3,208 个通过，9 个跳过，0 个失败。
