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
import { describe, test } from 'node:test';
import {
  createDefaultBotChatSettings,
  mergeBotChatSettings,
  normalizeBotChatSettings,
  parseAllowedUserIdsFromText,
} from '../bot-chat-settings.js';

describe('bot chat settings owner', () => {
  test('normalizes an explicitly patched allowlist without touching it on unrelated patches', () => {
    const defaults = createDefaultBotChatSettings();
    const withAllowlist = mergeBotChatSettings(defaults, {
      channels: {
        telegram: { allowedUserIds: [' 123 ', '456', '123', ''] },
      },
    });
    const tokenPatched = mergeBotChatSettings(withAllowlist, {
      channels: { telegram: { token: 'telegram-token' } },
    });

    assert.deepEqual(withAllowlist.channels.telegram.allowedUserIds, ['123', '456']);
    assert.strictEqual(
      tokenPatched.channels.telegram.allowedUserIds,
      withAllowlist.channels.telegram.allowedUserIds,
    );
  });

  // The workspace Project is a top-level field, so it rides no per-channel
  // merge arm: it needs its own, and `normalize` — which rebuilds the record
  // field by field — has to name it too or a reload would silently drop it.
  test('keeps the workspace Project across unrelated patches and clears it on the empty string', () => {
    const defaults = createDefaultBotChatSettings();
    const selected = mergeBotChatSettings(defaults, { workspaceProjectId: ' project-1 ' });
    assert.equal(selected.workspaceProjectId, 'project-1');

    const tokenPatched = mergeBotChatSettings(selected, {
      channels: { wechat: { token: 'wechat-token' } },
    });
    assert.equal(tokenPatched.workspaceProjectId, 'project-1');

    const cleared = mergeBotChatSettings(selected, { workspaceProjectId: '' });
    assert.equal(cleared.workspaceProjectId, undefined);

    const normalized = normalizeBotChatSettings(
      { ...defaults, workspaceProjectId: 'project-1' },
      { workspaceProjectId: 'project-1' },
    );
    assert.equal(normalized.workspaceProjectId, 'project-1');
    assert.equal(normalizeBotChatSettings(defaults, undefined).workspaceProjectId, undefined);
  });

  test('parses textarea allowlists with trim, deduplication, and the defensive cap', () => {
    const raw = [
      ' 123 ',
      '456',
      '123',
      '',
      ...Array.from({ length: 60 }, (_, i) => `user-${i}`),
    ].join('\n');
    const parsed = parseAllowedUserIdsFromText(raw);

    assert.equal(parsed.length, 50);
    assert.deepEqual(parsed.slice(0, 3), ['123', '456', 'user-0']);
    assert.equal(parsed.at(-1), 'user-47');
  });
});
