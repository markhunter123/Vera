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

//! The UIA layer (§5/§6.1): tree walk, the AX-role mapping, element digests,
//! and the element dispatch paths.
//!
//! The tree walk is budgeted twice — an element ceiling and a depth ceiling —
//! and reports which budget it hit in `snapshot.truncated`. A truncated tree
//! must say so: an open/save panel reaching the bound is a matter of course on
//! Chromium, and a bounded tree that reads as complete is what makes a model
//! address an element that was never minted.

use crate::capture::hex;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use windows::Win32::UI::Accessibility::{
    CUIAutomation8, IUIAutomation, IUIAutomationElement, IUIAutomationExpandCollapsePattern,
    IUIAutomationInvokePattern, IUIAutomationRangeValuePattern, IUIAutomationScrollPattern,
    IUIAutomationSelectionItemPattern, IUIAutomationTogglePattern, IUIAutomationValuePattern,
    UIA_CONTROLTYPE_ID, UIA_PATTERN_ID, UIA_ButtonControlTypeId, UIA_CalendarControlTypeId,
    UIA_CheckBoxControlTypeId,
    UIA_ComboBoxControlTypeId, UIA_CustomControlTypeId, UIA_DocumentControlTypeId,
    UIA_EditControlTypeId, UIA_GroupControlTypeId, UIA_HeaderControlTypeId,
    UIA_HeaderItemControlTypeId, UIA_HyperlinkControlTypeId, UIA_ImageControlTypeId,
    UIA_ListControlTypeId, UIA_ListItemControlTypeId, UIA_MenuBarControlTypeId,
    UIA_MenuControlTypeId, UIA_MenuItemControlTypeId, UIA_PaneControlTypeId,
    UIA_ProgressBarControlTypeId, UIA_RadioButtonControlTypeId, UIA_ScrollBarControlTypeId,
    UIA_SemanticZoomControlTypeId, UIA_SeparatorControlTypeId, UIA_SliderControlTypeId,
    UIA_SpinnerControlTypeId, UIA_SplitButtonControlTypeId, UIA_StatusBarControlTypeId,
    UIA_TabControlTypeId, UIA_TabItemControlTypeId, UIA_TableControlTypeId, UIA_TextControlTypeId,
    UIA_ThumbControlTypeId, UIA_TitleBarControlTypeId, UIA_ToolBarControlTypeId,
    UIA_ToolTipControlTypeId, UIA_TreeControlTypeId, UIA_TreeItemControlTypeId,
    UIA_WindowControlTypeId, UIA_ExpandCollapsePatternId, UIA_InvokePatternId,
    UIA_RangeValuePatternId, UIA_ScrollPatternId, UIA_SelectionItemPatternId,
    UIA_TogglePatternId, UIA_ValuePatternId,
};
use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::System::Com::{CLSCTX_INPROC_SERVER, CoCreateInstance};

/// The element ceiling. Chromium windows reach 1500+ nodes; the walk stops and
/// says so rather than shipping an unbounded response.
pub const MAX_ELEMENTS: usize = 800;
pub const MAX_DEPTH: u32 = 24;
pub const MAX_TEXT_CHARS: usize = 2_000;

pub fn automation() -> Result<IUIAutomation, String> {
    unsafe {
        CoCreateInstance(&CUIAutomation8, None, CLSCTX_INPROC_SERVER)
            .map_err(|e| format!("internal: UIA COM init failed: {e}"))
    }
}

/// §5 role names. UIA `ControlType` ids map onto the AX vocabulary the host
/// renders; a control type this table does not know is `AXGroup`, never an
/// empty string — `readElement` requires a non-empty role.
// The windows crate names its constants in CamelCase, which is exactly what
// the match arms must spell.
#[allow(non_upper_case_globals)]
pub fn role_for_control_type(control_type: UIA_CONTROLTYPE_ID) -> &'static str {
    match control_type {
        UIA_ButtonControlTypeId => "AXButton",
        UIA_CalendarControlTypeId => "AXCalendar",
        UIA_CheckBoxControlTypeId => "AXCheckBox",
        UIA_ComboBoxControlTypeId => "AXComboBox",
        UIA_EditControlTypeId => "AXTextField",
        UIA_HyperlinkControlTypeId => "AXLink",
        UIA_ImageControlTypeId => "AXImage",
        UIA_ListItemControlTypeId => "AXListItem",
        UIA_ListControlTypeId => "AXList",
        UIA_MenuControlTypeId => "AXMenu",
        UIA_MenuBarControlTypeId => "AXMenuBar",
        UIA_MenuItemControlTypeId => "AXMenuItem",
        UIA_ProgressBarControlTypeId => "AXProgressIndicator",
        UIA_RadioButtonControlTypeId => "AXRadioButton",
        UIA_ScrollBarControlTypeId => "AXScrollBar",
        UIA_SliderControlTypeId => "AXSlider",
        UIA_SpinnerControlTypeId => "AXIncrementor",
        UIA_StatusBarControlTypeId => "AXStatusBar",
        UIA_TabControlTypeId => "AXTabGroup",
        UIA_TabItemControlTypeId => "AXTabItem",
        UIA_TextControlTypeId => "AXStaticText",
        UIA_ThumbControlTypeId => "AXThumb",
        UIA_TitleBarControlTypeId => "AXTitleBar",
        UIA_ToolBarControlTypeId => "AXToolBar",
        UIA_ToolTipControlTypeId => "AXToolTip",
        UIA_DocumentControlTypeId => "AXTextArea",
        UIA_WindowControlTypeId => "AXWindow",
        UIA_TableControlTypeId => "AXTable",
        UIA_TreeControlTypeId => "AXTree",
        UIA_TreeItemControlTypeId => "AXTreeItem",
        UIA_SemanticZoomControlTypeId | UIA_SplitButtonControlTypeId => "AXButton",
        UIA_HeaderControlTypeId => "AXHeader",
        UIA_HeaderItemControlTypeId => "AXHeaderItem",
        UIA_SeparatorControlTypeId => "AXSplitter",
        UIA_CustomControlTypeId | UIA_PaneControlTypeId | UIA_GroupControlTypeId => "AXGroup",
        _ => "AXGroup",
    }
}

pub struct WalkedElement {
    pub token: String,
    pub stable_id: u64,
    pub parent_token: Option<String>,
    pub depth: u32,
    pub role: String,
    pub title: Option<String>,
    pub ax_identifier: Option<String>,
    pub label: Option<String>,
    pub value: Option<String>,
    pub enabled: bool,
    pub focused: bool,
    pub selected: Option<bool>,
    /// Window-local logical points, origin at the window's top-left (§5.3).
    pub frame_in_window: Option<(i64, i64, i64, i64)>,
    pub actions: Vec<String>,
    pub digest_hex: String,
    pub truncated_fields: Vec<String>,
    /// The live COM reference, for dispatch and for the post-action re-read.
    pub raw: IUIAutomationElement,
}

pub struct WalkResult {
    pub elements: Vec<WalkedElement>,
    pub truncated_elements: bool,
    pub truncated_depth: bool,
    pub focused_token: Option<String>,
}

/// Depth-first walk of the control view under `root`, pre-order.
pub fn walk(
    automation: &IUIAutomation,
    root: &IUIAutomationElement,
    window_origin: (i32, i32),
) -> Result<WalkResult, String> {
    let mut tokens = crate::book::TokenCounter::default();
    let mut elements: Vec<WalkedElement> = Vec::new();
    let mut truncated_elements = false;
    let mut truncated_depth = false;
    let focused = unsafe { automation.GetFocusedElement().ok() };

    // Root first: `parentToken` is null for the root and the root carries the
    // window role, so the tree always has a depth-0 anchor.
    visit(
        automation,
        root,
        None,
        0,
        window_origin,
        &focused,
        &mut tokens,
        &mut elements,
        &mut truncated_elements,
        &mut truncated_depth,
    )?;
    let focused_token = focused.and_then(|focused| {
        elements
            .iter()
            .find(|element| unsafe {
                automation
                    .CompareElements(&element.raw, &focused)
                    .map(|v| v.as_bool())
                    .unwrap_or(false)
            })
            .map(|element| element.token.clone())
    });
    Ok(WalkResult {
        elements,
        truncated_elements,
        truncated_depth,
        focused_token,
    })
}

#[allow(clippy::too_many_arguments)]
fn visit(
    automation: &IUIAutomation,
    element: &IUIAutomationElement,
    parent_token: Option<&str>,
    depth: u32,
    window_origin: (i32, i32),
    focused: &Option<IUIAutomationElement>,
    tokens: &mut crate::book::TokenCounter,
    out: &mut Vec<WalkedElement>,
    truncated_elements: &mut bool,
    truncated_depth: &mut bool,
) -> Result<(), String> {
    if out.len() >= MAX_ELEMENTS {
        *truncated_elements = true;
        return Ok(());
    }
    if depth > MAX_DEPTH {
        *truncated_depth = true;
        return Ok(());
    }
    let walked = describe(
        automation,
        element,
        parent_token,
        tokens.mint(),
        depth,
        window_origin,
        focused,
        out.len(),
    )?;
    let token = walked.token.clone();
    out.push(walked);
    // Children are looked up AFTER the parent is recorded, so a mid-walk
    // property failure still reports everything gathered so far.
    unsafe {
        if let Ok(children) =
            element.FindAll(windows::Win32::UI::Accessibility::TreeScope_Children, &automation.CreateTrueCondition().map_err(|e| e.to_string())?)
        {
            let count = children.Length().unwrap_or(0);
            for index in 0..count {
                if let Ok(child) = children.GetElement(index) {
                    visit(
                        automation,
                        &child,
                        Some(&token),
                        depth + 1,
                        window_origin,
                        focused,
                        tokens,
                        out,
                        truncated_elements,
                        truncated_depth,
                    )?;
                    if out.len() >= MAX_ELEMENTS {
                        *truncated_elements = true;
                        return Ok(());
                    }
                }
            }
        }
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn describe(
    automation: &IUIAutomation,
    element: &IUIAutomationElement,
    parent_token: Option<&str>,
    token: String,
    depth: u32,
    window_origin: (i32, i32),
    focused: &Option<IUIAutomationElement>,
    // DFS position. Two controls with the same (automationId, class, role)
    // tuple — two unlabeled static texts, say — would otherwise mint the same
    // `stableId`, which the host rejects as duplicate. The walk order is
    // deterministic for a given tree, so identical revisions keep identical
    // ids, and a changed tree re-mints ids under a digest that changed too.
    dfs_index: usize,
) -> Result<WalkedElement, String> {
    unsafe {
        let control_type = element.CurrentControlType().unwrap_or(UIA_CONTROLTYPE_ID(0));
        let role = role_for_control_type(control_type).to_string();
        let name = element
            .CurrentName()
            .ok()
            .filter(|name| !name.is_empty())
            .map(|name| name.to_string());
        let automation_id = element
            .CurrentAutomationId()
            .ok()
            .filter(|id| !id.is_empty())
            .map(|id| id.to_string());
        let class_name = element
            .CurrentClassName()
            .ok()
            .filter(|name| !name.is_empty())
            .map(|name| name.to_string());
        let is_enabled = element.CurrentIsEnabled().map(|v| v.as_bool()).unwrap_or(true);
        let rect = element.CurrentBoundingRectangle().unwrap_or_default();
        let is_focused = focused
            .as_ref()
            .map(|focused| {
                automation
                    .CompareElements(element, focused)
                    .map(|v| v.as_bool())
                    .unwrap_or(false)
            })
            .unwrap_or(false);

        // `value`: the control's own content, read from the value pattern where
        // one exists, cut at `maxTextChars` with the cut declared.
        let mut truncated_fields = Vec::new();
        let value = pattern::<IUIAutomationValuePattern>(element, UIA_ValuePatternId).and_then(
            |pattern| {
                let text = pattern.CurrentValue().ok()?.to_string();
                (!text.is_empty()).then_some(text)
            },
        );
        let value = value.map(|text| cut_text(text, "value", &mut truncated_fields));

        let selected = pattern::<IUIAutomationSelectionItemPattern>(
            element,
            UIA_SelectionItemPatternId,
        )
        .and_then(|pattern| pattern.CurrentIsSelected().ok().map(|v| v.as_bool()));

        // Window-local frame: the UIA rectangle is screen-physical, the wire
        // declares window-local (§5.3), and `scale` is 1 by construction.
        let frame_in_window = (
            (rect.left - window_origin.0) as i64,
            (rect.top - window_origin.1) as i64,
            (rect.right - rect.left) as i64,
            (rect.bottom - rect.top) as i64,
        );

        let actions = derive_actions(element);

        // `stableId`: a hash of the identifying tuple. UIA's `RuntimeId` is a
        // SAFEARRAY whose shape varies by provider; the (window, automationId,
        // class, role) tuple is what stays put across revisions of the same
        // window, which is all §5 requires.
        let identity = format!(
            "{}|{}|{}|{}|{}",
            automation_id.as_deref().unwrap_or(""),
            class_name.as_deref().unwrap_or(""),
            role,
            control_type.0,
            dfs_index
        );
        let mut hasher = Sha256::new();
        hasher.update(identity.as_bytes());
        let stable_id = u64::from_be_bytes(
            hasher.finalize()[..8].try_into().unwrap_or_default(),
        );

        let mut element = WalkedElement {
            token,
            stable_id,
            parent_token: parent_token.map(str::to_string),
            depth,
            role,
            title: name
                .clone()
                .map(|name| cut_text(name, "title", &mut truncated_fields)),
            ax_identifier: automation_id,
            label: None,
            value,
            enabled: is_enabled,
            focused: is_focused,
            selected,
            frame_in_window: Some(frame_in_window),
            actions,
            digest_hex: String::new(),
            truncated_fields,
            raw: element.clone(),
        };
        element.digest_hex = digest_element(&element);
        Ok(element)
    }
}

pub(crate) fn cut_text(text: String, field: &str, truncated: &mut Vec<String>) -> String {
    // `truncated` names the FIELD (§5.2), and a cut field must be declared.
    if text.chars().count() > MAX_TEXT_CHARS {
        truncated.push(field.to_string());
        text.chars().take(MAX_TEXT_CHARS).collect()
    } else {
        text
    }
}

/// Actions the element actually honours, in the closed §5 vocabulary. Only
/// patterns the element exposes produce names — an element's list IS the
/// contract the model reads.
fn derive_actions(element: &IUIAutomationElement) -> Vec<String> {
    let mut actions = Vec::new();
    if pattern::<IUIAutomationInvokePattern>(element, UIA_InvokePatternId).is_some() {
        actions.push("press".to_string());
        actions.push("confirm".to_string());
        actions.push("open".to_string());
        actions.push("raise".to_string());
        actions.push("cancel".to_string());
    }
    if pattern::<IUIAutomationTogglePattern>(element, UIA_TogglePatternId).is_some()
        && !actions.contains(&"press".to_string())
    {
        actions.push("press".to_string());
    }
    if pattern::<IUIAutomationExpandCollapsePattern>(element, UIA_ExpandCollapsePatternId).is_some()
    {
        actions.push("show_menu".to_string());
    }
    if pattern::<IUIAutomationSelectionItemPattern>(
        element,
        UIA_SelectionItemPatternId,
    )
    .is_some()
    {
        actions.push("pick".to_string());
    }
    if pattern::<IUIAutomationRangeValuePattern>(element, UIA_RangeValuePatternId).is_some() {
        actions.push("increment".to_string());
        actions.push("decrement".to_string());
    }
    if pattern::<IUIAutomationScrollPattern>(element, UIA_ScrollPatternId).is_some() {
        actions.push("scroll_up".to_string());
        actions.push("scroll_down".to_string());
        actions.push("scroll_left".to_string());
        actions.push("scroll_right".to_string());
    }
    actions
}

fn pattern<P: windows::core::Interface>(
    element: &IUIAutomationElement,
    pattern_id: UIA_PATTERN_ID,
) -> Option<P> {
    use windows::core::Interface as _;
    unsafe {
        element
            .GetCurrentPattern(pattern_id)
            .ok()
            .and_then(|unknown| unknown.cast::<P>().ok())
    }
}

/// §4.3: the digest covers every model-facing field, so a change to any of
/// them is a digest change, and `expectElementDigest` fails closed.
pub fn digest_element(element: &WalkedElement) -> String {
    digest_fingerprint(&ElementFingerprint {
        role: element.role.as_str(),
        title: element.title.as_deref(),
        ax_identifier: element.ax_identifier.as_deref(),
        label: element.label.as_deref(),
        value: element.value.as_deref(),
        enabled: element.enabled,
        focused: element.focused,
        frame: element.frame_in_window,
    })
}

/// The digest inputs, so the post-action re-read hashes EXACTLY what the walk
/// hashed — a verify that hashes a different shape would flag every dispatch.
pub struct ElementFingerprint<'a> {
    pub role: &'a str,
    pub title: Option<&'a str>,
    pub ax_identifier: Option<&'a str>,
    pub label: Option<&'a str>,
    pub value: Option<&'a str>,
    pub enabled: bool,
    pub focused: bool,
    pub frame: Option<(i64, i64, i64, i64)>,
}

pub fn digest_fingerprint(fp: &ElementFingerprint<'_>) -> String {
    let mut hasher = Sha256::new();
    hasher.update(fp.role.as_bytes());
    hasher.update(b"\x1f");
    for text in [fp.title, fp.ax_identifier, fp.label, fp.value] {
        hasher.update(text.unwrap_or("").as_bytes());
        hasher.update(b"\x1f");
    }
    hasher.update(if fp.enabled { b"1" } else { b"0" });
    hasher.update(b"\x1f");
    hasher.update(if fp.focused { b"1" } else { b"0" });
    hasher.update(b"\x1f");
    if let Some((x, y, w, h)) = fp.frame {
        hasher.update(format!("{x},{y},{w},{h}").as_bytes());
    }
    hex(&hasher.finalize())
}

/// The window digest: every element digest plus the window's own bounds and
/// title, computed where the tree lives (§4.3). A dispatch quotes this back
/// and the executor answers `window_changed` when it disagrees.
pub fn digest_window(
    elements: &[WalkedElement],
    bounds: (i32, i32, i32, i32),
    title: &str,
) -> String {
    let mut hasher = Sha256::new();
    for element in elements {
        hasher.update(element.digest_hex.as_bytes());
        hasher.update(b"\x1f");
    }
    hasher.update(format!("{}|{title}", bounds.0).as_bytes());
    hex(&hasher.finalize())
}

// ---------------------------------------------------------------------------
// Element dispatch (§6.1).
// ---------------------------------------------------------------------------

/// Perform one element action against the element the token mints from. The
/// action wire is the host's; unknown kinds refuse rather than guess.
pub fn dispatch_element_action(
    element: &IUIAutomationElement,
    hwnd: isize,
    action: &Value,
) -> Result<(), String> {
    let kind = action
        .get("kind")
        .and_then(Value::as_str)
        .ok_or_else(|| "invalid_params: dispatch.element action.kind is missing".to_string())?;
    match kind {
        "click" => press_element(element),
        "set_value" => unsafe {
            let value = action
                .get("value")
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_params: set_value needs a value".to_string())?;
            let wide: Vec<u16> = value.encode_utf16().collect();
            let pattern = pattern::<IUIAutomationValuePattern>(element, UIA_ValuePatternId)
                .ok_or_else(|| "element_not_actionable: no Value pattern on this element".to_string())?;
            pattern
                .SetValue(&windows::core::BSTR::from_wide(&wide))
                .map_err(|e| format!("element_not_actionable: SetValue refused: {e}"))
                .map(|_| ())
        },
        "secondary_action" => {
            let named = action
                .get("action")
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_params: secondary_action needs an action".to_string())?;
            secondary(element, named)
        }
        "minimize_window" => unsafe {
            windows::Win32::UI::WindowsAndMessaging::ShowWindow(
                HWND(hwnd as *mut _),
                windows::Win32::UI::WindowsAndMessaging::SW_MINIMIZE,
            )
            .as_bool()
            .then_some(())
            .ok_or_else(|| "window_changed: ShowWindow refused".to_string())
        },
        "move_window" => unsafe {
            let position = action
                .get("position")
                .ok_or_else(|| "invalid_params: move_window needs a position".to_string())?;
            let x = position.get("x").and_then(Value::as_i64).unwrap_or(0) as i32;
            let y = position.get("y").and_then(Value::as_i64).unwrap_or(0) as i32;
            let mut rect = RECT::default();
            windows::Win32::UI::WindowsAndMessaging::GetWindowRect(HWND(hwnd as *mut _), &mut rect)
                .map_err(|e| format!("window_changed: GetWindowRect: {e}"))?;
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;
            windows::Win32::UI::WindowsAndMessaging::MoveWindow(
                HWND(hwnd as *mut _),
                x,
                y,
                width,
                height,
                true,
            )
            .map_err(|e| format!("window_changed: MoveWindow: {e}"))
            .map(|_| ())
        },
        "resize_window" => unsafe {
            let size = action
                .get("size")
                .ok_or_else(|| "invalid_params: resize_window needs a size".to_string())?;
            let width = size.get("width").and_then(Value::as_i64).unwrap_or(0) as i32;
            let height = size.get("height").and_then(Value::as_i64).unwrap_or(0) as i32;
            let mut rect = RECT::default();
            windows::Win32::UI::WindowsAndMessaging::GetWindowRect(HWND(hwnd as *mut _), &mut rect)
                .map_err(|e| format!("window_changed: GetWindowRect: {e}"))?;
            windows::Win32::UI::WindowsAndMessaging::MoveWindow(
                HWND(hwnd as *mut _),
                rect.left,
                rect.top,
                width.max(1),
                height.max(1),
                true,
            )
            .map_err(|e| format!("window_changed: MoveWindow: {e}"))
            .map(|_| ())
        },
        "scroll" => {
            let direction = action
                .get("direction")
                .and_then(Value::as_str)
                .unwrap_or("down");
            let pages = action.get("pages").and_then(Value::as_f64).unwrap_or(1.0);
            let horizontal = matches!(direction, "left" | "right");
            // UIA scroll amounts are enum steps, not pixels; one large step per
            // page, capped, keeps a half-page request from scrolling ten.
            let increments = pages.ceil().clamp(1.0, 10.0) as usize;
            let (positive, horizontal) = (matches!(direction, "up" | "left"), horizontal);
            unsafe {
                let pattern = pattern::<IUIAutomationScrollPattern>(element, UIA_ScrollPatternId)
                    .ok_or_else(|| "element_not_actionable: no Scroll pattern on this element".to_string())?;
                use windows::Win32::UI::Accessibility::{
                    ScrollAmount_LargeDecrement, ScrollAmount_LargeIncrement, ScrollAmount_NoAmount,
                };
                let amount = if positive {
                    ScrollAmount_LargeDecrement
                } else {
                    ScrollAmount_LargeIncrement
                };
                // Scroll takes an amount PER AXIS; the idle axis says so.
                let (h_amount, v_amount) = if horizontal {
                    (amount, ScrollAmount_NoAmount)
                } else {
                    (ScrollAmount_NoAmount, amount)
                };
                for _ in 0..increments {
                    pattern
                        .Scroll(h_amount, v_amount)
                        .map_err(|e| format!("element_not_actionable: Scroll refused: {e}"))?;
                }
            }
            Ok(())
        }
        other => Err(format!(
            "unsupported_action: '{other}' is not an element action this executor declares"
        )),
    }
}

/// `press` and friends: Invoke first, Toggle as the fallback — a checkbox
/// advertises `press` off the Toggle pattern and has no Invoke to call.
fn press_element(element: &IUIAutomationElement) -> Result<(), String> {
    unsafe {
        if let Some(invoke) = pattern::<IUIAutomationInvokePattern>(element, UIA_InvokePatternId) {
            return invoke
                .Invoke()
                .map_err(|e| format!("element_not_actionable: Invoke refused: {e}"))
                .map(|_| ());
        }
        if let Some(toggle) = pattern::<IUIAutomationTogglePattern>(element, UIA_TogglePatternId) {
            return toggle
                .Toggle()
                .map_err(|e| format!("element_not_actionable: Toggle refused: {e}"))
                .map(|_| ());
        }
        Err("element_not_actionable: the element offers neither Invoke nor Toggle".to_string())
    }
}

fn secondary(element: &IUIAutomationElement, named: &str) -> Result<(), String> {
    match named {
        "press" | "confirm" | "open" | "raise" | "cancel" => press_element(element),
        "show_menu" => unsafe {
            let pattern =
                pattern::<IUIAutomationExpandCollapsePattern>(element, UIA_ExpandCollapsePatternId)
                    .ok_or_else(|| "element_not_actionable: no ExpandCollapse pattern".to_string())?;
            pattern
                .Expand()
                .map_err(|e| format!("element_not_actionable: Expand refused: {e}"))
                .map(|_| ())
        },
        "pick" => unsafe {
            let pattern =
                pattern::<IUIAutomationSelectionItemPattern>(element, UIA_SelectionItemPatternId)
                    .ok_or_else(|| "element_not_actionable: no SelectionItem pattern".to_string())?;
            pattern
                .Select()
                .map_err(|e| format!("element_not_actionable: Select refused: {e}"))
                .map(|_| ())
        },
        "increment" | "decrement" => unsafe {
            let pattern =
                pattern::<IUIAutomationRangeValuePattern>(element, UIA_RangeValuePatternId)
                    .ok_or_else(|| format!("element_not_actionable: '{named}' needs a RangeValue pattern"))?;
            let current = pattern.CurrentValue().unwrap_or(0.0);
            let small = pattern.CurrentSmallChange().unwrap_or(1.0);
            let next = if named == "increment" {
                current + small
            } else {
                current - small
            };
            pattern
                .SetValue(next)
                .map_err(|e| format!("element_not_actionable: SetValue refused: {e}"))
                .map(|_| ())
        },
        "scroll_up" | "scroll_down" | "scroll_left" | "scroll_right" => {
            dispatch_element_action(
                element,
                0,
                &json!({ "kind": "scroll", "direction": named.trim_start_matches("scroll_"), "pages": 1.0 }),
            )
        }
        other => Err(format!(
            "unsupported_action: '{other}' is not one of the secondary actions this executor declares"
        )),
    }
}

/// Post-action verification (§6.5 `tree_delta`): re-read the element's
/// properties through the live COM reference and hash them into the same
/// fingerprint the walk hashed. A dead element answers with default
/// properties, which almost always changes the fingerprint — the honest read,
/// since the world did move even if this node did not.
pub fn verify_tree_delta(
    automation: &IUIAutomation,
    element: &IUIAutomationElement,
    window_origin: (i32, i32),
    before_hex: &str,
) -> bool {
    unsafe {
        let control_type = element.CurrentControlType().unwrap_or(UIA_CONTROLTYPE_ID(0));
        let title = element
            .CurrentName()
            .ok()
            .filter(|name| !name.is_empty())
            .map(|name| name.to_string());
        let ax_identifier = element
            .CurrentAutomationId()
            .ok()
            .filter(|id| !id.is_empty())
            .map(|id| id.to_string());
        let rect = element.CurrentBoundingRectangle().unwrap_or_default();
        let enabled = element.CurrentIsEnabled().map(|v| v.as_bool()).unwrap_or(true);
        let value = pattern::<IUIAutomationValuePattern>(element, UIA_ValuePatternId).and_then(
            |pattern| {
                let text = pattern.CurrentValue().ok()?.to_string();
                (!text.is_empty()).then_some(text)
            },
        );
        let focused = automation
            .GetFocusedElement()
            .ok()
            .map(|focused| {
                automation
                    .CompareElements(element, &focused)
                    .map(|v| v.as_bool())
                    .unwrap_or(false)
            })
            .unwrap_or(false);
        let digest = digest_fingerprint(&ElementFingerprint {
            role: role_for_control_type(control_type),
            title: title.as_deref(),
            ax_identifier: ax_identifier.as_deref(),
            label: None,
            value: value.as_deref(),
            enabled,
            focused,
            frame: Some((
                (rect.left - window_origin.0) as i64,
                (rect.top - window_origin.1) as i64,
                (rect.right - rect.left) as i64,
                (rect.bottom - rect.top) as i64,
            )),
        });
        digest != before_hex
    }
}
