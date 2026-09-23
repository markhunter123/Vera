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

//! Frame capture (§8): GDI `PrintWindow` for a window, `BitBlt` for the whole
//! screen, WIC to encode PNG.
//!
//! Every image is a file reference written under the host-owned `imageDir`
//! (§8 — the host purges the directory before every spawn, so nothing here
//! needs to clean up). `scale` is always 1: the process is per-monitor DPI
//! aware, so physical pixels ARE the pixels of every rectangle this executor
//! reports, and `widthPx / bounds.width` measures 1 rather than being
//! declared.

use sha2::{Digest, Sha256};
use windows::core::PCWSTR;
use windows::Win32::Foundation::HWND;
use windows::Win32::Graphics::Gdi::{
    BITMAPINFO, BITMAPINFOHEADER, BI_RGB, BitBlt, CreateCompatibleBitmap, CreateCompatibleDC,
    DIB_RGB_COLORS, DeleteDC, DeleteObject, GetDC, GetDIBits, ReleaseDC, SRCCOPY, SelectObject,
};
// PrintWindow lives under Storage::Xps in windows 0.61, not Gdi; its flags
// are split between that module and WindowsAndMessaging.
use windows::Win32::Storage::Xps::{PRINT_WINDOW_FLAGS, PW_CLIENTONLY, PrintWindow};
use windows::Win32::UI::WindowsAndMessaging::PW_RENDERFULLCONTENT;

pub struct CapturedFrame {
    pub path: String,
    pub width_px: i64,
    pub height_px: i64,
    pub byte_length: i64,
    pub sha256_hex: String,
}

/// Capture a window's client area. `PW_RENDERFULLCONTENT` asks DWM for the
/// composed content, which is what makes DirectComposition surfaces (most
/// modern apps) show up at all.
pub fn capture_window(hwnd: isize, image_dir: &str) -> Result<CapturedFrame, String> {
    capture(
        HWND(hwnd as *mut _),
        true,
        image_dir,
        "window",
    )
}

/// Capture the entire virtual screen (§6.6 `screen.capture`).
pub fn capture_screen(image_dir: &str) -> Result<CapturedFrame, String> {
    capture(HWND::default(), false, image_dir, "screen")
}

fn capture(
    hwnd: HWND,
    window_only: bool,
    image_dir: &str,
    kind: &str,
) -> Result<CapturedFrame, String> {
    unsafe {
        let screen_dc = GetDC(None);
        if screen_dc.is_invalid() {
            return Err("capture_failed: no screen DC".into());
        }
        let mem_dc = CreateCompatibleDC(Some(screen_dc));
        if mem_dc.is_invalid() {
            return Err("capture_failed: no compatible DC".into());
        }
        let (width, height) = if window_only {
            let mut rect = Default::default();
            windows::Win32::UI::WindowsAndMessaging::GetClientRect(hwnd, &mut rect)
                .map_err(|e| format!("capture_failed: GetClientRect {e}"))?;
            (rect.right - rect.left, rect.bottom - rect.top)
        } else {
            (
                windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics(
                    windows::Win32::UI::WindowsAndMessaging::SM_CXVIRTUALSCREEN,
                ),
                windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics(
                    windows::Win32::UI::WindowsAndMessaging::SM_CYVIRTUALSCREEN,
                ),
            )
        };
        if width <= 0 || height <= 0 {
            let _ = DeleteDC(mem_dc);
            return Err("capture_failed: empty target".into());
        }
        let bitmap = CreateCompatibleBitmap(screen_dc, width, height);
        if bitmap.is_invalid() {
            let _ = DeleteDC(mem_dc);
            return Err("capture_failed: no bitmap".into());
        }
        let previous = SelectObject(mem_dc, bitmap.into());
        let copied = if window_only {
            // PW_RENDERFULLCONTENT is a bare u32 over in WindowsAndMessaging and
            // PRINT_WINDOW_FLAGS has no BitOr impl, so combine numerically.
            PrintWindow(hwnd, mem_dc, PRINT_WINDOW_FLAGS(PW_CLIENTONLY.0 | PW_RENDERFULLCONTENT))
                .as_bool()
        } else {
            let screen_dc_full = GetDC(None);
            let ok = BitBlt(
                mem_dc,
                0,
                0,
                width,
                height,
                Some(screen_dc_full),
                windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics(
                    windows::Win32::UI::WindowsAndMessaging::SM_XVIRTUALSCREEN,
                ),
                windows::Win32::UI::WindowsAndMessaging::GetSystemMetrics(
                    windows::Win32::UI::WindowsAndMessaging::SM_YVIRTUALSCREEN,
                ),
                SRCCOPY,
            )
            .is_ok();
            ReleaseDC(None, screen_dc_full);
            ok
        };
        if !copied {
            let _ = SelectObject(mem_dc, previous);
            let _ = DeleteObject(bitmap.into());
            let _ = DeleteDC(mem_dc);
            return Err("capture_failed: bitblt refused".into());
        }
        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height, // top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut pixels = vec![0u8; (width * height * 4) as usize];
        let lines = GetDIBits(
            mem_dc,
            bitmap,
            0,
            height as u32,
            Some(pixels.as_mut_ptr().cast()),
            &mut info,
            DIB_RGB_COLORS,
        );
        let _ = SelectObject(mem_dc, previous);
        let _ = DeleteObject(bitmap.into());
        let _ = DeleteDC(mem_dc);
        if lines == 0 {
            return Err("capture_failed: GetDIBits returned nothing".into());
        }
        encode_png(&pixels, width, height, image_dir, kind)
    }
}

/// BGRA pixel rows in, PNG file out. WIC is the platform PNG encoder; the
/// `32bppBGRA` pixel format matches the `GetDIBits` layout byte for byte.
fn encode_png(
    pixels: &[u8],
    width: i32,
    height: i32,
    image_dir: &str,
    kind: &str,
) -> Result<CapturedFrame, String> {
    use windows::Win32::Graphics::Imaging::{
        CLSID_WICImagingFactory, GUID_ContainerFormatPng, GUID_WICPixelFormat32bppBGRA,
        IWICBitmapEncoder, IWICBitmapFrameEncode, IWICImagingFactory, IWICStream,
        WICBitmapEncoderNoCache,
    };
    use windows::Win32::System::Com::{CLSCTX_INPROC_SERVER, CoCreateInstance};
    unsafe {
        let factory: IWICImagingFactory = CoCreateInstance(&CLSID_WICImagingFactory, None, CLSCTX_INPROC_SERVER)
            .map_err(|e| format!("image_write_failed: WIC factory {e}"))?;
        let file_name = format!(
            "{image_dir}\\{kind}-{}-{}.png",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis()
        );
        let wide: Vec<u16> = file_name.encode_utf16().chain(std::iter::once(0)).collect();
        let stream: IWICStream = factory
            .CreateStream()
            .map_err(|e| format!("image_write_failed: stream {e}"))?;
        stream
            .InitializeFromFilename(PCWSTR(wide.as_ptr()), 0x4000_0000) // GENERIC_WRITE
            .map_err(|e| format!("image_write_failed: open {e}"))?;
        let encoder: IWICBitmapEncoder = factory
            .CreateEncoder(&GUID_ContainerFormatPng, std::ptr::null())
            .map_err(|e| format!("image_write_failed: encoder {e}"))?;
        encoder
            .Initialize(&stream, WICBitmapEncoderNoCache)
            .map_err(|e| format!("image_write_failed: encoder init {e}"))?;
        let mut frame_slot: Option<IWICBitmapFrameEncode> = None;
        encoder
            .CreateNewFrame(&mut frame_slot, std::ptr::null_mut())
            .map_err(|e| format!("image_write_failed: frame {e}"))?;
        let frame = frame_slot.ok_or("image_write_failed: no frame".to_string())?;
        frame.Initialize(None).map_err(|e| format!("image_write_failed: frame init {e}"))?;
        let mut pixel_format = GUID_WICPixelFormat32bppBGRA;
        frame
            .SetPixelFormat(&mut pixel_format)
            .map_err(|e| format!("image_write_failed: pixel format {e}"))?;
        frame
            .SetSize(width as u32, height as u32)
            .map_err(|e| format!("image_write_failed: size {e}"))?;
        frame
            .WritePixels(height as u32, (width * 4) as u32, pixels)
            .map_err(|e| format!("image_write_failed: write {e}"))?;
        frame.Commit().map_err(|e| format!("image_write_failed: frame commit {e}"))?;
        encoder.Commit().map_err(|e| format!("image_write_failed: commit {e}"))?;
        let byte_length = std::fs::metadata(&file_name)
            .map_err(|e| format!("image_write_failed: stat {e}"))?
            .len();
        let mut hasher = Sha256::new();
        let bytes = std::fs::read(&file_name).map_err(|e| format!("image_write_failed: read {e}"))?;
        hasher.update(&bytes);
        Ok(CapturedFrame {
            path: file_name,
            width_px: width as i64,
            height_px: height as i64,
            byte_length: byte_length as i64,
            sha256_hex: hex(&hasher.finalize()),
        })
    }
}

pub fn hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{byte:02x}"));
    }
    out
}
