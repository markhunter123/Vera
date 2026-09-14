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

# Computer Use 宿主事件契约

该层只连接具有类型化、可归属来源的事件。

## 已连接的产出者

- 类型化分派结果：
  - `user_intervened` -> 重新观察
  - `screen_locked` -> 已锁定
  - `blocked_url` -> 终结性 URL 拦截
  - `outcome_unknown`、服务不可用或服务不匹配 -> 重新观察
- 执行器服务释放：
  - 清除执行器本地的观察和键盘所有权
  - 将相应的 Runtime 会话推进到重新观察
- 轮次/会话终结性事件：
  - 同步清除 Runtime、执行器和覆盖层（overlay）所有权

## 有意的缺口

- Vera 不会从 AX 或 DOM 内容变化推断物理用户输入。
- 在拥有可靠、可归属的 macOS 事件来源之前，Vera 不宣称拥有全局物理输入产出者。
- Vera 不调用 Codex 的签名 `turn-ended` 辅助函数。该辅助函数使用 Codex 原生服务特有的 Apple Event 生命周期，辅助进程退出并不能证明服务清理已完成。
- Runtime 的 URL、锁定和干预状态要求类型化的驱动结果；原始错误消息匹配不是被接受的产出者。
- 当前驱动没有暴露可信的干预防抖截止时间，因此类型化的干预直接推进到重新观察。两阶段防抖状态保留给未来的可归属截止时间产出者。
- Vera 当前按 PID/窗口/内容/页面身份绑定目标。V10 逆向工程出的边界更强：规范应用路径加上当前活动进程实例。在执行器或原生宿主 API 能够提供原子、高精度的进程身份之前，Vera 不宣称该边界。

## 验证

跨层确定性测试框架覆盖：

- 绑定目标传播；
- 绑定观察的呈现与分派；
- 动作后的全新观察；
- 重复与陈旧拒绝；
- 类型化目标变更取消；
- 未知结果要求重新观察；
- 显式会话清理；
- 持久化工具文本中省略私有 UI 内容，而当前轮次的模型投影保留动作所需的 UI 证据。

目标/诱饵执行、真实进程重启、持久化级别隐私、Desktop 终端生命周期、真实 macOS 事件产出和真实窗口累积 Electron 验证仍然是独立的发布门禁。
