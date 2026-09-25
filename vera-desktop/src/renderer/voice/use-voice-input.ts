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

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechSttTranscribeFailure } from '../../shared/speech-contract.js';
import {
  VOICE_MAX_DURATION_MS,
  startVoiceRecording,
  type VoiceRecording,
} from './wav-recorder.js';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing';

/** Everything that can go wrong, each mapping to one localized message. */
export type VoiceInputError =
  | { reason: 'denied' }
  | { reason: 'not_configured' }
  | { reason: 'no_speech' }
  | { reason: 'audio_too_long' }
  | { reason: 'api_error'; message?: string }
  | { reason: 'network_error'; message?: string }
  | { reason: 'failed'; message?: string };

export interface UseVoiceInputOptions {
  /** Master switch (Settings · 语音识别). False pins the state to idle. */
  enabled: boolean;
  /** Receives the recognized text (already trimmed, non-empty). */
  onText(text: string): void;
  onError(error: VoiceInputError): void;
}

export interface UseVoiceInputResult {
  state: VoiceInputState;
  /** Click-to-toggle: start recording, or stop + recognize. No-op while
   *  a recognition round-trip is in flight. */
  toggle(): void;
}

/**
 * 点按录音 → 识别 → 填入输入框. Recording happens here in the renderer
 * (getUserMedia); recognition is a main-process IPC round-trip. State is
 * mirrored straight onto the composer's mic button.
 */
export function useVoiceInput(options: UseVoiceInputOptions): UseVoiceInputResult {
  const [state, setState] = useState<VoiceInputState>('idle');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const recordingRef = useRef<VoiceRecording | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  // Active-session flag: true from click-to-record until the stop→transcribe
  // chain settles (or unmount cancels the capture). The guards in the async
  // chain check this so a mid-flight unmount drops the result instead of
  // touching state — a manual stop must NOT clear it, or the audio would be
  // discarded before recognition ever runs.
  const activeRef = useRef(false);

  const clearAutoStop = useCallback(() => {
    if (autoStopTimerRef.current !== null) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
  }, []);

  const teardownRecording = useCallback(() => {
    clearAutoStop();
    const recording = recordingRef.current;
    recordingRef.current = null;
    return recording;
  }, [clearAutoStop]);

  useEffect(() => () => {
    // Unmount (or disable) mid-capture: drop the mic immediately.
    activeRef.current = false;
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) void recording.cancel();
  }, []);

  const finishRecording = useCallback(async () => {
    const recording = teardownRecording();
    if (!recording) {
      setState('idle');
      return;
    }
    setState('transcribing');
    try {
      const audio = await recording.stop();
      if (!activeRef.current) return;
      const result = await window.vera.speech.transcribe(audio);
      if (!activeRef.current) return;
      if (!result.ok) {
        optionsRef.current.onError(mapTranscribeFailure(result.reason, result.message));
        return;
      }
      const text = result.text.trim();
      if (text.length === 0) {
        optionsRef.current.onError({ reason: 'no_speech' });
        return;
      }
      optionsRef.current.onText(text);
    } catch (error) {
      if (activeRef.current) {
        optionsRef.current.onError({
          reason: 'failed',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (activeRef.current) setState('idle');
      // The session ends here whether it produced text or an error.
      activeRef.current = false;
    }
  }, [teardownRecording]);

  const toggle = useCallback(() => {
    if (!optionsRef.current.enabled) return;
    if (state === 'transcribing') return;
    if (state === 'recording') {
      void finishRecording();
      return;
    }
    void startRecording();
  }, [state, finishRecording]);

  async function startRecording(): Promise<void> {
    activeRef.current = true;
    // Ask before recording: an unconfigured click gives the settings hint
    // instead of a capture that can never produce a result.
    try {
      const status = await window.vera.speech.configStatus();
      if (!activeRef.current) return;
      if (!status.configured) {
        activeRef.current = false;
        optionsRef.current.onError({ reason: 'not_configured' });
        return;
      }
    } catch {
      // Status read failed — let the transcribe round-trip report the
      // real failure rather than blocking on the pre-check.
    }
    try {
      const recording = await startVoiceRecording();
      if (!activeRef.current) {
        void recording.cancel();
        return;
      }
      recordingRef.current = recording;
      setState('recording');
      autoStopTimerRef.current = window.setTimeout(() => {
        autoStopTimerRef.current = null;
        void finishRecording();
      }, VOICE_MAX_DURATION_MS);
    } catch (error) {
      activeRef.current = false;
      optionsRef.current.onError({
        reason: (error as { name?: string }).name === 'NotAllowedError' ? 'denied' : 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { state, toggle };
}

function mapTranscribeFailure(
  reason: SpeechSttTranscribeFailure,
  message?: string,
): VoiceInputError {
  switch (reason) {
    case 'not_configured':
      return { reason: 'not_configured' };
    case 'invalid_audio':
      return { reason: 'failed', message };
    case 'audio_too_long':
      return { reason: 'audio_too_long' };
    case 'api_error':
      return { reason: 'api_error', message };
    case 'network_error':
      return { reason: 'network_error', message };
  }
}
