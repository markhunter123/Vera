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

//! Snapshot bookkeeping (§4.1): the executor's mirror of what it has minted.
//!
//! A dispatch quotes a `snapshotId` plus a token/digest pair; this table is
//! what lets the executor answer `snapshot_unknown`, `element_unknown` and
//! `element_digest_mismatch` as three different diagnoses instead of one shrug.

use std::collections::HashMap;

/// Upper bound on retained snapshots across sessions. The host bounds its own
/// mirror per session (`snapshotsPerSession: 8`); a global ceiling here is the
/// backstop for a host that never calls `session.end`.
const MAX_SNAPSHOTS: usize = 32;

pub struct SnapshotRecord {
    pub snapshot_id: String,
    pub hwnd: isize,
    /// Hex window digest the dispatch must echo to pass `expectWindowDigest`.
    pub window_digest: String,
    /// token → bare hex digest of the element it minted. The wire value
    /// carries the `sha256:` prefix (§1.3); the prefix is stripped before a
    /// quoted digest lands here, so this table and every comparison run on
    /// bare hex.
    pub elements: HashMap<String, String>,
    pub captured_at: u64,
}

/// (hwnd, runtimeId) → stable id. ponytail: retired — the walk mints
/// `stableId` from the element's own identity tuple, and UIA's `RuntimeId`
/// SAFEARRAY has no shape worth parsing for a field the host only checks for
/// uniqueness and stability within a revision.
#[derive(Default)]
pub struct SnapshotStore(HashMap<String, SnapshotRecord>);

impl SnapshotStore {
    pub fn insert(&mut self, record: SnapshotRecord) {
        if self.0.len() >= MAX_SNAPSHOTS {
            // Evict the oldest: a host quoting an evicted id gets
            // `snapshot_evicted`, which maps to `stale_frame` — the same
            // re-observe answer any expiry produces.
            let oldest = self
                .0
                .values()
                .min_by_key(|record| record.captured_at)
                .map(|record| record.snapshot_id.clone());
            if let Some(oldest) = oldest {
                self.0.remove(&oldest);
            }
        }
        self.0.insert(record.snapshot_id.clone(), record);
    }

    pub fn get(&self, snapshot_id: &str) -> Option<&SnapshotRecord> {
        self.0.get(snapshot_id)
    }
}

/// Monotonic token counter. Tokens are snapshot-scoped on the wire (a dispatch
/// names snapshot AND token), so a single counter is unambiguous.
#[derive(Default)]
pub struct TokenCounter(u64);

impl TokenCounter {
    pub fn mint(&mut self) -> String {
        self.0 += 1;
        format!("e{}", self.0)
    }
}
