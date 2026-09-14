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

/**
 * Regenerate the canonical brand assets:
 *   vera-desktop/assets/icon.png          — 1024x1024 transparent app mark
 *   .github/assets/vera-hero.en.png       — 1774x887 English banner
 *   .github/assets/vera-hero.zh-CN.png    — 1774x887 Chinese banner
 *
 * The diamond mark geometry is shared with scripts/generate-app-icons.py via
 * the exported SVGs below (same constants, duplicated here so the mark and
 * the lockup render from one place at asset time). The wordmark paths are
 * generated from Nunito 700 (rounded letterforms matching the original brand
 * style) and shared with vera-ui/src/vera-wordmark.tsx.
 *
 * Requires the Playwright chromium browser (bundled with the desktop suite).
 */

import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

// ---- diamond mark geometry (must match scripts/generate-app-icons.py) ------
const STROKE = 52;
const CHEV_TOP = [[335, 474], [512, 257], [689, 474]];
const CHEV_BOT = [[335, 550], [512, 767], [689, 550]];
const MARK_BOX = {
  x: CHEV_TOP[0][0] - STROKE / 2,
  y: CHEV_TOP[1][1] - STROKE / 2,
  w: CHEV_TOP[2][0] - CHEV_TOP[0][0] + STROKE,
  h: CHEV_BOT[1][1] - CHEV_TOP[1][1] + STROKE,
};

function markPaths(colors) {
  const chevron = (points, color) =>
    `<path d="M ${points.map((p) => `${p[0]} ${p[1]}`).join(' L ')}" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="butt" stroke-linejoin="miter" fill="none"/>`;
  return (
    chevron(CHEV_TOP, colors.tip) +
    chevron(CHEV_BOT, colors.body)
  );
}

const WORDMARK_PATHS = `M134.419 111.120Q130.639 111.120 128.189 109.370Q125.739 107.620 124.199 104.120L87.659 22.080Q86.119 18.580 86.819 15.920Q87.519 13.260 89.759 11.720Q91.999 10.180 95.079 10.180Q99.139 10.180 101.169 11.930Q103.199 13.680 104.599 17.180L137.779 94.040L131.759 94.040L164.799 17.040Q166.339 13.680 168.439 11.930Q170.539 10.180 174.319 10.180Q177.399 10.180 179.429 11.720Q181.459 13.260 182.019 15.920Q182.579 18.580 181.039 22.080L144.499 104.120Q142.959 107.620 140.649 109.370Q138.339 111.120 134.419 111.120M218.279 111.400Q206.659 111.400 198.259 107.060Q189.859 102.720 185.309 94.740Q180.759 86.760 180.759 75.840Q180.759 65.200 185.169 57.220Q189.579 49.240 197.349 44.690Q205.119 40.140 215.059 40.140Q222.339 40.140 228.149 42.520Q233.959 44.900 238.089 49.380Q242.219 53.860 244.389 60.230Q246.559 66.600 246.559 74.580Q246.559 77.100 244.809 78.430Q243.059 79.760 239.839 79.760L194.899 79.760L194.899 69.680L234.239 69.680L231.999 71.780Q231.999 65.340 230.109 61Q228.219 56.660 224.649 54.350Q221.079 52.040 215.759 52.040Q209.879 52.040 205.749 54.770Q201.619 57.500 199.449 62.470Q197.279 67.440 197.279 74.300L197.279 75.280Q197.279 86.760 202.669 92.430Q208.059 98.100 218.559 98.100Q222.199 98.100 226.749 97.190Q231.299 96.280 235.359 94.040Q238.299 92.360 240.539 92.570Q242.779 92.780 244.109 94.180Q245.439 95.580 245.719 97.610Q245.999 99.640 244.949 101.740Q243.899 103.840 241.379 105.380Q236.479 108.460 230.109 109.930Q223.739 111.400 218.279 111.400M269.379 111.120Q265.039 111.120 262.729 108.810Q260.419 106.500 260.419 102.160L260.419 49.240Q260.419 44.900 262.659 42.660Q264.899 40.420 268.959 40.420Q273.019 40.420 275.259 42.660Q277.499 44.900 277.499 49.240L277.499 58.060L276.099 58.060Q278.059 49.660 283.799 45.320Q289.539 40.980 299.059 40.140Q301.999 39.860 303.749 41.610Q305.499 43.360 305.779 47Q306.059 50.500 304.169 52.670Q302.279 54.840 298.499 55.260L295.419 55.540Q286.879 56.380 282.539 60.790Q278.199 65.200 278.199 73.180L278.199 102.160Q278.199 106.500 275.959 108.810Q273.719 111.120 269.379 111.120M337.139 111.400Q329.719 111.400 323.909 108.530Q318.099 105.660 314.809 100.760Q311.519 95.860 311.519 89.700Q311.519 82.140 315.439 77.730Q319.359 73.320 328.179 71.360Q336.999 69.400 351.839 69.400L358.839 69.400L358.839 79.480L351.979 79.480Q343.299 79.480 338.119 80.320Q332.939 81.160 330.769 83.190Q328.599 85.220 328.599 88.860Q328.599 93.480 331.819 96.420Q335.039 99.360 340.779 99.360Q345.399 99.360 348.969 97.190Q352.539 95.020 354.639 91.240Q356.739 87.460 356.739 82.560L356.739 66.460Q356.739 59.460 353.659 56.380Q350.579 53.300 343.299 53.300Q339.239 53.300 334.549 54.280Q329.859 55.260 324.679 57.640Q322.019 58.900 319.989 58.340Q317.959 57.780 316.839 56.030Q315.719 54.280 315.719 52.180Q315.719 50.080 316.839 48.050Q317.959 46.020 320.619 45.040Q327.059 42.380 333.009 41.260Q338.959 40.140 343.859 40.140Q353.939 40.140 360.449 43.220Q366.959 46.300 370.179 52.530Q373.399 58.760 373.399 68.560L373.399 102.160Q373.399 106.500 371.299 108.810Q369.199 111.120 365.279 111.120Q361.359 111.120 359.189 108.810Q357.019 106.500 357.019 102.160L357.019 95.440L358.139 95.440Q357.159 100.340 354.289 103.910Q351.419 107.480 347.079 109.440Q342.739 111.400 337.139 111.400`;

const wordmark = (x, y, scale, fill = '#FFFFFF') =>
  `<g transform="translate(${x},${y}) scale(${scale})" fill="${fill}" stroke="none">` +
  `<path d="${WORDMARK_PATHS}"/></g>`;

const mark = (x, y, scale, colors) =>
  `<g transform="translate(${x - MARK_BOX.x * scale},${y - MARK_BOX.y * scale}) scale(${scale})">` +
  markPaths(colors) + '</g>';

// ---- icon.png: transparent app mark (no tile, mark only) -------------------
// The apex miter joins extend past the stroke centerline box, so the ink
// bounding box is taller than MARK_BOX; scale and center on the true ink.
function markInkBox() {
  const ax = CHEV_TOP[0][0] - CHEV_TOP[1][0];
  const ay = CHEV_TOP[0][1] - CHEV_TOP[1][1];
  const bx = CHEV_TOP[2][0] - CHEV_TOP[1][0];
  const by = CHEV_TOP[2][1] - CHEV_TOP[1][1];
  const cosA = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
  const miterTip = STROKE / 2 / Math.sqrt((1 - cosA) / 2);
  const top = CHEV_TOP[1][1] - miterTip;
  const bottom = CHEV_BOT[1][1] + miterTip;
  return { x: MARK_BOX.x, y: top, w: MARK_BOX.w, h: bottom - top };
}

function iconSvg() {
  const ink = markInkBox();
  const k = (0.96 * 1024) / ink.h;
  const inkLeft = (1024 - ink.w * k) / 2;
  const inkTop = (1024 - ink.h * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${mark(inkLeft, inkTop + (MARK_BOX.y - ink.y) * k, k, { tip: '#FFFFFF', body: '#1B5EC2' })}
</svg>`;
}

// ---- hero banners -----------------------------------------------------------
function heroSvg(tagline, fontFamily) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1774 887" width="1774" height="887">
  <defs>
    <linearGradient id="bg" x1="80" y1="80" x2="1694" y2="807" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#060B14"/><stop offset="0.55" stop-color="#0A1B36"/><stop offset="1" stop-color="#12315F"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#2F6CF6" stop-opacity="0.32"/><stop offset="1" stop-color="#2F6CF6" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#7FB0FF" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1774" height="887" fill="url(#bg)"/>
  <rect width="1774" height="887" fill="url(#grid)"/>
  <ellipse cx="360" cy="300" rx="640" ry="540" fill="url(#glow)"/>
  <path d="M 0 780 L 480 780 L 590 690 L 780 690" fill="none" stroke="#7FB0FF" stroke-opacity="0.16" stroke-width="2" stroke-linecap="round"/>
  <path d="M 1774 90 L 1620 90 L 1560 150" fill="none" stroke="#7FB0FF" stroke-opacity="0.12" stroke-width="2" stroke-linecap="round"/>
  ${mark(355, 443, 0.60, { tip: '#FFFFFF', body: '#4DA3FF' })}
  ${wordmark(481.1, 240.2, 1.95)}
  <text x="604" y="520" font-family="${fontFamily}" font-size="46" fill="#9DB8E8">${tagline}</text>
  <g>
    <rect x="600" y="576" rx="20" width="128" height="42" fill="none" stroke="#6E9FE8" stroke-opacity="0.45" stroke-width="1.5"/>
    <text x="664" y="605" font-family="${fontFamily}" font-size="26" fill="#6E9FE8" text-anchor="middle">v1.0.0</text>
  </g>
</svg>`;
}

const html = (svg, transparent = false) => `<!DOCTYPE html><html><head><style>
  html,body{margin:0;padding:0;overflow:hidden;background:${transparent ? 'transparent' : '#000'}}
  svg{display:block}
</style></head><body>${svg}</body></html>`;

async function shoot(page, svg, width, height, path, transparent = false) {
  await page.setViewportSize({ width, height });
  await page.setContent(html(svg, transparent), { waitUntil: 'networkidle' });
  await page.locator('svg').waitFor({ state: 'visible' });
  await page.screenshot({ path, omitBackground: transparent });
  console.log(`wrote ${path}`);
}

const out = {
  icon: fileURLToPath(new URL('../vera-desktop/assets/icon.png', import.meta.url)),
  heroEn: fileURLToPath(new URL('../.github/assets/vera-hero.en.png', import.meta.url)),
  heroZh: fileURLToPath(new URL('../.github/assets/vera-hero.zh-CN.png', import.meta.url)),
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await shoot(page, iconSvg(), 1024, 1024, out.icon, true);
  await shoot(page, heroSvg('Your personal AI agent', 'Segoe UI, sans-serif'), 1774, 887, out.heroEn);
  await shoot(page, heroSvg('你的个人 AI 助手', 'Microsoft YaHei, PingFang SC, sans-serif'), 1774, 887, out.heroZh);
} finally {
  await browser.close();
}
console.log('done');
