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

//! `host.hello` (§2): protocol negotiation and the declared capability set.

use crate::rpc::{RPC_INVALID_PARAMS, RPC_PROTOCOL_VERSION_MISMATCH};
use serde_json::{Value, json};

pub const PROTOCOL_VERSION: &str = "vera.cu/2";

/// What this executor can do, in wire names. The host checks a model's request
/// against this table BEFORE sending, so a name left out here never reaches the
/// dispatcher — the refusal comes from the host with model-facing guidance.
///
/// `select_text` is deliberately absent: UIA has no pattern that selects a text
/// range inside a general control, and a capability this executor cannot honour
/// must not be advertised.
pub const ELEMENT_ACTIONS: [&str; 7] = [
    "click",
    "set_value",
    "secondary_action",
    "minimize_window",
    "move_window",
    "resize_window",
    "scroll",
];

/// §6.4: `key` is a named key or printable character with modifiers; `type` is
/// a literal text run via KEYEVENTF_UNICODE.
pub const KEY_ACTIONS: [&str; 2] = ["key", "type"];

/// §6.3: every point action synthesizes through `SendInput`, which moves the
/// real cursor — that is why the host must pass `allowGlobalPointer: true` at
/// handshake (Windows has no pid-scoped pointer path).
pub const POINT_ACTIONS: [&str; 10] = [
    "move",
    "left_click",
    "right_click",
    "middle_click",
    "double_click",
    "triple_click",
    "mouse_down",
    "mouse_up",
    "drag",
    "scroll",
];

pub const IMAGE_FORMATS: [&str; 1] = ["png"];

/// §2's declared limits. The four the host consumes
/// (`snapshotsPerSession`, `snapshotTtlMs`, `maxResponseBytes`,
/// `shutdownGraceMs`) size host-side tables and budgets; the rest bound this
/// executor's own work. A function rather than a `const` because `json!` is
/// not const-evaluable.
pub fn limits() -> Value {
    json!({
    "snapshotsPerSession": 8,
    "snapshotTtlMs": 60_000,
    "maxElements": 800,
    "maxDepth": 24,
    "maxTextChars": 2_000,
    "maxResponseBytes": 16_777_216,
    "settleCeilingMs": 4_000,
    "shutdownGraceMs": 2_000,
    "imageDirBudgetBytes": 268_435_456,
    })
}

#[derive(Debug)]
pub struct Handshake {
    pub image_dir: String,
    /// The host decides this, not the executor. When false, no path that moves
    /// the system cursor may be dispatched — and since every point dispatch on
    /// Windows moves it, a `false` here means point dispatch refuses.
    pub allow_global_pointer: bool,
}

/// Parse and answer `host.hello`. Returns the envelope result value, or an
/// RPC error carrying the code the host maps to `service_mismatch`.
pub fn handle_hello(params: &Value) -> Result<Handshake, (i64, String)> {
    let protocol = params
        .get("protocol")
        .and_then(Value::as_str)
        .ok_or((RPC_INVALID_PARAMS, "host.hello params.protocol is missing".to_string()))?;
    if protocol != PROTOCOL_VERSION {
        // §2: a mismatched protocol is a structured rejection listing what this
        // executor speaks, so the host can render a version-skew message.
        return Err((
            RPC_PROTOCOL_VERSION_MISMATCH,
            format!("this executor speaks {PROTOCOL_VERSION}"),
        ));
    }
    let image_dir = params
        .get("imageDir")
        .and_then(Value::as_str)
        .ok_or((RPC_INVALID_PARAMS, "host.hello params.imageDir is missing".to_string()))?
        .to_string();
    let allow_global_pointer = params
        .get("allowGlobalPointer")
        .and_then(Value::as_bool)
        .ok_or((
            RPC_INVALID_PARAMS,
            "host.hello params.allowGlobalPointer is missing".to_string(),
        ))?;
    Ok(Handshake {
        image_dir,
        allow_global_pointer,
    })
}

pub fn capabilities_value() -> Value {
    json!({
        "captureStream": false,
        "elementActions": ELEMENT_ACTIONS,
        "keyActions": KEY_ACTIONS,
        "pointActions": POINT_ACTIONS,
        "imageFormats": IMAGE_FORMATS,
    })
}
