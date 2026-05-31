import { useEffect, useMemo, useRef, useState } from 'react';
import ChatPanel from './ChatPanel.jsx';
import FormEditor from './FormEditor.jsx';
import PreviewPanel from './PreviewPanel.jsx';
import AtsModal from './AtsModal.jsx';
import TemplateGallery from './TemplateGallery.jsx';
import CustomizePanel from './CustomizePanel.jsx';
import { api } from '../lib/api.js';
import { emptyResume, baseUrlFor, resumeStore, providerReady } from '../lib/storage.js';
import { runAtsChecks } from '@resumex/ats';
import { mergeResume, diffResume, hasContent, splitChangesIntoCards, applyCardPatch, invertCardPatch, undoCardPatch, highlightCardPatch } from '@resumex/core';
import { usePdfCompiler } from '../lib/usePdfCompiler.js';
import { validateActions, orderActions, mergeFormatting, describeAction, STYLE_ACTION_TYPES } from '../lib/chatActions.js';

// Default formatting a fresh template starts from. Switching templates and
// "reset styling" both fall back to this so no template-specific override leaks
// across layouts (mirrors the Templates gallery's onChange reset).
const BASE_FORMATTING = { compactMode: false, showContactIcons: true, sidebarWidth: 'medium' };

const todayLabel = () => {
  try { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return ''; }
};

const GREETING = {
  role: 'assistant',
  content:
    "Hi! I'm ResumeX. I'll build your resume through a quick conversation.\n\nLet's start — what's your name and current (or target) role?",
};

// Import an existing resume as-is: copy the text verbatim into the right fields.
// Optimization is a separate, explicit step (the "Optimize" button).
export const getImportPrompt = (text) =>
  `Here is my existing resume. Import ALL of these details into the builder verbatim — ` +
  `copy the text EXACTLY as written into the correct sections. Do NOT rephrase, rewrite, ` +
  `optimize, summarize, reorder, or embellish anything; preserve the original wording. ` +
  `I'll optimize it separately afterward.\n\n${text}`;

export default function Editor({
  entry, settings, templates,
  onBack, onUpdate, onOpenSettings, importText,
  onTailor, onOpenDocuments, onEnrich,
}) {
  const [resume, setResume] = useState(entry.resume || emptyResume());
  const [messages, setMessages] = useState(() =>
    entry.messages?.length ? entry.messages : [GREETING]
  );
  const [templateId, setTemplateId] = useState(entry.templateId || 'jake');
  const [pageSize, setPageSize] = useState(entry.pageSize || 'a4');
  const [trim, setTrim] = useState(entry.trim ?? true);
  const [title, setTitle] = useState(entry.title || 'Untitled Resume');
  const [editingTitle, setEditingTitle] = useState(false);
  const [leftTab, setLeftTab] = useState('chat'); // 'chat' | 'edit' | 'templates' | 'customize'
  const [formatting, setFormatting] = useState(() => entry.formatting || { ...BASE_FORMATTING });

  const [sending, setSending] = useState(false);
  const [showAts, setShowAts] = useState(false);

  const hasKey = providerReady(settings);
  const ats = useMemo(() => runAtsChecks(resume), [resume]);
  const currentTemplate = templates.find(t => t.id === templateId);

  const abortRef = useRef(null);
  const inFlight = useRef(false); // synchronous guard against concurrent/duplicate turns
  const latest = useRef({ resume, messages, templateId, pageSize, trim, title, formatting });
  latest.current = { resume, messages, templateId, pageSize, trim, title, formatting };

  // Generated documents (cover letter / outreach) accumulate here so a chat-driven
  // generation can persist to the store without clobbering the other document, and
  // so re-opening the Documents panel shows the freshly written copy.
  const docsRef = useRef(entry.documents || {});
  // Stable per-message ids so an async document generation can target the right
  // chat bubble after it resolves (message indexes shift as the list grows).
  const idSeq = useRef(0);
  const makeId = () => `m${Date.now().toString(36)}-${idSeq.current++}`;

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
  }, [resume, messages, templateId, pageSize, trim, title, formatting]);

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
  const previewResume = useMemo(() => {
    let pr = resume;
    for (const m of messages) {
      if (!m.suggestion || !m.suggestion.cards) continue;
      for (const card of m.suggestion.cards) {
        // Apply unapplied, un-dismissed cards with highlights
        if (!m.suggestion.appliedCards?.[card.id] && !m.suggestion.dismissedCards?.[card.id] && !m.suggestion.dismissed && !m.suggestion.undoneCards?.[card.id]) {
          const edits = card.changes.flatMap(c => c.edits || []);
          const highlightedPatch = highlightCardPatch(card.patch, edits);
          pr = applyCardPatch(pr, card.id, highlightedPatch);
        }
      }
    }
    return pr;
  }, [resume, messages]);

  // PDF compilation + a small cache of compiled blobs. `prewarm(id)` lets the
  // template tab compile a layout on hover so picking it swaps in instantly.
  const { pdfUrl, compiling, error: pdfError, prewarm } = usePdfCompiler({
    resume: previewResume, templateId, pageSize, trim, formatting, retryNonce,
  });

  const importedOnce = useRef(false);
  useEffect(() => {
    if (importText && !importedOnce.current && hasKey) {
      importedOnce.current = true;
      sendMessage(
        getImportPrompt(importText),
        [],
        { display: '📄 Imported existing resume — extracting your details…', imported: true }
      );
    }
  }, [importText, hasKey]);

  // Auto-resume a turn that was cut off before it finished (a dangling user
  // message with no reply). This happens on a hard reload mid-request and, in
  // dev, on React StrictMode's mount→unmount→remount which aborts the in-flight
  // import. We silently re-send instead of stranding the user on a "Resend"
  // button. The retry carries the original turn's intent (imported/optimize) so
  // a verbatim import still applies as-is and re-offers Optimize.
  useEffect(() => {
    if (inFlight.current || sending) return; // a turn is (about to be) running
    if (!hasKey) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'user') retryLast();
  }, [sending, messages, hasKey]);

  function sendMessage(text, images = [], opts = {}) {
    const trimmed = (text || '').trim();
    if ((!trimmed && images.length === 0) || sending) return;
    if (!hasKey) { onOpenSettings(); return; }

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

  // Import a dropped/selected resume file into the current resume — verbatim.
  async function importFile(file) {
    if (sending || !file) return;
    if (!hasKey) { onOpenSettings(); return; }
    try {
      const { text } = await api.extract(file);
      if (!text || !text.trim()) {
        setMessages(curr => [...curr, { role: 'assistant', content: `I couldn't read any text from “${file.name}”. Try a different file.`, error: true }]);
        return;
      }
      sendMessage(getImportPrompt(text), [], { display: `📄 Imported ${file.name} — extracting your details…`, imported: true });
    } catch (e) {
      setMessages(curr => [...curr, { role: 'assistant', content: `Sorry — couldn't import that file: ${e.message}`, error: true }]);
    }
  }

  // Rewrite and polish the whole resume in one shot, applied immediately. Undo
  // breaks it back into per-section cards so the user can cherry-pick changes.
  function optimizeResume(sourceIndex) {
    if (sending) return;
    if (!hasKey) { onOpenSettings(); return; }
    if (!hasContent(resume)) return;
    sendMessage(
      `Please optimize my entire resume. Rewrite every bullet to be strong, action-oriented, ` +
      `quantified (where possible without guessing), and high-impact. ` +
      `Fix any grammar or tense issues. Make it sound professional and confident. ` +
      `Return the full optimized resume as a patch.`,
      [],
      { display: '✨ Optimizing your resume…', optimize: true, clearOfferIndex: sourceIndex }
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

    // Live app context lets the model drive styling/template/document actions —
    // not just résumé content. Imports use the coach-free parser prompt, which
    // ignores context, so we skip building it for them.
    const tmpl = templates.find(t => t.id === latest.current.templateId);
    const context = (imported && !optimize) ? undefined : {
      templates: templates.map(t => ({ id: t.id, name: t.name })),
      templateId: latest.current.templateId,
      templateName: tmpl?.name,
      capabilities: tmpl?.capabilities || null,
      formatting: latest.current.formatting || {},
      job: entry.job ? { company: entry.job.company || '', role: entry.job.role || '' } : null,
    };

    try {
      const { message, resume: updated, patch, actions } = await api.chat(
        {
          provider: settings.provider, model: settings.model, apiKey: '',
          messages: payload, resume: baseResume, context,
          // Verbatim imports use a dedicated coach-free parser prompt on the
          // backend + greedy decoding, so the model transcribes the resume
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
        const isImport = imported && !optimize;
        // Optimize: snapshot how to reverse each card so every section can be
        // undone on its own (cards touch disjoint items, so capturing them all
        // against baseResume up front is safe). Import collapses to one
        // confirmation + Undo-all, so it leans on the whole-resume `undoAll`.
        const appliedCards = {};
        for (const c of cards) {
          appliedCards[c.id] = isImport ? {} : { undo: invertCardPatch(baseResume, c.id, c.patch) };
        }
        setResume(r => mergeResume(r, patch));
        assistantMsg = {
          role: 'assistant',
          content: replyText,
          // `imported` marks a verbatim import (vs. Optimize) so the chat can
          // collapse the per-section cards into one "Added to your resume"
          // confirmation. After an Undo-all it splits back into cherry-pick cards.
          suggestion: { patch, changes, cards, appliedCards, applied: true, undoAll: baseResume, imported: isImport },
        };
        // Offer a one-click Optimize right in the chat after a verbatim import.
        if (imported && !optimize) assistantMsg.optimizeOffer = true;
      } else if (patch && changes.length) {
        const cards = splitChangesIntoCards(changes, patch, baseResume);
        assistantMsg = { role: 'assistant', content: replyText, suggestion: { patch, changes, cards } };
      } else {
        assistantMsg = { role: 'assistant', content: replyText };
      }

      // Run any app actions the model proposed (styling, template, page, title,
      // documents, opening tools). Styling-type changes apply immediately and
      // capture an undo snapshot; document generators run async after the bubble
      // is shown. Validation is gated by the TARGET template's capabilities so a
      // "switch to Deedy and widen the sidebar" request validates correctly.
      assistantMsg.id = makeId();
      const targetTemplateId =
        (Array.isArray(actions) && actions.find(a => a?.type === 'set_template' && templates.some(t => t.id === a.templateId))?.templateId)
        || latest.current.templateId;
      const targetCaps = templates.find(t => t.id === targetTemplateId)?.capabilities || null;
      const clean = orderActions(validateActions(actions, { templates, capabilities: targetCaps }));
      const { chips, styleUndo, docAction } = applyActionsSync(clean);
      if (chips.length) assistantMsg.actions = chips;
      if (styleUndo) assistantMsg.styleUndo = styleUndo;
      if (docAction) {
        assistantMsg.document = docAction.type === 'generate_cover_letter'
          ? { kind: 'coverLetter', status: 'loading', tone: docAction.tone }
          : { kind: 'outreach', status: 'loading', channel: docAction.channel };
      }

      setMessages(curr => [...curr, assistantMsg]);
      if (docAction) runDocAction(assistantMsg.id, docAction);
    } catch (e) {
      if (controller.signal.aborted || e.name === 'AbortError') return;
      setMessages(curr => [...curr, { role: 'assistant', content: `Sorry — ${e.message}`, error: true }]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      inFlight.current = false;
      setSending(false);
    }
  }

  // Execute the synchronous app actions now (styling/template/page/title applied
  // immediately, tools opened, PDF download triggered) and return display data.
  // Document generators are deferred to runDocAction (they're async). All style
  // changes are reverted together by undoStyleActions via the `styleUndo` snapshot.
  function applyActionsSync(actions) {
    if (!actions.length) return { chips: [], styleUndo: null, docAction: null };
    const snapshot = {
      formatting: latest.current.formatting,
      templateId: latest.current.templateId,
      pageSize: latest.current.pageSize,
      trim: latest.current.trim,
      title: latest.current.title,
    };
    const chips = [];
    let docAction = null;
    let hasStyle = false;

    for (const a of actions) {
      if (STYLE_ACTION_TYPES.has(a.type)) hasStyle = true;
      switch (a.type) {
        case 'set_template':
          setTemplateId(a.templateId);
          // Drop template-specific overrides when switching layouts; carry only
          // the layout-agnostic toggles (mirrors the Templates gallery reset).
          setFormatting(prev => ({ ...BASE_FORMATTING, compactMode: prev.compactMode, showContactIcons: prev.showContactIcons, sidebarWidth: prev.sidebarWidth }));
          break;
        case 'set_page_size': setPageSize(a.pageSize); break;
        case 'reset_formatting': setFormatting({ ...BASE_FORMATTING }); break;
        case 'set_formatting': setFormatting(prev => mergeFormatting(prev, a.formatting)); break;
        case 'set_title': setTitle(a.title); break;
        case 'generate_cover_letter':
        case 'generate_outreach':
          docAction = a; // the rich document card is the confirmation — no chip
          continue;
        case 'open_tailor': flushSave(); onTailor?.(); break;
        case 'open_documents': flushSave(); onOpenDocuments?.(); break;
        case 'open_strengthen': flushSave(); onEnrich?.(); break;
        case 'open_ats': setShowAts(true); break;
        case 'download_pdf': downloadPdf(); break;
        default: break;
      }
      chips.push({ type: a.type, label: describeAction(a, { templates }) });
    }
    return { chips, styleUndo: hasStyle ? snapshot : null, docAction };
  }

  function updateMessageById(id, fn) {
    setMessages(curr => curr.map(m => (m.id === id ? fn(m) : m)));
  }

  // Generate a cover letter / outreach note via the dedicated endpoints (same
  // quality + guardrails as the Documents panel), persist it, and fill in the
  // chat's document card when it resolves.
  async function runDocAction(messageId, a) {
    const auth = {
      provider: settings.provider, model: settings.model,
      apiKey: '', baseUrl: baseUrlFor(settings.provider, settings),
    };
    const language = settings.language || 'en';
    // Merge onto the freshest stored documents so a chat-generated doc never
    // clobbers one the Documents panel saved earlier this session.
    const persist = async (patch) => {
      const stored = await resumeStore.get(entry.id);
      const merged = { ...(stored?.documents || {}), ...docsRef.current, ...patch };
      docsRef.current = merged;
      onUpdate(entry.id, { documents: merged });
    };
    try {
      if (a.type === 'generate_cover_letter') {
        const { text } = await api.coverLetter({
          ...auth, resume: latest.current.resume,
          jobDescription: a.jobDescription || entry.job?.description || '',
          job: entry.job || null, language, tone: a.tone,
        });
        await persist({ coverLetter: text || '' });
        updateMessageById(messageId, m => ({ ...m, document: { kind: 'coverLetter', status: 'ready', tone: a.tone, text: text || '' } }));
      } else {
        const { text } = await api.outreach({
          ...auth, resume: latest.current.resume,
          jobDescription: entry.job?.description || '',
          job: entry.job || null, language, channel: a.channel,
        });
        await persist({ outreach: text || '' });
        updateMessageById(messageId, m => ({ ...m, document: { kind: 'outreach', status: 'ready', channel: a.channel, text: text || '' } }));
      }
    } catch (e) {
      updateMessageById(messageId, m => ({ ...m, document: { ...(m.document || {}), status: 'error', error: e.message } }));
    }
  }

  // Revert every styling/template/page/title change made by one chat turn.
  function undoStyleActions(messageId) {
    const m = messages.find(x => x.id === messageId);
    if (!m?.styleUndo || m.styleUndone) return;
    const s = m.styleUndo;
    setFormatting(s.formatting || { ...BASE_FORMATTING });
    setTemplateId(s.templateId);
    setPageSize(s.pageSize);
    setTrim(s.trim);
    setTitle(s.title);
    setMessages(curr => curr.map(x => (x.id === messageId ? { ...x, styleUndone: true } : x)));
  }

  // Download a chat-generated cover letter as a PDF (same route the Documents
  // panel uses). The letterhead/name come from the résumé; we send the body text.
  async function downloadCoverLetterPdf(text) {
    if (!text || !text.trim()) return;
    try {
      const resp = await fetch('/api/documents/cover-letter/pdf', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resume: latest.current.resume, body: text, date: todayLabel() }),
      });
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resume.name || 'resume').replace(/\s+/g, '_')}-cover-letter.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* best-effort download */ }
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
      const undoneCards = { ...(mm.suggestion.undoneCards || {}) };
      for (const card of targets) {
        delete appliedCards[card.id];
        undoneCards[card.id] = true;
      }
      const stillApplied = cards.length > 0 && cards.every(c => appliedCards[c.id]);
      return { ...mm, suggestion: { ...mm.suggestion, appliedCards, undoneCards, applied: stillApplied } };
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

  async function downloadSource() {
    try {
      const { source } = await api.render({ templateId, resume, pageSize });
      const blob = new Blob([source], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resume.name || 'resume').replace(/\s+/g, '_')}.typ`;
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

        {/* AI actions for this resume — flush the autosave first so the panels
            (which read the stored entry) see the very latest content. */}
        <div className="hidden md:flex items-center gap-1 mr-0.5">
          {onTailor && (
            <button onClick={() => { flushSave(); onTailor(); }} title="Tailor this resume to a job"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition font-medium">
              Job Suit
            </button>
          )}
          {onOpenDocuments && (
            <button onClick={() => { flushSave(); onOpenDocuments(); }} title="Cover letter & outreach"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition font-medium">
              Cover Letter
            </button>
          )}
          {onEnrich && (
            <button onClick={() => { flushSave(); onEnrich(); }} title="Strengthen weak bullets"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition font-medium">
              Strengthen
            </button>
          )}
        </div>
        <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

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
          onClick={downloadSource}
          disabled={!pdfUrl}
          className="hidden sm:block text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition font-medium"
        >
          .typ
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
          <div className="bg-white border-b border-slate-200 flex items-stretch h-12 px-1 shrink-0">
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
            <TabBtn active={leftTab === 'customize'} onClick={() => setLeftTab('customize')}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Customize
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
                onUndoStyle={undoStyleActions}
                onOpenDocuments={onOpenDocuments ? () => { flushSave(); onOpenDocuments(); } : undefined}
                onDownloadCoverLetter={downloadCoverLetterPdf}
                placeholder={hasKey ? 'Ask me to edit, restyle, or write a cover letter…' : 'Add an API key in Settings first'}
              />
            ) : leftTab === 'edit' ? (
              <FormEditor resume={resume} onChange={setResume} />
            ) : leftTab === 'templates' ? (
              <TemplateGallery
                templates={templates}
                value={templateId}
                resume={resume}
                onChange={(id) => {
                  if (id !== templateId) {
                    setTemplateId(id);
                    setFormatting((prev) => ({
                      compactMode: prev.compactMode,
                      showContactIcons: prev.showContactIcons,
                      sidebarWidth: prev.sidebarWidth,
                    }));
                  }
                }}
                onPrewarm={prewarm}
              />
            ) : (
              <CustomizePanel
                value={formatting}
                onChange={setFormatting}
                templateDefaultFonts={currentTemplate?.defaultFonts}
                templateId={templateId}
                templateAccent={currentTemplate?.accent}
                templateCapabilities={currentTemplate?.capabilities}
                templateNativeMargins={currentTemplate?.nativeMarginsMm}
                templateUiDefaults={currentTemplate?.uiDefaults}
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
            empty={!hasContent(previewResume)}
            onRetry={() => setRetryNonce(n => n + 1)}
            onDownload={downloadPdf}
          />
        </div>
      </div>

      {showAts && (
        <AtsModal settings={settings} resume={resume} onClose={() => setShowAts(false)} />
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
      className={`flex items-center gap-1.5 text-sm font-medium px-4 h-full border-b-2 transition ${
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
