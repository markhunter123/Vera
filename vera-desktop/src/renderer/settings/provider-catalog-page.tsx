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

import {
  Banner,
  EmptyState,
  HStack,
  List,
  ListItem,
  Section,
  Selector,
  Text,
  VStack,
} from '@astryxdesign/core';
import { ICON_SIZE, Check, ChevronRight, Search } from '@vera/ui/icons';
import {
  CATALOG_PROVIDER_TYPES,
  RECOMMENDED_PROVIDER_TYPES,
  type ProviderCatalogGroup,
  type ProviderType,
} from '@vera/core/provider-registry';
import { PROVIDER_DEFAULTS } from '@vera/core/llm-connections';
import { Button, TextInput, useUiLocale } from '@vera/ui';
import { AddProviderForm } from './provider-add-form';
import { ProviderLogo, providerDisplay } from './provider-display';
import { OAuthLoginPanel, useOAuthCards, type OAuthCardId } from './provider-oauth-section';
import { type ConnectionsBridge } from './provider-panel-shared';
import { getProviderSettingsCopy } from '../locales/settings-provider-copy';

type CatalogCategory = ProviderCatalogGroup | 'all' | 'recommended' | 'accounts';

const CATALOG_CATEGORIES: CatalogCategory[] = [
  'all',
  'recommended',
  'accounts',
  'plans',
  'api',
  'aggregators',
  'local',
];

/**
 * How the catalog is filtered. It lives in the panel, not in this component:
 * picking a provider navigates away and unmounts the catalog, and a search the
 * user typed should still be there when they come back.
 */
export interface CatalogFilter {
  query: string;
  category: CatalogCategory;
}

export const CATALOG_INITIAL_FILTER: CatalogFilter = { query: '', category: 'all' };

/**
 * One provider being set up. `credentials` is a form, `account` is a browser
 * login — two bodies of one level, not two levels: they are reached the same
 * way and they go back to the same place.
 */
export type SetupTarget =
  | { method: 'credentials'; providerType: ProviderType; name: string }
  | { method: 'account'; cardId: OAuthCardId; providerType: ProviderType; name: string };

/**
 * Level 2: the provider catalog. Search plus a category filter over the 55
 * keyed providers and the account sign-ins, one row each. Cloud rows sit
 * above local deployments; the two groups carry labels only when both are on
 * screen — the split matters in the mixed "all" view, not in a
 * single-category one.
 *
 * This used to be step 1 of a Dialog. It is a page because it is a
 * destination, not an interruption — Astryx's own Dialog guidance says "if the
 * content grows beyond what fits, consider a full page instead", and a
 * 560px-wide modal over a ~700px content column preserved almost none of the
 * context a modal exists to preserve.
 */
export function ProviderCatalogPage(props: {
  filter: CatalogFilter;
  onFilterChange(filter: CatalogFilter): void;
  onPick(target: SetupTarget): void;
}) {
  const locale = useUiLocale();
  const providerCopy = getProviderSettingsCopy(locale);
  const copy = providerCopy.panel;
  const { query, category } = props.filter;
  const showsOAuth = category === 'all' || category === 'recommended' || category === 'accounts';
  const oauth = useOAuthCards({ query: showsOAuth ? query : undefined });

  // Category is a Selector, not a second TabList: the page header already owns
  // one level of navigation, and six tabs beside a search field made the
  // toolbar the busiest row on the page.
  const categoryOptions = CATALOG_CATEGORIES.map((value) => ({ value, label: copy.tabs[value] }));
  const providers = providersForCategory(category, query, locale);
  // Cloud access and local runtimes are different acquisition paths: cloud
  // rows are things you sign up for, local rows are servers already running
  // on this machine. One flat list made a local runtime read as just another
  // sign-up option, so the catalog splits — cloud first, local last.
  const localProviders = providers.filter((type) => PROVIDER_DEFAULTS[type].catalogGroup === 'local');
  const cloudProviders = providers.filter((type) => PROVIDER_DEFAULTS[type].catalogGroup !== 'local');
  const oauthCards = showsOAuth ? oauth.cards : [];
  const splitsGroups = (oauthCards.length > 0 || cloudProviders.length > 0) && localProviders.length > 0;
  const isEmpty = providers.length === 0 && (!showsOAuth || oauth.cards.length === 0);

  return (
    <VStack gap={4} data-vera-contract="provider-catalog">
      <Section variant="transparent" paddingBlock={2}>
        <HStack gap={2} hAlign="between" vAlign="center">
          <TextInput
            value={query}
            onChange={(value) => props.onFilterChange({ ...props.filter, query: value })}
            placeholder={copy.searchPlaceholder}
            label={copy.searchAria}
            isLabelHidden
            startIcon={Search}
          />
          <Selector
            label={copy.category}
            isLabelHidden
            value={category}
            onChange={(value: string) => props.onFilterChange({ ...props.filter, category: value as CatalogCategory })}
            options={categoryOptions}
            data-catalog-category={category}
          />
        </HStack>
      </Section>
      {oauth.refreshError && (
        <Banner
          status="warning"
          role="alert"
          title={providerCopy.oauthSection.staleState}
          description={oauth.refreshError}
        />
      )}
      {isEmpty ? (
        // Filter empty (DESIGN.md §10 tier 1): a filter no-match always carries
        // the clear action, on any tier — the user must be able to exit.
        <EmptyState
          isCompact
          title={copy.noMatch}
          actions={(
            <Button
              variant="ghost"
              size="sm"
              label={copy.clearSearch}
              onClick={() => props.onFilterChange({ ...props.filter, query: '' })}
            />
          )}
        />
      ) : (
        <>
          {(oauthCards.length > 0 || cloudProviders.length > 0) && (
            <VStack gap={2}>
              {splitsGroups && (
                <Text type="label" size="sm" color="secondary">{copy.cloudSection}</Text>
              )}
              <List hasDividers>
                {oauthCards.map((card) => (
                  <ListItem
                    key={card.id}
                    className="providerCatalogRow"
                    data-card-id={card.id}
                    data-provider={card.providerType}
                    data-status="ready"
                    data-logged-in={card.isLoggedIn ? 'true' : undefined}
                    startContent={<ProviderLogo type={card.providerType} />}
                    label={/* a11y-allow: this label names the ROW, not the span. Astryx's Item puts consumer props on its outer wrapper and renders a separate invisible <button> for the click target, so an aria-label on the Item never reaches that button — measured. The button is named from its content, and this span is how the status reaches that name. Removing it drops the runtime error from the row's accessible name (settings.spec:226).*/ <span aria-label={providerCopy.oauthSection.cardAria(card.name, card.status, card.description)}>{card.name}</span>}
                    description={card.description}
                    endContent={(
                      <HStack gap={2} vAlign="center">
                        {card.isLoggedIn && (
                          <span className="settingsStatus" aria-hidden="true">
                            <Check size={ICON_SIZE.chrome} />
                            <span>{providerCopy.oauthSection.signedIn}</span>
                          </span>
                        )}
                        <ChevronRight size={ICON_SIZE.chrome} aria-hidden="true" />
                      </HStack>
                    )}
                    onClick={() => props.onPick({
                      method: 'account',
                      cardId: card.id,
                      providerType: card.providerType,
                      name: card.name,
                    })}
                  />
                ))}
                {cloudProviders.map((type) => (
                  <CatalogProviderRow key={type} type={type} onPick={props.onPick} />
                ))}
              </List>
            </VStack>
          )}
          {localProviders.length > 0 && (
            <VStack gap={2}>
              {splitsGroups && (
                <Text type="label" size="sm" color="secondary">{copy.localSection}</Text>
              )}
              <List hasDividers>
                {localProviders.map((type) => (
                  <CatalogProviderRow key={type} type={type} onPick={props.onPick} />
                ))}
              </List>
            </VStack>
          )}
        </>
      )}
    </VStack>
  );
}

/**
 * One keyed provider row, shared by the cloud list and the local list — the
 * section split is visual only, the row itself is identical in both.
 */
function CatalogProviderRow(props: {
  type: ProviderType;
  onPick(target: SetupTarget): void;
}) {
  const locale = useUiLocale();
  const catalogCopy = getProviderSettingsCopy(locale).catalog;
  const display = providerDisplay(props.type, locale);
  return (
    <ListItem
      className="providerCatalogRow"
      data-provider={props.type}
      data-status="ready"
      startContent={<ProviderLogo type={props.type} />}
      label={/* a11y-allow: this label names the ROW, not the span. Astryx's Item puts consumer props on its outer wrapper and renders a separate invisible <button> for the click target, so an aria-label on the Item never reaches that button — measured. The button is named from its content, and this span is how the status reaches that name. Removing it drops the runtime error from the row's accessible name (settings.spec:226).*/ <span aria-label={catalogCopy.cardAria(display.name, display.description)}>{display.name}</span>}
      description={display.description}
      endContent={<ChevronRight size={ICON_SIZE.chrome} aria-hidden="true" />}
      onClick={() => props.onPick({ method: 'credentials', providerType: props.type, name: display.name })}
    />
  );
}

/**
 * Level 3: one provider being set up — its credential form, or its account
 * login. Named `setup` rather than `create` because the account body also
 * signs out and re-authorizes; it is not a one-way create.
 */
export function ProviderSetupPage(props: {
  bridge: ConnectionsBridge;
  target: SetupTarget;
  existingSlugs: string[];
  onCancel(): void;
  onCreated(slug: string, modelDiscoveryError?: unknown): Promise<void>;
  onAccountChanged(): Promise<void>;
}) {
  if (props.target.method === 'account') {
    return (
      <div tabIndex={-1} className="settingsRouteLevel" data-vera-contract="provider-setup">
        <OAuthLoginPanel cardId={props.target.cardId} onLoginSuccess={props.onAccountChanged} />
      </div>
    );
  }
  return (
    <div tabIndex={-1} className="settingsRouteLevel" data-vera-contract="provider-setup">
      <AddProviderForm
        key={props.target.providerType}
        bridge={props.bridge}
        providerType={props.target.providerType}
        existingSlugs={props.existingSlugs}
        onCancel={props.onCancel}
        onCreated={props.onCreated}
      />
    </div>
  );
}

function providersForCategory(category: CatalogCategory, query: string, locale: 'zh' | 'en'): ProviderType[] {
  // 'accounts' is the OAuth-only category: every row in it comes from
  // useOAuthCards, so the keyed catalog contributes nothing.
  if (category === 'accounts') return [];
  const source = category === 'recommended' ? RECOMMENDED_PROVIDER_TYPES : CATALOG_PROVIDER_TYPES;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return source.filter((type) => {
    if (!CATALOG_PROVIDER_TYPES.includes(type)) return false;
    if (PROVIDER_DEFAULTS[type].status !== 'ready') return false;
    if (
      category !== 'all' &&
      category !== 'recommended' &&
      PROVIDER_DEFAULTS[type].catalogGroup !== category
    ) {
      return false;
    }
    if (!normalizedQuery) return true;
    const display = providerDisplay(type, locale);
    return [type, display.name, display.description, PROVIDER_DEFAULTS[type].label]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}
