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

"use client";

import type React from "react";
import { cn } from "../utils.js";

/**
 * `Marker` — the per-turn status / lineage / footer chrome (issue #332, PR2).
 *
 * Retires the bespoke `.vera-turn-summary*`, `.vera-turn-aborted-marker`,
 * `.vera-turn-lineage-*`, and `.vera-turn-footer*` shell
 * CSS (spread across `vera-tokens.css`, `styles/settings/models.css`, and the
 * re-anchored measure-column block in `styles/tool-output.css`), moving each
 * onto package-owned semantic classes.
 *
 * The measure-column geometry the old `tool-output.css` re-anchor applied to
 * the summary / lineage rows / footer is gone rather than moved: `.vera-turn`
 * is the column, and every `Marker` renders inside one, so a second cap on the
 * chrome could only ever be the same edge stated twice.
 *
 * `markerVariants` is exported from THIS module as a local variant recipe
 * so the lineage badge + footer action — which render as `UiButton` and can't
 * be wrapped — apply the shell via `className`; `Button` runs it through
 * `cn` last so consumers can append their own product hook.
 * It is intentionally kept OFF the `@vera/ui` package barrel (see `index.ts`):
 * the only consumers import it by relative path, so the variant table stays an
 * internal, freely-removable styling detail rather than public API.
 *
 */
export type MarkerVariant =
  | "aborted"
  | "host-origin"
  | "lineage-row"
  | "lineage-row-reverse"
  | "lineage-badge"
  | "footer"
  | "footer-action";

const MARKER_CLASSES: Record<MarkerVariant, string> = {
  aborted: "vera-turn-aborted-marker",
  "host-origin": "vera-turn-host-origin",
  "lineage-row": "vera-turn-lineage-row",
  "lineage-row-reverse": "vera-turn-lineage-row vera-turn-lineage-row-reverse",
  "lineage-badge": "vera-turn-lineage-badge",
  footer: "vera-turn-footer",
  "footer-action": "vera-turn-footer-action",
};

function markerVariants({ variant }: { variant: MarkerVariant }): string {
  return MARKER_CLASSES[variant];
}

export { markerVariants };

export interface MarkerProps extends React.ComponentPropsWithoutRef<"div"> {
  variant: MarkerVariant;
  // The summary chips were authored as inline `<span>`s; the containers /
  // markers as `<div>`s. Keep the original tag so the semantic-class
  // conversion is structurally identical (zero behavioral change).
  as?: "div" | "span";
}

export function Marker({
  className,
  variant,
  as: Tag = "div",
  ...props
}: MarkerProps): React.ReactElement {
  return (
    // `{...props}` first so the `data-slot` / `data-variant` hooks land last and
    // can't be clobbered by a consumer (mirrors Message / Bubble). The styling
    // `data-kind` / `data-state` / `data-direction` etc. flow through `...props`
    // and are read by the literalized `data-[…]:` variants above.
    <Tag
      {...props}
      data-slot="marker"
      data-variant={variant}
      className={cn(markerVariants({ variant }), className)}
    />
  );
}

/**
 * Tool-result preview surfaces (issue #332, PR4).
 *
 * Retires the bespoke `OverlayPreview` family shell CSS — the shared
 * height-bounded `.vera-overlay-preview` base + `.vera-overlay-close`, the
 * structured cards (`.vera-tool-diff*`, `.vera-tool-terminal*`,
 * `.vera-explore-agent-*` / `.vera-subagent-preview`,
 * `.vera-web-search-*`), and the separate `.vera-load-tool-*` result card —
 * represented by package-owned semantic classes in `styles.css`.
 *
 * Two structural notes:
 *   1. The chat structured cards carry BOTH the shared `overlay` base AND a kind
 *      part (the retired DOM had `class="vera-overlay-preview vera-tool-diff"`),
 *      applied as `cn(previewVariants({part:'overlay'}), previewVariants({part:'diff'}))`.
 *      The kind class follows the shared base and may refine it by normal CSS
 *      source order.
 *   2. Leaf rules authored as descendant selectors on bare tags (e.g.
 *      `.vera-explore-agent-section li`, `.vera-web-search-preview > header strong`)
 *      remain descendants of the stable semantic container class.
 *
 * Unlike the other tables, `previewVariants` IS exported on the `@vera/ui` barrel
 * (`index.ts`): the file-diff `diff` / `diff-body` / `diff-line` parts have a
 * SECOND, cross-package consumer — `vera-desktop`'s `artifact-preview.tsx`, whose
 * non-chat diff pane shared the retired `.vera-tool-diff*` shell and co-migrates
 * here. That second consumer is exactly the condition the off-barrel convention
 * named for promotion, so the export is the rule, not an exception.
 *
 * Preview card shells use the shared shadow-ring recipe instead of hard visual
 * borders. Dividers inside the cards remain real borders because they separate
 * rows and headers.
 */
const PREVIEW_PART_CLASSES = {
      // ── shared base ──────────────────────────────────────────────────────
      // `.vera-overlay-preview` — the height-bounded mono container every
      // overlay preview shares.
      overlay:
        "vera-overlay-preview",
      // Overlay placement only; Button owns the dismiss action's proportions.
      close: "vera-overlay-close",

      // ── file diff (shared with vera-desktop artifact-preview) ─────────────
      // `.vera-tool-diff` — the card shell. `[white-space:normal]` overrides the
      // overlay base's pre-wrap on the chat consumer.
      diff:
        "vera-tool-diff",
      // `.vera-tool-diff-paths` (+ its bare `code` children).
      "diff-paths":
        "vera-tool-diff-paths",
      // `.vera-tool-diff-body` — the scrolling mono `<pre>`.
      "diff-body":
        "vera-tool-diff-body",
      // `.vera-tool-diff-line` (+ the `[data-line]` add/del/hunk/meta/ctx tints).
      "diff-line":
        "vera-tool-diff-line",

      // ── terminal ──────────────────────────────────────────────────────────
      // `.vera-tool-terminal` — same card shell as diff.
      terminal:
        "vera-tool-terminal",
      // `.vera-tool-terminal-head`
      "terminal-head":
        "vera-tool-terminal-head",
      // `.vera-tool-terminal-cwd`
      "terminal-cwd": "vera-tool-terminal-cwd",
      // `.vera-tool-terminal-cmd` — the ellipsized command line.
      "terminal-cmd":
        "vera-tool-terminal-cmd",
      // `.vera-tool-terminal-exit` (+ the `[data-ok]` success/failure badge).
      "terminal-exit":
        "vera-tool-terminal-exit",
      // `.vera-tool-terminal-empty`
      "terminal-empty":
        "vera-tool-terminal-empty",
      // `.vera-tool-terminal-stream` (+ the `[data-stream]` stdout/stderr tone).
      "terminal-stream":
        "vera-tool-terminal-stream",
      // `.vera-tool-terminal-truncated-note` (+ its `> span` min-width reset).
      "terminal-truncated-note":
        "vera-tool-terminal-truncated-note",
      // `.vera-tool-terminal-copy` (UiButton) + the shared copy-state tints.
      "terminal-copy":
        "vera-tool-terminal-copy",

      // ── explore agent / subagent (shared shell) ───────────────────────────
      // `.vera-explore-agent-preview, .vera-subagent-preview` (+ the fault
      // border, keyed on explore's `[data-ok=false]` or subagent's failed /
      // cancelled `[data-status]`).
      agent:
        "vera-agent-preview",
      // `.vera-explore-agent-head` (+ its `strong` title and `small` caption,
      // the latter shared with the nested summary-line small).
      "agent-head":
        "vera-agent-preview-head",
      // `.vera-explore-agent-summary-line` (+ its `small` ellipsis, layered over
      // the head's caption styling above).
      "agent-summary-line":
        "vera-agent-preview-summary-line",
      // `.vera-explore-agent-actions`
      "agent-actions": "vera-agent-preview-actions",
      // `.vera-explore-agent-message`
      "agent-message":
        "vera-agent-preview-message",
      // `.vera-explore-agent-meta` (+ its `div` cells, `dt` labels, `dd` values).
      "agent-meta":
        "vera-agent-preview-meta",
      // `.vera-explore-agent-section` (+ its direct `> strong`, list `ul`/`li`
      // rows, leading `li` reset, `code` / `small` / `p` / `span` leaves).
      "agent-section":
        "vera-agent-preview-section",
      // `.vera-explore-agent-section-head` (+ its `> strong`).
      "agent-section-head":
        "vera-agent-preview-section-head",
      // `.vera-explore-agent-copy` (UiButton) + the copied / shared copy-state tints.
      "agent-copy":
        "vera-agent-preview-copy",

      // ── web search ────────────────────────────────────────────────────────
      // `.vera-web-search-preview` (+ its bare `> header` / list leaves; the
      // container inherits the overlay base's mono font, never resetting it).
      "web-search":
        "vera-web-search-preview",
      // `.vera-web-search-error` — the destructive container tint.
      "web-search-error":
        "vera-web-search-error",
      // `.vera-web-search-error-message`
      "web-search-error-message":
        "vera-web-search-error-message",
      // `.vera-web-search-error-repair`
      "web-search-error-repair":
        "vera-web-search-error-repair",

      // ── load-tool result card (separate base; not an overlay) ─────────────
      // `.vera-load-tool-preview` (+ its `p` margin reset).
      "load-tool":
        "vera-load-tool-preview",
      // `.vera-load-tool-title`
      "load-tool-title": "vera-load-tool-title",
      // `.vera-load-tool-count`
      "load-tool-count": "vera-load-tool-count",
} as const;

type PreviewPart = keyof typeof PREVIEW_PART_CLASSES;
const previewVariants = ({ part }: { part: PreviewPart }): string => PREVIEW_PART_CLASSES[part];

export { previewVariants };
