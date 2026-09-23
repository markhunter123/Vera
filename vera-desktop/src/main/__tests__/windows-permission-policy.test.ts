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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { windowsOsPermissionSnapshot } from '../windows-permission-policy.js';

describe('Windows OS permission snapshots', () => {
  it('reports input synthesis, screen capture and UIA as granted with the real UIPI boundary in the reason', () => {
    // Windows has no TCC gate for these; the readiness derivation treats a
    // required permission that is not `granted` as a hard blocker, so the
    // honest mapping is `granted` + reason text carrying the security model.
    for (const id of ['accessibility', 'screen_recording', 'automation'] as const) {
      const snapshot = windowsOsPermissionSnapshot(id, 1000);
      assert.equal(snapshot.id, id);
      assert.equal(snapshot.status, 'granted');
      assert.equal(snapshot.source, 'static');
      assert.equal(snapshot.checkedAt, 1000);
      assert.match(snapshot.reason ?? '', /UIPI|闸门/u);
      assert.equal(snapshot.canOpenSettings, false);
      assert.equal(snapshot.canRequest, false);
    }
  });

  it('keeps notifications unknown but deep-linkable, since toast state is not probeable', () => {
    const snapshot = windowsOsPermissionSnapshot('notifications', 2000);
    assert.equal(snapshot.status, 'unknown');
    assert.equal(snapshot.canOpenSettings, true);
    assert.equal(snapshot.canRequest, false);
    assert.match(snapshot.reason ?? '', /Focus Assist/u);
  });

  it('carries the caller-supplied checkedAt through', () => {
    for (const id of ['accessibility', 'screen_recording', 'notifications', 'automation'] as const) {
      assert.equal(windowsOsPermissionSnapshot(id, 1234567890).checkedAt, 1234567890);
    }
  });
});
