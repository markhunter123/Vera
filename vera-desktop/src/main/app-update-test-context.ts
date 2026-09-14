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

import { readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';

/** Exact loopback-only feed accepted by packaged auto-update E2E tests. */
export function resolveUpdateFeedOverride(
  raw: string | undefined,
): { provider: 'generic'; url: string } | undefined {
  if (raw === undefined || raw === '') return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new TypeError(`VERA_UPDATE_TEST_FEED is not a URL: ${JSON.stringify(raw)}`);
  }
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.port === '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new TypeError(
      'VERA_UPDATE_TEST_FEED must be http://127.0.0.1:<port>[/path] ' +
        `(got ${JSON.stringify(raw)})`,
    );
  }
  return { provider: 'generic', url: url.toString() };
}

/**
 * Keeps both sides of a macOS replacement in one disposable profile.
 *
 * The candidate receives an explicit directory paired with the loopback feed.
 * Squirrel.Mac does not preserve that environment when it relaunches, so the
 * test-only successor carries `veraUpdateTestProfile: true` in package.json and
 * derives the same directory from its unchanged bundle location.
 */
export function resolveUpdateTestUserDataDirectory({
  feedUrl,
  explicitDirectory,
  isPackaged,
  appPath,
  executablePath,
}: {
  feedUrl?: string;
  explicitDirectory?: string;
  isPackaged: boolean;
  appPath: string;
  executablePath: string;
}): string | undefined {
  if (explicitDirectory) {
    if (!resolveUpdateFeedOverride(feedUrl)) {
      throw new TypeError('VERA_UPDATE_TEST_USER_DATA_DIR requires VERA_UPDATE_TEST_FEED');
    }
    if (!isAbsolute(explicitDirectory)) {
      throw new TypeError('VERA_UPDATE_TEST_USER_DATA_DIR must be an absolute path');
    }
    return explicitDirectory;
  }
  if (!isPackaged || process.platform !== 'darwin') return undefined;

  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(join(appPath, 'package.json'), 'utf8'));
  } catch {
    return undefined;
  }
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    !('veraUpdateTestProfile' in manifest) ||
    manifest.veraUpdateTestProfile !== true
  ) {
    return undefined;
  }
  const bundle = dirname(dirname(dirname(executablePath)));
  if (basename(bundle) !== 'Vera.app') {
    throw new TypeError(`Update-test executable is not inside Vera.app: ${executablePath}`);
  }
  return join(dirname(bundle), '.vera-update-test-user-data');
}
