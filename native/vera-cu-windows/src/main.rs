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

//! The `host` entry point: COM/DPI process setup and the method table.
//!
//! One thread, one apartment, everything synchronous — the host reads one
//! response per line and will not pipeline, so the dispatch closure can hold
//! `&mut State` without any of the concurrency the macOS executor pays for.
//! ponytail: no `doctor`/`list-apps`/`snapshot` CLI subcommands (ledger #7).

mod apps;
mod book;
mod capture;
mod handshake;
mod input;
mod perms;
mod rpc;
mod uia;
mod wins;

#[cfg(test)]
mod tests;

use book::{SnapshotRecord, SnapshotStore};
use serde_json::{Value, json};
use std::collections::HashMap;
use windows::core::Interface;
use windows::Win32::Foundation::{HWND, POINT, RECT};
use windows::Win32::Graphics::Dwm::{
    DWMWA_EXTENDED_FRAME_BOUNDS, DwmGetWindowAttribute,
};
// ClientToScreen sits under Graphics::Gdi in windows 0.61, not WindowsAndMessaging.
use windows::Win32::Graphics::Gdi::ClientToScreen;
use windows::Win32::System::Com::{COINIT_APARTMENTTHREADED, CoInitializeEx};
use windows::Win32::UI::HiDpi::{
    DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2, SetProcessDpiAwarenessContext,
};
use windows::Win32::UI::WindowsAndMessaging::{
    GetSystemMetrics, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId,
    SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
};

/// The whole executor state. `live` holds the COM element references behind
/// each minted token — the dispatch reads through them, which is what makes the
/// post-action re-read (§6.5 tree_delta) a property fetch and not a re-walk.
struct State {
    automation: Option<windows::Win32::UI::Accessibility::IUIAutomation>,
    image_dir: String,
    allow_global_pointer: bool,
    snapshots: SnapshotStore,
    live: HashMap<String, HashMap<String, windows::Win32::UI::Accessibility::IUIAutomationElement>>,
    seq: u64,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

// -- request param readers (§1: params are typed at the boundary) ------------

fn p_str<'a>(params: &'a Value, key: &str) -> Option<&'a str> {
    params.get(key).and_then(Value::as_str)
}

fn p_f64(params: &Value, key: &str) -> Option<f64> {
    params.get(key).and_then(Value::as_f64)
}

/// A wire digest is `sha256:<64 hex>`; comparisons happen on the bare hex.
fn p_digest_hex(params: &Value, key: &str) -> Option<String> {
    let value = p_str(params, key)?;
    value.strip_prefix("sha256:").map(str::to_string)
}

/// Domain errors travel as `code: message` in this crate's own error strings.
fn split_domain(error: String) -> (String, String) {
    match error.split_once(": ") {
        Some((code, message)) => (code.to_string(), message.to_string()),
        None => ("internal".to_string(), error),
    }
}

/// A refusal arm with every declared field (§6.5). `effect` is never
/// `confirmed` and `verification` records that nothing was observed.
fn refused_arm(
    tool_call_id: &str,
    tier: &str,
    path: &str,
    code: &str,
    message: &str,
) -> Value {
    json!({
        "ok": false,
        "error": { "code": code, "message": message },
        "toolCallId": tool_call_id,
        "tier": tier,
        "path": path,
        "outcome": "refused",
        "effect": "unverifiable",
        "verification": { "method": "none", "observedChange": false },
    })
}

fn settle_arm(settle_ms: u128) -> Value {
    json!({
        "waitedMs": settle_ms as u64,
        "quiesced": true,
        "reason": "waited for the UI to settle after the action",
    })
}

fn hwnd_from_id(window_id: f64) -> HWND {
    HWND(window_id as i64 as isize as *mut _)
}

fn window_title(hwnd: HWND) -> String {
    unsafe {
        let mut buffer = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut buffer);
        String::from_utf16_lossy(&buffer[..len.min(511) as usize])
    }
}

fn window_pid(hwnd: HWND) -> u32 {
    unsafe {
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        pid
    }
}

/// The client-area origin in screen-physical coordinates. With the process
/// per-monitor DPI aware and `scale: 1`, these ARE image-px coordinates (§8).
fn client_origin(hwnd: HWND) -> (i32, i32) {
    unsafe {
        let mut point = POINT::default();
        let _ = ClientToScreen(hwnd, &mut point);
        (point.x, point.y)
    }
}

fn window_bounds(hwnd: HWND) -> (i32, i32, i32, i32) {
    unsafe {
        let mut rect = RECT::default();
        let size = std::mem::size_of::<RECT>() as u32;
        if DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut rect as *mut RECT as *mut _,
            size,
        )
        .is_err()
        {
            let _ = GetWindowRect(hwnd, &mut rect);
        }
        (rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top)
    }
}

fn virtual_screen() -> (i32, i32, i32, i32) {
    unsafe {
        (
            GetSystemMetrics(SM_XVIRTUALSCREEN),
            GetSystemMetrics(SM_YVIRTUALSCREEN),
            GetSystemMetrics(SM_CXVIRTUALSCREEN),
            GetSystemMetrics(SM_CYVIRTUALSCREEN),
        )
    }
}

fn element_wire(element: &uia::WalkedElement) -> Value {
    let (x, y, width, height) = element.frame_in_window.unwrap_or((0, 0, 0, 0));
    json!({
        "token": element.token,
        "stableId": element.stable_id,
        "parentToken": element.parent_token,
        "depth": element.depth,
        "role": element.role,
        "title": element.title,
        "axIdentifier": element.ax_identifier,
        "label": element.label,
        "value": element.value,
        "enabled": element.enabled,
        "focused": element.focused,
        "selected": element.selected,
        "frame": { "x": x, "y": y, "width": width, "height": height },
        "actions": element.actions,
        "digest": format!("sha256:{}", element.digest_hex),
        "truncated": element.truncated_fields,
    })
}

fn image_wire(frame: &capture::CapturedFrame) -> Value {
    json!({
        "path": frame.path,
        "format": "png",
        "widthPx": frame.width_px,
        "heightPx": frame.height_px,
        "byteLength": frame.byte_length,
        "sha256": format!("sha256:{}", frame.sha256_hex),
        "scale": 1,
    })
}

/// Resolve the observe target to an HWND. `pid:` is the one appId namespace
/// Windows has (§5.5); a window target is exact by construction.
fn resolve_hwnd(_state: &State, target: &Value) -> Result<HWND, Value> {
    let kind = target
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or_default();
    match kind {
        "window" => {
            let window_id = target
                .get("windowId")
                .and_then(Value::as_f64)
                .ok_or_else(|| json!({ "ok": false, "error": { "code": "window_gone", "message": "target.windowId is missing" } }))?;
            let hwnd = hwnd_from_id(window_id);
            unsafe {
                if !windows::Win32::UI::WindowsAndMessaging::IsWindow(Some(hwnd)).as_bool() {
                    return Err(json!({ "ok": false, "error": { "code": "window_gone", "message": "that window is closed; observe again to get a fresh window id" } }));
                }
            }
            let pid = target
                .get("pid")
                .and_then(Value::as_f64)
                .map(|pid| pid as u32);
            if let Some(pid) = pid {
                if window_pid(hwnd) != pid {
                    return Err(json!({ "ok": false, "error": { "code": "window_gone", "message": "that window id now belongs to another process" } }));
                }
            }
            Ok(hwnd)
        }
        "app" => {
            let app = target
                .get("app")
                .and_then(Value::as_str)
                .and_then(|app| app.strip_prefix("pid:"))
                .and_then(|pid| pid.parse::<u32>().ok())
                .ok_or_else(|| json!({ "ok": false, "error": { "code": "app_not_found", "message": "Windows names apps by pid — pass the appId from apps.list (pid:<n>)" } }))?;
            wins::list_windows()
                .into_iter()
                .find(|window| window.pid == app)
                .map(|window| HWND(window.hwnd as isize as *mut _))
                .ok_or_else(|| json!({ "ok": false, "error": { "code": "window_gone", "message": "that app has no observable window right now" } }))
        }
        other => Err(json!({ "ok": false, "error": { "code": "app_not_found", "message": format!("unknown target kind '{other}'") } })),
    }
}

#[allow(clippy::too_many_lines)]
fn observe(state: &mut State, params: &Value) -> Result<Value, Value> {
    let hwnd = resolve_hwnd(state, params.get("target").unwrap_or(&Value::Null))?;
    let pid = window_pid(hwnd);
    let automation = state
        .automation
        .clone()
        .ok_or_else(|| json!({ "ok": false, "error": { "code": "capture_failed", "message": "UIA is not initialised" } }))?;
    unsafe {
        let root = automation
            .ElementFromHandle(hwnd)
            .map_err(|error| json!({ "ok": false, "error": { "code": "window_gone", "message": format!("that window exposes no accessibility tree: {error}") } }))?;
        // The walk's window-local origin is the client-area origin, so a
        // frame and the same pixel in the screenshot name the same point.
        let origin = client_origin(hwnd);
        let walked = uia::walk(&automation, &root, origin)
            .map_err(|error| json!({ "ok": false, "error": { "code": "capture_failed", "message": error } }))?;

        state.seq += 1;
        let snapshot_id = format!("s{}", state.seq);
        let bounds = window_bounds(hwnd);
        let title = window_title(hwnd);
        let window_digest = uia::digest_window(&walked.elements, bounds, &title);

        // The layer/zIndex story comes from the same enumeration window.list
        // answers from, so both views of one window cannot disagree.
        let listed = wins::list_windows()
            .into_iter()
            .find(|window| window.hwnd == hwnd.0 as isize);
        let (layer, z_index) = listed
            .as_ref()
            .map(|window| (window.layer, window.z_index))
            .unwrap_or((0, 0));

        let image = if params.get("includeImage").and_then(Value::as_bool) == Some(true) {
            capture::capture_window(hwnd.0 as isize, &state.image_dir)
                .map(|frame| image_wire(&frame))
                .map_err(|error| {
                    let (code, message) = split_domain(error);
                    json!({ "ok": false, "error": { "code": code, "message": message } })
                })?
        } else {
            Value::Null
        };

        let (sx, sy, sw, sh) = virtual_screen();
        let mut live = HashMap::new();
        let mut records = HashMap::new();
        let mut wire_elements = Vec::with_capacity(walked.elements.len());
        for element in &walked.elements {
            live.insert(element.token.clone(), element.raw.clone());
            records.insert(element.token.clone(), element.digest_hex.clone());
            wire_elements.push(element_wire(element));
        }
        state.live.insert(snapshot_id.clone(), live);
        state.snapshots.insert(SnapshotRecord {
            snapshot_id: snapshot_id.clone(),
            hwnd: hwnd.0 as isize,
            window_digest: window_digest.clone(),
            elements: records,
            captured_at: now_ms(),
        });

        Ok(json!({
            "ok": true,
            "snapshot": {
                "snapshotId": snapshot_id,
                "capturedAt": now_ms(),
                "target": {
                    "pid": pid,
                    "windowId": hwnd.0 as isize,
                    "appId": format!("pid:{pid}"),
                    "appName": apps::process_name(pid),
                    "title": title,
                    "bounds": { "x": bounds.0, "y": bounds.1, "width": bounds.2, "height": bounds.3 },
                    "layer": layer,
                    "zIndex": z_index,
                },
                "windowDigest": format!("sha256:{window_digest}"),
                "focusedElementToken": walked.focused_token,
                "selectedText": null,
                "image": image,
                "displays": [{
                    "displayId": "display-0",
                    "logicalBounds": { "x": sx, "y": sy, "width": sw, "height": sh },
                    "sourceBoundsPx": { "x": sx, "y": sy, "width": sw, "height": sh },
                    "scaleFactor": 1,
                }],
                "obscuringRects": [],
                "elements": wire_elements,
                "truncated": {
                    "elements": walked.truncated_elements,
                    "depth": walked.truncated_depth,
                },
            },
        }))
    }
}

/// Verify the element binding a dispatch quotes (§6.1): the snapshot exists,
/// the token was minted in it, and the echoed digest is the one recorded.
fn bound_element<'a>(
    state: &'a mut State,
    snapshot_id: &str,
    token: &str,
    expect_digest: Option<&str>,
) -> Result<(&'a SnapshotRecord, windows::Win32::UI::Accessibility::IUIAutomationElement), Value> {
    let record = state
        .snapshots
        .get(snapshot_id)
        .ok_or_else(|| refused_arm("", "ax", "none", "snapshot_unknown", "that snapshotId was never minted here or has been evicted; observe again"))?;
    let digest = record
        .elements
        .get(token)
        .ok_or_else(|| refused_arm("", "ax", "none", "element_unknown", "that token is not in that snapshot; observe again"))?;
    if let Some(expected) = expect_digest {
        if expected != digest {
            return Err(refused_arm(
                "",
                "ax",
                "none",
                "element_digest_mismatch",
                "the element's digest no longer matches the observation it was quoted from; observe again",
            ));
        }
    }
    let raw = state
        .live
        .get(snapshot_id)
        .and_then(|elements| elements.get(token))
        .cloned()
        .ok_or_else(|| refused_arm("", "ax", "none", "snapshot_evicted", "that snapshot's live element table is gone; observe again"))?;
    Ok((record, raw))
}

fn dispatch_element(state: &mut State, params: &Value, _cancelled: &rpc::CancelFlag) -> Value {
    let tool_call_id = p_str(params, "toolCallId").unwrap_or_default().to_string();
    let snapshot_id = p_str(params, "snapshotId").unwrap_or_default();
    let token = p_str(params, "elementToken").unwrap_or_default();
    let expect = p_digest_hex(params, "expectElementDigest");
    let (record, element) = match bound_element(state, snapshot_id, token, expect.as_deref()) {
        Ok(found) => found,
        Err(mut refusal) => {
            refusal["toolCallId"] = json!(tool_call_id);
            return refusal;
        }
    };
    let hwnd = record.hwnd;
    let before = record
        .elements
        .get(token)
        .map(|digest| digest.clone())
        .unwrap_or_default();
    let started = std::time::Instant::now();
    let action = params.get("action").cloned().unwrap_or(Value::Null);
    let kind = action
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    // §6.3 path names the mechanism: the Value/RangeValue writes are attribute
    // writes, selection is its own path, everything else is an AX action.
    let path = match kind.as_str() {
        "set_value" => "ax_attribute",
        "secondary_action" => match action.get("action").and_then(Value::as_str) {
            Some("pick") => "ax_select",
            Some("increment") | Some("decrement") => "ax_attribute",
            _ => "ax_action",
        },
        _ => "ax_action",
    };
    if let Err(error) = uia::dispatch_element_action(&element, hwnd, &action) {
        let (code, message) = split_domain(error);
        return refused_arm(&tool_call_id, "ax", path, &code, &message);
    }
    // `settle: "quiesce"` — a fixed beat lets DWM repaint and the target queue
    // its accessibility updates before anything verifies.
    std::thread::sleep(std::time::Duration::from_millis(150));

    // §6.5: read the action's own success back where the element offers it,
    // otherwise a fingerprint delta is the only honest verification.
    let mut method = "tree_delta";
    let automation = state.automation.clone();
    let origin = client_origin(HWND(hwnd as isize as *mut _));
    let mut observed_change = match &automation {
        Some(automation) => uia::verify_tree_delta(automation, &element, origin, &before),
        None => false,
    };
    if kind == "set_value" {
        // A value write verifies by read-back, not by tree delta.
        unsafe {
            let read_back: Option<String> = element
                .GetCurrentPattern(windows::Win32::UI::Accessibility::UIA_ValuePatternId)
                .ok()
                .and_then(|unknown| unknown.cast::<windows::Win32::UI::Accessibility::IUIAutomationValuePattern>().ok())
                .and_then(|pattern| pattern.CurrentValue().ok().map(|value| value.to_string()));
            if let Some(written) = read_back {
                method = "value_readback";
                observed_change = true;
                let requested = action.get("value").and_then(Value::as_str).unwrap_or("");
                if written != requested {
                    return refused_arm(
                        &tool_call_id,
                        "ax",
                        path,
                        "element_changed",
                        "the field reads back a different value than the one written",
                    );
                }
            }
        }
    }
    let effect = if observed_change { "confirmed" } else { "unverifiable" };
    json!({
        "ok": true,
        "toolCallId": tool_call_id,
        "tier": "ax",
        "path": path,
        "outcome": "ok",
        "effect": effect,
        "verification": { "method": method, "observedChange": observed_change },
        "settle": settle_arm(started.elapsed().as_millis()),
    })
}

fn dispatch_key(state: &mut State, params: &Value, cancelled: &rpc::CancelFlag) -> Value {
    let tool_call_id = p_str(params, "toolCallId").unwrap_or_default().to_string();
    let snapshot_id = p_str(params, "snapshotId").unwrap_or_default();
    let token = p_str(params, "focusToken").unwrap_or_default();
    let expect = p_digest_hex(params, "expectElementDigest");
    let (record, element) = match bound_element(state, snapshot_id, token, expect.as_deref()) {
        Ok(found) => found,
        Err(mut refusal) => {
            refusal["toolCallId"] = json!(tool_call_id);
            return refusal;
        }
    };
    let _ = record;
    let started = std::time::Instant::now();

    // Focus policy (§6.4): absent means `require` — the element must already
    // hold focus; `acquire` moves focus through UIA's SetFocus.
    match p_str(params, "focusPolicy") {
        Some("acquire") => {
            if unsafe { element.SetFocus().is_err() } {
                return refused_arm(&tool_call_id, "coordinate-background", "cg_event_global", "focus_changed", "the element could not be focused");
            }
        }
        _ => {
            let focused = state
                .automation
                .as_ref()
                .and_then(|automation| unsafe { automation.GetFocusedElement().ok() });
            let same = match (&state.automation, focused) {
                (Some(automation), Some(focused)) => unsafe {
                    automation
                        .CompareElements(&element, &focused)
                        .map(|v| v.as_bool())
                        .unwrap_or(false)
                },
                _ => false,
            };
            if !same {
                return refused_arm(&tool_call_id, "coordinate-background", "cg_event_global", "focus_changed", "the quoted element does not hold focus; observe again and use the focused element");
            }
        }
    }

    let action = params.get("action").cloned().unwrap_or(Value::Null);
    let outcome = match action.get("kind").and_then(Value::as_str) {
        Some("key") => {
            let key = action.get("key").and_then(Value::as_str).unwrap_or_default();
            let modifiers: Vec<String> = action
                .get("modifiers")
                .and_then(Value::as_array)
                .map(|modifiers| {
                    modifiers
                        .iter()
                        .filter_map(Value::as_str)
                        .map(str::to_string)
                        .collect()
                })
                .unwrap_or_default();
            input::send_chord(key, &modifiers)
        }
        Some("type") => {
            let text = action.get("text").and_then(Value::as_str).unwrap_or_default();
            input::send_text(text)
        }
        other => Err(format!("unsupported_action: unknown key action '{other:?}'")),
    };
    if let Err(error) = outcome {
        let (code, message) = split_domain(error);
        return refused_arm(&tool_call_id, "coordinate-background", "cg_event_global", &code, &message);
    }
    if cancelled.is_cancelled() {
        return refused_arm(&tool_call_id, "coordinate-background", "cg_event_global", "aborted", "cancelled by the host");
    }
    json!({
        "ok": true,
        "toolCallId": tool_call_id,
        "tier": "coordinate-background",
        "path": "cg_event_global",
        "outcome": "ok",
        // SendInput saying "delivered" is not the target saying "obeyed"; no
        // read-back exists for a keystroke, so unverifiable is the honest arm.
        "effect": "unverifiable",
        "verification": { "method": "none", "observedChange": false },
        "settle": settle_arm(started.elapsed().as_millis()),
    })
}

fn dispatch_point(state: &mut State, params: &Value, cancelled: &rpc::CancelFlag) -> Value {
    let tool_call_id = p_str(params, "toolCallId").unwrap_or_default().to_string();
    if !state.allow_global_pointer {
        // The host withheld the one permission this path needs: every point
        // action here moves the real cursor, so there is no way to honour it.
        return refused_arm(
            &tool_call_id,
            "coordinate-background",
            "none",
            "dispatch_refused",
            "this session did not allow input that moves the system pointer",
        );
    }
    let snapshot_id = p_str(params, "snapshotId").unwrap_or_default();
    let record = match state.snapshots.get(snapshot_id) {
        Some(record) => record,
        None => {
            return refused_arm(&tool_call_id, "coordinate-background", "none", "snapshot_unknown", "that snapshotId was never minted here or has been evicted; observe again");
        }
    };
    let expected = p_digest_hex(params, "expectWindowDigest");
    if let Some(expected) = expected {
        if expected != record.window_digest {
            return refused_arm(&tool_call_id, "coordinate-background", "none", "window_changed", "the window has changed since the observation; observe again");
        }
    }
    if p_str(params, "space") != Some("image_px") {
        return refused_arm(&tool_call_id, "coordinate-background", "none", "invalid_point", "only space 'image_px' is supported");
    }
    let Some(point) = params.get("point") else {
        return refused_arm(&tool_call_id, "coordinate-background", "none", "invalid_point", "dispatch.point needs a point");
    };
    let x = point.get("x").and_then(Value::as_f64).unwrap_or(0.0) as i32;
    let y = point.get("y").and_then(Value::as_f64).unwrap_or(0.0) as i32;
    let started = std::time::Instant::now();

    // image_px → screen-physical: origin is the client area, scale is 1 (§8).
    let hwnd = HWND(record.hwnd as isize as *mut _);
    let (origin_x, origin_y) = client_origin(hwnd);
    let (sx, sy, sw, sh) = virtual_screen();
    let (ax, ay) = (origin_x + x, origin_y + y);
    if ax < sx || ay < sy || ax >= sx + sw || ay >= sy + sh {
        return refused_arm(&tool_call_id, "coordinate-background", "none", "invalid_point", "the point lands outside the virtual screen");
    }

    let action = params.get("action").cloned().unwrap_or(Value::Null);
    let outcome = point_action(&action, (origin_x, origin_y), ax, ay, params.get("startPoint"), cancelled);
    if let Err(error) = outcome {
        let (code, message) = split_domain(error);
        return refused_arm(&tool_call_id, "coordinate-background", "cg_event_global", &code, &message);
    }
    json!({
        "ok": true,
        "toolCallId": tool_call_id,
        "tier": "coordinate-background",
        "path": "cg_event_global",
        "outcome": "ok",
        "effect": "unverifiable",
        "verification": { "method": "none", "observedChange": false },
        "settle": settle_arm(started.elapsed().as_millis()),
    })
}

#[allow(clippy::too_many_lines)]
fn point_action(
    action: &Value,
    client_origin: (i32, i32),
    ax: i32,
    ay: i32,
    start_point: Option<&Value>,
    _cancelled: &rpc::CancelFlag,
) -> Result<(), String> {
    let kind = action
        .get("kind")
        .and_then(Value::as_str)
        .ok_or_else(|| "invalid_params: dispatch.point action.kind is missing".to_string())?;
    match kind {
        "move" => input::send_mouse_move(ax, ay),
        "left_click" => {
            let count = action.get("count").and_then(Value::as_f64).unwrap_or(1.0);
            for _ in 0..count.max(1.0) as u32 {
                input::send_mouse_button("left", true)?;
                input::send_mouse_button("left", false)?;
            }
            Ok(())
        }
        "right_click" | "middle_click" => {
            let button = kind.trim_end_matches("_click");
            input::send_mouse_button(button, true)?;
            input::send_mouse_button(button, false)
        }
        // A double/triple click is N clicks in quick succession; the OS's own
        // timing does the grouping, so one SendInput pair per click is exact.
        "double_click" | "triple_click" => {
            let clicks = if kind == "double_click" { 2 } else { 3 };
            for _ in 0..clicks {
                input::send_mouse_button("left", true)?;
                input::send_mouse_button("left", false)?;
            }
            Ok(())
        }
        "mouse_down" => input::send_mouse_button("left", true),
        "mouse_up" => input::send_mouse_button("left", false),
        // §6.3: `startPoint` is in the same image-px space; the drag is move
        // to start, button down, move to the end, button up.
        "drag" => {
            let start = start_point
                .and_then(|start| {
                    let x = start.get("x").and_then(Value::as_f64)?;
                    let y = start.get("y").and_then(Value::as_f64)?;
                    Some((x as i32, y as i32))
                })
                .ok_or_else(|| "invalid_params: drag needs a startPoint in image_px".to_string())?;
            let (sx, sy) = (client_origin.0 + start.0, client_origin.1 + start.1);
            input::send_mouse_move(sx, sy)?;
            input::send_mouse_button("left", true)?;
            input::send_mouse_move(ax, ay)?;
            input::send_mouse_button("left", false)
        }
        "scroll" => {
            let direction = action.get("direction").and_then(Value::as_str).unwrap_or("down");
            let pages = action.get("pages").and_then(Value::as_f64).unwrap_or(3.0);
            let signed = if direction == "up" { pages } else { -pages };
            input::send_wheel(signed)
        }
        other => Err(format!(
            "unsupported_action: '{other}' is not a point action this executor declares"
        )),
    }
}

fn main() {
    // argv: `[host]` — the host spawns `vera-cu-windows host` and nothing else
    // is implemented (ledger #7).
    let mut args = std::env::args().skip(1);
    if args.next().as_deref() != Some("host") {
        eprintln!("usage: vera-cu-windows host");
        std::process::exit(2);
    }
    unsafe {
        // Before any GDI/window call: physical pixels are the unit of every
        // rectangle and image this process reports (§8, ledger #6).
        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
        // S_FALSE (already initialised) is fine; everything runs on this thread.
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    }
    let automation = match uia::automation() {
        Ok(automation) => Some(automation),
        // A machine without UIA has bigger problems; the handshake will still
        // answer and every observe will refuse honestly.
        Err(_) => None,
    };
    let mut state = State {
        automation,
        image_dir: String::new(),
        allow_global_pointer: false,
        snapshots: SnapshotStore::default(),
        live: HashMap::new(),
        seq: 0,
    };
    rpc::serve(|incoming| {
        let params = incoming.params.clone();
        match incoming.method {
            "host.hello" => {
                let handshake = handshake::handle_hello(&params)?;
                state.image_dir = handshake.image_dir;
                state.allow_global_pointer = handshake.allow_global_pointer;
                Ok(json!({
                    "ok": true,
                    "protocol": handshake::PROTOCOL_VERSION,
                    "executor": { "name": "vera-cu-windows", "version": env!("CARGO_PKG_VERSION") },
                    "pid": std::process::id(),
                    "capabilities": handshake::capabilities_value(),
                    "limits": handshake::limits(),
                }))
            }
            "session.begin" | "session.end" => Ok(json!({ "ok": true })),
            // observe() signals domain refusals through the Err arm as
            // ready-made ok:false envelopes — they are 200 responses, never
            // RPC-layer errors.
            "observe" => Ok(observe(&mut state, &params).unwrap_or_else(|envelope| envelope)),
            "window.list" => Ok(json!({
                "ok": true,
                "windows": wins::list_windows().into_iter().map(|window| json!({
                    "pid": window.pid,
                    "windowId": window.hwnd,
                    "appId": format!("pid:{}", window.pid),
                    "layer": window.layer,
                    "zIndex": window.z_index,
                    "onScreen": window.on_screen,
                })).collect::<Vec<_>>(),
            })),
            "screen.capture" => {
                let frame = match capture::capture_screen(&state.image_dir) {
                    Ok(frame) => frame,
                    Err(error) => {
                        let (code, message) = split_domain(error);
                        return Ok(
                            json!({ "ok": false, "error": { "code": code, "message": message } })
                        );
                    }
                };
                Ok(json!({ "ok": true, "image": image_wire(&frame) }))
            }
            "permissions.check" => Ok(perms::check(&params)),
            "apps.list" => Ok(json!({
                "ok": true,
                "apps": apps::list_apps().into_iter().map(|app| json!({
                    "appId": format!("pid:{}", app.pid),
                    "pid": app.pid,
                    "name": app.name,
                    "windowCount": app.window_count,
                })).collect::<Vec<_>>(),
            })),
            "apps.launch" => {
                let app = p_str(&params, "app").unwrap_or_default().to_string();
                let wait = p_f64(&params, "waitForWindowMs").unwrap_or(5_000.0) as u64;
                match apps::launch(&app, wait) {
                    Ok(launched) => Ok(json!({
                        "ok": true,
                        "pid": launched.pid,
                        "appId": format!("pid:{}", launched.pid),
                        "name": launched.name,
                        "foregroundTaken": launched.foreground_taken,
                        "windows": launched.windows.iter().map(|(hwnd, title)| json!({
                            "windowId": hwnd,
                            "title": title,
                        })).collect::<Vec<_>>(),
                        "waited": { "ms": launched.waited_ms, "reason": launched.wait_reason },
                    })),
                    Err(error) => {
                        let (code, message) = split_domain(error);
                        Ok(json!({ "ok": false, "error": { "code": code, "message": message } }))
                    }
                }
            }
            "dispatch.element" => Ok(dispatch_element(&mut state, &params, incoming.cancelled)),
            "dispatch.key" => Ok(dispatch_key(&mut state, &params, incoming.cancelled)),
            "dispatch.point" => Ok(dispatch_point(&mut state, &params, incoming.cancelled)),
            other => Err((rpc::RPC_UNKNOWN_METHOD, format!("unknown method '{other}'"))),
        }
    });
}
