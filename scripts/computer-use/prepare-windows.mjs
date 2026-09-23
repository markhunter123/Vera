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

// Build the vera-cu-windows executor and pin the result — the Windows sibling
// of prepare.mjs, which builds the Swift executor for macOS.
//
// Same contract, smaller surface: the crate builds from this repo (no sibling
// checkout, no branch provenance to resolve), Windows has no codesign
// equivalent wired up, so `signature` is honest `none` and `distributionReady`
// stays false — the host refuses an unready entry in a packaged build, which
// keeps this binary development-only until signing is solved for the whole
// bundle (the same reason the macOS entry is false today).
//
//   node scripts/computer-use/prepare-windows.mjs
//
// The toolchain environment below is the CLAUDE.md §3 story for this machine:
// clang-cl + lld-link + an xwin Windows SDK, no Visual Studio required. A
// machine with a real VS install can drop the env block and plain `cargo
// build --release` works too.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readSync, closeSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const crateDir = join(repoRoot, 'native', 'vera-cu-windows');
const destination = join(repoRoot, 'vera-desktop', 'resources', 'bin', 'vera-cu-windows.exe');

function fail(message) {
  process.stderr.write(`computer-use prepare-windows: ${message}\n`);
  process.exit(1);
}

if (process.platform !== 'win32') {
  fail('this script builds the Windows executor and must run on Windows.');
}

/** Dos header magic — the one check that separates a PE from a text file. */
function assertPe(path) {
  const fd = openSync(path, 'r');
  try {
    const head = Buffer.alloc(2);
    if (readSync(fd, head, 0, 2, 0) !== 2) fail(`${path} is too short to be an executable.`);
    if (head.toString('ascii') !== 'MZ') fail(`${path} is not a PE executable.`);
  } finally {
    closeSync(fd);
  }
}

// xwin's unpacked Windows SDK (see CLAUDE.md §3). Everything is optional from
// here down: a machine whose cargo already links needs none of it.
const llvm = process.env.VERA_LLVM_BIN ?? 'C:\\Program Files\\LLVM\\bin';
const shims = process.env.VERA_LLVM_SHIMS ?? 'D:\\project\\llvm-shims';
const xwin = process.env.VERA_XWIN_SPLAT ?? join(process.env.LOCALAPPDATA ?? '', 'xwin-cache', 'splat');

const env = {
  ...process.env,
  PATH: `${shims};${llvm};${process.env.PATH ?? ''}`,
  CC: join(llvm, 'clang-cl.exe'),
  CXX: join(llvm, 'clang-cl.exe'),
  CARGO_ENCODED_RUSTFLAGS: `-Clinker=${join(llvm, 'lld-link.exe')}`,
};
if (existsSync(xwin)) {
  env.LIB = [
    join(xwin, 'sdk', 'lib', 'um', 'x86_64'),
    join(xwin, 'sdk', 'lib', 'ucrt', 'x86_64'),
    join(xwin, 'crt', 'lib', 'x86_64'),
  ].join(';');
}

process.stderr.write('computer-use prepare-windows: building native/vera-cu-windows\n');
// Running inside the crate directory is what makes rustup pick up the pinned
// 1.98.0 toolchain from rust-toolchain.toml — it resolves by cwd, not by
// --manifest-path.
execFileSync('cargo', ['build', '--release'], { cwd: crateDir, env, stdio: 'inherit' });

const binary = join(crateDir, 'target', 'release', 'vera-cu-windows.exe');
if (!existsSync(binary)) fail(`cargo build produced no ${binary}.`);
assertPe(binary);

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(binary, destination);
const binarySha256 = createHash('sha256').update(readFileSync(destination)).digest('hex');

const manifestPath = join(repoRoot, 'vera-desktop', 'bundled-tools.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.veraCuWindows = {
  repo: 'markhunter123/Vera',
  path: 'native/vera-cu-windows',
  commit: execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  expectedProtocolVersion: 'vera.cu/2',
  binaryName: 'vera-cu-windows.exe',
  binarySizeBytes: statSync(destination).size,
  binarySha256,
  buildProvenance: 'local-source-build',
  signature: 'none',
  distributionReady: false,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stderr.write(
  `computer-use prepare-windows: ${destination}\n` +
    `computer-use prepare-windows: sha256 ${binarySha256}\n` +
    `computer-use prepare-windows: development only — distributionReady stays false ` +
    'until Windows signing is solved for the bundle.\n',
);
