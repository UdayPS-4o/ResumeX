import { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard.jsx';
import TemplatePicker from '@/components/TemplatePicker.jsx';
import Editor from '@/components/Editor.jsx';
import SettingsModal from '@/components/SettingsModal.jsx';
import Tracker from '@/components/Tracker.jsx';
import TailorPanel from '@/components/TailorPanel.jsx';
import DocumentsPanel from '@/components/DocumentsPanel.jsx';
import EnrichWizard from '@/components/EnrichWizard.jsx';
import { settingsStore, resumeStore, applicationStore, providerReady, defaultSettings } from '@/lib/storage.js';

// `initialTemplates` is pre-fetched server-side by page.js and passed down
// through AppShell. `user` + `onLogout` come from AuthGate (the auth boundary).
//
// Persistence is server-backed now: the stores are async (REST → SQLite), so
// load/mutate handlers are async and we refresh the in-memory `resumes` list
// after each mutation.
export default function App({ initialTemplates = [], user = null, onLogout = () => {} }) {
  // View state: 'dashboard' | 'pickTemplate' | 'editor' | 'tracker'
  const [view, setView] = useState('dashboard');
  const [activeId, setActiveId] = useState(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [templates, setTemplates] = useState(initialTemplates);
  const [resumes, setResumes] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState(null);
  const [pendingImport, setPendingImport] = useState(null); // extracted text for a freshly imported resume

  // Per-entry feature overlays — each operates on a stored resume entry.
  const [tailorTarget, setTailorTarget] = useState(null);       // a master → spawn a tailored variant
  const [documentsTarget, setDocumentsTarget] = useState(null); // cover letter / outreach
  const [enrichTarget, setEnrichTarget] = useState(null);       // enrichment wizard

  const [mounted, setMounted] = useState(false);

  // Initial load — settings + resumes from the server, in parallel.
  useEffect(() => {
    (async () => {
      try {
        const [s, list] = await Promise.all([settingsStore.load(), resumeStore.list()]);
        setSettings(s);
        setResumes(list);
      } catch (e) {
        setError(e?.message || 'Failed to load your data.');
      } finally {
        setMounted(true);
      }
    })();
  }, []);

  // Keyless providers (Ollama, OpenAI-compatible) are "ready" without a key.
  const hasKey = providerReady(settings);

  useEffect(() => {
    if (mounted && !hasKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSettings(true);
    }
  }, [hasKey, mounted]);

  // Active entry is derived from the loaded list (each entry carries its full
  // content), so the Editor mounts without an extra fetch. The Editor manages
  // its own working copy and persists via onUpdate.
  const activeEntry = activeId ? resumes.find((r) => r.id === activeId) || null : null;

  async function refresh() {
    try {
      setResumes(await resumeStore.list());
    } catch (e) {
      setError(e?.message || 'Failed to refresh resumes.');
    }
  }

  function openEditor(id) {
    setActiveId(id);
    setView('editor');
  }

  async function createResume(templateId, importText = null) {
    const tmpl = templates.find((t) => t.id === templateId) || {};
    const init = { pageSize: tmpl.defaultPageSize || 'a4' };
    try {
      const entry = await resumeStore.create(templateId, init);
      setPendingImport(importText || null);
      await refresh();
      openEditor(entry.id);
    } catch (e) {
      setError(e?.message || 'Could not create resume.');
    }
  }

  async function deleteResume(id) {
    try {
      await resumeStore.delete(id);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Could not delete resume.');
    }
  }

  async function duplicateResume(id) {
    try {
      await resumeStore.duplicate(id);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Could not duplicate resume.');
    }
  }

  async function handleUpdate(id, patch) {
    try {
      await resumeStore.update(id, patch);
    } catch (e) {
      setError(e?.message || 'Could not save changes.');
    }
  }

  function backToDashboard() {
    setActiveId(null);
    setPendingImport(null);
    setView('dashboard');
    refresh();
  }

  // ── Feature overlay results ────────────────────────────────────────────────
  // Tailoring a master spawns a linked tailored variant and opens it.
  async function handleTailorSave({ resume, job, matchScore, title, messages } = {}) {
    if (!tailorTarget) return;
    try {
      const variant = await resumeStore.createVariant(tailorTarget.id, { resume, job, matchScore, title, messages });
      // Close the loop like Resume-Matcher: dropping a tailored variant also drops
      // an "applied" card into the tracker (best-effort — never blocks the save).
      if (variant && job && (job.company || job.role)) {
        try {
          await applicationStore.create({
            resumeId: variant.id,
            parentId: tailorTarget.id,
            company: job.company || '',
            role: job.role || '',
            status: 'applied',
            appliedAt: Date.now(),
            notes: job.description ? String(job.description).slice(0, 2000) : '',
          });
        } catch { /* tracker is optional */ }
      }
      setTailorTarget(null);
      await refresh();
      if (variant) openEditor(variant.id);
    } catch (e) {
      setError(e?.message || 'Could not save tailored resume.');
    }
  }

  async function handleDocumentsSave(docs) {
    try {
      if (documentsTarget && docs) await resumeStore.setDocuments(documentsTarget.id, docs);
      await refresh();
    } catch (e) {
      setError(e?.message || 'Could not save documents.');
    }
  }

  async function handleEnrichApply(newResume) {
    try {
      if (enrichTarget && newResume) await resumeStore.update(enrichTarget.id, { resume: newResume });
      await refresh();
    } catch (e) {
      setError(e?.message || 'Could not apply changes.');
    }
  }

  // Open a feature overlay for the currently-edited resume — fetch a fresh copy
  // so it reflects edits the Editor just persisted.
  async function openOverlayFor(setter) {
    try {
      const fresh = await resumeStore.get(activeId);
      if (fresh) setter(fresh);
    } catch (e) {
      setError(e?.message || 'Could not open.');
    }
  }

  return (
    <div className="h-full">
      {view === 'dashboard' && (
        <Dashboard
          resumes={resumes}
          user={user}
          onLogout={onLogout}
          onCreateNew={() => setView('pickTemplate')}
          onOpen={openEditor}
          onDelete={deleteResume}
          onDuplicate={duplicateResume}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTracker={() => setView('tracker')}
          onTailor={(entry) => setTailorTarget(entry)}
          onOpenDocuments={(entry) => setDocumentsTarget(entry)}
          onEnrich={(entry) => setEnrichTarget(entry)}
          hasKey={hasKey}
          mounted={mounted}
        />
      )}

      {view === 'pickTemplate' && (
        <TemplatePicker
          templates={templates}
          onSelect={createResume}
          onBack={() => setView('dashboard')}
          onError={setError}
        />
      )}

      {view === 'editor' && activeEntry && (
        <Editor
          key={activeId}
          entry={activeEntry}
          settings={settings}
          templates={templates}
          importText={pendingImport}
          onBack={backToDashboard}
          onUpdate={handleUpdate}
          onOpenSettings={() => setShowSettings(true)}
          onTailor={() => openOverlayFor(setTailorTarget)}
          onOpenDocuments={() => openOverlayFor(setDocumentsTarget)}
          onEnrich={() => openOverlayFor(setEnrichTarget)}
        />
      )}

      {view === 'tracker' && (
        <Tracker onBack={backToDashboard} onOpenResume={openEditor} />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(updated) => { setSettings(updated); setShowSettings(false); }}
        />
      )}

      {tailorTarget && (
        <TailorPanel
          master={tailorTarget}
          settings={settings}
          onClose={() => setTailorTarget(null)}
          onSave={handleTailorSave}
        />
      )}

      {documentsTarget && (
        <DocumentsPanel
          entry={documentsTarget}
          settings={settings}
          onClose={() => setDocumentsTarget(null)}
          onSave={handleDocumentsSave}
        />
      )}

      {enrichTarget && (
        <EnrichWizard
          entry={enrichTarget}
          settings={settings}
          onClose={() => setEnrichTarget(null)}
          onApply={handleEnrichApply}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 max-w-md bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 shadow-lg slide-up z-50">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
