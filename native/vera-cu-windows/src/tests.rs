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

//! Pure-logic tests: the tables and parsers a JSON-RPC smoke run against a
//! real desktop cannot cover deterministically. Everything that touches UIA,
//! GDI or SendInput stays out — those are smoke-run territory.

use crate::book::{SnapshotRecord, SnapshotStore, TokenCounter};
use crate::capture::hex;
use crate::handshake;
use crate::input::{modifier_vk, named_key_vk, printable_key_vk};
use crate::rpc::{RPC_INVALID_PARAMS, RPC_PROTOCOL_VERSION_MISMATCH};
use crate::uia::{self, ElementFingerprint, MAX_TEXT_CHARS};
use serde_json::json;

// -- input: key tables (§6.4) ------------------------------------------------

#[test]
fn named_keys_cover_the_host_alias_set() {
    assert_eq!(named_key_vk("Return").unwrap().0, 0x0D);
    assert_eq!(named_key_vk("Space").unwrap().0, 0x20);
    assert_eq!(named_key_vk("ForwardDelete").unwrap().0, 0x2E);
    assert_eq!(named_key_vk("F12").unwrap().0, 0x7B);
    // A name outside the host's alias table must never mint a key here.
    assert!(named_key_vk("VolDn").is_none());
    assert!(named_key_vk("").is_none());
}

#[test]
fn printable_keys_map_single_characters_only() {
    assert_eq!(printable_key_vk("a").unwrap().0, 'A' as u16);
    assert_eq!(printable_key_vk("Z").unwrap().0, 'Z' as u16);
    assert_eq!(printable_key_vk("7").unwrap().0, '7' as u16);
    assert_eq!(printable_key_vk("+").unwrap().0, 0xBB);
    // Multi-character runs and shift-only symbols belong to `type`.
    assert!(printable_key_vk("ab").is_none());
    assert!(printable_key_vk("?").is_none());
    assert!(printable_key_vk("").is_none());
}

#[test]
fn modifiers_map_onto_windows_virtual_keys() {
    assert_eq!(modifier_vk("command").unwrap().0, 0x5B); // VK_LWIN
    assert_eq!(modifier_vk("control").unwrap().0, 0x11);
    assert_eq!(modifier_vk("option").unwrap().0, 0x12); // VK_MENU
    assert_eq!(modifier_vk("shift").unwrap().0, 0x10);
    // `fn` has no SendInput expression; the dispatcher refuses it.
    assert!(modifier_vk("fn").is_none());
}

// -- uia: role table and digests (§5/§4.3) -----------------------------------

#[test]
fn control_types_map_onto_ax_roles() {
    use windows::Win32::UI::Accessibility::{
        UIA_ButtonControlTypeId, UIA_DocumentControlTypeId, UIA_EditControlTypeId,
        UIA_MenuItemControlTypeId,
    };
    assert_eq!(uia::role_for_control_type(UIA_ButtonControlTypeId), "AXButton");
    assert_eq!(uia::role_for_control_type(UIA_EditControlTypeId), "AXTextField");
    // A document control reads as a multi-line text area.
    assert_eq!(uia::role_for_control_type(UIA_DocumentControlTypeId), "AXTextArea");
    assert_eq!(uia::role_for_control_type(UIA_MenuItemControlTypeId), "AXMenuItem");
    // Unknown control types degrade to AXGroup, never an empty role.
    assert_eq!(uia::role_for_control_type(windows::Win32::UI::Accessibility::UIA_CONTROLTYPE_ID(0)), "AXGroup");
}

fn fingerprint<'a>(role: &'a str, title: Option<&'a str>) -> ElementFingerprint<'a> {
    ElementFingerprint {
        role,
        title,
        ax_identifier: None,
        label: None,
        value: None,
        enabled: true,
        focused: false,
        frame: Some((10, 20, 30, 40)),
    }
}

#[test]
fn digest_is_stable_and_field_sensitive() {
    let base = uia::digest_fingerprint(&fingerprint("AXButton", Some("Save")));
    // Identical inputs hash identically — the verify pass re-reads and
    // compares against exactly this.
    assert_eq!(base, uia::digest_fingerprint(&fingerprint("AXButton", Some("Save"))));
    // Any model-facing change must move the digest, or expectElementDigest
    // would wave through a changed world.
    assert_ne!(base, uia::digest_fingerprint(&fingerprint("AXButton", Some("Save As"))));
    assert_ne!(base, uia::digest_fingerprint(&fingerprint("AXCheckBox", Some("Save"))));
    let mut disabled = fingerprint("AXButton", Some("Save"));
    disabled.enabled = false;
    assert_ne!(base, uia::digest_fingerprint(&disabled));
    let mut moved = fingerprint("AXButton", Some("Save"));
    moved.frame = Some((11, 20, 30, 40));
    assert_ne!(base, uia::digest_fingerprint(&moved));
    let mut unfocused = fingerprint("AXButton", Some("Save"));
    unfocused.focused = true;
    assert_ne!(base, uia::digest_fingerprint(&unfocused));
}

#[test]
fn cut_text_declares_what_it_cuts() {
    let mut truncated = Vec::new();
    let short = uia::cut_text("short".to_string(), "title", &mut truncated);
    assert_eq!(short, "short");
    assert!(truncated.is_empty());

    let long = "x".repeat(MAX_TEXT_CHARS + 1);
    let cut = uia::cut_text(long, "value", &mut truncated);
    assert_eq!(cut.chars().count(), MAX_TEXT_CHARS);
    assert_eq!(truncated, vec!["value".to_string()]);
}

// -- capture: hex encoding ----------------------------------------------------

#[test]
fn hex_encodes_bytewise() {
    assert_eq!(hex(&[]), "");
    assert_eq!(hex(&[0x00, 0xff, 0x10]), "00ff10");
}

// -- handshake: hello validation (§2) -----------------------------------------

#[test]
fn hello_accepts_a_matching_protocol_and_stores_the_policy() {
    let ok = handshake::handle_hello(&json!({
        "protocol": handshake::PROTOCOL_VERSION,
        "imageDir": "C:\\temp\\images",
        "allowGlobalPointer": true,
    }));
    let handshake::Handshake { image_dir, allow_global_pointer } = ok.unwrap();
    assert_eq!(image_dir, "C:\\temp\\images");
    assert!(allow_global_pointer);
}

#[test]
fn hello_rejects_skewed_or_missing_fields_as_rpc_errors() {
    let skewed = handshake::handle_hello(&json!({
        "protocol": "vera.cu/1",
        "imageDir": "x",
        "allowGlobalPointer": false,
    }));
    let (code, _) = skewed.unwrap_err();
    assert_eq!(code, RPC_PROTOCOL_VERSION_MISMATCH);

    for missing in [
        json!({ "imageDir": "x", "allowGlobalPointer": false }),
        json!({ "protocol": handshake::PROTOCOL_VERSION, "allowGlobalPointer": false }),
        json!({ "protocol": handshake::PROTOCOL_VERSION, "imageDir": "x" }),
    ] {
        let (code, _) = handshake::handle_hello(&missing).unwrap_err();
        assert_eq!(code, RPC_INVALID_PARAMS);
    }
}

#[test]
fn declared_capabilities_match_the_action_tables() {
    let capabilities = handshake::capabilities_value();
    assert_eq!(capabilities["elementActions"], json!(handshake::ELEMENT_ACTIONS));
    assert_eq!(capabilities["keyActions"], json!(handshake::KEY_ACTIONS));
    assert_eq!(capabilities["pointActions"], json!(handshake::POINT_ACTIONS));
    assert_eq!(capabilities["imageFormats"], json!(handshake::IMAGE_FORMATS));
    assert_eq!(capabilities["captureStream"], json!(false));

    let limits = handshake::limits();
    // The four the host sizes its own tables from must all be present and
    // positive (§2).
    for key in [
        "snapshotsPerSession",
        "snapshotTtlMs",
        "maxResponseBytes",
        "shutdownGraceMs",
    ] {
        assert!(limits[key].as_i64().unwrap_or(0) >= 1, "{key} missing or < 1");
    }
}

// -- book: snapshot eviction (§4.1) -------------------------------------------

fn record(id: &str, captured_at: u64) -> SnapshotRecord {
    SnapshotRecord {
        snapshot_id: id.to_string(),
        hwnd: 0,
        window_digest: "d".into(),
        elements: Default::default(),
        captured_at,
    }
}

#[test]
fn snapshot_store_keeps_everything_under_the_ceiling() {
    let mut store = SnapshotStore::default();
    for index in 0..32 {
        store.insert(record(&format!("s{index}"), index as u64));
    }
    assert!(store.get("s0").is_some());
    assert!(store.get("s31").is_some());
}

#[test]
fn snapshot_store_evicts_the_oldest_past_the_ceiling() {
    let mut store = SnapshotStore::default();
    for index in 0..33 {
        store.insert(record(&format!("s{index}"), index as u64));
    }
    assert!(store.get("s0").is_none(), "the oldest snapshot must go first");
    assert!(store.get("s1").is_some());
    assert!(store.get("s32").is_some());
}

#[test]
fn tokens_mint_in_order() {
    let mut tokens = TokenCounter::default();
    assert_eq!(tokens.mint(), "e1");
    assert_eq!(tokens.mint(), "e2");
}
