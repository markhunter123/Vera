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

import type { VoiceInputError } from './use-voice-input.js';

/** Toast copy for the voice-input flow (zh/en), kept next to the hook so
 *  the reason → wording mapping cannot drift between them. */
export function getVoiceInputCopy(locale: 'zh' | 'en'): {
  transcribeFailedTitle: string;
  notConfiguredTitle: string;
  openSettingsLabel: string;
  errorText(error: VoiceInputError): string;
} {
  if (locale === 'zh') {
    return {
      transcribeFailedTitle: '语音识别失败',
      notConfiguredTitle: '语音识别未配置',
      openSettingsLabel: '前往设置',
      errorText: (error) => {
        switch (error.reason) {
          case 'denied':
            return '麦克风访问被拒绝，请在系统设置中允许后重试。';
          case 'not_configured':
            return '还没有配置腾讯云语音识别，先在 设置 → 通用 里填写密钥。';
          case 'no_speech':
            return '没有识别到说话内容，再试一次。';
          case 'audio_too_long':
            return '录音超过 60 秒上限，请缩短后重试。';
          case 'api_error':
            return error.message ?? '腾讯云接口返回错误。';
          case 'network_error':
            return error.message ?? '网络请求失败，请检查网络后重试。';
          case 'failed':
            return error.message ?? '录音失败，请重试。';
        }
      },
    };
  }
  return {
    transcribeFailedTitle: 'Voice recognition failed',
    notConfiguredTitle: 'Voice recognition is not configured',
    openSettingsLabel: 'Open settings',
    errorText: (error) => {
      switch (error.reason) {
        case 'denied':
          return 'Microphone access was denied. Allow it in system settings and try again.';
        case 'not_configured':
          return 'Tencent Cloud speech recognition is not configured yet. Add your keys in Settings → General.';
        case 'no_speech':
          return 'Nothing was recognized — try again.';
        case 'audio_too_long':
          return 'The recording exceeded the 60-second limit. Shorten it and try again.';
        case 'api_error':
          return error.message ?? 'The Tencent Cloud API returned an error.';
        case 'network_error':
          return error.message ?? 'The network request failed. Check your connection and try again.';
        case 'failed':
          return error.message ?? 'Recording failed. Try again.';
      }
    },
  };
}
