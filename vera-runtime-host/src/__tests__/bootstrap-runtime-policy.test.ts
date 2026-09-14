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
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { OPENCODE_FREE_DEFAULT_ENABLED_MODELS } from '@vera/core/llm-connections';
import {
  openInteractiveRuntimePolicyStoresForWrite,
  type RuntimePolicyStoresWriter,
} from '@vera/storage/runtime-policy-stores';
import { resolveStorageRoot, tryAcquireInteractiveRootOwner } from '@vera/storage/root-authority';
import { ensureBootstrapRuntimePolicy } from '../server/bootstrap-runtime-policy.js';

test('a fresh Host with no environment seeds nothing', async () => {
  await withFixture(async ({ root, stores }) => {
    await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });

    // The app ships zero connections: no bundled provider, no default, and no
    // crash on the missing seed a past release used to plant.
    const catalog = await stores.connectionCatalog.getSnapshot();
    assert.deepEqual(catalog.connections, []);
    assert.equal(catalog.defaultTarget, null);
    // The journal is cleaned up: a second run is a byte-identical no-op.
    const before = await stores.connectionCatalog.getSnapshot();
    await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });
    assert.deepEqual(await stores.connectionCatalog.getSnapshot(), before);
  });
});

test('a system-seeded OpenCode Free row is retired and its default released', async () => {
  await withFixture(async ({ root, stores }) => {
    // The exact row a past release planted: current seed model list, default
    // pinned to the seed's first model.
    const created = await stores.connectionCatalog.create({
      expectedCatalogRevision: 0,
      connection: {
        slug: 'opencode-free',
        name: 'OpenCode Free',
        providerType: 'opencode-free',
        enabled: true,
        enabledModelIds: [...OPENCODE_FREE_DEFAULT_ENABLED_MODELS],
      },
    });
    assert.equal(created.kind, 'committed');
    const connection = created.snapshot.connections[0]!;
    const defaulted = await stores.connectionCatalog.setDefaultTarget({
      expectedCatalogRevision: created.snapshot.revision,
      target: {
        connectionId: connection.connectionId,
        modelId: connection.enabledModelIds[0]!,
      },
    });
    assert.equal(defaulted.kind, 'committed');

    await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });

    const catalog = await stores.connectionCatalog.getSnapshot();
    assert.deepEqual(catalog.connections, []);
    assert.equal(catalog.defaultTarget, null);
  });
});

test('a system-seeded row next to a user connection is retired without reassigning the default', async () => {
  await withFixture(async ({ root, stores }) => {
    const local = await stores.connectionCatalog.create({
      expectedCatalogRevision: 0,
      connection: {
        slug: 'local',
        name: 'Local',
        providerType: 'ollama',
        enabled: true,
        enabledModelIds: ['local-model'],
      },
    });
    assert.equal(local.kind, 'committed');
    const seeded = await stores.connectionCatalog.create({
      expectedCatalogRevision: local.snapshot.revision,
      connection: {
        slug: 'opencode-free',
        name: 'OpenCode Free',
        providerType: 'opencode-free',
        enabled: true,
        enabledModelIds: [...OPENCODE_FREE_DEFAULT_ENABLED_MODELS],
      },
    });
    assert.equal(seeded.kind, 'committed');
    const seededRow = seeded.snapshot.connections.find(({ slug }) => slug === 'opencode-free')!;
    const defaulted = await stores.connectionCatalog.setDefaultTarget({
      expectedCatalogRevision: seeded.snapshot.revision,
      target: {
        connectionId: seededRow.connectionId,
        modelId: OPENCODE_FREE_DEFAULT_ENABLED_MODELS[0]!,
      },
    });
    assert.equal(defaulted.kind, 'committed');

    await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });

    // The dangling default is released by the same write that removes the row;
    // bootstrap does not silently re-point the user at a different provider.
    const catalog = await stores.connectionCatalog.getSnapshot();
    assert.deepEqual(
      catalog.connections.map(({ slug }) => slug),
      ['local'],
    );
    assert.equal(catalog.defaultTarget, null);
  });
});

test('a historical persisted seed document is retired atomically', async () => {
  await withFixture(async ({ root, stores }) => {
    // An actual pre-#3409 persisted document: the three-model seed, the
    // pinned four-model fallback inventory of that build, and a default
    // target on a model no current release serves.
    const connectionId = '00000000-0000-4000-8000-000000000001';
    await writeFile(
      join(root, 'connection-catalog.json'),
      `${JSON.stringify({
        schemaVersion: 1,
        revision: 7,
        defaultTarget: { connectionId, modelId: 'deepseek-v4-flash-free' },
        connections: [
          {
            connectionId,
            revision: 3,
            slug: 'opencode-free',
            name: 'OpenCode Free',
            providerType: 'opencode-free',
            enabled: true,
            enabledModelIds: ['nemotron-3-ultra-free', 'mimo-v2.5-free', 'deepseek-v4-flash-free'],
            models: [
              { id: 'nemotron-3-ultra-free' },
              { id: 'mimo-v2.5-free' },
              { id: 'big-pickle' },
              { id: 'deepseek-v4-flash-free' },
            ],
            modelSource: 'fallback',
            modelsFetchedAt: 0,
          },
        ],
      })}\n`,
    );

    await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });

    const catalog = await stores.connectionCatalog.getSnapshot();
    assert.deepEqual(catalog.connections, []);
    assert.equal(catalog.defaultTarget, null);

    // Restart on the far side of the removal: a second bootstrap is a
    // byte-identical no-op.
    await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });
    assert.deepEqual(await stores.connectionCatalog.getSnapshot(), catalog);
  });
});

test('a user-modified opencode-free inventory is never retired', async () => {
  // A reordered seed counts as user-modified too: exact sequence equality is
  // the (documented, lossy) proof a row is still system-owned.
  for (const enabledModelIds of [
    ['nemotron-3-ultra-free', 'big-pickle'],
    ['mimo-v2.5-free', 'nemotron-3-ultra-free', 'user-model'],
  ]) {
    await withFixture(async ({ root, stores }) => {
      const created = await stores.connectionCatalog.create({
        expectedCatalogRevision: 0,
        connection: {
          slug: 'opencode-free',
          name: 'OpenCode Free',
          providerType: 'opencode-free',
          enabled: true,
          enabledModelIds,
        },
      });
      assert.equal(created.kind, 'committed');
      const before = await stores.connectionCatalog.getSnapshot();

      await ensureBootstrapRuntimePolicy({ workspaceRoot: root, stores, environment: {} });

      assert.deepEqual(await stores.connectionCatalog.getSnapshot(), before);
    });
  }
});

test('bootstrap resumes after interruption and prefers the supported environment key', async () => {
  await withFixture(async ({ root, stores }) => {
    // A row a past release planted survives the crash that left the journal
    // behind; resuming retires it AND seeds the environment provider.
    const created = await stores.connectionCatalog.create({
      expectedCatalogRevision: 0,
      connection: {
        slug: 'opencode-free',
        name: 'OpenCode Free',
        providerType: 'opencode-free',
        enabled: true,
        enabledModelIds: ['nemotron-3-ultra-free'],
      },
    });
    assert.equal(created.kind, 'committed');
    await writeFile(
      join(root, '.runtime-host-bootstrap.json'),
      '{"version":1,"state":"initializing"}\n',
      'utf8',
    );

    await ensureBootstrapRuntimePolicy({
      workspaceRoot: root,
      stores,
      environment: {
        ANTHROPIC_API_KEY: 'anthropic-secret',
        OPENAI_API_KEY: 'openai-secret',
      },
    });

    const catalog = await stores.connectionCatalog.getSnapshot();
    assert.deepEqual(
      catalog.connections.map(({ slug }) => slug),
      ['env-anthropic'],
    );
    const anthropic = catalog.connections[0];
    assert.deepEqual(catalog.defaultTarget, {
      connectionId: anthropic?.connectionId,
      modelId: 'claude-sonnet-4-5-20250929',
    });
    const status = await stores.credentialVault.getStatus({
      scope: 'connection',
      connectionId: anthropic!.connectionId,
      kind: 'api_key',
    });
    assert.equal(status.kind, 'status');
    if (status.kind === 'status') assert.equal(status.status.configured, true);
  });
});

test('bootstrap preserves DeepSeek provider semantics for a DeepSeek environment key', async () => {
  await withFixture(async ({ root, stores }) => {
    await ensureBootstrapRuntimePolicy({
      workspaceRoot: root,
      stores,
      environment: {
        DEEPSEEK_API_KEY: 'deepseek-secret',
        DEEPSEEK_BASE_URL: 'https://deepseek.example/v1',
      },
    });

    const catalog = await stores.connectionCatalog.getSnapshot();
    const deepseek = catalog.connections.find(({ slug }) => slug === 'env-deepseek');
    assert.equal(deepseek?.providerType, 'deepseek');
    assert.equal(deepseek?.baseUrl, 'https://deepseek.example/v1');
    assert.deepEqual(deepseek?.enabledModelIds, ['deepseek-v4-flash']);
    assert.deepEqual(catalog.defaultTarget, {
      connectionId: deepseek?.connectionId,
      modelId: 'deepseek-v4-flash',
    });
  });
});

test('bootstrap does not alter an existing user catalog', async () => {
  await withFixture(async ({ root, stores }) => {
    const created = await stores.connectionCatalog.create({
      expectedCatalogRevision: 0,
      connection: {
        slug: 'local',
        name: 'Local',
        providerType: 'ollama',
        enabled: true,
        enabledModelIds: ['local-model'],
      },
    });
    assert.equal(created.kind, 'committed');
    const before = await stores.connectionCatalog.getSnapshot();

    await ensureBootstrapRuntimePolicy({
      workspaceRoot: root,
      stores,
      environment: { OPENAI_API_KEY: 'must-not-be-imported' },
    });

    assert.deepEqual(await stores.connectionCatalog.getSnapshot(), before);
    assert.deepEqual((await stores.credentialVault.getSnapshot()).entries, []);
  });
});

test('an invalid optional environment credential defers and leaves no connection', async () => {
  await withFixture(async ({ root, stores }) => {
    const oversized = 'x'.repeat(64 * 1024 + 1);
    const errors: unknown[] = [];
    await ensureBootstrapRuntimePolicy({
      workspaceRoot: root,
      stores,
      environment: { OPENAI_API_KEY: oversized },
      onDeferredError: (error) => errors.push(error),
    });

    assert.equal(errors.length, 1);
    const catalog = await stores.connectionCatalog.getSnapshot();
    assert.deepEqual(catalog.connections, []);
    assert.equal(catalog.defaultTarget, null);

    // Every start with an invalid key retries the seed exactly once and
    // defers exactly one error; the catalog never keeps the failed row.
    await ensureBootstrapRuntimePolicy({
      workspaceRoot: root,
      stores,
      environment: { OPENAI_API_KEY: oversized },
      onDeferredError: (error) => errors.push(error),
    });
    assert.equal(errors.length, 2);
    assert.deepEqual((await stores.connectionCatalog.getSnapshot()).connections, []);
  });
});

async function withFixture(
  run: (fixture: { root: string; stores: RuntimePolicyStoresWriter }) => Promise<void>,
): Promise<void> {
  const base = await mkdtemp(join(tmpdir(), 'vera-runtime-host-bootstrap-'));
  const root = join(base, 'interactive');
  const capability = await resolveStorageRoot({ path: root, kind: 'interactive' });
  const owner = await tryAcquireInteractiveRootOwner(capability);
  assert.ok(owner);
  if (!owner) return;
  try {
    const stores = await openInteractiveRuntimePolicyStoresForWrite(owner.lease);
    await run({ root, stores });
  } finally {
    try {
      await owner.close();
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  }
}
