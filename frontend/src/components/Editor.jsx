import { useEffect, useMemo, useRef, useState } from 'react';
import ChatPanel from './ChatPanel.jsx';
import FormEditor from './FormEditor.jsx';
import PreviewPanel from './PreviewPanel.jsx';
import AtsModal from './AtsModal.jsx';
import TemplateGallery from './TemplateGallery.jsx';
import { api } from '../lib/api.js';
import { emptyResume } from '../lib/storage.js';
import { runAtsChecks } from '../lib/ats.js';
import { mergeResume, diffResume, hasContent, splitChangesIntoCards, applyCardPatch, invertCardPatch, undoCardPatch } from '../lib/resume.js';
import { usePdfCompiler } from '../lib/usePdfCompiler.js';

const GREETING = {
  role: 'assistant',
  content:
    "Hi! I'm Resumex. I'll build your resume through a quick conversation.\n\nLet's start — what's your name and current (or target) role?",
};

// Import an existing résumé as-is: copy the text verbatim into the right fields.
// Optimization is a separate, explicit step (the "Optimize" button).
const importInstruction = (text) =>
  `Here is my existing résumé. Import ALL of these details into the builder verbatim — ` +
  `copy the text EXACTLY as written into the correct sections. Do NOT rephrase, rewrite, ` +
  `optimize, summarize, reorder, or embellish anything; preserve the original wording. ` +
  `I'll optimize it separately afterward.\n\n${text}`;

export default function Editor({
  entry, settings, templates,
  onBack, onUpdate, onOpenSettings, importText,
}) {
  const [resume, setResume] = useState(entry.resume || emptyResume());
  const [messages, setMessages] = useState(() =>
    entry.messages?.length ? entry.messages : [GREETING]
  );
  // 'uday' was renamed to 'modern' — map any saved value forward.
  const [templateId, setTemplateId] = useState((entry.templateId === 'uday' ? 'modern' : entry.templateId) || 'jake');
  const [pageSize, setPageSize] = useState(entry.pageSize || 'a4');
  const [trim, setTrim] = useState(entry.trim ?? true);
  const [title, setTitle] = useState(entry.title || 'Untitled Resume');
  const [editingTitle, setEditingTitle] = useState(false);
  const [leftTab, setLeftTab] = useState('chat'); // 'chat' | 'edit' | 'templates'

  const [sending, setSending] = useState(false);
  const [showAts, setShowAts] = useState(false);

  const currentApiKey = settings.apiKeys?.[settings.provider] || '';
  const ats = useMemo(() => runAtsChecks(resume), [resume]);
  const currentTemplate = templates.find(t => t.id === templateId);

  const abortRef = useRef(null);
  const inFlight = useRef(false); // synchronous guard against concurrent/duplicate turns
  const latest = useRef({ resume, messages, templateId, pageSize, trim, title });
  latest.current = { resume, messages, templateId, pageSize, trim, title };

  function flushSave(override) {
    const s = { ...latest.current, ...(override || {}) };
    const cleanMessages = s.messages.map(({ streaming, pending, ...m }) => m);
    onUpdate(entry.id, { ...s, messages: cleanMessages });
  }

  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 400);
    return () => clearTimeout(saveTimer.current);
  }, [resume, messages, templateId, pageSize, trim, title]);

  useEffect(() => () => flushSave(), []);

  // Persist synchronously when the tab is hidden or torn down — the debounced
  // save and the unmount cleanup don't run on a hard browser reload.
  useEffect(() => {
    const save = () => flushSave();
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushSave(); };
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('beforeunload', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Abort any in-flight chat request if the editor unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (resume.name && title === 'Untitled Resume') {
      setTitle(`${resume.name}'s Resume`);
    }
  }, [resume.name]);

  const [retryNonce, setRetryNonce] = useState(0);
  // PDF compilation + a small cache of compiled blobs. `prewarm(id)` lets the
  // template tab compile a layout on hover so picking it swaps in instantly.
  const { pdfUrl, compiling, error: pdfError, prewarm } = usePdfCompiler({
    resume, templateId, pageSize, trim, retryNonce,
  });

  const importedOnce = useRef(false);
  useEffect(() => {
    if (importText && !importedOnce.current && currentApiKey) {
      importedOnce.current = true;
      sendMessage(
        importInstruction(importText),
        [],
        { display: '📄 Imported existing resume — extracting your details…', imported: true }
      );
    }
  }, [importText, currentApiKey]);

  // Auto-resume a turn that was cut off before it finished (a dangling user
  // message with no reply). This happens on a hard reload mid-request and, in
  // dev, on React StrictMode's mount→unmount→remount which aborts the in-flight
  // import. We silently re-send instead of stranding the user on a "Resend"
  // button. The retry carries the original turn's intent (imported/optimize) so
  // a verbatim import still applies as-is and re-offers Optimize.
  useEffect(() => {
    if (inFlight.current || sending) return; // a turn is (about to be) running
    if (!currentApiKey) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'user') retryLast();
  }, [sending, messages, currentApiKey]);

  function sendMessage(text, images = [], opts = {}) {
    const trimmed = (text || '').trim();
    if ((!trimmed && images.length === 0) || sending) return;
    if (!currentApiKey) { onOpenSettings(); return; }

    const userMsg = { role: 'user', content: trimmed };
    if (images.length) userMsg.images = images;
    if (opts.display) userMsg.display = opts.display;
    // Remember the turn's intent so an interrupted turn can resume faithfully
    // (e.g. a StrictMode/reload-aborted import still applies verbatim + offers Optimize).
    if (opts.imported) userMsg.imported = true;
    if (opts.optimize) userMsg.optimize = true;

    // An explicit Optimize consumes the import message's "Optimize" offer.
    let prior = messages;
    if (typeof opts.clearOfferIndex === 'number') {
      prior = messages.map((mm, i) => (i === opts.clearOfferIndex ? { ...mm, optimizeOffer: false } : mm));
    }
    const base = [...prior, userMsg];
    setMessages(base);
    runTurn(base, { optimize: opts.optimize, imported: opts.imported });
  }

  // Import a dropped/selected résumé file into the current resume — verbatim.
  async function importFile(file) {
    if (sending || !file) return;
    if (!currentApiKey) { onOpenSettings(); return; }
    try {
      const { text } = await api.extract(file);
      if (!text || !text.trim()) {
        setMessages(curr => [...curr, { role: 'assistant', content: `I couldn't read any text from “${file.name}”. Try a different file.`, error: true }]);
        return;
      }
      sendMessage(importInstruction(text), [], { display: `📄 Imported ${file.name} — extracting your details…`, imported: true });
    } catch (e) {
      setMessages(curr => [...curr, { role: 'assistant', content: `Sorry — couldn't import that file: ${e.message}`, error: true }]);
    }
  }

  // Rewrite and polish the whole résumé in one shot, applied immediately. Undo
  // breaks it back into per-section cards so the user can cherry-pick changes.
  function optimizeResume(sourceIndex) {
    if (sending) return;
    if (!currentApiKey) { onOpenSettings(); return; }
    if (!hasContent(resume)) return;
    sendMessage(
      `Please optimize my entire résumé. Rewrite every bullet to be strong, action-oriented, ` +
      `and quantified where the facts allow; fix grammar, spelling, and wording; keep it concise ` +
      `and ATS-friendly. Do NOT invent facts, numbers, or experience I didn't provide. ` +
      `Return the full optimized résumé as a patch.`,
      [],
      { display: '✨ Optimizing your résumé…', optimize: true, clearOfferIndex: sourceIndex }
    );
  }

  // Re-run the last user turn after an interruption (reload) or an error,
  // without duplicating the user's message.
  function retryLast() {
    if (inFlight.current || sending) return;
    let i = messages.length - 1;
    while (i >= 0 && messages[i].role !== 'user') i--;
    if (i < 0) return;
    const u = messages[i];
    const base = messages.slice(0, i + 1); // drop any trailing error bubble
    setMessages(base);
    runTurn(base, { optimize: u.optimize, imported: u.imported });
  }

  // One request/response cycle. `base` ends with the user message to answer.
  // No token streaming: show a typing indicator, then reveal the reply and the
  // suggestion cards in a single atomic update.
  async function runTurn(base, { optimize = false, imported = false } = {}) {
    if (inFlight.current) return; // never run two turns at once (StrictMode double-fire, races)
    inFlight.current = true;
    setSending(true);
    flushSave({ messages: base }); // persist the user's message right away

    const baseResume = resume;
    const payload = base.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.images?.length ? { images: m.images.map(im => ({ mime: im.mime, data: im.data })) } : {}),
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { message, resume: updated, patch } = await api.chat(
        {
          provider: settings.provider, model: settings.model, apiKey: currentApiKey,
          messages: payload, resume: baseResume,
          // Verbatim imports use a dedicated coach-free parser prompt on the
          // backend + greedy decoding, so the model transcribes the résumé
          // instead of "improving" it. Optimization is the separate Optimize step.
          ...(imported && !optimize ? { imported: true, temperature: 0 } : {}),
        },
        { signal: controller.signal }
      );
      if (controller.signal.aborted) return;

      const replyText = message || '(no reply)';
      const changes = patch ? diffResume(baseResume, updated) : [];

      let assistantMsg;
      if (patch && changes.length && (optimize || !hasContent(baseResume))) {
        // Import into an empty resume, or an explicit Optimize: apply it all at
        // once, but keep a snapshot so the whole thing stays undoable (and an
        // undo splits it back into per-section cards to cherry-pick).
        const cards = splitChangesIntoCards(changes, patch, baseResume);
        const appliedCards = {};
        for (const c of cards) appliedCards[c.id] = {};
        setResume(r => mergeResume(r, patch));
        assistantMsg = {
          role: 'assistant',
          content: replyText,
          suggestion: { patch, changes, cards, appliedCards, applied: true, undoAll: baseResume },
        };
        // Offer a one-click Optimize right in the chat after a verbatim import.
        if (imported && !optimize) assistantMsg.optimizeOffer = true;
      } else if (patch && changes.length) {
        const cards = splitChangesIntoCards(changes, patch, baseResume);
        assistantMsg = { role: 'assistant', content: replyText, suggestion: { patch, changes, cards } };
      } else {
        assistantMsg = { role: 'assistant', content: replyText };
      }

      setMessages(curr => [...curr, assistantMsg]);
    } catch (e) {
      if (controller.signal.aborted || e.name === 'AbortError') return;
      setMessages(curr => [...curr, { role: 'assistant', content: `Sorry — ${e.message}`, error: true }]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      inFlight.current = false;
      setSending(false);
    }
  }

  function applySuggestion(messageIndex, cardId) {
    const m = messages[messageIndex];
    if (!m?.suggestion) return;
    const cards = m.suggestion.cards || [];
    const applied = m.suggestion.appliedCards || {};
    const dismissed = m.suggestion.dismissedCards || {};
    // One card, or (no cardId = "Insert all") every not-yet-applied, not-dismissed card.
    const targets = (cardId ? cards.filter(c => c.id === cardId) : cards.filter(c => !dismissed[c.id])).filter(c => !applied[c.id]);
    if (!targets.length) return;

    // Snapshot how to reverse each card. Cards touch disjoint items, so it's
    // safe to capture them all against the current resume up front.
    const undos = {};
    for (const card of targets) undos[card.id] = invertCardPatch(resume, card.id, card.patch);

    setResume(r => {
      let working = r;
      for (const card of targets) working = applyCardPatch(working, card.id, card.patch);
      return working;
    });

    setMessages(curr => curr.map((mm, i) => {
      if (i !== messageIndex || !mm.suggestion) return mm;
      const appliedCards = { ...(mm.suggestion.appliedCards || {}) };
      for (const card of targets) appliedCards[card.id] = { undo: undos[card.id] };
      const allApplied = (mm.suggestion.cards || []).every(c => appliedCards[c.id]);
      return { ...mm, suggestion: { ...mm.suggestion, appliedCards, applied: allApplied } };
    }));
  }

  function undoSuggestion(messageIndex, cardId) {
    const m = messages[messageIndex];
    if (!m?.suggestion) return;
    const cards = m.suggestion.cards || [];
    const applied = m.suggestion.appliedCards || {};
    const targets = (cardId ? cards.filter(c => c.id === cardId) : cards).filter(c => applied[c.id]?.undo);

    if (!targets.length) {
      // Whole-batch undo for an auto-applied import (no per-card snapshots).
      if (!cardId && m.suggestion.undoAll) {
        const snapshot = m.suggestion.undoAll;
        setResume(() => snapshot);
        setMessages(curr => curr.map((mm, i) =>
          i === messageIndex && mm.suggestion
            ? { ...mm, suggestion: { ...mm.suggestion, applied: false, appliedCards: {} } }
            : mm));
      }
      return;
    }

    setResume(r => {
      let working = r;
      for (const card of targets) working = undoCardPatch(working, applied[card.id].undo);
      return working;
    });

    setMessages(curr => curr.map((mm, i) => {
      if (i !== messageIndex || !mm.suggestion) return mm;
      const appliedCards = { ...(mm.suggestion.appliedCards || {}) };
      for (const card of targets) delete appliedCards[card.id];
      const stillApplied = cards.length > 0 && cards.every(c => appliedCards[c.id]);
      return { ...mm, suggestion: { ...mm.suggestion, appliedCards, applied: stillApplied } };
    }));
  }

  function dismissSuggestion(messageIndex, cardId) {
    const m = messages[messageIndex];
    if (!m?.suggestion) return;

    if (cardId) {
      setMessages(curr => curr.map((mm, i) => {
        if (i !== messageIndex) return mm;
        const dismissedCards = {
          ...(mm.suggestion.dismissedCards || {}),
          [cardId]: true
        };

        const allDismissed = mm.suggestion.cards.every(c => dismissedCards[c.id] || mm.suggestion.appliedCards?.[c.id]);

        return {
          ...mm,
          suggestion: {
            ...mm.suggestion,
            dismissedCards,
            dismissed: allDismissed
          }
        };
      }));
    } else {
      setMessages(curr => curr.map((mm, i) =>
        i === messageIndex ? { ...mm, suggestion: { ...mm.suggestion, dismissed: true } } : mm
      ));
    }
  }

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${(resume.name || 'resume').replace(/\s+/g, '_')}.pdf`;
    a.click();
  }

  async function downloadTex() {
    try {
      const { latex } = await api.render({ templateId, resume, pageSize });
      const blob = new Blob([latex], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resume.name || 'resume').replace(/\s+/g, '_')}.tex`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-3 h-12 flex items-center gap-2 shrink-0 z-10">
        {/* Back */}
        <button
          onClick={() => { flushSave(); onBack(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition text-sm font-medium shrink-0"
          title="Back to dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

        {/* Editable title */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
            className="text-sm font-semibold text-slate-900 bg-white border border-brand-400 rounded-lg px-2.5 py-1 outline-none ring-2 ring-brand-100 w-52"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-brand-600 transition truncate max-w-[200px] group"
            title="Click to rename"
          >
            {title}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0">
              <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.263-4.265a1.75 1.75 0 0 0 0-2.47Z" />
            </svg>
          </button>
        )}

        <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

        {/* Template (opens the Templates tab) + page size */}
        <button
          onClick={() => setLeftTab('templates')}
          title="Choose template"
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition font-medium ${
            leftTab === 'templates'
              ? 'border-brand-300 bg-brand-50 text-brand-700'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: currentTemplate?.accent || '#64748b' }} />
          <span>{currentTemplate?.name || 'Template'}</span>
        </button>
        <PageSizeSelect value={pageSize} onChange={setPageSize} />

        <div className="flex-1" />

        {/* Right actions */}
        <AtsChip score={ats.score} grade={ats.grade} onClick={() => setShowAts(true)} />

        <button
          onClick={onOpenSettings}
          className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition"
          title="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>

        <button
          onClick={downloadTex}
          disabled={!pdfUrl}
          className="hidden sm:block text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition font-medium"
        >
          .tex
        </button>

        <button
          onClick={downloadPdf}
          disabled={!pdfUrl}
          className="flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition font-semibold shadow-sm shadow-brand-600/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          PDF
        </button>
      </header>

      {/* ── Main split ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="flex flex-col w-1/2 min-w-[420px] border-r border-slate-200">
          {/* Tab bar */}
          <div className="bg-white border-b border-slate-200 flex items-center px-1 shrink-0">
            <TabBtn active={leftTab === 'chat'} onClick={() => setLeftTab('chat')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 2c-4.418 0-8 3.13-8 7 0 1.892.857 3.605 2.252 4.873l-.738 2.583a.5.5 0 0 0 .691.59l3.06-1.36c.86.2 1.78.314 2.735.314 4.418 0 8-3.13 8-7s-3.582-7-8-7Z" clipRule="evenodd" />
              </svg>
              AI Chat
            </TabBtn>
            <TabBtn active={leftTab === 'edit'} onClick={() => setLeftTab('edit')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
              </svg>
              Edit Fields
            </TabBtn>
            <TabBtn active={leftTab === 'templates'} onClick={() => setLeftTab('templates')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
              </svg>
              Templates
            </TabBtn>
          </div>

          <div className="flex-1 min-h-0">
            {leftTab === 'chat' ? (
              <ChatPanel
                messages={messages}
                sending={sending}
                onSend={sendMessage}
                onInsert={applySuggestion}
                onUndo={undoSuggestion}
                onDismiss={dismissSuggestion}
                onRetry={retryLast}
                onImportFile={importFile}
                onOptimize={optimizeResume}
                placeholder={currentApiKey ? 'Tell me about your experience…' : 'Add an API key in Settings first'}
              />
            ) : leftTab === 'edit' ? (
              <FormEditor resume={resume} onChange={setResume} />
            ) : (
              <TemplateGallery
                templates={templates}
                value={templateId}
                resume={resume}
                onChange={setTemplateId}
                onPrewarm={prewarm}
              />
            )}
          </div>
        </div>

        {/* Right: PDF preview */}
        <div className="flex flex-col flex-1 min-w-0">
          <PreviewPanel
            pdfUrl={pdfUrl}
            compiling={compiling}
            error={pdfError}
            empty={!hasContent(resume)}
            onRetry={() => setRetryNonce(n => n + 1)}
            onDownload={downloadPdf}
          />
        </div>
      </div>

      {showAts && (
        <AtsModal settings={settings} resume={resume} localResult={ats} onClose={() => setShowAts(false)} />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

const PAGE_SIZES = [
  { id: 'a4', label: 'A4' },
  { id: 'legal', label: 'Long' },
];

function PageSizeSelect({ value, onChange }) {
  return (
    <label className="relative flex items-center" title="Page size">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none text-xs pl-2.5 pr-6 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer outline-none focus:border-brand-400 transition font-medium"
      >
        {PAGE_SIZES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
        className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 pointer-events-none">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
      </svg>
    </label>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm font-medium px-4 py-3 border-b-2 transition ${
        active
          ? 'text-brand-600 border-brand-600'
          : 'text-slate-500 border-transparent hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function AtsChip({ score, grade, onClick }) {
  const color = score >= 70 ? 'emerald' : score >= 50 ? 'amber' : 'rose';
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    amber:   'bg-amber-50  text-amber-700  border-amber-200  hover:bg-amber-100',
    rose:    'bg-rose-50   text-rose-700   border-rose-200   hover:bg-rose-100',
  };
  const dots = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' };
  return (
    <button
      onClick={onClick}
      title={`ATS score ${score} (${grade}). Click for details.`}
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition ${styles[color]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dots[color]}`} />
      ATS {score}
    </button>
  );
}
