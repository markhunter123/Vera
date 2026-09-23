/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Windows OS-permission snapshots — the platform-policy twin of
 * `os-permission-policy.ts`, kept electron-free so the snapshot logic stays
 * unit-testable under plain node --test.
 *
 * Windows has no TCC-style authorization gates for input synthesis, screen
 * capture, or cross-process UIA reads: SendInput/BitBlt/UIA always run. The
 * real boundary is UIPI — a medium-integrity process cannot automate an
 * elevated window. Reporting `granted` for those three is what keeps the
 * computer-use capability readiness honest (an `unsupported`/`unknown`
 * required permission would permanently downgrade it even though nothing is
 * actually missing); the reason text carries the true security model.
 *
 * Notifications stay `unknown`: Windows toast state lives outside the
 * registry per-app until the first toast is sent, and Focus Assist is not
 * registry-visible at all, so no synchronous probe can report it — the deep
 * link to ms-settings:notifications is the only useful affordance.
 */

import type { OsPermissionId, OsPermissionSnapshot } from '@vera/core/capabilities';

export function windowsOsPermissionSnapshot(id: OsPermissionId, now: number): OsPermissionSnapshot {
  switch (id) {
    case 'accessibility':
      return granted(
        id,
        now,
        'Windows 对键盘/鼠标合成与窗口焦点读取没有系统授权闸门；对提权窗口的自动化受 UIPI 完整性级别约束。',
      );
    case 'screen_recording':
      return granted(
        id,
        now,
        'Windows 截屏与窗口内容读取没有系统级授权闸门；受保护内容（UAC 提示、DRM）会捕获为黑帧。',
      );
    case 'automation':
      return granted(
        id,
        now,
        'Windows 的 UIA 跨应用自动化没有逐 App 授权；对提权窗口的读取受 UIPI 完整性级别约束。',
      );
    case 'notifications':
      return {
        id,
        status: 'unknown',
        source: 'static',
        checkedAt: now,
        reason: 'Windows 无法可靠读取通知授权状态（Focus Assist 与逐 App 开关不可探测），可在系统设置中确认',
        canOpenSettings: true,
        canRequest: false,
      };
  }
}

function granted(id: OsPermissionId, now: number, reason: string): OsPermissionSnapshot {
  return {
    id,
    status: 'granted',
    source: 'static',
    checkedAt: now,
    reason,
    canOpenSettings: false,
    canRequest: false,
  };
}
