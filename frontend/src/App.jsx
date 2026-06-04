import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import TemplatePicker from './components/TemplatePicker.jsx';
import Editor from './components/Editor.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import { api } from './lib/api.js';
import { settingsStore, resumeStore } from './lib/storage.js';

export default function App() {
  // View state: 'dashboard' | 'pickTemplate' | 'editor'
  const [view, setView] = useState('dashboard');
  const [activeId, setActiveId] = useState(null);
  const [settings, setSettings] = useState(() => settingsStore.load());
  const [templates, setTemplates] = useState([]);
  const [resumes, setResumes] = useState(() => resumeStore.list());
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState(null);
  const [pendingImport, setPendingImport] = useState(null); // extracted text for a freshly imported resume

  useEffect(() => settingsStore.save(settings), [settings]);
  useEffect(() => {
    api.listTemplates().then(setTemplates).catch(e => setError(e.message));
  }, []);

  const hasKey = !!(settings.apiKeys?.[settings.provider]);
  
  useEffect(() => {
    if (!hasKey) {
      setShowSettings(true);
    }
  }, [hasKey]);

  const activeEntry = activeId ? resumeStore.get(activeId) : null;

  function refresh() { setResumes(resumeStore.list()); }

  function openEditor(id) {
    setActiveId(id);
    setView('editor');
  }

  async function createResume(templateId, importText = null) {
    const tmpl = templates.find(t => t.id === templateId) || {};
    const init = { pageSize: tmpl.defaultPageSize || 'a4' };

    // Templates that ship with seed data start pre-filled (e.g. the personal template).
    if (tmpl.hasSeed && !importText) {
      try {
        const { seed } = await api.seed(templateId);
        if (seed) {
          init.resume = seed;
          init.title = seed.name ? `${seed.name}'s Resume` : 'Untitled Resume';
        }
      } catch (e) {
        setError(`Could not load template data: ${e.message}`);
      }
    }

    const entry = resumeStore.create(templateId, init);
    setPendingImport(importText || null);
    refresh();
    openEditor(entry.id);
  }

  function deleteResume(id) {
    resumeStore.delete(id);
    refresh();
  }

  function duplicateResume(id) {
    resumeStore.duplicate(id);
    refresh();
  }

  function handleUpdate(id, patch) {
    resumeStore.update(id, patch);
  }

  function backToDashboard() {
    setActiveId(null);
    setPendingImport(null);
    setView('dashboard');
    refresh();
  }

  return (
    <div className="h-full">
      {view === 'dashboard' && (
        <Dashboard
          resumes={resumes}
          onCreateNew={() => setView('pickTemplate')}
          onOpen={openEditor}
          onDelete={deleteResume}
          onDuplicate={duplicateResume}
          onOpenSettings={() => setShowSettings(true)}
          hasKey={hasKey}
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
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={s => { setSettings(s); setShowSettings(false); }}
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
