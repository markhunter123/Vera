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

import { buildComputerUseTools, type ComputerUseToolSet } from '@vera/runtime/computer-use-tools';
import { type CuOverlayHook, type CuDispatchBackend } from '@vera/runtime/computer-use-types';
import { createVeraCuBackend } from './vera-cu-backend.js';
import type { VeraCuBackendOptions } from './vera-cu-backend.js';
import type { VeraCuServiceSnapshot } from './vera-cu-service.js';

/**
 * One executor.
 *
 * This was a two-member set while cua-driver was being replaced, and the
 * selector took an overload per member. Keeping the id now that the second
 * executor is gone is not ceremony: `backendId` is what the capability snapshot
 * reports and what `'none'` is distinguished from, so it stays a named value
 * rather than becoming a boolean nobody can read.
 */
export const CU_BACKEND_IDS = ['vera-cu'] as const;
export type CuBackendId = (typeof CU_BACKEND_IDS)[number];

export const DEFAULT_CU_BACKEND_ID: CuBackendId = 'vera-cu';

type DisposableBackend = CuDispatchBackend & {
  clearSession?: (sessionId: string) => void;
  dispose?: () => void;
  /** vera-cu supervises one child, not a role pair, so it reports its own shape. */
  executorState?: () => VeraCuServiceSnapshot;
};

export interface SelectedComputerUseBackend {
  backend?: DisposableBackend;
  tools: ComputerUseToolSet;
  backendId: CuBackendId | 'none';
}

function emptyTools(): ComputerUseToolSet {
  const tools = [] as unknown as ComputerUseToolSet;
  tools.clearSession = () => {};
  const snapshot = () => ({ status: 'unobserved' as const, generation: 0 });
  tools.sessionEvents = {
    snapshot,
    physicalUserIntervened: snapshot,
    interventionDebounceElapsed: snapshot,
    reobserveRequired: snapshot,
    screenLocked: snapshot,
    screenUnlocked: snapshot,
    blockedUrlDetected: snapshot,
    userStopped: snapshot,
    dynamicContentChanged: snapshot,
  };
  return tools;
}

const NONE: SelectedComputerUseBackend = {
  backend: undefined,
  tools: emptyTools(),
  backendId: 'none',
};

export interface VeraCuSelection {
  /** Omitted means the default; see `DEFAULT_CU_BACKEND_ID`. */
  backendId?: 'vera-cu';
  binaryPath?: string;
  expectedBinarySha256?: string;
  compressFrame?: (
    base64: string,
    mimeType: string,
  ) => { base64: string; mimeType: 'image/png' | 'image/jpeg' };
  physicalInputRecentlyActive?: () => boolean | Promise<boolean>;
  /**
   * Whether the machine is locked. Handed to the tool layer rather than to the
   * driver, because the refusal is a session-state decision (see
   * `buildComputerUseTools`) and the driver has no session state to latch it in.
   */
  screenLocked?: (context: { sessionId: string }) => boolean | Promise<boolean>;
  overlay?: CuOverlayHook;
  onTrace?: VeraCuBackendOptions['onTrace'];
  /**
   * Coordinate and key dispatch post synthetic events. Off unless a host policy
   * says otherwise; the model-facing contract already states they fail closed.
   */
  allowCompatibilityInputDispatch?: boolean;
  createBackend?: (options: VeraCuBackendOptions) => DisposableBackend;
}

export type ComputerUseBackendSelection = VeraCuSelection;

export function selectComputerUseBackend(deps?: VeraCuSelection): SelectedComputerUseBackend {
  if (process.platform !== 'darwin') return NONE;
  if (!deps?.binaryPath || !deps.expectedBinarySha256) return NONE;
  const binaryPath = deps.binaryPath;
  const expectedBinarySha256 = deps.expectedBinarySha256;
  try {
    let tools: ComputerUseToolSet | undefined;
    const backend = (deps.createBackend ?? createVeraCuBackend)({
      binaryPath,
      expectedBinarySha256,
      ...(deps.compressFrame ? { compressFrame: deps.compressFrame } : {}),
      ...(deps.physicalInputRecentlyActive
        ? { physicalInputRecentlyActive: deps.physicalInputRecentlyActive }
        : {}),
      ...(deps.onTrace ? { onTrace: deps.onTrace } : {}),
      ...(deps.allowCompatibilityInputDispatch === undefined
        ? {}
        : { allowCompatibilityInputDispatch: deps.allowCompatibilityInputDispatch }),
      onSessionInvalidated: ({ sessionId }) => {
        tools?.sessionEvents.reobserveRequired(sessionId);
      },
    });
    tools = buildComputerUseTools({
      backend,
      ...(deps.overlay ? { overlay: deps.overlay } : {}),
      ...(deps.screenLocked ? { screenLocked: deps.screenLocked } : {}),
    });
    return { backend, tools, backendId: DEFAULT_CU_BACKEND_ID };
  } catch {
    return NONE;
  }
}
