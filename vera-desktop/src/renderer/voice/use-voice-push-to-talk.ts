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

import { useEffect, useRef } from 'react';
import type { VoiceInputState } from './use-voice-input.js';

export interface UseVoicePushToTalkOptions {
  /** Master switch (Settings · 语音识别), same gate as the mic button. */
  enabled: boolean;
  state: VoiceInputState;
  toggle(): void;
}

/**
 * 按住右侧 Alt 说话，松开识别. Push-to-talk on the physical right Alt key
 * (`event.code` is the only way to tell the two Alt keys apart — `event.key`
 * reports plain 'Alt' for both).
 *
 * Deliberately not a `useHotkeys` entry: that hook only fires on keydown,
 * while hold-to-talk needs the release edge too. The pairing rules exist so
 * the key can never fight the mic button:
 *   - keydown only STARTS a capture (idle → recording); while the button's
 *     own capture is running it just tracks that the key is held.
 *   - keyup only STOPS a capture this key started. Stopping someone else's
 *     recording because Alt happened to come up would eat their audio.
 *   - window blur releases the same way: Alt+Tab must not leave the mic hot
 *     when the keyup lands in another window.
 */
export function useVoicePushToTalk(options: UseVoicePushToTalkOptions): void {
  const stateRef = useRef(options.state);
  stateRef.current = options.state;
  const toggleRef = useRef(options.toggle);
  toggleRef.current = options.toggle;
  const enabled = options.enabled;

  useEffect(() => {
    if (!enabled) return;
    // Whether the key is currently down, so auto-repeat keydowns and a
    // stray keyup can neither double-start nor double-stop a capture.
    let held = false;
    // Whether THIS key press owns the capture that may be running.
    let ownsCapture = false;

    const release = () => {
      if (!held) return;
      held = false;
      const owned = ownsCapture;
      ownsCapture = false;
      if (owned && stateRef.current === 'recording') toggleRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'AltRight' || event.repeat) return;
      // Keep the key from reaching the window menu (Alt focuses it on
      // Windows); system chords (Alt+Tab, Alt+F4) are handled below the
      // page and are unaffected.
      event.preventDefault();
      if (held) return;
      held = true;
      if (stateRef.current !== 'idle') return;
      ownsCapture = true;
      toggleRef.current();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'AltRight') return;
      release();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', release);
      held = false;
      ownsCapture = false;
    };
  }, [enabled]);
}
