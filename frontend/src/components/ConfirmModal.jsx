import { useEffect } from 'react';

export default function ConfirmModal({ isOpen, title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, danger = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="rx-overlay" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'rx-pop 0.18s cubic-bezier(0.2, 0.7, 0.3, 1) both' }}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 rounded-b-2xl">
          <button className="rx-btn rx-btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`rx-btn ${danger ? 'rx-btn-danger' : 'rx-btn-primary'}`} 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
