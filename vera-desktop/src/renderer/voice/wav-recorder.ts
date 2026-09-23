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
 * Microphone → 16 kHz / 16-bit / mono WAV recorder for voice input.
 * The sample rate matches the 一句话识别 engine (`16k_zh`), so the WAV
 * crosses IPC as-is and goes straight into the ASR request — no
 * resampling in the main process.
 *
 * ScriptProcessorNode (deprecated upstream, still universal) over
 * AudioWorklet: a worklet needs its own script file fetched relative to
 * the document, which the sandboxed file:// renderer cannot load
 * cleanly; the processor callback keeps this recorder self-contained.
 * Capture runs only for the seconds a user holds the button, so the
 * main-thread cost is bounded by design.
 */

/** Matches the ASR engine type; also caps the WAV well under the API's
 *  3 MB limit (60 s ≈ 1.9 MB). */
export const VOICE_SAMPLE_RATE = 16_000;
/** 一句话识别 hard cap; the hook auto-stops just under it. */
export const VOICE_MAX_DURATION_MS = 60_000;

/** One active capture. `stop()` finalizes and hands back the WAV;
 *  `cancel()` throws everything away. Both are idempotent. */
export interface VoiceRecording {
  stop(): Promise<Uint8Array>;
  cancel(): Promise<void>;
}

export async function startVoiceRecording(): Promise<VoiceRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: VOICE_SAMPLE_RATE,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  const audioContext = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
  const sampleRate = audioContext.sampleRate;
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let finished = false;

  processor.onaudioprocess = (event) => {
    if (finished) return;
    // Copy: the browser reuses this buffer for the next callback.
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  };
  source.connect(processor);
  // ScriptProcessor only pulls when its output is connected; route
  // through a muted gain so capture never echoes to the speakers.
  const silentGain = audioContext.createGain();
  silentGain.gain.value = 0;
  processor.connect(silentGain);
  silentGain.connect(audioContext.destination);

  async function teardown(): Promise<void> {
    finished = true;
    processor.onaudioprocess = null;
    for (const node of [source, processor, silentGain]) {
      try {
        node.disconnect();
      } catch {
        // Already torn down by a previous call.
      }
    }
    for (const track of stream.getTracks()) track.stop();
    try {
      await audioContext.close();
    } catch {
      // Already closed.
    }
  }

  return {
    async stop(): Promise<Uint8Array> {
      await teardown();
      return encodeWav(chunks, sampleRate);
    },
    async cancel(): Promise<void> {
      chunks.length = 0;
      await teardown();
    },
  };
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Uint8Array {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (16-bit mono)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, sampleCount * 2, true);
  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      const clamped = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }
  return new Uint8Array(buffer);
}
