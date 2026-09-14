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

// vera-ui/src/primitives/stat-tile.tsx
//
// The shared implementation for "big number + label (+ detail)" stat tiles. Before
// this, four near-identical recipes lived in page CSS (permission summary,
// health summary — literal twins — plus the filled MetricCard and the
// daily-review totals cell).
//
// Recipe decisions (union of the twins):
//   - value is tabular-nums ALWAYS (tabular-nums-converge contract);
//   - emphasis="outline" = card-like tile (hairline + radius-surface +
//     1.5em value); emphasis="filled" = compact quiet tile (foreground-5
//     wash + radius-control + ui-size value) for dense metric strips;
//   - tone paints the value ink AND (outline only) tints the border —
//     the health model, which scans better than value-only;
//   - a ZERO count is not an exception: numeric zero drops the tone to
//     neutral and sets data-empty (dim) — the permission rationale
//     (0 已拒绝 in red read as a false alarm) now applies everywhere.
//
// Styled with package-owned semantic classes so the primitive is portable; wrapper
// classes from call sites (grid placement, page pins) pass through.

import type { ReactNode } from 'react';
import { cn } from '../utils.js';

export type StatTileTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive';

const TONE_VALUE_CLASS: Record<StatTileTone, string> = {
  neutral: '',
  info: 'vera-stat-tile-value-info',
  success: 'vera-stat-tile-value-success',
  warning: 'vera-stat-tile-value-warning',
  destructive: 'vera-stat-tile-value-destructive',
};

const TONE_BORDER_CLASS: Record<StatTileTone, string> = {
  neutral: '',
  info: 'vera-stat-tile-border-info',
  success: 'vera-stat-tile-border-success',
  warning: 'vera-stat-tile-border-warning',
  destructive: 'vera-stat-tile-border-destructive',
};

export interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Optional third quiet line under the label (MetricCard's detail). */
  detail?: ReactNode;
  tone?: StatTileTone;
  /** outline = card tile (permission/health); filled = compact metric strip. */
  emphasis?: 'outline' | 'filled';
  /** Numeric zero drops tone to neutral + dims (data-empty). Default on. */
  zeroNeutral?: boolean;
  as?: 'div' | 'li';
  className?: string;
}

export function StatTile({
  label,
  value,
  detail,
  tone = 'neutral',
  emphasis = 'outline',
  zeroNeutral = true,
  as: Tag = 'div',
  className,
}: StatTileProps) {
  const isEmptyCount = zeroNeutral && typeof value === 'number' && value === 0;
  const effectiveTone: StatTileTone = isEmptyCount ? 'neutral' : tone;
  return (
    <Tag
      className={cn(
        'vera-stat-tile',
        emphasis === 'outline'
          ? 'vera-stat-tile-outline'
          : 'vera-stat-tile-filled',
        emphasis === 'outline' ? TONE_BORDER_CLASS[effectiveTone] : '',
        isEmptyCount ? 'vera-stat-tile-empty' : '',
        className,
      )}
      data-slot="stat-tile"
      data-tone={effectiveTone}
      data-empty={isEmptyCount ? 'true' : undefined}
    >
      <span
        className={cn(
          'vera-stat-tile-value',
          emphasis === 'outline' ? 'vera-stat-tile-value-outline' : 'vera-stat-tile-value-filled',
          TONE_VALUE_CLASS[effectiveTone],
        )}
        data-slot="stat-tile-value"
      >
        {value}
      </span>
      <span
        className="vera-stat-tile-label"
        data-slot="stat-tile-label"
      >
        {label}
      </span>
      {detail != null && (
        <span
          className="vera-stat-tile-detail"
          data-slot="stat-tile-detail"
        >
          {detail}
        </span>
      )}
    </Tag>
  );
}
