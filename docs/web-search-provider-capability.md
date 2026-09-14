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

# Provider 托管的 web 搜索能力

状态：已为 OpenAI Responses 与 Anthropic Messages 实现 `web_search_20250305`；其他 provider 原生的接线仍是显式后续项。
已于 2026-08-04 对照公开的 provider 文档与已发布的 client/SDK 行为验证。

## 问题

Vera 最初只暴露一个基于 Tavily 的 `WebSearch` 工具。这使得即使所选模型 provider 已经提供服务端搜索工具，实时搜索仍需第二个凭据。

缺失的抽象并不是再增加一个搜索 provider 枚举项。托管搜索依赖以下三者的组合：

1. 已配置的 provider 访问路径；
2. 精确选定的模型；
3. provider 特定的协议与工具形状。

`functionCalling: true` 并不隐含托管搜索。OpenAI 兼容的 chat 不隐含 Responses `web_search`，Anthropic 兼容的 messages 也不隐含对 `web_search_20250305` 的支持。

## 当前路由

用户选择一个显式的搜索来源：

- `model`：复用当前会话模型的连接与凭据；
- `tavily`：使用单独配置的 Tavily 凭据。

没有静默回退。如果选择了 `model` 但精确的 provider/模型配对不受支持，Vera 会在该 turn 中省略原生工具。Tavily 仍是显式替代，而不会在原生调用失败后接管。

能力决策位于 `vera-core/src/model-web-search.ts`。存储的模型元数据可以显式设置 `capabilities.webSearch`；否则应用窄化的 provider/模型规则。

已实现的原生适配器：

- `openai-responses`，用于 Codex 风格的 `web_search`；
- `anthropic-messages`，用于 Claude Code 兼容的 `web_search_20250305`。

## 执行表面

所有生产环境的 `AiSdkBackend` 组合根都使用同一个 `routeWebSearchTools` 决策：

| 表面 | 配置权威 | 根行为 |
| --- | --- | --- |
| Desktop | 持久化的 `webSearch.enabled/defaultProvider` 设置 | 可添加 provider 原生 `WebSearch` |
| CLI / TUI / `vera run` | 同一组持久化设置 | 可添加 provider 原生 `WebSearch` |
| Runtime Host | runtime-policy 的 web-search 设置 | 可添加 provider 原生 `WebSearch` |
| Headless Harbor | 显式 `VERA_WEB_SEARCH_ENABLED=true` | 可添加 provider 原生 `WebSearch` |

Headless 保持 opt-in，因为静默启用网络搜索会改变基准语义与历史基线。仅仅讲 Anthropic Messages 协议不足以推断托管搜索支持；Vera 使用显式模型元数据或窄化的 model id 规则，包括 `anthropic-compatible` 连接上的 DeepSeek V4 Flash。

显式的 `BackendFactoryContext.tools` 列表是硬上限。根表面可以添加原生搜索，但有作用域的 child agent 不会获得它，除非其提供的工具列表已包含 `WebSearch`。专用模型实验与辅助调用——如标题生成、历史压缩、目标判定、连接测试与 daily review——不会隐式获得搜索。

隐私模式（privacy mode）会在模型请求构建之前移除 provider 原生与客户端执行的两种 `WebSearch`。

内置的 `web_research` child profile 派生自同一个按会话路由的 child 工具表面。当搜索被禁用、隐私模式激活、或所选 provider/模型接线不受支持时，它不会对外展示。

```text
turn-start tool surface
  -> provider/model capability resolution
  -> replace client WebSearch with provider-native WebSearch
  -> primary model POST /responses
       tools: [{ type: "web_search" }]
  -> provider-executed search call/result
  -> same model stream continues to final text
```

搜索请求使用现有的模型凭据。它不会把密钥复制进 web-search 设置、不会启动嵌套的模型请求、也不会把密钥暴露给 renderer。Provider 执行的搜索调用/结果被标记为 `providerExecuted`，与本地 `ToolRuntime` 执行分开保存，并通过原生 provider 工具形状重放。

持久化事件为规范读模型、UI 与导出保留归一化的 `result` 数据，同时为 provider 协议重放保留不透明的 `providerOutput` 数据。Anthropic 重放将 `server_tool_use` 与 `web_search_tool_result` 放在同一 assistant 消息中。Responses 重放使用 provider item 引用，绝不发出孤立的 `function_call_output`。

上下文预算按不透明的重放载荷计，而非较小的展示投影。Provider 原生结果不会被部分归档：历史压缩移除完整的旧 turn，而不是只归档 `result` 却意外保留无界的 `providerOutput`。

2026-08-04 的 DeepSeek 实时验证在同一个流中完成了一次真实的 Vera `AiSdkBackend` turn，包含两次 provider 执行的 WebSearch 调用与最终回答。DeepSeek 在该响应中返回了搜索动作但没有结构化来源行或 URL 注解，因此 Vera 在提供时保留引用，但不会合成或编造它们。

同一密钥也通过 DeepSeek 的 Anthropic 兼容端点验证：一次真实 Vera turn 发送了 `web_search_20250305`，收到一条包含十行来源的 provider 执行 WebSearch 结果，并在无第二次模型调用的情况下完成最终回答。这同时把 Codex/Responses 与 Claude Code/Messages 两种线上格式钉在了真实 provider 行为之上。

随后于 2026-08-04 运行了完整生产表面的冒烟验证：

- 通过持久化的 DeepSeek Responses 连接运行 `vera run`；
- 通过持久化的 DeepSeek Anthropic 兼容连接运行 `vera run`；
- 前 Headless Harbor 路径配 Responses 与显式 WebSearch opt-in；
- 前 Headless Harbor 路径配 Anthropic Messages 与相同的 opt-in。

四次运行全部以 provider 执行的 WebSearch 调用/结果对、最终模型文本、无 `WebSearch` 的本地 `ToolRuntime` 执行与持久化 runtime 事件完成。两条历史 Headless 运行也持久化了 token 摘要；那条已删除的路径是 provider 能力的证据，而不是新的 Runtime Host Eval 对象的证据。Responses CLI turn 发出了搜索加页面打开动作；Anthropic CLI turn 返回了十行结构化来源。

审查修复后，本地 HTTP 线上一致性还通过真实 AI SDK provider 转换器验证了两种协议的第二 turn 重放。2026-08-04 稍后的一次实时 provider 重跑在任一 provider 返回首个模型事件之前超时，因此它没有取代先前成功的实时冒烟或确定性的第二 turn 线上测试。

## 双线选择

原生搜索绝不会独立于主模型请求切换协议。所选连接的线上形式是权威的：

- OpenAI Responses 会话收到 `openai.web_search`；
- Anthropic Messages 会话收到 `anthropic.web_search_20250305`。

对于两者都支持的 provider，显式的 connection/model `apiProtocol` 胜出。模糊的标准 DeepSeek V4 连接默认走 Responses；使用 CC 线需要在 Anthropic 兼容连接上显式选择。Vera 不会在另一种协议上重试失败的原生搜索。

2026-08-04 对 DeepSeek V4 Flash 做了一次同 prompt 单次对比，观察到：

| 线上形式 | 延迟 | 搜索调用 | 可见来源行 | Token | 估计成本 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Responses | 9.46 s | 2 | 0 | 5,943 | $0.00046 |
| Anthropic Messages | 3.13 s | 1 | 10 | 9,638 | $0.00134 |

这是冒烟对比，不是延迟基准。它展示了一个权衡：CC 线提供了更严格的 `maxUses`、更低的实测延迟与结构化来源行；Responses 使用了多得多的缓存、成本约为三分之一，并与通用的 Codex/编码 agent 线一致。因此默认仍是 Responses，而 Anthropic 兼容路线保留为搜索密集型工作流的显式选择，这些工作流更看重来源可见性而非缓存经济性。

## Provider 矩阵

| Provider 或访问路径 | 官方托管搜索表面 | 模型边界 | Vera 状态 |
| --- | --- | --- | --- |
| DeepSeek | Responses `web_search`，服务端执行 | `deepseek-v4-flash` 与 `deepseek-v4-pro` | 经 `openai-responses` 集成 |
| OpenAI API | Responses `web_search` 工具 | Vera 当前为 GPT-5 家族启用原生路径，其 runtime 线已是 Responses | 经 `openai-responses` 集成 |
| Custom Responses relay | 当模型元数据显式声明时提供 Responses `web_search` 工具 | `apiProtocol=openai-responses` 且 `capabilities.webSearch=true` 的 `openai-responses-compatible` 连接 | 经 `openai-responses` 集成 |
| xAI API / OAuth | Responses Agent Tools `web_search` | Vera 当前启用已核验的 Grok 4.5 Responses 路线 | 经 `openai-responses` 集成 |
| Alibaba Model Studio | Responses `web_search` | 记录了 Qwen 3.5 Plus/Flash 的 provider 支持 | Provider 支持；Vera Responses 适配器待补 |
| Anthropic / Claude subscription | Messages `web_search_20250305` | 当前 Claude Opus/Sonnet/Haiku/Fable 家族 | 经 `anthropic-messages` 集成 |
| MiniMax API / Coding Plan | Anthropic 兼容的 `web_search_20250305` | MiniMax M2.7/M3 家族 | 经 `anthropic-messages` 集成；实时 provider 验证待补 |
| Google Gemini | 带 Google Search 的 Gemini API grounding | 支持的 Gemini 2.0+ 模型家族随版本而异 | Provider 支持；Vera 适配器待补 |
| Z.AI / GLM Coding Plan | Chat 工具与独立 Web Search API | GLM 模型/工具可用性随端点而异 | Provider 支持；Vera 适配器待补 |
| Mistral | Agents/Conversations `websearch` connector | 支持 agent 的模型 | Provider 支持；Vera 适配器待补 |
| Groq | 带内置 web search 的 Compound systems | `groq/compound` 与 `groq/compound-mini` | Provider 支持；Vera 适配器待补 |
| OpenRouter | Web plugin 与 `:online` 变体 | 取决于被路由模型/plugin 的支持 | Provider 支持；Vera 适配器待补 |
| Moonshot API | 在所审查的 API 文档中未找到通用模型 API 托管搜索契约 | Kimi Code 暴露了 `SearchWeb`，但那是托管编码平台工具 | 不视为 Moonshot 模型能力 |
| Cohere、Together、Fireworks、SiliconFlow | 在所审查的 API 文档中未找到通用托管搜索契约 | 仍需客户端工具或外部搜索 | 使用 Tavily 或未来的其他外部 provider |

## 官方参考

- DeepSeek Responses 兼容性：
  https://api-docs.deepseek.com/guides/responses_api
- DeepSeek Anthropic 兼容性：
  https://api-docs.deepseek.com/guides/anthropic_api/
- OpenAI web search：
  https://developers.openai.com/api/docs/guides/tools-web-search
- Anthropic web search：
  https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- 带 Google Search 的 Gemini grounding：
  https://ai.google.dev/gemini-api/docs/google-search
- xAI 搜索工具：
  https://docs.x.ai/developers/tools/search-tools
- Alibaba Qwen web search：
  https://www.alibabacloud.com/help/en/model-studio/web-search
- Z.AI web search：
  https://docs.bigmodel.cn/cn/guide/tools/web-search
- Mistral websearch connector：
  https://docs.mistral.ai/agents/tools/built-in/websearch
- Groq web search：
  https://console.groq.com/docs/web-search
- OpenRouter web search：
  https://openrouter.ai/docs/guides/features/plugins/web-search

## 后续适配器

按此顺序添加适配器：

1. 为支持动态过滤的 Anthropic 部署添加 opt-in 的 `web_search_20260209` 能力；保留 `20250305` 作为 Claude Code 与第三方 Anthropic 兼容服务使用的兼容基线。
2. 带 Google Search 的 Gemini grounding。
3. Z.AI 原生模型工具。将其独立 Search API 保留在 provider 原生路径之外。
4. OpenRouter web plugin。
5. Mistral Agents 与 Groq Compound，在定义其成本与结果行投影契约之后。

每个适配器都必须在主模型请求中执行、保留 provider 工具事件与引用元数据、保持凭据隔离，并保持显式的无回退行为。
