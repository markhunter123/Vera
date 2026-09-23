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

//! Synthetic input (§6.4/§6.3): `SendInput` for keys and the pointer.
//!
//! Every path here moves or uses the real keyboard/pointer state — that is
//! what `path: "cg_event_global"` declares on the wire — and every caller must
//! have been gated by the host's `allowCompatibilityInputDispatch` and the
//! physical-input guard before reaching this module.

use windows::Win32::UI::Input::KeyboardAndMouse::{
    KEYBD_EVENT_FLAGS, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, INPUT_MOUSE, KEYBDINPUT,
    KEYEVENTF_KEYUP, KEYEVENTF_UNICODE, MOUSEEVENTF_ABSOLUTE, MOUSEEVENTF_LEFTDOWN,
    MOUSEEVENTF_LEFTUP, MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP, MOUSEEVENTF_MOVE,
    MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_WHEEL, MOUSEINPUT, VIRTUAL_KEY,
};

/// §6.4 named keys → virtual-key codes. The host's alias table accepts only
/// these names, so a miss here is a host bug, not a parser question.
pub fn named_key_vk(key: &str) -> Option<VIRTUAL_KEY> {
    let vk = match key {
        "Return" => 0x0D,
        "Tab" => 0x09,
        "Space" => 0x20,
        "Escape" => 0x1B,
        "Backspace" => 0x08,
        "ForwardDelete" => 0x2E,
        "Up" => 0x26,
        "Down" => 0x28,
        "Left" => 0x25,
        "Right" => 0x27,
        "Home" => 0x24,
        "End" => 0x23,
        "PageUp" => 0x21,
        "PageDown" => 0x22,
        "F1" => 0x70,
        "F2" => 0x71,
        "F3" => 0x72,
        "F4" => 0x73,
        "F5" => 0x74,
        "F6" => 0x75,
        "F7" => 0x76,
        "F8" => 0x77,
        "F9" => 0x78,
        "F10" => 0x79,
        "F11" => 0x7A,
        "F12" => 0x7B,
        _ => return None,
    };
    Some(VIRTUAL_KEY(vk))
}

/// A single printable ASCII character's virtual key, for chord keys that are
/// not named (`cmd+a`). Letters and digits map by identity; the shifted
/// symbols are left to `type`, because a VK alone does not carry shift state.
pub fn printable_key_vk(key: &str) -> Option<VIRTUAL_KEY> {
    let mut chars = key.chars();
    let c = chars.next()?;
    if chars.next().is_some() {
        return None;
    }
    let vk = match c {
        'a'..='z' | 'A'..='Z' => c.to_ascii_uppercase() as u16,
        '0'..='9' => c as u16,
        '+' => 0xBB, // VK_OEM_PLUS
        '-' => 0xBD, // VK_OEM_MINUS
        _ => return None,
    };
    Some(VIRTUAL_KEY(vk))
}

pub fn modifier_vk(modifier: &str) -> Option<VIRTUAL_KEY> {
    // §6.4: `fn` is refused upstream by the host's own alias table? No — the
    // host PARSES `fn` and sends it. It is the one modifier SendInput cannot
    // express, so the dispatcher refuses it before touching the keyboard.
    let vk = match modifier {
        "command" => 0x5B,    // VK_LWIN: the Windows key is the platform's "command"
        "shift" => 0x10,      // VK_SHIFT
        "option" => 0x12,     // VK_MENU (Alt)
        "control" => 0x11,    // VK_CONTROL
        _ => return None,
    };
    Some(VIRTUAL_KEY(vk))
}

fn keyboard_input(vk: Option<VIRTUAL_KEY>, scan: u16, flags: KEYBD_EVENT_FLAGS) -> INPUT {
    INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: vk.unwrap_or_default(),
                wScan: scan,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    }
}

/// Press and release a chord: modifiers down, key down, key up, modifiers up
/// (reverse order, so `ctrl+shift+Tab` unwinds the way it wound).
pub fn send_chord(key: &str, modifiers: &[String]) -> Result<(), String> {
    let vk = named_key_vk(key)
        .or_else(|| printable_key_vk(key))
        .ok_or_else(|| format!("unsupported_action: '{key}' is not a key this platform can press"))?;
    let mut mods = Vec::new();
    for modifier in modifiers {
        let vk = modifier_vk(modifier)
            .ok_or_else(|| format!("unsupported_action: the '{modifier}' modifier does not exist on this platform"))?;
        mods.push(vk);
    }
    let mut events = Vec::new();
    for vk in &mods {
        events.push(keyboard_input(Some(*vk), 0, KEYBD_EVENT_FLAGS(0)));
    }
    events.push(keyboard_input(Some(vk), 0, KEYBD_EVENT_FLAGS(0)));
    events.push(keyboard_input(Some(vk), 0, KEYEVENTF_KEYUP));
    for vk in mods.iter().rev() {
        events.push(keyboard_input(Some(*vk), 0, KEYEVENTF_KEYUP));
    }
    dispatch_input(&events)
}

/// Type a literal text run as UTF-16 code units. `KEYEVENTF_UNICODE` sidesteps
/// scan codes entirely, which is what makes CJK text work at all.
pub fn send_text(text: &str) -> Result<(), String> {
    let mut events = Vec::new();
    for unit in text.encode_utf16() {
        events.push(keyboard_input(None, unit, KEYEVENTF_UNICODE));
        events.push(keyboard_input(None, unit, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP));
    }
    dispatch_input(&events)
}

/// Absolute pointer move: screen coordinates normalized onto the 0..65535
/// virtual-screen range, exactly what the host's image-px space converts into.
pub fn send_mouse_move(x: i32, y: i32) -> Result<(), String> {
    let (nx, ny) = normalize(x, y);
    let event = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dwFlags: MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE,
                dx: nx,
                dy: ny,
                mouseData: 0,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    dispatch_input(&[event])
}

pub fn send_mouse_button(button: &str, down: bool) -> Result<(), String> {
    let flags = match (button, down) {
        ("left", true) => MOUSEEVENTF_LEFTDOWN,
        ("left", false) => MOUSEEVENTF_LEFTUP,
        ("right", true) => MOUSEEVENTF_RIGHTDOWN,
        ("right", false) => MOUSEEVENTF_RIGHTUP,
        ("middle", true) => MOUSEEVENTF_MIDDLEDOWN,
        ("middle", false) => MOUSEEVENTF_MIDDLEUP,
        _ => return Err(format!("unsupported_action: no '{button}' mouse button")),
    };
    let event = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dwFlags: flags,
                dx: 0,
                dy: 0,
                mouseData: 0,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    dispatch_input(&[event])
}

/// Wheel scroll in "pages": one page is three wheel notches, the convention
/// most Windows apps interpret as a screenful. Negative pages scroll down.
pub fn send_wheel(pages: f64) -> Result<(), String> {
    use windows::Win32::UI::WindowsAndMessaging::WHEEL_DELTA;
    let delta = (pages * 3.0 * WHEEL_DELTA as f64).round() as i32;
    let event = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dwFlags: MOUSEEVENTF_WHEEL,
                dx: 0,
                dy: 0,
                mouseData: delta as u32,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    dispatch_input(&[event])
}

fn normalize(x: i32, y: i32) -> (i32, i32) {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN,
    };
    // SAFETY: plain user32 metric queries; no invariants to uphold.
    let (left, top, width, height) = unsafe {
        (
            GetSystemMetrics(SM_XVIRTUALSCREEN),
            GetSystemMetrics(SM_YVIRTUALSCREEN),
            GetSystemMetrics(SM_CXVIRTUALSCREEN).max(1),
            GetSystemMetrics(SM_CYVIRTUALSCREEN).max(1),
        )
    };
    (
        ((x - left) as f64 / width as f64 * 65535.0).round() as i32,
        ((y - top) as f64 / height as f64 * 65535.0).round() as i32,
    )
}

fn dispatch_input(events: &[INPUT]) -> Result<(), String> {
    let sent = unsafe { SendInput(events, std::mem::size_of::<INPUT>() as i32) };
    if sent as usize != events.len() {
        // The classic cause is UIPI: something elevated is on the receiving
        // end, or the foreground is an elevated window that swallowed the
        // injection. `dispatch_refused` names it to the model.
        return Err("dispatch_refused: SendInput delivered fewer events than sent".into());
    }
    Ok(())
}
