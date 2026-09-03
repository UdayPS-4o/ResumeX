import { useEffect, useRef, useState } from 'react';
import { fileToImagePart } from '../lib/image.js';
import { useDropzone, usePaste } from '../lib/dropzone.js';

export default function ChatPanel({ messages, sending, onSend, onInsert, onUndo, onDismiss, onRetry, onImportFile, onOptimize, onUndoStyle, onOpenDocuments, onDownloadCoverLetter, placeholder }) {
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState([]); // [{mime, data, dataUrl}]
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const prevCount = useRef(0);

  // Auto-scroll only when a new message arrives or while a reply is pending —
  // NOT on in-place updates (e.g. applying/undoing a suggestion card), which
  // would otherwise yank the view to the bottom mid-interaction.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevCount.current;
    prevCount.current = messages.length;
    if (grew || sending) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  async function addFiles(files) {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    for (const f of imgs) {
      try {
        const part = await fileToImagePart(f);
        setImages(prev => [...prev, part]);
      } catch { /* ignore unreadable image */ }
    }
  }

  // Documents (PDF/DOCX/TXT) are imported as resume source; images are attached.
  const isDocFile = (f) =>
    f.type === 'application/pdf' ||
    f.type === 'text/plain' ||
    /word|officedocument/.test(f.type) ||
    /\.(pdf|docx?|txt)$/i.test(f.name);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const docs = files.filter(isDocFile);
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (docs.length && onImportFile) onImportFile(docs[0]);
    if (imgs.length) addFiles(imgs);
  }

  const { getRootProps, isDragging: dragOver } = useDropzone({
    accept: ["image/*", "application/pdf", "text/plain", ".docx", ".doc"],
    multiple: true,
    onDrop: (files) => {
      handleFiles(files);
    }
  });

  const { ref: dropzoneRef } = getRootProps();

  const pasteRef = usePaste((data) => {
    if (data.images.length) {
      data.preventDefault();
      addFiles(data.images);
    }
  });

  const setCombinedTextareaRef = (el) => {
    textareaRef.current = el;
    pasteRef(el);
  };

  function submit() {
    if ((!draft.trim() && images.length === 0) || sending) return;
    onSend(draft, images);
    setDraft('');
    setImages([]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const last = messages[messages.length - 1];
  const interrupted = !sending && last?.role === 'user';

  return (
    <div
      ref={dropzoneRef}
      className="flex flex-col h-full relative"
    >
      <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-900 text-sm">Conversation</div>
          <div className="text-[11px] text-slate-500">Chat naturally — your resume builds itself on the right.</div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {messages.map((m, i) => (
          <Message
            key={i}
            message={m}
            onInsert={onInsert}
            onUndo={onUndo}
            onDismiss={onDismiss}
            onRetry={onRetry}
            onOptimize={onOptimize}
            onUndoStyle={onUndoStyle}
            onOpenDocuments={onOpenDocuments}
            onDownloadCoverLetter={onDownloadCoverLetter}
            sending={sending}
            messageIndex={i}
          />
        ))}
        {/* While waiting for a reply, show a typing indicator — no partial text. */}
        {sending && <TypingIndicator />}
        {/* A turn cut off by a reload leaves a dangling user message. */}
        {interrupted && <InterruptedNotice onRetry={onRetry} />}
      </div>

      <div className="border-t border-slate-100 p-3">
        {/* Image thumbnails */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.dataUrl} alt="attachment" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition-all active:scale-95 duration-200 ease-in-out"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition">
          <textarea
            ref={setCombinedTextareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={2}
            className="w-full resize-none px-3 py-2.5 pr-20 text-sm bg-transparent rounded-xl outline-none placeholder:text-slate-400"
          />
          {/* Attach */}
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach image"
            className="absolute bottom-2 right-11 w-8 h-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
          {/* Send */}
          <button
            onClick={submit}
            disabled={(!draft.trim() && images.length === 0) || sending}
            title="Send (Enter)"
            className="absolute bottom-2 right-2 w-8 h-8 grid place-items-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all active:scale-95 duration-200 ease-in-out disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-slate-400 mt-1.5 px-1">
          <kbd className="px-1 py-0.5 border border-slate-200 rounded bg-slate-50 text-slate-600">Enter</kbd> to send ·
          <kbd className="px-1 py-0.5 border border-slate-200 rounded bg-slate-50 text-slate-600 ml-1">Shift+Enter</kbd> newline ·
          {onImportFile ? ' drop a PDF to import or paste an image' : ' paste or drop an image to attach'}
        </div>
      </div>

      {/* Drop overlay — covers the whole panel (messages + composer) so a file
          can be dropped anywhere, and stays put while the chat scrolls. */}
      {dragOver && (
        <div className="absolute inset-2 z-30 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-50/85 backdrop-blur-[1px] grid place-items-center text-center px-6 text-brand-700 text-sm font-semibold pointer-events-none">
          {onImportFile
            ? 'Drop your resume (PDF, DOCX, TXT) to import — or an image to attach'
            : 'Drop image to attach'}
        </div>
      )}
    </div>
  );
}

function Message({ message, onInsert, onUndo, onDismiss, onRetry, onOptimize, onUndoStyle, onOpenDocuments, onDownloadCoverLetter, sending, messageIndex }) {
  const isUser = message.role === 'user';
  const text = message.display || message.content;
  const sug = message.suggestion;
  // Dismissed cards are removed from the chat entirely (not shown as "dismissed").
  const cards = (sug?.cards || []).filter(c => !sug?.dismissedCards?.[c.id]);
  const isCardApplied = (c) => !!(sug?.appliedCards?.[c.id] || sug?.applied);
  const unapplied = cards.filter(c => !isCardApplied(c));
  const appliedCount = cards.length - unapplied.length;
  const showInsertAll = cards.length > 1 && unapplied.length > 0;
  const showUndoAll = appliedCount > 0 && (cards.length > 1 || !!sug?.undoAll);

  return (
    <div className={`slide-up flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="w-7 h-7 rounded-md bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0 mr-2 mt-0.5">
            R
          </div>
        )}
        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : message.error
              ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-sm'
              : 'bg-slate-100 text-slate-800 rounded-bl-sm'
        }`}>
          {message.images?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img.dataUrl || `data:${img.mime};base64,${img.data}`}
                  alt="attachment"
                  className="max-w-[160px] max-h-32 rounded-lg border border-black/10"
                />
              ))}
            </div>
          )}
          {text}
          {message.error && onRetry && (
            <div className="mt-1.5">
              <button
                onClick={onRetry}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline underline-offset-2 transition-transform active:scale-95 duration-200 ease-in-out"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {!isUser && message.actions?.length > 0 && (
        <ActionChips
          actions={message.actions}
          canUndo={!!message.styleUndo && !message.styleUndone}
          undone={!!message.styleUndone}
          onUndo={() => onUndoStyle?.(message.id)}
        />
      )}

      {!isUser && message.document && (
        <DocumentCard
          document={message.document}
          onOpenDocuments={onOpenDocuments}
          onDownloadCoverLetter={onDownloadCoverLetter}
        />
      )}

      {!isUser && sug && cards.length > 0 && (
        <div className="ml-9 mt-2 w-[85%] space-y-3">
          {/* A verbatim import applies every section at once. Show a single
              "Added to your resume" confirmation instead of one card per item.
              An Undo splits it back into per-section cards to cherry-pick. */}
          {sug.imported && unapplied.length === 0 ? (
            <ImportedConfirmation onUndo={() => onUndo?.(messageIndex)} />
          ) : (
            <>
              {cards.map((card) => (
                <SuggestionCard
                  key={card.id}
                  suggestion={{
                    ...card,
                    applied: isCardApplied(card),
                    dismissed: sug.dismissedCards?.[card.id] || sug.dismissed,
                    canUndo: !!sug.appliedCards?.[card.id]?.undo,
                  }}
                  onInsert={() => onInsert?.(messageIndex, card.id)}
                  onUndo={() => onUndo?.(messageIndex, card.id)}
                  onDismiss={() => onDismiss?.(messageIndex, card.id)}
                />
              ))}

              {(showInsertAll || showUndoAll) && (
                <div className="flex justify-end gap-3 pr-1">
                  {showUndoAll && (
                    <button
                      onClick={() => onUndo?.(messageIndex)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out"
                    >
                      Undo all
                    </button>
                  )}
                  {showInsertAll && (
                    <button
                      onClick={() => onInsert?.(messageIndex)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-all active:scale-95 duration-200 ease-in-out flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckIcon />
                      Accept all ({unapplied.length})
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!isUser && message.optimizeOffer && onOptimize && (
        <div className="ml-9 mt-2">
          <button
            onClick={() => onOptimize(messageIndex)}
            disabled={sending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all active:scale-95 duration-200 ease-in-out shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <SparkIcon className="w-3.5 h-3.5 text-white" />
            Optimize this resume
          </button>
          <div className="text-[11px] text-slate-400 mt-1">Imported as-is — polish bullets &amp; wording in one click (fully undoable).</div>
        </div>
      )}
    </div>
  );
}

const KIND_TONE = {
  add:    { sign: '+', cls: 'text-emerald-700 bg-emerald-100' },
  revise: { sign: '~', cls: 'text-amber-700 bg-amber-100' },
  remove: { sign: '−', cls: 'text-rose-700 bg-rose-100' },
};

// One concrete change: context line (which item/field) + the before/after text.
function EditRow({ edit }) {
  const ctx = [edit?.where, edit?.field].filter(Boolean).join(' · ');
  return (
    <div className="text-xs">
      {ctx && <div className="text-[11px] font-medium text-slate-400 mb-0.5">{ctx}</div>}
      {edit?.before && (
        <div className="rounded bg-rose-50 text-rose-700 px-2 py-1 flex gap-1.5">
          <span className="select-none font-semibold shrink-0">−</span>
          <span className="whitespace-pre-wrap break-words line-through decoration-rose-300/70">{edit.before}</span>
        </div>
      )}
      {edit?.after && (
        <div className="rounded bg-emerald-50 text-emerald-800 px-2 py-1 mt-1 flex gap-1.5">
          <span className="select-none font-semibold shrink-0">+</span>
          <span className="whitespace-pre-wrap break-words">{edit.after}</span>
        </div>
      )}
    </div>
  );
}

// A section's worth of edits (e.g. all the Projects changes).
function SectionDiff({ change }) {
  const tone = KIND_TONE[change?.kind] || { sign: '•', cls: 'text-slate-600 bg-slate-100' };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        <span className={`w-4 h-4 rounded grid place-items-center text-[11px] font-bold leading-none shrink-0 ${tone.cls}`}>
          {tone.sign}
        </span>
        <span className="text-xs font-semibold text-slate-700 truncate">{change?.label}</span>
      </div>
      <div className="space-y-2 pl-0.5">
        {change?.edits?.map((e, i) => <EditRow key={i} edit={e} />)}
      </div>
    </div>
  );
}

// Confirmation chips for app actions the assistant took (restyling, template,
// page size, rename, opening a tool). Styling-type actions share one "Undo" that
// reverts the whole batch via the message's snapshot.
function ActionChips({ actions, canUndo, undone, onUndo }) {
  return (
    <div className="ml-9 mt-2 w-[85%]">
      <div className="flex flex-wrap items-center gap-1.5">
        {actions.map((a, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full pl-1.5 pr-2.5 py-1"
            title={a.label}
          >
            <CheckIcon className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[230px]">{a.label}</span>
          </span>
        ))}
        {canUndo && (
          <button
            onClick={onUndo}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out"
          >
            Undo
          </button>
        )}
        {undone && <span className="text-[11px] text-slate-400 px-1">Reverted</span>}
      </div>
    </div>
  );
}

// A generated document (cover letter / outreach) shown inline in chat, with the
// text preview and quick actions. The copy is also saved to the résumé's
// Documents, so "Open in Documents" picks up right where this left off.
function DocumentCard({ document: doc, onOpenDocuments, onDownloadCoverLetter }) {
  const [copied, setCopied] = useState(false);
  const isCover = doc.kind === 'coverLetter';
  const title = isCover ? 'Cover letter' : 'Outreach message';
  const subtitle = isCover
    ? (doc.tone ? `${doc.tone[0].toUpperCase()}${doc.tone.slice(1)} tone` : '')
    : (doc.channel === 'email' ? 'Email' : 'LinkedIn');

  async function copy() {
    try {
      await navigator.clipboard.writeText(doc.text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="ml-9 mt-2 w-[85%]">
      <div className="rounded-xl border border-brand-200 bg-white overflow-hidden shadow-sm">
        <div className="px-3 py-2 flex items-center gap-2 border-b border-brand-100 bg-brand-50/60">
          <DocIcon />
          <span className="text-xs font-semibold text-brand-900">{title}</span>
          {subtitle && <span className="text-[11px] text-brand-500">· {subtitle}</span>}
          {doc.status === 'ready' && <span className="ml-auto text-[11px] text-emerald-600 font-medium">Saved to Documents</span>}
        </div>

        {doc.status === 'loading' ? (
          <div className="px-3 py-4 flex items-center gap-2 text-xs text-slate-500">
            <span className="dot w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5" />
            <span className="dot w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5" />
            <span className="dot w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5" />
            <span className="ml-1">Writing your {isCover ? 'cover letter' : 'message'}…</span>
          </div>
        ) : doc.status === 'error' ? (
          <div className="px-3 py-3 text-xs text-rose-700 bg-rose-50">
            Couldn’t generate it: {doc.error || 'something went wrong'}.
          </div>
        ) : (
          <>
            <div className="px-3 py-2.5 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {doc.text}
            </div>
            <div className="px-3 py-2 flex items-center gap-2 bg-white border-t border-brand-100">
              <button onClick={copy} className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              {isCover && onDownloadCoverLetter && (
                <button
                  onClick={() => onDownloadCoverLetter(doc.text)}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out"
                >
                  Download PDF
                </button>
              )}
              {onOpenDocuments && (
                <button
                  onClick={onOpenDocuments}
                  className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all active:scale-95 duration-200 ease-in-out flex items-center gap-1"
                >
                  Open in Documents
                  <ArrowIcon />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DocIcon({ className = 'w-4 h-4 text-brand-600' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-3.62-3.622A1.5 1.5 0 0 0 11.378 2H4.5Zm2 6.75A.75.75 0 0 1 7.25 8h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
    </svg>
  );
}

// Single confirmation shown after a verbatim import, in place of one applied
// card per section. Undo reverts the whole import (and re-splits into cards).
function ImportedConfirmation({ onUndo }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
      <CheckIcon />
      Added to your resume
      <button
        onClick={onUndo}
        className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-white/70 transition-all active:scale-95 duration-200 ease-in-out"
      >
        Undo
      </button>
    </div>
  );
}

function SuggestionCard({ suggestion, onInsert, onUndo, onDismiss }) {
  const { changes = [], applied, dismissed, canUndo, label } = suggestion || {};

  if (applied) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <CheckIcon />
        {/* Name the section that was applied so each card says what it touched. */}
        <span className="flex-1 min-w-0 truncate" title={label || undefined}>{label || 'Added to your resume'}</span>
        {canUndo && (
          <button
            onClick={onUndo}
            className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-white/70 transition-all active:scale-95 duration-200 ease-in-out"
          >
            Undo
          </button>
        )}
      </div>
    );
  }

  const total = changes.reduce((n, c) => n + (c?.edits?.length || 0), 0);

  return (
    <div className="rounded-xl border border-brand-200 bg-white overflow-hidden shadow-sm">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-brand-100 bg-brand-50/60">
        <SparkIcon />
        <span className="text-xs font-semibold text-brand-900">Suggested change</span>
        <span className="text-[11px] text-brand-500 tabular-nums">
          {total} edit{total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-3 max-h-72 overflow-y-auto">
        {changes.map((c, i) => <SectionDiff key={i} change={c} />)}
      </div>

      <div className="px-3 py-2 flex items-center gap-2 bg-white border-t border-brand-100">
        {dismissed ? (
          <>
            <span className="text-[11px] text-slate-400 flex-1">Dismissed</span>
            <button
              onClick={onInsert}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-all active:scale-95 duration-200 ease-in-out"
            >
              Accept anyway →
            </button>
          </>
        ) : (
          <>
            <span className="text-[11px] text-slate-400 flex-1 truncate">Previewing on your resume</span>
            <button
              onClick={onDismiss}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-all active:scale-95 duration-200 ease-in-out"
            >
              Undo
            </button>
            <button
              onClick={onInsert}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all active:scale-95 duration-200 ease-in-out flex items-center gap-1"
            >
              Accept
              <ArrowIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InterruptedNotice({ onRetry }) {
  return (
    <div className="flex justify-start slide-up">
      <div className="w-7 h-7 rounded-md bg-amber-100 text-amber-700 grid place-items-center text-xs font-semibold shrink-0 mr-2 mt-0.5">!</div>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm flex items-center gap-3">
        <span>The reply didn’t finish.</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-all active:scale-95 duration-200 ease-in-out"
          >
            Resend
          </button>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start slide-up">
      <div className="w-7 h-7 rounded-md bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0 mr-2 mt-0.5">R</div>
      <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <span className="dot w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5"></span>
        <span className="dot w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5"></span>
        <span className="dot w-1.5 h-1.5 bg-slate-400 rounded-full mx-0.5"></span>
      </div>
    </div>
  );
}

function CheckIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function SparkIcon({ className = 'w-4 h-4 text-brand-600' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10 1.5a.75.75 0 0 1 .728.568l.622 2.49a4 4 0 0 0 2.892 2.892l2.49.622a.75.75 0 0 1 0 1.456l-2.49.622a4 4 0 0 0-2.892 2.892l-.622 2.49a.75.75 0 0 1-1.456 0l-.622-2.49a4 4 0 0 0-2.892-2.892l-2.49-.622a.75.75 0 0 1 0-1.456l2.49-.622a4 4 0 0 0 2.892-2.892l.622-2.49A.75.75 0 0 1 10 1.5Z" />
    </svg>
  );
}

function ArrowIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  );
}
