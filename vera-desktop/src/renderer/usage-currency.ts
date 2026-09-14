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

// Usage costs arrive from the Host in USD (pricing tables are USD per MTok),
// but the UI reports them in CNY. The conversion is display-only: the ledger
// keeps USD so switching this constant never rewrites recorded history.
// Rate: 1 USD ≈ 7.2 CNY (2026-09 board rate; update here when it drifts).
export const USD_TO_CNY_RATE = 7.2;

/** Format a USD cost as a CNY string with the ¥ prefix. */
export function formatCny(usd: number, digits = 2): string {
  return `¥${(usd * USD_TO_CNY_RATE).toFixed(digits)}`;
}
