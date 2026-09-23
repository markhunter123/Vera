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

//! The app inventory (§5.5) and `apps.launch` (§5.7).
//!
//! Windows has no bundle identifiers, so `appId` is `pid:<n>` everywhere (the
//! one namespace the protocol declares for apps without a bundle id). `name`
//! is the process image name, display strings only, never matched against.

use crate::wins;
use windows::Win32::Foundation::{CloseHandle, HWND, WAIT_OBJECT_0};
use windows::Win32::System::Threading::{
    CreateProcessW, GetExitCodeProcess, OpenProcess, QueryFullProcessImageNameW,
    WaitForInputIdle, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION,
    PROCESS_CREATION_FLAGS,
};
use windows::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, SW_SHOW, ShowWindow};

pub struct AppSummary {
    pub pid: u32,
    pub name: String,
    pub window_count: usize,
}

pub fn list_apps() -> Vec<AppSummary> {
    let mut by_pid: std::collections::HashMap<u32, AppSummary> = std::collections::HashMap::new();
    for window in wins::list_windows() {
        let entry = by_pid.entry(window.pid).or_insert_with(|| AppSummary {
            pid: window.pid,
            name: process_name(window.pid),
            window_count: 0,
        });
        entry.window_count += 1;
    }
    by_pid.into_values().collect()
}

pub fn process_name(pid: u32) -> String {
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
            .unwrap_or_default();
        if handle.is_invalid() {
            return String::new();
        }
        let mut buffer = [0u16; 1024];
        let mut len = buffer.len() as u32;
        let name = if QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            windows::core::PWSTR(buffer.as_mut_ptr()),
            &mut len,
        )
        .is_ok()
        {
            String::from_utf16_lossy(&buffer[..len.min(1023) as usize])
        } else {
            String::new()
        };
        let _ = CloseHandle(handle);
        // The file name of the image path — `notepad.exe`, not its directory.
        name.rsplit(['\\', '/']).next().unwrap_or("").to_string()
    }
}

pub struct LaunchOutcome {
    pub pid: u32,
    pub name: String,
    pub foreground_taken: bool,
    pub windows: Vec<(isize, String)>,
    pub waited_ms: u64,
    pub wait_reason: &'static str,
}

/// Launch by executable path (`params.app` is the one place a display name is
/// legal on this wire, but resolving Start-Menu names is its own resolver; an
/// app that is not a path refuses with `app_not_found` and the host surfaces
/// it as `target_missing`).
///
/// ponytail: no Start-Menu / App Paths resolution, no shell verbs.
pub fn launch(app: &str, wait_for_window_ms: u64) -> Result<LaunchOutcome, String> {
    if !app.to_ascii_lowercase().ends_with(".exe") || app.contains('*') || app.contains('?') {
        return Err("app_not_found: pass the full path to an .exe; Windows has no bundle id to resolve a display name with".into());
    }
    let mut wide: Vec<u16> = app.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        let mut startup = windows::Win32::System::Threading::STARTUPINFOW::default();
        startup.cb = std::mem::size_of::<windows::Win32::System::Threading::STARTUPINFOW>() as u32;
        let mut process_info = windows::Win32::System::Threading::PROCESS_INFORMATION::default();
        CreateProcessW(
            windows::core::PCWSTR::null(),
            // CreateProcessW writes back into the command line buffer, so it
            // must be mutable.
            Some(windows::core::PWSTR(wide.as_mut_ptr())),
            None,
            None,
            false,
            PROCESS_CREATION_FLAGS(0),
            None,
            None,
            &startup,
            &mut process_info,
        )
        .map_err(|e| format!("app_not_found: CreateProcess for {app} failed: {e}"))?;
        let pid = process_info.dwProcessId;
        let handle = process_info.hProcess;
        // Wait for the first window: `WaitForInputIdle` signals the UI thread
        // being ready, then the poll looks for a top-level window this pid did
        // not own before. Both must fail to spend the whole budget.
        let mut waited_ms = 0u64;
        let mut wait_reason = "timeout";
        let idle = WaitForInputIdle(handle, wait_for_window_ms as u32);
        if idle == WAIT_OBJECT_0.0 {
            let deadline = std::time::Instant::now() + std::time::Duration::from_millis(wait_for_window_ms);
            loop {
                let windows = windows_for_pid(pid);
                if !windows.is_empty() {
                    wait_reason = "window_appeared";
                    break;
                }
                if std::time::Instant::now() >= deadline {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(100));
                waited_ms += 100;
            }
        }
        // A dead child answers the launch now, not after the host observes an
        // app that vanished.
        let mut exit_code = 0u32;
        let _ = GetExitCodeProcess(handle, &mut exit_code);
        if exit_code != u32::MAX && exit_code != 0 && windows_for_pid(pid).is_empty() {
            let _ = CloseHandle(handle);
            return Err(format!(
                "app_not_found: {app} exited immediately with code {exit_code}"
            ));
        }
        let windows = windows_for_pid(pid);
        let mut foreground_taken = false;
        if let Some((hwnd, _)) = windows.first() {
            if ShowWindow(HWND(*hwnd as *mut _), SW_SHOW).as_bool() {
                foreground_taken = SetForegroundWindow(HWND(*hwnd as *mut _)).as_bool();
            }
        }
        let _ = CloseHandle(handle);
        Ok(LaunchOutcome {
            pid,
            name: process_name(pid),
            foreground_taken,
            windows,
            waited_ms,
            wait_reason,
        })
    }
}

fn windows_for_pid(pid: u32) -> Vec<(isize, String)> {
    wins::list_windows()
        .into_iter()
        .filter(|w| w.pid == pid)
        .map(|w| (w.hwnd, w.title))
        .collect()
}
