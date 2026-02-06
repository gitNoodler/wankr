import { useRef, useEffect } from 'react';

function ArchiveModal({ open, onClose, onSave, onDiscard, archiveName, onArchiveNameChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="panel w-full max-w-md"
        style={{
          padding: 24,
          border: 'var(--border)',
          borderRadius: 'var(--dashboard-panel-radius)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05), var(--accent-glow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-wankr font-semibold text-xl mb-2 text-glow" style={{ color: 'var(--accent)' }}>
          Archive this conversation
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Name it to recall later, or discard and start fresh.
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Conversation name..."
          value={archiveName}
          onChange={(e) => onArchiveNameChange(e.target.value)}
          className="input-field w-full rounded-lg px-4 py-3 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onDiscard} className="btn px-6 py-3 rounded-lg" style={{ borderRadius: 8 }}>
            Discard
          </button>
          <button type="button" onClick={onSave} className="btn-primary px-6 py-3 rounded-lg" style={{ borderRadius: 8 }}>
            Save & new chat
          </button>
          <button type="button" onClick={onClose} className="btn px-6 py-3 rounded-lg" style={{ borderRadius: 8 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveModal;
