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

import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Switch,
  TextInput,
  useMountedRef,
  useToast,
  useUiLocale,
} from '@vera/ui';
import { PasswordInput } from './password-input';
import {
  SettingsActions,
  SettingsField,
  SettingsRow,
  SettingsSection,
} from './settings-section';
import type { UpdateAppSettingsResult } from '@vera/core/settings';
import { settingsActionErrorMessage } from './settings-error-copy';
import { getSettingsPreferencesCopy } from '../locales/settings-preferences-copy.js';

/**
 * Settings · 通用 · 语音识别. The enable toggle writes the client-owned
 * `voiceInput.enabled` setting; the key form writes Tencent Cloud ASR
 * credentials through `speech:configure` into the desktop credential
 * store — never into settings.json, which config-transfer exports.
 * The renderer only ever reads back a masked SecretId.
 */
export function VoiceInputSettingsSection(props: {
  enabled: boolean;
  onUpdate(
    patch: Parameters<typeof window.vera.settings.update>[0],
  ): Promise<UpdateAppSettingsResult>;
}) {
  const locale = useUiLocale();
  const copy = getSettingsPreferencesCopy(locale).general;
  const sections = getSettingsPreferencesCopy(locale).sections;
  const toast = useToast();
  const mountedRef = useMountedRef();
  const [secretId, setSecretId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [configuredStatus, setConfiguredStatus] = useState<
    { configured: boolean; secretIdMasked: string | null } | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await window.vera.speech.configStatus();
      if (mountedRef.current) setConfiguredStatus(status);
    } catch {
      // Leave the status unknown; the save/clear actions report their own
      // failures and the next visit retries the read.
    }
  }, [mountedRef]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const canSave = secretId.trim().length > 0 && secretKey.trim().length > 0 && !saving;
  const busy = saving || clearing;

  async function saveKeys(): Promise<void> {
    if (!canSave) return;
    setSaving(true);
    try {
      const result = await window.vera.speech.configure({
        secretId: secretId.trim(),
        secretKey: secretKey.trim(),
      });
      if (!mountedRef.current) return;
      if (!result.ok) {
        toast.error(copy.voiceSaveFailed, copy.voiceFieldInvalid);
        return;
      }
      setSecretId('');
      setSecretKey('');
      setConfiguredStatus({ configured: true, secretIdMasked: result.secretIdMasked });
      toast.success(copy.voiceSaved);
    } catch (error) {
      if (mountedRef.current) {
        toast.error(copy.voiceSaveFailed, settingsActionErrorMessage(error, locale));
      }
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  async function clearKeys(): Promise<void> {
    if (clearing) return;
    setClearing(true);
    try {
      await window.vera.speech.clearConfig();
      if (!mountedRef.current) return;
      setConfiguredStatus({ configured: false, secretIdMasked: null });
    } catch (error) {
      if (mountedRef.current) {
        toast.error(copy.voiceClearFailed, settingsActionErrorMessage(error, locale));
      }
    } finally {
      if (mountedRef.current) setClearing(false);
    }
  }

  const statusText = configuredStatus === undefined
    ? ''
    : configuredStatus.configured && configuredStatus.secretIdMasked
      ? copy.voiceConfigured(configuredStatus.secretIdMasked)
      : copy.voiceNotConfigured;

  return (
    <SettingsSection
      title={sections.voiceInput}
      description={sections.voiceInputHelp}
    >
      <SettingsRow
        label={copy.voiceInput}
        description={copy.voiceInputHelp}
        end={
          <Switch
            label={copy.voiceInput}
            isLabelHidden
            value={props.enabled}
            changeAction={async (enabled) => {
              try {
                await props.onUpdate({ voiceInput: { enabled } });
              } catch (error: unknown) {
                toast.error(copy.voiceInputFailed, settingsActionErrorMessage(error, locale));
              }
            }}
          />
        }
      />
      {props.enabled && (
        <>
          <SettingsField>
            <TextInput
              value={secretId}
              onChange={setSecretId}
              label={copy.voiceSecretId}
              description={statusText}
              placeholder="AKID…"
              width="100%"
              isDisabled={busy}
            />
            <PasswordInput
              value={secretKey}
              onChange={setSecretKey}
              label={copy.voiceSecretKey}
              description={copy.voiceSecretHelp}
              placeholder="••••••••"
              isDisabled={busy}
            />
          </SettingsField>
          <SettingsActions>
            <Button
              variant="primary"
              isDisabled={!canSave}
              isLoading={saving}
              onClick={() => void saveKeys()}
              label={saving ? copy.voiceSaving : copy.voiceSave}
            />
            {configuredStatus?.configured ? (
              <Button
                variant="ghost"
                isDisabled={busy}
                isLoading={clearing}
                onClick={() => void clearKeys()}
                label={copy.voiceClear}
              />
            ) : null}
          </SettingsActions>
        </>
      )}
    </SettingsSection>
  );
}
