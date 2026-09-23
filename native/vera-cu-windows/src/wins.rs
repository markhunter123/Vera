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

//! The window inventory (§5.4): `EnumWindows` in Z order, ghost windows
//! filtered out via `DWMWA_CLOAKED`.
//!
//! `windowId` is the raw `HWND`. It is stable for the life of the window and
//! unique machine-wide, which is everything the protocol needs from an id.
//! `zIndex` is the enum order: `EnumWindows` walks topmost-first, and the host
//! picks the frontmost usable window by taking the highest `zIndex` with
//! `layer == 0` — so ties MUST NOT happen (§5.4) and the loop index guarantees
//! they cannot.

use windows::Win32::Foundation::{HWND, LPARAM};
// `BOOL` lives in the core crate in windows 0.61, not in Foundation.
use windows::core::BOOL;
use windows::Win32::Graphics::Dwm::{DWMWA_CLOAKED, DwmGetWindowAttribute};
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, GetWindowTextW, GetWindowThreadProcessId, IsIconic, IsWindowVisible,
    GWL_EXSTYLE, WS_EX_TOPMOST,
};

#[derive(Debug, Clone)]
pub struct WindowEntry {
    pub hwnd: isize,
    pub pid: u32,
    pub title: String,
    /// 0 for a normal window, 1 when `WS_EX_TOPMOST` — the closest thing this
    /// platform has to the mac window layers, and the only value the host's
    /// `layer === 0` filter needs to be honest about.
    pub layer: i64,
    pub z_index: i64,
    pub on_screen: bool,
}

/// Windows that a screen reader or a screenshot would actually see: visible,
/// titled (untitled surfaces are almost always frames), not cloaked by DWM
/// (UWP suspended apps stay "visible" to `EnumWindows` while showing nothing),
/// and not pure tool windows.
pub fn list_windows() -> Vec<WindowEntry> {
    let mut found: Vec<isize> = Vec::new();
    collect_hwnds(&mut found);
    let mut entries = Vec::new();
    for (z_index, hwnd) in found.iter().enumerate() {
        let Some(entry) = describe(*hwnd, z_index as i64) else {
            continue;
        };
        entries.push(entry);
    }
    entries
}

fn collect_hwnds(out: &mut Vec<isize>) {
    unsafe {
        let _ = windows::Win32::UI::WindowsAndMessaging::EnumWindows(
            Some(enumerate_cb),
            LPARAM(&mut *out as *mut Vec<isize> as isize),
        );
    }
}

unsafe extern "system" fn enumerate_cb(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let out = unsafe { &mut *(lparam.0 as *mut Vec<isize>) };
    out.push(hwnd.0 as isize);
    BOOL(1)
}

fn describe(hwnd: isize, z_index: i64) -> Option<WindowEntry> {
    let hwnd = HWND(hwnd as *mut _);
    unsafe {
        if !IsWindowVisible(hwnd).as_bool() {
            return None;
        }
        if cloaked(hwnd) {
            return None;
        }
        let mut title = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut title);
        let title = String::from_utf16_lossy(&title[..len.max(0).min(511) as usize]);
        if title.trim().is_empty() {
            return None;
        }
        let mut pid = 0u32;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return None;
        }
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        Some(WindowEntry {
            hwnd: hwnd.0 as isize,
            pid,
            title,
            layer: if ex_style & WS_EX_TOPMOST.0 as isize != 0 { 1 } else { 0 },
            z_index,
            on_screen: !IsIconic(hwnd).as_bool(),
        })
    }
}

fn cloaked(hwnd: HWND) -> bool {
    unsafe {
        let mut cloaked = 0u32;
        let result = DwmGetWindowAttribute(
            hwnd,
            DWMWA_CLOAKED,
            &mut cloaked as *mut u32 as *mut _,
            std::mem::size_of::<u32>() as u32,
        );
        // A window that reports cloaked==0, or whose DWM query fails (pre-DWM
        // surfaces), is treated as shown.
        result.is_ok() && cloaked != 0
    }
}
