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
 * The Vera wordmark — our own brand asset, not a generic UI icon.
 *
 * Lives beside `bot-brand-logo.tsx` for the same reason: `icons.tsx` is a
 * pass-through to lucide-react for generic UI glyphs, while fixed product
 * assets carry their own module.
 *
 * Outlines are generated from Nunito 700 (rounded letterforms matching the
 * original brand style) and scale into the 460:120 viewBox below; the same
 * paths render the lockup in `vera-desktop/assets/icon.png`, so the
 * empty-state mark and the dock icon cannot drift apart. Paths are filled
 * with `currentColor` so the mark inherits the surface's text colour and
 * works in both themes; callers set the opacity they want rather than
 * baking a tint in here.
 */

import type { CSSProperties } from 'react';

export interface VeraWordmarkProps {
  /** Rendered width in px; height follows the 460:120 aspect ratio. */
  width?: number | string;
  className?: string;
  style?: CSSProperties;
  /**
   * Accessible name. Omit it (the default) for decorative use — the mark
   * then renders `aria-hidden`, because the surrounding hero already names
   * the surface and a second "Vera" announcement is just noise.
   */
  title?: string;
}

export function VeraWordmark({ width = 104, className, style, title }: VeraWordmarkProps) {
  return (
    <svg
      viewBox="0 0 460 120"
      width={width}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <g fill="currentColor" stroke="none">
        <path d="M134.419 111.120Q130.639 111.120 128.189 109.370Q125.739 107.620 124.199 104.120L87.659 22.080Q86.119 18.580 86.819 15.920Q87.519 13.260 89.759 11.720Q91.999 10.180 95.079 10.180Q99.139 10.180 101.169 11.930Q103.199 13.680 104.599 17.180L137.779 94.040L131.759 94.040L164.799 17.040Q166.339 13.680 168.439 11.930Q170.539 10.180 174.319 10.180Q177.399 10.180 179.429 11.720Q181.459 13.260 182.019 15.920Q182.579 18.580 181.039 22.080L144.499 104.120Q142.959 107.620 140.649 109.370Q138.339 111.120 134.419 111.120M218.279 111.400Q206.659 111.400 198.259 107.060Q189.859 102.720 185.309 94.740Q180.759 86.760 180.759 75.840Q180.759 65.200 185.169 57.220Q189.579 49.240 197.349 44.690Q205.119 40.140 215.059 40.140Q222.339 40.140 228.149 42.520Q233.959 44.900 238.089 49.380Q242.219 53.860 244.389 60.230Q246.559 66.600 246.559 74.580Q246.559 77.100 244.809 78.430Q243.059 79.760 239.839 79.760L194.899 79.760L194.899 69.680L234.239 69.680L231.999 71.780Q231.999 65.340 230.109 61Q228.219 56.660 224.649 54.350Q221.079 52.040 215.759 52.040Q209.879 52.040 205.749 54.770Q201.619 57.500 199.449 62.470Q197.279 67.440 197.279 74.300L197.279 75.280Q197.279 86.760 202.669 92.430Q208.059 98.100 218.559 98.100Q222.199 98.100 226.749 97.190Q231.299 96.280 235.359 94.040Q238.299 92.360 240.539 92.570Q242.779 92.780 244.109 94.180Q245.439 95.580 245.719 97.610Q245.999 99.640 244.949 101.740Q243.899 103.840 241.379 105.380Q236.479 108.460 230.109 109.930Q223.739 111.400 218.279 111.400M269.379 111.120Q265.039 111.120 262.729 108.810Q260.419 106.500 260.419 102.160L260.419 49.240Q260.419 44.900 262.659 42.660Q264.899 40.420 268.959 40.420Q273.019 40.420 275.259 42.660Q277.499 44.900 277.499 49.240L277.499 58.060L276.099 58.060Q278.059 49.660 283.799 45.320Q289.539 40.980 299.059 40.140Q301.999 39.860 303.749 41.610Q305.499 43.360 305.779 47Q306.059 50.500 304.169 52.670Q302.279 54.840 298.499 55.260L295.419 55.540Q286.879 56.380 282.539 60.790Q278.199 65.200 278.199 73.180L278.199 102.160Q278.199 106.500 275.959 108.810Q273.719 111.120 269.379 111.120M337.139 111.400Q329.719 111.400 323.909 108.530Q318.099 105.660 314.809 100.760Q311.519 95.860 311.519 89.700Q311.519 82.140 315.439 77.730Q319.359 73.320 328.179 71.360Q336.999 69.400 351.839 69.400L358.839 69.400L358.839 79.480L351.979 79.480Q343.299 79.480 338.119 80.320Q332.939 81.160 330.769 83.190Q328.599 85.220 328.599 88.860Q328.599 93.480 331.819 96.420Q335.039 99.360 340.779 99.360Q345.399 99.360 348.969 97.190Q352.539 95.020 354.639 91.240Q356.739 87.460 356.739 82.560L356.739 66.460Q356.739 59.460 353.659 56.380Q350.579 53.300 343.299 53.300Q339.239 53.300 334.549 54.280Q329.859 55.260 324.679 57.640Q322.019 58.900 319.989 58.340Q317.959 57.780 316.839 56.030Q315.719 54.280 315.719 52.180Q315.719 50.080 316.839 48.050Q317.959 46.020 320.619 45.040Q327.059 42.380 333.009 41.260Q338.959 40.140 343.859 40.140Q353.939 40.140 360.449 43.220Q366.959 46.300 370.179 52.530Q373.399 58.760 373.399 68.560L373.399 102.160Q373.399 106.500 371.299 108.810Q369.199 111.120 365.279 111.120Q361.359 111.120 359.189 108.810Q357.019 106.500 357.019 102.160L357.019 95.440L358.139 95.440Q357.159 100.340 354.289 103.910Q351.419 107.480 347.079 109.440Q342.739 111.400 337.139 111.400" />
      </g>
    </svg>
  );
}
