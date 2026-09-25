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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Banner, Collapsible, EmptyState, Spinner, StatusDot, type StatusDotVariant } from '@astryxdesign/core';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { MoreMenu, TextArea, useUiLocale } from '@vera/ui';
import type {
  CreateWorkBoardItemInput,
  WorkBoardItem,
  WorkBoardItemState,
  WorkBoardListQuery,
  WorkBoardScope,
} from '@vera/core/work-board';
import { ListTodo } from '@vera/ui/icons';
import { useWorkBoard } from './use-work-board.js';
import { getDesktopConversationCopy } from './locales/conversation-copy.js';

type WorkBoardPanelCopy = ReturnType<typeof getDesktopConversationCopy>['workBoardPanel'];

function scopeForFilter(filter: 'inbox' | 'project', projectId: string | null): WorkBoardScope {
  return filter === 'project' && projectId !== null
    ? { kind: 'project', projectId }
    : { kind: 'inbox' };
}

/** Active items stacked in board order: running work on top, finished last. */
const ACTIVE_GROUP_ORDER: WorkBoardItemState[] = ['in_progress', 'todo', 'done'];

function stateDotVariant(state: WorkBoardItemState): StatusDotVariant {
  return state === 'done' ? 'success' : state === 'in_progress' ? 'accent' : 'neutral';
}

interface ActiveWorkBoardRowActions {
  kind: 'active';
  projectId: string | null;
  renaming: boolean;
  renameValue: string;
  notesEditing: boolean;
  notesDraft: string;
  onRenameStart(): void;
  onRenameChange(value: string): void;
  onRenameSave(): void;
  onRenameCancel(): void;
  onNotesEdit(): void;
  onNotesChange(value: string): void;
  onNotesSave(): void;
  onNotesCancel(): void;
  onStart(): void;
  onSendBack(): void;
  onComplete(): void;
  onReopen(): void;
  onMove(): void;
  onArchive(): void;
}

interface ArchivedWorkBoardRowActions {
  kind: 'archived';
  onUnarchive(): void;
  onRemove(): void;
}

/** Inline rename field; its own component so the Enter/Escape wiring reads
 *  against concrete props instead of a narrowed union action object. */
function WorkBoardRenameInput(props: {
  label: string;
  value: string;
  onChange(value: string): void;
  onSave(): void;
  onCancel(): void;
}) {
  return (
    <TextInput
      className="vera-work-board-rename-input"
      size="sm"
      label={props.label}
      isLabelHidden
      hasAutoFocus
      value={props.value}
      onChange={props.onChange}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing || event.key === 'Process') return;
        if (event.key === 'Enter') {
          event.preventDefault();
          props.onSave();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          props.onCancel();
        }
      }}
    />
  );
}

function WorkBoardRow(props: {
  item: WorkBoardItem;
  copy: WorkBoardPanelCopy;
  actions: ActiveWorkBoardRowActions | ArchivedWorkBoardRowActions;
}) {
  const { item, copy, actions } = props;
  return (
    <li className="vera-work-board-row" data-archived={item.archived || undefined} data-state={actions.kind === 'active' ? item.state : undefined}>
      <div className="vera-work-board-row-main">
        {actions.kind === 'active' && actions.renaming ? (
          <WorkBoardRenameInput
            label={copy.rename}
            value={actions.renameValue}
            onChange={actions.onRenameChange}
            onSave={actions.onRenameSave}
            onCancel={actions.onRenameCancel}
          />
        ) : (
          <span className="vera-work-board-headline">
            <StatusDot variant={stateDotVariant(item.state)} label={
              item.state === 'done' ? copy.stateDone : item.state === 'in_progress' ? copy.stateInProgress : copy.stateTodo
            } />
            <span className="vera-work-board-title">{item.title}</span>
            {/* Where the item came from stays visible on the row itself: an
                agent-suggested entry reads differently from one the user
                typed, and the dot alone cannot say it. */}
            {item.creator.kind === 'agent_suggestion' && (
              <span className="vera-work-board-agent-tag">{copy.agentTag}</span>
            )}
            {item.archived && <span className="vera-work-board-archived-tag">{copy.archived}</span>}
          </span>
        )}
      </div>
      {item.notes && !(actions.kind === 'active' && (actions.notesEditing || actions.renaming)) && (
        <p className="vera-work-board-notes">{item.notes}</p>
      )}
      {actions.kind === 'active' && actions.notesEditing && (
        <TextArea
          label={copy.notes}
          value={actions.notesDraft}
          onChange={actions.onNotesChange}
          placeholder={copy.notesPlaceholder}
          hasAutoFocus
        />
      )}
      <div className="vera-work-board-row-actions">
        {actions.kind === 'archived' ? (
          <>
            <Button size="sm" variant="ghost" label={copy.unarchive} onClick={actions.onUnarchive} />
            <Button size="sm" variant="ghost" label={copy.delete} onClick={actions.onRemove} />
          </>
        ) : actions.notesEditing ? (
          <>
            <Button size="sm" variant="primary" label={copy.renameSave} onClick={actions.onNotesSave} />
            <Button size="sm" variant="ghost" label={copy.cancel} onClick={actions.onNotesCancel} />
          </>
        ) : (
          <>
            {item.state === 'todo' && (
              <Button size="sm" variant="ghost" label={copy.start} onClick={actions.onStart} />
            )}
            {item.state === 'in_progress' && (
              <>
                <Button size="sm" variant="ghost" label={copy.complete} onClick={actions.onComplete} />
                <Button size="sm" variant="ghost" label={copy.sendBack} onClick={actions.onSendBack} />
              </>
            )}
            {item.state === 'done' && (
              <Button size="sm" variant="ghost" label={copy.reopen} onClick={actions.onReopen} />
            )}
            <Button size="sm" variant="ghost" label={copy.notes} onClick={actions.onNotesEdit} />
            <MoreMenu
              size="sm"
              label={`${copy.moreActions}：${item.title}`}
              items={[
                { label: actions.renaming ? copy.renameSave : copy.rename, onClick: actions.renaming ? actions.onRenameSave : actions.onRenameStart },
                {
                  label: item.scope.kind === 'project' ? copy.moveToInbox : copy.moveToProject,
                  isDisabled: actions.projectId === null,
                  onClick: actions.onMove,
                },
                { label: copy.archive, onClick: actions.onArchive },
              ]}
            />
          </>
        )}
      </div>
    </li>
  );
}

export function WorkBoardPanel(props: {
  projectId: string | null;
  projectAliases?: readonly string[];
}) {
  const copy = getDesktopConversationCopy(useUiLocale()).workBoardPanel;
  const [filter, setFilter] = useState<'inbox' | 'project'>('inbox');
  const projectScopeIds = useMemo(() => {
    if (props.projectId === null) return undefined;
    return [...new Set([props.projectId, ...(props.projectAliases ?? [])])];
  }, [props.projectAliases, props.projectId]);
  const query: WorkBoardListQuery = useMemo(
    () => ({
      scope: scopeForFilter(filter, props.projectId),
      includeArchived: true,
      ...(filter === 'project' && projectScopeIds ? { projectIds: projectScopeIds } : {}),
    }),
    [filter, projectScopeIds, props.projectId],
  );
  const board = useWorkBoard(query);
  const [newTitle, setNewTitle] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [renamingRevision, setRenamingRevision] = useState<number | null>(null);
  const [notesEditingId, setNotesEditingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesRevision, setNotesRevision] = useState<number | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();
  const createPendingRef = useRef(false);
  const [createPending, setCreatePending] = useState(false);

  useEffect(() => {
    if (props.projectId === null) setFilter('inbox');
  }, [props.projectId]);

  const activeItems = board.items.filter((item) => !item.archived);
  const archivedItems = board.items.filter((item) => item.archived);
  const activeGroups = ACTIVE_GROUP_ORDER.map((state) => ({
    state,
    items: activeItems.filter((item) => item.state === state),
  }));

  const runAction = async (action: () => Promise<unknown>): Promise<boolean> => {
    setActionError(undefined);
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : copy.actionFailed);
      return false;
    }
  };

  const create = async (): Promise<void> => {
    const title = newTitle.trim();
    if (!title || createPendingRef.current) return;
    createPendingRef.current = true;
    setCreatePending(true);
    const input: CreateWorkBoardItemInput = {
      scope: query.scope ?? { kind: 'inbox' },
      title,
      creator: { kind: 'user' },
      provenance: { kind: 'manual' },
    };
    try {
      if (await runAction(() => board.create(input))) {
        setNewTitle('');
      }
    } finally {
      createPendingRef.current = false;
      setCreatePending(false);
    }
  };

  const startRename = (item: WorkBoardItem): void => {
    setRenamingId(item.id);
    setRenamingTitle(item.title);
    setRenamingRevision(item.revision);
  };

  const saveRename = async (item: WorkBoardItem): Promise<void> => {
    const title = renamingTitle.trim();
    if (!title) return;
    if (
      await runAction(() =>
        board.update(item.id, { title }, { expectedRevision: renamingRevision ?? item.revision }),
      )
    ) {
      setRenamingId(null);
      setRenamingRevision(null);
    }
  };

  const startNotesEdit = (item: WorkBoardItem): void => {
    setNotesEditingId(item.id);
    setNotesDraft(item.notes ?? '');
    setNotesRevision(item.revision);
  };

  // An empty draft clears stored notes — that is the patch contract's
  // explicit null signal, not a no-op.
  const saveNotes = async (item: WorkBoardItem): Promise<void> => {
    if (
      await runAction(() =>
        board.update(
          item.id,
          { notes: notesDraft.trim() || null },
          { expectedRevision: notesRevision ?? item.revision },
        ),
      )
    ) {
      setNotesEditingId(null);
      setNotesRevision(null);
    }
  };

  const moveScope = (item: WorkBoardItem): WorkBoardScope =>
    item.scope.kind === 'project'
      ? { kind: 'inbox' }
      : props.projectId !== null
        ? { kind: 'project', projectId: props.projectId }
        : item.scope;

  const activeRowActions = (item: WorkBoardItem): ActiveWorkBoardRowActions => ({
    kind: 'active',
    projectId: props.projectId,
    renaming: renamingId === item.id,
    renameValue: renamingTitle,
    notesEditing: notesEditingId === item.id,
    notesDraft,
    onRenameStart: () => startRename(item),
    onRenameChange: setRenamingTitle,
    onRenameSave: () => void saveRename(item),
    onRenameCancel: () => {
      setRenamingId(null);
      setRenamingRevision(null);
    },
    onNotesEdit: () => startNotesEdit(item),
    onNotesChange: setNotesDraft,
    onNotesSave: () => void saveNotes(item),
    onNotesCancel: () => {
      setNotesEditingId(null);
      setNotesRevision(null);
    },
    onStart: () =>
      void runAction(() =>
        board.update(item.id, { state: 'in_progress' }, { expectedRevision: item.revision }),
      ),
    onSendBack: () =>
      void runAction(() =>
        board.update(item.id, { state: 'todo' }, { expectedRevision: item.revision }),
      ),
    onComplete: () =>
      void runAction(() =>
        board.update(item.id, { state: 'done' }, { expectedRevision: item.revision }),
      ),
    onReopen: () =>
      void runAction(() =>
        board.update(item.id, { state: 'todo' }, { expectedRevision: item.revision }),
      ),
    onMove: () =>
      void runAction(() =>
        board.update(item.id, { scope: moveScope(item) }, { expectedRevision: item.revision }),
      ),
    // Permanent delete is deliberately absent here: the store contract requires
    // archiving first ("must_archive_first"), and the archived group is where
    // that action lives.
    onArchive: () =>
      void runAction(() => board.archive(item.id, { expectedRevision: item.revision })),
  });

  const stateCopy = (state: WorkBoardItemState): string =>
    state === 'done' ? copy.stateDone : state === 'in_progress' ? copy.stateInProgress : copy.stateTodo;

  return (
    <section
      className="vera-work-board-panel"
      aria-label={filter === 'project' ? copy.project : copy.inbox}
    >
      {actionError && (
        <Banner status="error" role="alert" className="vera-work-board-message" title={actionError} />
      )}
      <div className="vera-work-board-filters">
        <Button
          size="sm"
          variant={filter === 'inbox' ? 'primary' : 'ghost'}
          label={copy.inbox}
          onClick={() => setFilter('inbox')}
        />
        <Button
          size="sm"
          variant={filter === 'project' ? 'primary' : 'ghost'}
          label={copy.project}
          onClick={() => setFilter('project')}
          isDisabled={props.projectId === null}
          tooltip={props.projectId === null ? copy.noProject : undefined}
        />
      </div>
      <div className="vera-work-board-create">
        <TextInput
          size="sm"
          width="100%"
          label={copy.createPlaceholder}
          isLabelHidden
          value={newTitle}
          onChange={setNewTitle}
          isDisabled={createPending}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.nativeEvent.isComposing || event.key === 'Process') return;
            if (event.key === 'Enter') {
              event.preventDefault();
              void create();
            }
          }}
          placeholder={copy.createPlaceholder}
        />
        <Button
          size="sm"
          label={copy.create}
          onClick={() => void create()}
          isDisabled={createPending || newTitle.trim().length === 0}
        />
      </div>
      {board.error && board.items.length === 0 ? (
        <Banner
          status="error"
          role="alert"
          className="vera-work-board-message"
          title={copy.loadFailed}
          description={board.error}
          endContent={
            <Button size="sm" variant="ghost" label={copy.retry} onClick={board.retry} />
          }
        />
      ) : (
        <>
          {board.continuationError && (
            <Banner
              status="error"
              role="alert"
              className="vera-work-board-message"
              title={copy.loadFailed}
              description={board.continuationError}
              endContent={
                <Button
                  size="sm"
                  variant="ghost"
                  label={copy.retry}
                  onClick={board.retryContinuation}
                />
              }
            />
          )}
          {board.loading && board.items.length === 0 ? (
            <Spinner size="sm" shade="subtle" label={copy.loading} className="vera-work-board-message" />
          ) : (
            <>
              {activeItems.length === 0 && archivedItems.length === 0 ? (
                <EmptyState
                  isCompact
                  className="vera-work-board-empty"
                  icon={<ListTodo size={24} aria-hidden="true" />}
                  title={copy.empty}
                />
              ) : (
                <>
                  {/* Empty states stay hidden: in a narrow rail a section
                      heading for zero items is noise, and the create field
                      already owns "add something". */}
                  {activeGroups.map((group) => (
                    group.items.length > 0 ? (
                      <section key={group.state} className="vera-work-board-group" aria-label={stateCopy(group.state)}>
                        <h3 className="vera-work-board-group-title">
                          {stateCopy(group.state)}
                          <span className="vera-work-board-group-count">{group.items.length}</span>
                        </h3>
                        <ul className="vera-work-board-list">
                          {group.items.map((item) => (
                            <WorkBoardRow key={item.id} item={item} copy={copy} actions={activeRowActions(item)} />
                          ))}
                        </ul>
                      </section>
                    ) : null
                  ))}
                  {archivedItems.length > 0 && (
                    <Collapsible
                      className="vera-work-board-archived-group"
                      trigger={copy.archivedGroup(archivedItems.length)}
                      isOpen={archivedOpen}
                      onOpenChange={setArchivedOpen}
                    >
                      <ul className="vera-work-board-list">
                        {archivedItems.map((item) => (
                          <WorkBoardRow
                            key={item.id}
                            item={item}
                            copy={copy}
                            actions={{
                              kind: 'archived',
                              onUnarchive: () =>
                                void runAction(() =>
                                  board.unarchive(item.id, { expectedRevision: item.revision }),
                                ),
                              onRemove: () =>
                                void runAction(() => board.remove(item.id, { expectedRevision: item.revision })),
                            }}
                          />
                        ))}
                      </ul>
                    </Collapsible>
                  )}
                </>
              )}
              {board.nextCursor && (
                <Button
                  size="sm"
                  variant="ghost"
                  label={copy.loadMore}
                  onClick={board.loadMore}
                  isDisabled={board.loading}
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
