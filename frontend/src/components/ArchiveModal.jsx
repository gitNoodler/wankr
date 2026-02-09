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
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        background: 'rgba(0,0,0,0.85)',
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: 448,
          padding: 24,
          border: 'var(--border)',
          borderRadius: 'var(--dashboard-panel-radius)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05), var(--accent-glow)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-wankr text-glow" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.25rem', marginBottom: 8 }}>
          Archive this conversation
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
          Name it to recall later, or discard and start fresh.
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder="Conversation name..."
          value={archiveName}
          onChange={(e) => onArchiveNameChange(e.target.value)}
          className="input-field"
          style={{ width: '100%', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onDiscard} className="btn" style={{ padding: '12px 24px', borderRadius: 8 }}>
            Discard
          </button>
          <button type="button" onClick={onSave} className="btn-primary" style={{ padding: '12px 24px', borderRadius: 8 }}>
            Save & new chat
          </button>
          <button type="button" onClick={onClose} className="btn" style={{ padding: '12px 24px', borderRadius: 8 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ArchiveModal;
