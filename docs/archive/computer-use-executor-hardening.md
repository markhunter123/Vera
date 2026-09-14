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

# Computer Use 执行器加固

本说明记录了对 PR #893 的合并后评审，对照当前 `cua-driver` 执行器和本地 Codex Computer Use 逆向工程证据。

## 本次后续修复的内容

- 语义重新获取现在要求一个唯一的 role/label/value 候选，然后验证其帧、深度和值仍然与观察到的控件匹配。同标签替换或候选集不明确时以失败关闭（fail closed）。
- 原生内容指纹包含 label 和 value，因此在同一结构槽位中改变含义的控件会使坐标动作失效。
- 窗口截图使用与桌面截图相同的压缩阈值和 8 MiB 上限。
- 未消耗的观察每会话上限为 16 个，并按 FIFO 驱逐。
- 当绑定的 PID 或窗口不再与点击建立的目标匹配时，键盘所有权失效。
- 已投递但无法验证的 Electron 指针动作和已投递的文本写入保留 `outcome_unknown`，而不会变成可重试的 `capture_failed` 结果。
- `select_text` 和 `secondary_action` 以失败关闭，因为固定的驱动程序注册表没有暴露它们声称的工具。

## 有意未改动的内容

- 坐标点击、滚动、拖拽和按键分派默认仍然禁用。重新启用兼容性 CGEvent 路径会恢复真机测试中发现的物理输入干扰。
- 在该执行器层，物理输入回调仍然可选，因为语义 AX/CDP 操作也被非 Desktop 宿主使用。Desktop 接线必须在宣称并发用户安全之前提供该防护。
- 进程级操作队列仍然保持全局。Vera 当前拥有一个动作子进程 stdio 连接，新快照/动作对必须在该共享连接上保持原子性。Codex 原生服务通过独立连接支持并发，同时将单条连接和单个应用实例串行化。在不引入独立服务连接的情况下移除队列，会破坏现有的排序契约。

## 剩余工作

- 如果跨会话并发成为必要，创建隔离的驱动连接或按目标的服务实例，并显式保留快照/动作事务。
- 初始 `observeApp` 失败无法通过当前仅观察的接口返回完整的类型化捕获结果。后端仍然强制截图上限，但 Runtime 接口需要一个可携带结果的观察契约，以端到端保留 `sensitivity_blocked`。
- 继续在坐标动作失败关闭的情况下进行真实提供商模型循环测试，直到存在隔离的原生事件执行器。

## 验证

聚焦的 `@vera/computer-use` 套件通过 111 项测试，包括语义替换、注册表不匹配、观察驱逐、窗口压缩、共享客户端排序、生命周期错误和键盘目标回归等用例。
