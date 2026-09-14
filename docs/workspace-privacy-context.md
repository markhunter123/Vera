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

# 工作区隐私上下文

`WorkspacePrivacyContext` 是隐私敏感操作的共享契约。其当前形态刻意保持精简：

```ts
export interface WorkspacePrivacyContext {
  incognitoActive: boolean;
}
```

## 权威

主进程拥有生效的工作区隐私状态。渲染器可以请求变更并显示当前值，但渲染器提供的值绝不是生效状态的证明。

当前的权威路径是：

- `vera-desktop/src/renderer/settings/general-settings-page.tsx` 请求设置变更。
- `vera-desktop/src/main/main.ts` 通过 `getWorkspacePrivacyContext()` 解析生效状态。
- 主进程消费者接收解析后的上下文，而不是信任渲染器输入。

`defaultWorkspacePrivacyContext()` 为显式初始化返回 `{ incognitoActive: false }`。`validateWorkspacePrivacyContext()` 拒绝格式错误的输入；它绝不把缺失或无效的数据转换为 `false`。无法解析出有效权威上下文的边界必须以失败关闭（fail closed）。

## 消费者规则

`incognitoActive: false` 仅表示无痕模式没有阻止该操作。它不是读取、写入、搜索、捕获或传输数据的一般许可。每个消费者仍然必须应用自己的设置、权限和保留规则。

当 `incognitoActive` 为 true 时，每个隐私敏感消费者在其现有的主进程边界定义失败关闭的结果。`vera-desktop/src/main/main.ts` 中的组合和聚焦的消费者测试拥有当前的清单。不要在此处重复该清单、添加另一个无痕标志、把状态复制到并行的 store 中，或让渲染器自我证明。

## 契约变更

添加字段、改变范围或改变默认语义属于横切契约变更。同步更新核心类型和校验器、主进程权威路径、每个消费者、测试和本文档。
