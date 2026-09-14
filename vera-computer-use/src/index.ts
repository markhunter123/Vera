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

export {
  selectComputerUseBackend,
  CU_BACKEND_IDS,
  DEFAULT_CU_BACKEND_ID,
} from './select-backend.js';
export type {
  ComputerUseBackendSelection,
  CuBackendId,
  VeraCuSelection,
  SelectedComputerUseBackend,
} from './select-backend.js';

export { createVeraCuBackend } from './vera-cu-backend.js';
export type { VeraCuBackendOptions, VeraCuTraceEvent } from './vera-cu-backend.js';
export {
  VeraCuLifecycleError,
  VeraCuRpcError,
  VeraCuService,
  isVeraCuLifecycleError,
} from './vera-cu-service.js';
export type {
  VeraCuCapabilities,
  VeraCuHandshake,
  VeraCuLimits,
  VeraCuReleaseEvent,
  VeraCuServiceOptions,
  VeraCuServiceSnapshot,
} from './vera-cu-service.js';
export {
  VERA_CU_PROTOCOL_VERSION,
  VERA_CU_RPC_ERROR,
  VeraCuProtocolViolation,
  mapVeraCuDomainError,
  readDispatchResult,
  readEnvelope,
  readSnapshot,
} from './vera-cu-protocol.js';
export type {
  VeraCuDispatchResult,
  VeraCuDomainError,
  VeraCuElement,
  VeraCuEnvelope,
  VeraCuSnapshot,
} from './vera-cu-protocol.js';
export { decodeJsonLines } from './stdio-json-rpc.js';
export type { HostLifecycleErrorCode, HostRequestStage } from './stdio-json-rpc.js';

export { resolveCuaDisplaySnapshots } from './display-snapshot.js';
export type { CuaHostDisplay } from './display-snapshot.js';
export { createComputerUseOverlayHook } from './computer-use-overlay-hook.js';
export type {
  CursorActionKind,
  CursorCancelInput,
  CursorCompleteInput,
  CursorMoveInput,
  OverlayCursorSink,
} from './computer-use-overlay-hook.js';
