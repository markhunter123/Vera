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

import { createHash, createHmac } from "node:crypto";

/**
 * Tencent Cloud one-shot speech recognition (一句话识别) client — the
 * `SentenceRecognition` API 3.0 action, signed with TC3-HMAC-SHA256.
 * Hand-rolled instead of pulling `tencentcloud-sdk-nodejs`: one action,
 * one request shape, and the signing chain is ~20 lines of node:crypto.
 * `fetchImpl` is injectable so the signing and response mapping are
 * testable without network.
 *
 * Docs: https://cloud.tencent.com/document/product/1093/35646 (API),
 * /document/api/1093/35640 (TC3 signature). No Region, no AppId: the
 * account is identified by the SecretId alone.
 */

const ENDPOINT = "https://asr.tencentcloudapi.com";
const HOST = "asr.tencentcloudapi.com";
const SERVICE = "asr";
const ACTION = "SentenceRecognition";
const VERSION = "2019-06-14";
const REQUEST_TIMEOUT_MS = 60_000;

export interface TencentAsrCredentials {
  readonly secretId: string;
  readonly secretKey: string;
}

export interface TencentAsrTranscribeInput {
  /** Raw audio bytes (16 kHz / 16-bit / mono WAV from the renderer). */
  readonly audio: Uint8Array;
  /** Defaults to `wav`, matching the renderer recorder. */
  readonly voiceFormat?: string;
  /** Defaults to `16k_zh` (中文普通话). */
  readonly engineType?: string;
}

export interface TencentAsrTranscribeOutput {
  readonly text: string;
  readonly audioDurationMs: number | null;
}

export class TencentAsrError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "TencentAsrError";
    this.code = code;
  }
}

function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

export async function transcribeWithTencentAsr(
  credentials: TencentAsrCredentials,
  input: TencentAsrTranscribeInput,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<TencentAsrTranscribeOutput> {
  const payload = JSON.stringify({
    EngSerViceType: input.engineType ?? "16k_zh",
    SourceType: 1,
    VoiceFormat: input.voiceFormat ?? "wav",
    Data: Buffer.from(input.audio).toString("base64"),
    DataLen: input.audio.byteLength,
    // 保留标点 keeps recognized text readable in the chat composer;
    // 数字转阿拉伯数字 is the API default, made explicit.
    FilterPunc: 2,
    ConvertNumMode: 1,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

  // Canonical request per the TC3 spec: sorted lowercase headers, each
  // `name:value\n` (value trimmed), then signed headers and the payload
  // hash. The Host header is signed here but supplied by the HTTP stack,
  // which derives it from the URL.
  const canonicalHeaders =
    `content-type:application/json; charset=utf-8\n` +
    `host:${HOST}\n` +
    `x-tc-action:${ACTION.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(payload)}`;

  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign =
    `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const kDate = hmacSha256(`TC3${credentials.secretKey}`, date);
  const kService = hmacSha256(kDate, SERVICE);
  const kSigning = hmacSha256(kService, "tc3_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");
  const authorization =
    `TC3-HMAC-SHA256 Credential=${credentials.secretId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let response: Response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-TC-Action": ACTION,
        "X-TC-Version": VERSION,
        "X-TC-Timestamp": String(timestamp),
        Authorization: authorization,
      },
      body: payload,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new TencentAsrError("TimeoutError", "请求超时");
    }
    throw new TencentAsrError(
      "NetworkError",
      error instanceof Error ? error.message : String(error),
    );
  }

  const bodyText = await response.text();
  let parsed: {
    Response?: {
      Result?: unknown;
      AudioDuration?: unknown;
      Error?: { Code?: unknown; Message?: unknown };
    };
  };
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new TencentAsrError(
      "InvalidResponse",
      `Unexpected ASR response (HTTP ${response.status})`,
    );
  }
  const result = parsed.Response;
  if (result?.Error) {
    throw new TencentAsrError(
      typeof result.Error.Code === "string" ? result.Error.Code : "Unknown",
      typeof result.Error.Message === "string"
        ? result.Error.Message
        : "Unknown ASR error",
    );
  }
  if (typeof result?.Result !== "string") {
    throw new TencentAsrError(
      "InvalidResponse",
      `ASR response missing Result (HTTP ${response.status})`,
    );
  }
  return {
    text: result.Result.trim(),
    audioDurationMs:
      typeof result.AudioDuration === "number" ? result.AudioDuration : null,
  };
}
