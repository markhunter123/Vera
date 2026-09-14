#!/usr/bin/env node
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
 * PR-BUILD-HYGIENE-0: detect a stale `dist/` (source newer than its
 * compiled output) and exit non-zero so CI / pre-test hooks can
 * force a rebuild.
 *
 * Rule per workspace pkg `<W>`:
 *   - If `<W>/dist` is missing, treat as stale.
 *   - If any `*.ts(x)` file under `<W>/src` has mtime newer than the
 *     newest file under `<W>/dist`, treat as stale.
 *
 * `vera-desktop` has two outputs (`dist` for main + preload,
 * `dist-renderer` for the renderer bundle). Source paths split by
 * `src/main` / `src/preload` vs `src/renderer`, so this script
 * walks them independently to avoid false positives where a
 * renderer edit invalidates the main dist or vice versa.
 *
 * Pure file mtime comparison — no TypeScript program is started,
 * keeps the gate cheap enough to run before every `npm test`.
 */

import { readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const pairs = [
  { pkg: '@vera/core', src: 'vera-core/src', dist: 'vera-core/dist' },
  { pkg: '@vera/storage', src: 'vera-storage/src', dist: 'vera-storage/dist' },
  { pkg: '@vera/runtime', src: 'vera-runtime/src', dist: 'vera-runtime/dist' },
  {
    pkg: '@vera/runtime-host',
    src: 'vera-runtime-host/src',
    dist: 'vera-runtime-host/dist',
  },
  { pkg: '@vera/ui', src: 'vera-ui/src', dist: 'vera-ui/dist' },
  { pkg: '@vera/desktop:main', src: 'vera-desktop/src/main', dist: 'vera-desktop/dist/main' },
  {
    pkg: '@vera/desktop:preload',
    src: 'vera-desktop/src/preload',
    dist: 'vera-desktop/dist/preload',
  },
  {
    pkg: '@vera/desktop:renderer',
    src: 'vera-desktop/src/renderer',
    dist: 'vera-desktop/dist-renderer',
  },
];

function walkMaxMtime(dir, predicate) {
  if (!existsSync(dir)) return 0;
  let max = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop();
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const full = join(cur, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        stack.push(full);
        continue;
      }
      if (!predicate(entry.name)) continue;
      const m = statSync(full).mtimeMs;
      if (m > max) max = m;
    }
  }
  return max;
}

const stale = [];
for (const pair of pairs) {
  const srcDir = join(repoRoot, pair.src);
  const distDir = join(repoRoot, pair.dist);

  if (!existsSync(srcDir)) continue; // workspace not present
  if (!existsSync(distDir)) {
    stale.push({ pkg: pair.pkg, reason: 'dist missing' });
    continue;
  }
  const srcMax = walkMaxMtime(srcDir, (n) => n.endsWith('.ts') || n.endsWith('.tsx'));
  const distMax = walkMaxMtime(
    distDir,
    (n) => n.endsWith('.js') || n.endsWith('.mjs') || n.endsWith('.cjs') || n === 'index.html',
  );
  if (srcMax > distMax) {
    stale.push({
      pkg: pair.pkg,
      reason: `src newer than dist (Δ=${Math.round((srcMax - distMax) / 1000)}s)`,
    });
  }
}

if (stale.length === 0) {
  console.log('dist is fresh.');
  process.exit(0);
}

console.error('STALE DIST DETECTED:');
for (const s of stale) console.error(`  - ${s.pkg}: ${s.reason}`);
console.error('\nRun `npm run rebuild` and retry.');
process.exit(2);
