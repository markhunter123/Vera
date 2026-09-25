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

import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../locale-context.js';
import { SkillsModuleMain } from '../skills-panel.js';
import { ToastProvider } from '../toast.js';

function renderBundledSkill(installed: boolean): string {
  return renderToStaticMarkup(
    <LocaleProvider locale="en">
      <ToastProvider>
        <SkillsModuleMain
          bundledSkillCatalog={[{
            id: 'computer-use',
            name: 'Computer Use',
            description: 'Operate desktop applications.',
            category: '效率工具',
            declaredTools: ['Computer'],
            installed,
          }]}
          onInstallBundledSkill={() => undefined}
        />
      </ToastProvider>
    </LocaleProvider>,
  );
}

test('an available bundled skill renders the install action on its card', () => {
  const markup = renderBundledSkill(false);
  assert.match(markup, /aria-label="Install Computer Use"/);
  assert.match(markup, /vera-catalog-card/);
  assert.doesNotMatch(markup, /vera-catalog-card-badge/);
});

test('an installed bundled skill card carries the completion badge instead', () => {
  const markup = renderBundledSkill(true);
  assert.match(markup, /aria-label="Computer Use is installed in this workspace"/);
  assert.match(markup, /vera-catalog-card-badge/);
  assert.match(markup, /lucide-check/);
});
