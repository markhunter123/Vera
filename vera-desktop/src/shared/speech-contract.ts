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
 * Renderer ↔ main contract for voice input (speech-to-text).
 *
 * Secrets never cross back to the renderer: configuration writes go
 * forward into the desktop credential store, reads return only a
 * masked SecretId for display, and transcription sends audio one way.
 * Failure reasons are stable slugs so the renderer can map them to
 * localized copy without parsing error strings.
 */

export interface SpeechSttConfigStatus {
  readonly configured: boolean;
  /** `AKIDxxxx…wxyz` — safe for display; null when unconfigured. */
  readonly secretIdMasked: string | null;
}

export interface SpeechSttConfigureInput {
  readonly secretId: string;
  readonly secretKey: string;
}

export type SpeechSttConfigureResult =
  | { readonly ok: true; readonly secretIdMasked: string }
  | { readonly ok: false; readonly field: 'secretId' | 'secretKey' };

export type SpeechSttTranscribeFailure =
  | 'not_configured'
  | 'invalid_audio'
  | 'audio_too_long'
  | 'api_error'
  | 'network_error';

export type SpeechSttTranscribeResult =
  | {
      readonly ok: true;
      readonly text: string;
      /** Recognized audio length in ms, when the API reports it. */
      readonly audioDurationMs: number | null;
    }
  | {
      readonly ok: false;
      readonly reason: SpeechSttTranscribeFailure;
      /** Non-localized detail for logs/toast tails; may be absent. */
      readonly message?: string;
    };

/** Show first 8 + last 4 characters; SecretIds are `AKID…` prefixed. */
export function maskSecretId(secretId: string): string {
  if (secretId.length <= 12) return '…';
  return `${secretId.slice(0, 8)}…${secretId.slice(-4)}`;
}
