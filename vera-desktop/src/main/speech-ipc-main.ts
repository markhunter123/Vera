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

import type { CredentialStore } from "@vera/storage/credential-store";
import type { IpcMain } from "electron";
import {
  maskSecretId,
  type SpeechSttConfigStatus,
  type SpeechSttConfigureResult,
  type SpeechSttTranscribeResult,
} from "../shared/speech-contract.js";
import {
  TencentAsrError,
  transcribeWithTencentAsr,
} from "./speech-stt-tencent.js";

/**
 * Voice-input IPC: settings form writes Tencent Cloud ASR credentials
 * into the desktop credential store (never settings.json — that file
 * flows through config-transfer export), reads give back only a masked
 * SecretId, and transcription takes the renderer's recorded WAV and
 * returns text. Handlers never throw to the renderer: failures come
 * back as `{ ok: false, reason }` so the UI maps them to localized copy.
 */

const STT_SLUG = "tencent-asr";
const STT_KIND = "stt_credentials" as const;
/** 一句话识别 hard limit: audio ≤ 60 s and ≤ 3 MB. */
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

interface StoredSttCredentials {
  readonly secretId: string;
  readonly secretKey: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStoredSttCredentials(value: unknown): value is StoredSttCredentials {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return isNonEmptyString(candidate.secretId) && isNonEmptyString(candidate.secretKey);
}

async function loadSttCredentials(
  credentialStore: CredentialStore,
): Promise<StoredSttCredentials | null> {
  const raw = await credentialStore.getSecret(STT_SLUG, STT_KIND);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSttCredentials(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function registerSpeechIpc(deps: {
  readonly ipcMain: Pick<IpcMain, "handle">;
  readonly credentialStore: CredentialStore;
}): void {
  deps.ipcMain.handle("speech:configStatus", async (): Promise<SpeechSttConfigStatus> => {
    const stored = await loadSttCredentials(deps.credentialStore);
    return {
      configured: stored !== null,
      secretIdMasked: stored ? maskSecretId(stored.secretId) : null,
    };
  });

  deps.ipcMain.handle(
    "speech:configure",
    async (_event, input: unknown): Promise<SpeechSttConfigureResult> => {
      const candidate = (input ?? null) as Record<string, unknown> | null;
      const secretId = candidate?.secretId;
      const secretKey = candidate?.secretKey;
      if (!isNonEmptyString(secretId)) {
        return { ok: false, field: "secretId" };
      }
      if (!isNonEmptyString(secretKey)) {
        return { ok: false, field: "secretKey" };
      }
      await deps.credentialStore.setSecret(
        STT_SLUG,
        STT_KIND,
        JSON.stringify({ secretId: secretId.trim(), secretKey: secretKey.trim() }),
      );
      return { ok: true, secretIdMasked: maskSecretId(secretId.trim()) };
    },
  );

  deps.ipcMain.handle("speech:clearConfig", async (): Promise<void> => {
    await deps.credentialStore.deleteSecret(STT_SLUG, STT_KIND);
  });

  deps.ipcMain.handle(
    "speech:transcribe",
    async (_event, input: unknown): Promise<SpeechSttTranscribeResult> => {
      const stored = await loadSttCredentials(deps.credentialStore);
      if (stored === null) {
        return { ok: false, reason: "not_configured" };
      }
      const audio = extractAudioBytes(input);
      if (audio === null) {
        return { ok: false, reason: "invalid_audio" };
      }
      if (audio.byteLength === 0) {
        return { ok: false, reason: "invalid_audio", message: "empty audio" };
      }
      if (audio.byteLength > MAX_AUDIO_BYTES) {
        return { ok: false, reason: "audio_too_long" };
      }
      try {
        const output = await transcribeWithTencentAsr(stored, { audio });
        return {
          ok: true,
          text: output.text,
          audioDurationMs: output.audioDurationMs,
        };
      } catch (error) {
        if (error instanceof TencentAsrError) {
          if (error.code === "InvalidParameterValue.ErrorVoicedataTooLong") {
            return { ok: false, reason: "audio_too_long" };
          }
          return {
            ok: false,
            reason: "api_error",
            message: `${error.code}: ${error.message}`,
          };
        }
        return {
          ok: false,
          reason: "network_error",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
}

/** The renderer sends `{ audio: Uint8Array }`; accept ArrayBuffer too,
 *  since structured clone over IPC preserves both shapes. */
function extractAudioBytes(input: unknown): Uint8Array | null {
  if (input === null || typeof input !== "object") return null;
  const candidate = (input as Record<string, unknown>).audio;
  if (candidate instanceof Uint8Array) return candidate;
  if (candidate instanceof ArrayBuffer) return new Uint8Array(candidate);
  return null;
}
