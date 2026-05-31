// Application Tracker — a kanban board whose columns are fully user-defined:
// add, rename, recolour, reorder and delete stages. Native HTML5 drag-and-drop
// moves cards between columns; an add-application modal, a per-card detail/notes
// editor, and bulk select / move / delete round it out.
//
// Props:
//   onBack()         — return to the dashboard
//   onOpenResume(id) — open a resume entry in the editor
//
// Persistence is server-backed (async). boardStore.load() returns the whole
// board in one snapshot — ordered column metadata + cards grouped by column id —
// and we re-read it after every mutation so the board stays authoritative
// (positions are renumbered by the server on every move/create).

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  applicationStore,
  boardStore,
  resumeStore,
  DEFAULT_COLUMNS,
  COLUMN_COLORS,
} from '../lib/storage.js';
import ConfirmModal from './ConfirmModal.jsx';

const FALLBACK_COLOR = '#94a3b8';

// Empty cards map for a column list — initial state before the async load lands.
const emptyCards = (cols) => Object.fromEntries(cols.map((c) => [c.id, []]));

export default function Tracker({ onBack, onOpenResume }) {
  // Columns + cards arrive together from boardStore.load(). We seed with the
  // client-side defaults so the first paint isn't blank.
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [cards, setCards] = useState(() => emptyCards(DEFAULT_COLUMNS));
  const [selected, setSelected] = useState(() => new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  // The column currently under the dragged card (for the .is-over ring).
  const [overStatus, setOverStatus] = useState(null);
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);
  // Resume title lookup ({ [resumeId]: title }), filled lazily as cards appear.
  const [resumeTitles, setResumeTitles] = useState({});
  // Most recent store error surfaced to the user (rendered as a corner alert).
  const [error, setError] = useState(null);
  // Id of the card being dragged — lets columns exclude it from index math.
  const draggingId = useRef(null);

  // Re-read the authoritative board (columns + grouped+sorted cards).
  const refresh = async () => {
    try {
      const { columns: cols, cards: grouped } = await boardStore.load();
      setColumns(cols);
      setCards(grouped);
    } catch (err) {
      console.error('Tracker: failed to load board', err);
      setError('Could not load the board.');
    }
  };

  // Initial load. refresh() awaits the network round-trip before any setState,
  // so the setState is not synchronous despite the lint rule's static read.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  // Every card regardless of column membership (drives totals + shared hints).
  const allCards = useMemo(() => Object.values(cards).flat(), [cards]);
  const total = allCards.length;

  // Master resume ids backing more than one card → a small "shared" hint.
  const sharedResumeIds = useMemo(() => {
    const counts = new Map();
    for (const c of allCards) {
      if (c.resumeId) counts.set(c.resumeId, (counts.get(c.resumeId) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
  }, [allCards]);

  // Distinct resume ids currently backing a card. Joined so the title-fetching
  // effect below only re-runs when the *set* of ids changes, not on every render.
  const resumeIdsKey = useMemo(() => {
    const ids = new Set();
    for (const c of allCards) if (c.resumeId) ids.add(c.resumeId);
    return [...ids].sort().join(',');
  }, [allCards]);

  // Lazily fetch resume titles for any id we haven't resolved yet. The fetch is
  // async, so we can't do it in a useMemo — we stash results in state and let
  // render fall back to '' until they arrive.
  useEffect(() => {
    const ids = resumeIdsKey ? resumeIdsKey.split(',') : [];
    const missing = ids.filter((id) => !(id in resumeTitles));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = {};
      for (const id of missing) {
        try {
          const entry = await resumeStore.get(id);
          fetched[id] = entry?.title || null;
        } catch (err) {
          console.error('Tracker: failed to load resume title', id, err);
          fetched[id] = null;
        }
      }
      if (!cancelled && Object.keys(fetched).length > 0) {
        setResumeTitles((prev) => ({ ...prev, ...fetched }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeIdsKey]);

  // ── Drag-and-drop (cards + columns via @dnd-kit) ───────────────────────────
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null); // 'column' or 'card'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    setActiveType(active.data.current?.type);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCard = active.data.current?.type === 'card';
    const isOverCard = over.data.current?.type === 'card';
    const isOverColumn = over.data.current?.type === 'column';

    if (!isActiveCard) return;

    setCards((prev) => {
      const activeContainer = active.data.current.sortable.containerId;
      let overContainer;
      
      if (isOverCard) {
        overContainer = over.data.current.sortable.containerId;
      } else if (isOverColumn) {
        overContainer = overId;
      } else {
        return prev;
      }

      if (!activeContainer || !overContainer || activeContainer === overContainer) {
        return prev;
      }

      const activeItems = prev[activeContainer] || [];
      const overItems = prev[overContainer] || [];
      const activeIndex = activeItems.findIndex((c) => c.id === activeId);
      let overIndex;

      if (isOverCard) {
        overIndex = overItems.findIndex((c) => c.id === overId);
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        overIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      } else {
        overIndex = overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [...activeItems.filter((c) => c.id !== activeId)],
        [overContainer]: [
          ...overItems.slice(0, overIndex),
          activeItems[activeIndex],
          ...overItems.slice(overIndex, overItems.length),
        ],
      };
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    if (active.data.current?.type === 'column') {
      const activeId = active.id;
      const overId = over.id;

      if (activeId !== overId) {
        const oldIndex = columns.findIndex((c) => c.id === activeId);
        const newIndex = columns.findIndex((c) => c.id === overId);
        
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        setColumns(newColumns);
        
        try {
          await boardStore.reorderColumns(newColumns.map(c => c.id));
          await refresh();
        } catch (err) {
          console.error('Tracker: reorder columns failed', err);
          setError('Could not reorder the columns.');
          refresh();
        }
      }
      return;
    }

    if (active.data.current?.type === 'card') {
      const activeContainer = active.data.current.sortable.containerId;
      let overContainer;
      
      const isOverCard = over.data.current?.type === 'card';
      const isOverColumn = over.data.current?.type === 'column';
      
      if (isOverCard) {
        overContainer = over.data.current.sortable.containerId;
      } else if (isOverColumn) {
        overContainer = over.id;
      }

      if (!activeContainer || !overContainer) return;

      const activeIndex = active.data.current.sortable.index;
      
      let position = 0;
      if (isOverCard) {
        position = over.data.current.sortable.index;
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        position = position + modifier;
      } else {
         position = (cards[overContainer] || []).length;
      }

      try {
        await applicationStore.move(active.id, overContainer, position);
        await refresh();
      } catch (err) {
        console.error('Tracker: card move failed', err);
        setError('Could not move that application.');
        refresh();
      }
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  // Prune any selected ids that no longer exist (e.g. after a delete elsewhere).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(allCards.map((c) => c.id));
      const next = new Set([...prev].filter((id) => live.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [allCards]);

  const handleBulkMove = async (status) => {
    const ids = [...selected];
    clearSelection();
    try {
      await applicationStore.bulkUpdate(ids, { status });
      await refresh();
    } catch (err) {
      console.error('Tracker: bulk move failed', err);
      setError('Could not move the selected applications.');
    }
  };
  const handleBulkDelete = () => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Applications',
      message: `Delete ${selected.size} application${selected.size === 1 ? '' : 's'}?`,
      onConfirm: async () => {
        const ids = [...selected];
        clearSelection();
        try {
          await applicationStore.bulkDelete(ids);
          await refresh();
        } catch (err) {
          console.error('Tracker: bulk delete failed', err);
          setError('Could not delete the selected applications.');
        }
      }
    });
  };

  // ── Column management ───────────────────────────────────────────────────────
  const handleAddColumn = async (label) => {
    try {
      await boardStore.createColumn({ label, color: nextColor(columns) });
      await refresh();
    } catch (err) {
      console.error('Tracker: add column failed', err);
      setError('Could not add the column.');
    }
  };

  const handleRenameColumn = async (id, label) => {
    const col = columns.find((c) => c.id === id);
    if (!col || label === col.label) return;
    try {
      await boardStore.updateColumn(id, { label });
      await refresh();
    } catch (err) {
      console.error('Tracker: rename column failed', err);
      setError('Could not rename the column.');
    }
  };

  const handleRecolorColumn = async (id, color) => {
    try {
      await boardStore.updateColumn(id, { color });
      await refresh();
    } catch (err) {
      console.error('Tracker: recolour column failed', err);
      setError('Could not recolour the column.');
    }
  };

  const handleMoveColumn = async (id, dir) => {
    const idx = columns.findIndex((c) => c.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= columns.length) return;
    const ids = columns.map((c) => c.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    try {
      await boardStore.reorderColumns(ids);
      await refresh();
    } catch (err) {
      console.error('Tracker: reorder columns failed', err);
      setError('Could not reorder the columns.');
    }
  };

  const handleDeleteColumn = (id) => {
    if (columns.length <= 1) return;
    const col = columns.find((c) => c.id === id);
    const count = (cards[id] || []).length;
    const target = columns.find((c) => c.id !== id);
    const message = count
      ? `Delete “${col?.label || 'this column'}”? Its ${count} card${count === 1 ? '' : 's'} will move to “${target?.label}”.`
      : `Delete “${col?.label || 'this column'}”?`;
    setConfirmState({
      isOpen: true,
      title: 'Delete Column',
      message,
      onConfirm: async () => {
        try {
          await boardStore.deleteColumn(id);
          await refresh();
        } catch (err) {
          console.error('Tracker: delete column failed', err);
          setError('Could not delete the column.');
        }
      },
    });
  };

  const detailCard = detailId ? allCards.find((c) => c.id === detailId) || null : null;

  return (
    <div className="h-full flex flex-col" style={{ background: '#f7f8fc' }}>
      {/* Header */}
      <div className="shrink-0 px-8 pt-8 pb-5 flex items-end justify-between">
        <div>
          <div className="rx-eyebrow mb-1">Job search</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total === 0
              ? 'Track every application from first save to signed offer.'
              : `${total} application${total === 1 ? '' : 's'} across ${columns.length} stage${columns.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="rx-btn rx-btn-ghost" onClick={onBack}>
            <ArrowLeftIcon /> Dashboard
          </button>
          <button className="rx-btn rx-btn-primary" onClick={() => setAddOpen(true)}>
            <PlusIcon /> Add application
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 min-h-0 overflow-hidden px-8 pb-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="kanban h-full">
              {columns.map((column, i) => (
                <Column
                  key={column.id}
                  column={column}
                  index={i}
                  columnCount={columns.length}
                  cards={cards[column.id] || []}
                  selected={selected}
                  sharedResumeIds={sharedResumeIds}
                  resumeTitles={resumeTitles}
                  onToggleSelect={toggleSelect}
                  onOpenCard={setDetailId}
                  onOpenResume={onOpenResume}
                  onRename={handleRenameColumn}
                  onRecolor={handleRecolorColumn}
                  onMove={handleMoveColumn}
                  onDelete={handleDeleteColumn}
                />
              ))}
              <AddColumnTile onAdd={handleAddColumn} />
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ sideEffects: defaultDropAnimationSideEffects })}>
            {activeId ? (
              activeType === 'column' ? (
                <Column
                  column={columns.find((c) => c.id === activeId)}
                  cards={cards[activeId] || []}
                  selected={selected}
                  sharedResumeIds={sharedResumeIds}
                  resumeTitles={resumeTitles}
                />
              ) : (
                <Card
                  card={allCards.find((c) => c.id === activeId)}
                  selected={selected.has(activeId)}
                  shared={
                    allCards.find((c) => c.id === activeId)?.resumeId &&
                    sharedResumeIds.has(allCards.find((c) => c.id === activeId).resumeId)
                  }
                  resumeTitle={resumeTitles[allCards.find((c) => c.id === activeId)?.resumeId] || ''}
                />
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          columns={columns}
          onMove={handleBulkMove}
          onDelete={handleBulkDelete}
          onClear={clearSelection}
        />
      )}

      {addOpen && (
        <AddModal
          columns={columns}
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}

      {detailCard && (
        <DetailModal
          card={detailCard}
          columns={columns}
          resumeTitle={resumeTitles[detailCard.resumeId] || ''}
          onClose={() => setDetailId(null)}
          onChanged={refresh}
          onDeleted={() => {
            setDetailId(null);
            refresh();
          }}
          onOpenResume={onOpenResume}
          onRequestConfirm={(title, message, onConfirm) => setConfirmState({ isOpen: true, title, message, onConfirm })}
        />
      )}

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Delete"
        danger={true}
        onConfirm={() => confirmState.onConfirm?.()}
        onCancel={() => setConfirmState(s => ({ ...s, isOpen: false }))}
      />

      {error && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-700 shadow-lg">
          <span>{error}</span>
          <button
            type="button"
            className="text-rose-400 hover:text-rose-600"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// Pick a palette colour not already used by an existing column (cycles once the
// palette is exhausted).
function nextColor(columns) {
  const used = new Set(columns.map((c) => c.color));
  return COLUMN_COLORS.find((c) => !used.has(c)) || COLUMN_COLORS[columns.length % COLUMN_COLORS.length];
}

// ── Column ─────────────────────────────────────────────────────────────────
function Column({
  column,
  index,
  columnCount,
  cards,
  selected,
  sharedResumeIds,
  resumeTitles,
  onToggleSelect,
  onOpenCard,
  onOpenResume,
  onRename,
  onRecolor,
  onMove,
  onDelete,
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column' },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const [menuAt, setMenuAt] = useState(null); // {x,y} anchor when the menu is open
  const btnRef = useRef(null);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setMenuAt({ x: r.right, y: r.bottom });
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="kanban-col opacity-30" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kanban-col flex flex-col"
      data-column={column.id}
    >
      <div 
        className="kanban-col-head cursor-grab active:cursor-grabbing" 
        {...attributes} 
        {...listeners}
      >
        <span className="kanban-col-title flex items-center gap-1.5 min-w-0">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ background: column.color || FALLBACK_COLOR }}
          />
          <span className="truncate">{column.label || 'Untitled'}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <span className="kanban-count">{cards.length}</span>
          <button
            ref={btnRef}
            type="button"
            className="kanban-col-menu-btn"
            aria-label={`Edit “${column.label}” column`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={openMenu}
          >
            <DotsIcon />
          </button>
        </span>
      </div>

      {menuAt && (
        <ColumnMenu
          column={column}
          index={index}
          columnCount={columnCount}
          anchor={menuAt}
          onRename={onRename}
          onRecolor={onRecolor}
          onMove={onMove}
          onDelete={onDelete}
          onClose={() => setMenuAt(null)}
        />
      )}

      <div className="flex-1 min-h-[3rem] overflow-y-auto px-2 pb-2">
        <SortableContext id={column.id} items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2 min-h-full">
            {cards.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6 select-none">Drop here</div>
            ) : (
              cards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  selected={selected?.has(card.id)}
                  shared={card.resumeId && sharedResumeIds?.has(card.resumeId)}
                  resumeTitle={resumeTitles?.[card.resumeId] || ''}
                  onToggleSelect={onToggleSelect}
                  onOpenCard={onOpenCard}
                  onOpenResume={onOpenResume}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ── Column edit popover (fixed-position so it escapes the board's overflow) ────
function ColumnMenu({ column, index, columnCount, anchor, onRename, onRecolor, onMove, onDelete, onClose }) {
  const [label, setLabel] = useState(column.label || '');
  const ref = useRef(null);
  const WIDTH = 220;

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    // Defer so the opening click doesn't immediately close it.
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const commitRename = () => {
    const next = label.trim();
    if (next && next !== column.label) onRename(column.id, next);
  };

  const left = Math.max(12, Math.min(anchor.x - WIDTH, window.innerWidth - WIDTH - 12));
  const top = anchor.y + 6;

  return (
    <div
      ref={ref}
      className="rx-popover"
      style={{ position: 'fixed', top, left, width: WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 pt-3 pb-2">
        <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Rename</span>
        <input
          autoFocus
          className="field !py-1.5 !text-sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitRename();
              onClose();
            }
          }}
          onBlur={commitRename}
        />
      </div>

      <div className="px-3 pb-2">
        <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Colour</span>
        <div className="flex flex-wrap gap-1.5">
          {COLUMN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="h-5 w-5 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                outline: column.color === c ? '2px solid var(--color-brand-500)' : 'none',
                outlineOffset: 2,
              }}
              aria-label={`Use colour ${c}`}
              onClick={() => {
                onRecolor(column.id, c);
                onClose();
              }}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 py-1">
        <button
          type="button"
          className="rx-popover-item"
          disabled={index === 0}
          onClick={() => {
            onMove(column.id, -1);
            onClose();
          }}
        >
          <ChevronLeftIcon /> Move left
        </button>
        <button
          type="button"
          className="rx-popover-item"
          disabled={index === columnCount - 1}
          onClick={() => {
            onMove(column.id, 1);
            onClose();
          }}
        >
          <ChevronRightIcon /> Move right
        </button>
        <button
          type="button"
          className="rx-popover-item rx-popover-item-danger"
          disabled={columnCount <= 1}
          onClick={() => {
            onClose();
            onDelete(column.id);
          }}
        >
          <TrashIcon /> Delete column
        </button>
      </div>
    </div>
  );
}

// ── Add-column tile (ghost column at the right edge) ──────────────────────────
function AddColumnTile({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');

  const commit = () => {
    const next = label.trim();
    if (next) onAdd(next);
    setLabel('');
    setAdding(false);
  };

  if (!adding) {
    return (
      <button
        type="button"
        className="kanban-add-col"
        onClick={() => setAdding(true)}
        aria-label="Add a column"
      >
        <PlusIcon /> Add column
      </button>
    );
  }

  return (
    <div className="kanban-col kanban-add-col-form">
      <input
        autoFocus
        className="field !py-1.5 !text-sm"
        placeholder="Column name"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setLabel('');
            setAdding(false);
          }
        }}
        onBlur={commit}
      />
      <div className="flex items-center gap-2 mt-2">
        <button className="rx-btn rx-btn-primary rx-btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
          Add
        </button>
        <button
          className="rx-btn rx-btn-ghost rx-btn-sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setLabel('');
            setAdding(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
function Card({
  card,
  selected,
  shared,
  resumeTitle,
  onToggleSelect,
  onOpenCard,
  onOpenResume,
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    ...(selected ? { boxShadow: 'inset 0 0 0 2px var(--color-brand-400)' } : {}),
  };

  const notes = (card.notes || '').trim();

  if (isDragging) {
    return <div ref={setNodeRef} style={{ ...style, opacity: 0.3 }} className="kanban-card" />;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-card-id={card.id}
      className={`kanban-card cursor-grab active:cursor-grabbing hover:border-brand-300`}
      onClick={() => onOpenCard?.(card.id)}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={!!selected}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect?.(card.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select application"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand-600 cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-900">
            {card.company?.trim() || 'Untitled company'}
          </div>
          <div className="truncate text-xs text-slate-500 mt-0.5">
            {card.role?.trim() || 'Role not set'}
          </div>

          {card.resumeId && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onOpenResume?.(card.resumeId);
              }}
              className="mt-1.5 inline-flex items-center gap-1 max-w-full text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
              title={resumeTitle ? `Open “${resumeTitle}”` : 'Open linked resume'}
            >
              <DocIcon />
              <span className="truncate">{resumeTitle || 'Linked resume'}</span>
            </button>
          )}

          {notes && (
            <div className="mt-1.5 text-[11px] leading-snug text-slate-500 line-clamp-2">
              {notes}
            </div>
          )}

          {(shared || card.appliedAt) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {card.appliedAt && (
                <span className="chip chip-neutral">{formatDate(card.appliedAt)}</span>
              )}
              {shared && (
                <span className="chip chip-brand">
                  <LayersIcon /> shared
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add-application modal ─────────────────────────────────────────────────────
function AddModal({ columns, onClose, onCreated }) {
  const [entries, setEntries] = useState([]);
  const [resumeId, setResumeId] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState(columns[0]?.id || '');
  const [error, setError] = useState(null);
  // Tracks whether the user hand-edited company/role, so we only auto-prefill
  // from the chosen entry's .job while the field is still untouched.
  const touched = useRef({ company: false, role: false });

  // Load the resume list, then default the picker to the first entry.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await resumeStore.list();
        if (cancelled) return;
        setEntries(list);
        setResumeId((prev) => prev || list[0]?.id || '');
      } catch (err) {
        console.error('AddModal: failed to load resumes', err);
        if (!cancelled) setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill company/role from the selected entry's job, unless the user typed.
  useEffect(() => {
    const entry = entries.find((e) => e.id === resumeId);
    const job = entry?.job;
    if (!job) return;
    if (!touched.current.company && job.company) setCompany(job.company);
    if (!touched.current.role && job.role) setRole(job.role);
  }, [resumeId, entries]);

  const submit = async () => {
    try {
      await applicationStore.create({
        resumeId: resumeId || null,
        company: company.trim(),
        role: role.trim(),
        status,
      });
      onCreated();
    } catch (err) {
      console.error('AddModal: create failed', err);
      setError('Could not add the application.');
    }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="p-6">
        <div className="rx-eyebrow mb-1">New entry</div>
        <h2 className="text-lg font-semibold text-slate-900">Add application</h2>
        <p className="text-sm text-slate-500 mt-1">
          Link a resume and track it through your pipeline.
        </p>

        <div className="mt-5 space-y-4">
          <Labeled label="Resume">
            {entries.length === 0 ? (
              <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2.5">
                No resumes yet — create one first to link it here. You can still add an
                application without a resume.
              </div>
            ) : (
              <select
                className="field"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
              >
                <option value="">No linked resume</option>
                {entries.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title || 'Untitled'}
                    {e.job?.company ? ` · ${e.job.company}` : ''}
                  </option>
                ))}
              </select>
            )}
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Company">
              <input
                className="field"
                value={company}
                placeholder="Acme Inc."
                onChange={(e) => {
                  touched.current.company = true;
                  setCompany(e.target.value);
                }}
              />
            </Labeled>
            <Labeled label="Role">
              <input
                className="field"
                value={role}
                placeholder="Software Engineer"
                onChange={(e) => {
                  touched.current.role = true;
                  setRole(e.target.value);
                }}
              />
            </Labeled>
          </div>

          <Labeled label="Starting column">
            <StatusSelect columns={columns} value={status} onChange={setStatus} />
          </Labeled>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button className="rx-btn rx-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="rx-btn rx-btn-primary" onClick={submit}>
            Add application
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Card detail modal ─────────────────────────────────────────────────────────
function DetailModal({ card, columns, resumeTitle, onClose, onChanged, onDeleted, onOpenResume, onRequestConfirm }) {
  const [company, setCompany] = useState(card.company || '');
  const [role, setRole] = useState(card.role || '');
  const [notes, setNotes] = useState(card.notes || '');
  const [status, setStatus] = useState(card.status);
  const [appliedAt, setAppliedAt] = useState(toDateInput(card.appliedAt));
  const [error, setError] = useState(null);

  // Live-save a single field patch (cheap; the store stamps updatedAt).
  const patch = async (p) => {
    try {
      await applicationStore.update(card.id, p);
      await onChanged();
    } catch (err) {
      console.error('DetailModal: update failed', err);
      setError('Could not save changes.');
    }
  };

  const changeStatus = async (next) => {
    setStatus(next);
    // Re-home into the new column at the end so positions stay coherent.
    try {
      await applicationStore.move(card.id, next, Number.MAX_SAFE_INTEGER);
      await onChanged();
    } catch (err) {
      console.error('DetailModal: status change failed', err);
      setError('Could not change the status.');
    }
  };

  const changeAppliedAt = (val) => {
    setAppliedAt(val);
    patch({ appliedAt: val ? new Date(val).getTime() : null });
  };

  const remove = () => {
    onRequestConfirm('Delete Application', 'Delete this application? This cannot be undone.', async () => {
      try {
        await applicationStore.delete(card.id);
        await onDeleted();
      } catch (err) {
        console.error('DetailModal: delete failed', err);
        setError('Could not delete this application.');
      }
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="rx-eyebrow mb-1">Application</div>
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              {company.trim() || 'Untitled company'}
            </h2>
            <p className="text-sm text-slate-500 truncate">{role.trim() || 'Role not set'}</p>
          </div>
          {card.resumeId && (
            <button
              className="rx-btn rx-btn-soft rx-btn-sm shrink-0"
              onClick={() => onOpenResume?.(card.resumeId)}
            >
              <DocIcon /> Open resume
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Company">
              <input
                className="field"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                onBlur={() => patch({ company: company.trim() })}
              />
            </Labeled>
            <Labeled label="Role">
              <input
                className="field"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onBlur={() => patch({ role: role.trim() })}
              />
            </Labeled>
          </div>

          <Labeled label="Status">
            <StatusSelect columns={columns} value={status} onChange={changeStatus} />
          </Labeled>

          <Labeled label="Applied on">
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="field"
                value={appliedAt}
                onChange={(e) => changeAppliedAt(e.target.value)}
              />
              {appliedAt && (
                <button
                  className="rx-btn rx-btn-ghost rx-btn-sm shrink-0"
                  onClick={() => changeAppliedAt('')}
                >
                  Clear
                </button>
              )}
            </div>
          </Labeled>

          <Labeled label="Notes">
            <textarea
              className="field"
              rows={4}
              value={notes}
              placeholder="Recruiter name, salary range, interview prep, links…"
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => patch({ notes })}
            />
          </Labeled>

          {card.resumeId && (
            <div className="text-xs text-slate-400">
              Linked to{' '}
              <button
                className="text-brand-600 hover:underline font-medium"
                onClick={() => onOpenResume?.(card.resumeId)}
              >
                {resumeTitle || 'a resume'}
              </button>
              .
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button className="rx-btn rx-btn-danger" onClick={remove}>
            <TrashIcon /> Delete
          </button>
          <button className="rx-btn rx-btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Bulk action bar ───────────────────────────────────────────────────────────
function BulkBar({ count, columns, onMove, onDelete, onClear }) {
  return (
    <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-40">
      <div className="flex items-center gap-3 bg-white rounded-2xl pl-4 pr-2 py-2 shadow-xl border border-slate-200/70">
        <span className="text-sm font-semibold text-slate-700">
          {count} selected
        </span>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Move to</span>
          <select
            className="field !w-auto !py-1.5 !text-sm"
            value=""
            onChange={(e) => {
              if (e.target.value) onMove(e.target.value);
            }}
          >
            <option value="" disabled>
              Choose…
            </option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button className="rx-btn rx-btn-danger rx-btn-sm" onClick={onDelete}>
          <TrashIcon /> Delete
        </button>
        <button className="rx-btn rx-btn-ghost rx-btn-sm" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

// ── Small shared bits ─────────────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  // Close on Escape, like the app's other sheets.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rx-overlay" onClick={onClose}>
      <div className="rx-sheet rx-sheet-sm" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function StatusSelect({ columns, value, onChange }) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {columns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// Stored epoch timestamps → yyyy-mm-dd for <input type="date">.
function toDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Icons (inline SVG, matching the app's house style) ────────────────────────
function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}
function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M12.79 5.23a.75.75 0 0 1 0 1.06L9.06 10l3.73 3.71a.75.75 0 1 1-1.06 1.06l-4.25-4.24a.75.75 0 0 1 0-1.06l4.25-4.24a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 0 1 0-1.06L10.94 10 7.21 6.29a.75.75 0 1 1 1.06-1.06l4.25 4.24a.75.75 0 0 1 0 1.06l-4.25 4.24a.75.75 0 0 1-1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M6 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM11.5 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15.5 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-3.62-3.622A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
      <path d="M10.076 2.331a.75.75 0 0 0-.652 0l-7 3.5a.75.75 0 0 0 0 1.342l7 3.5a.75.75 0 0 0 .652 0l7-3.5a.75.75 0 0 0 0-1.342l-7-3.5Z" />
      <path d="M2.094 9.964a.75.75 0 0 1 1.006-.335L10 13.066l6.9-3.437a.75.75 0 1 1 .67 1.342l-7.236 3.604a.75.75 0 0 1-.668 0L2.43 10.971a.75.75 0 0 1-.336-1.007Z" />
    </svg>
  );
}
