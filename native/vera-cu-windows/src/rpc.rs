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

//! Line-delimited JSON-RPC 2.0 over stdio (§1).
//!
//! The host reads one response object per line and refuses anything outside the
//! closed sets, so every response this side writes must carry exactly the
//! declared fields. Errors on this layer describe the request, never the world:
//! facts about the world travel inside a `result` envelope with `ok: false`.

use serde_json::{Value, json};
use std::io::{BufRead, Write};

/// JSON-RPC error codes (§1.1). Mirrors `VERA_CU_RPC_ERROR` on the host side.
/// The full table stays declared even where this executor never emits a given
/// code, so a reviewer can diff the two tables at a glance.
#[allow(dead_code)]
pub const RPC_PARSE: i64 = -32700;
#[allow(dead_code)]
pub const RPC_INVALID_REQUEST: i64 = -32600;
pub const RPC_UNKNOWN_METHOD: i64 = -32601;
pub const RPC_INVALID_PARAMS: i64 = -32602;
#[allow(dead_code)]
pub const RPC_INTERNAL: i64 = -32603;
pub const RPC_PROTOCOL_VERSION_MISMATCH: i64 = -32000;
pub const RPC_HANDSHAKE_REQUIRED: i64 = -32001;
#[allow(dead_code)]
pub const RPC_SESSION_UNKNOWN: i64 = -32002;
#[allow(dead_code)]
pub const RPC_SHUTTING_DOWN: i64 = -32003;

/// A request the dispatcher can see, with its cancellation slot.
pub struct Incoming<'a> {
    pub method: &'a str,
    pub params: &'a Value,
    /// `None` for notifications (`$/cancel`). Framing writes the response id
    /// from the raw request, so the dispatcher itself never needs to read it.
    #[allow(dead_code)]
    pub id: Option<i64>,
    pub cancelled: &'a CancelFlag,
}

/// Shared cancellation slot for the request currently being served. The host
/// sends `$/cancel` while a dispatch is in flight (§7.2) and expects the
/// in-flight request to answer with `aborted`.
#[derive(Default)]
pub struct CancelFlag(std::sync::atomic::AtomicBool);

impl CancelFlag {
    pub fn is_cancelled(&self) -> bool {
        self.0.load(std::sync::atomic::Ordering::Relaxed)
    }
    fn set(&self) {
        self.0.store(true, std::sync::atomic::Ordering::Relaxed);
    }
    fn reset(&self) {
        self.0.store(false, std::sync::atomic::Ordering::Relaxed);
    }
}

pub type MethodResult = Result<Value, (i64, String)>;

/// Serve line-delimited requests until stdin closes. Handshake state and the
/// method table belong to the caller through the `dispatch` closure; this loop
/// owns framing, `$/cancel` routing and error envelopes only.
pub fn serve(mut dispatch: impl FnMut(&mut Incoming) -> MethodResult) {
    let stdin = std::io::stdin();
    let mut stdout = std::io::stdout();
    let current = CancelFlag::default();
    let mut handshake_done = false;
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let parsed = match serde_json::from_str::<Value>(&line) {
            Ok(value) => value,
            Err(error) => {
                // §1.1: a parse error still gets a response when an id is
                // recoverable; without one there is nothing to answer.
                write_error(&mut stdout, None, RPC_PARSE, error.to_string());
                continue;
            }
        };
        let id = parsed.get("id").and_then(Value::as_i64);
        let Some(method) = parsed.get("method").and_then(Value::as_str) else {
            write_error(&mut stdout, id, RPC_INVALID_REQUEST, "request has no method".into());
            continue;
        };
        if method == "$/cancel" {
            // §7.2: `params.id` names the request to abort. Only the in-flight
            // request can be cancelled — there is exactly one slot — and stale
            // ids land in the same flag and harm nothing, because the next
            // request resets it before it runs.
            if parsed.pointer("/params/id").and_then(Value::as_i64).is_some() {
                current.set();
            }
            continue;
        }
        if !handshake_done && method != "host.hello" {
            write_error(
                &mut stdout,
                id,
                RPC_HANDSHAKE_REQUIRED,
                "host.hello must come first".into(),
            );
            continue;
        }
        current.reset();
        let params = parsed.get("params").cloned().unwrap_or(Value::Null);
        let mut incoming = Incoming {
            method,
            params: &params,
            id,
            cancelled: &current,
        };
        if method == "host.hello" {
            handshake_done = true;
        }
        match dispatch(&mut incoming) {
            Ok(result) => write_response(&mut stdout, id, &json!({ "result": result })),
            Err((code, message)) => {
                write_error(&mut stdout, id, code, message);
            }
        }
    }
}

fn write_response(stdout: &mut std::io::Stdout, id: Option<i64>, body: &Value) {
    let mut envelope = json!({ "jsonrpc": "2.0", "id": id });
    if let Some(result) = body.get("result") {
        envelope["result"] = result.clone();
    }
    write_line(stdout, &envelope);
}

fn write_error(stdout: &mut std::io::Stdout, id: Option<i64>, code: i64, message: String) {
    let envelope = json!({
        "jsonrpc": "2.0",
        "id": id,
        "error": { "code": code, "message": message },
    });
    write_line(stdout, &envelope);
}

fn write_line(mut stdout: impl Write, value: &Value) {
    // One response object per line; a trailing newline is the frame delimiter.
    let _ = writeln!(stdout, "{value}");
    let _ = stdout.flush();
}
