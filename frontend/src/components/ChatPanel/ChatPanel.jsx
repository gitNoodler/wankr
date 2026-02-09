import { useRef, useLayoutEffect, useMemo, useState, useEffect } from 'react';
import LOGO_URL from '../../assets/logo.js';

function ChatPanel({ messages, onSend, onStop, disabled }) {
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');

  const getScale = () => {
    if (typeof window === 'undefined') return 1;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--scale');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const resizeTextarea = () => {
    const ta = inputRef.current;
    if (!ta) return;
    const scale = getScale();
    const minHeight = Math.max(12, Math.round(31 * scale));
    const maxHeight = Math.max(minHeight, Math.round(168 * scale));
    ta.style.height = `${minHeight}px`;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [inputValue]);

  useEffect(() => {
    const handleResize = () => resizeTextarea();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom when messages change
  useLayoutEffect(() => {
    if (!chatRef.current) return;
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 10);
  }, [messages, disabled]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const msg = inputValue.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Shift+Enter allows default behavior (new line)
  };

  const isEmpty = !messages || messages.length === 0;
  const isThinking = Boolean(disabled);
  const trainingLightOn = useMemo(() => {
    for (let i = (messages?.length ?? 0) - 1; i >= 0; i -= 1) {
      const content = String(messages[i]?.content || '').toLowerCase();
      if (content.includes('training mode activated')) return true;
      if (content.includes('training mode deactivated')) return false;
    }
    return false;
  }, [messages]);
  const avatarSrc = LOGO_URL;

  return (
    <div className="wankr-panel">
      {/* Simplified Chat Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 var(--dashboard-panel-padding)',
          height: 'var(--dashboard-header-height)',
          minHeight: 'var(--dashboard-header-height)',
          background: 'linear-gradient(180deg, #161616 0%, #0f0f0f 100%)',
          borderBottom: '1px solid rgba(100, 100, 100, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(11px * var(--scale))' }}>
          <img className="wankr-panel-title-logo" src={LOGO_URL} alt="Wankr" />
          <h2
            className="font-wankr"
            style={{
              margin: 0,
              fontSize: 'var(--dashboard-title-font-size)',
              fontWeight: 700,
              color: 'var(--accent)',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              textShadow: '0 0 12px rgba(0, 255, 0, 0.7), 0 0 24px rgba(0, 255, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.6)',
            }}
          >
            Wankr Vision
          </h2>
          <span
            className={`training-light${trainingLightOn ? ' on' : ''}`}
            title={trainingLightOn ? 'Training mode active' : 'Training mode off'}
          />
        </div>
      </div>

      {/* Messages Area with visible scrollbar */}
      <div
        ref={chatRef}
        className="wankr-messages scroll-area"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isEmpty ? 'center' : 'flex-start',
          padding: 'var(--dashboard-panel-padding)',
          gap: 'calc(14px * var(--scale))',
          minHeight: 0,
          background: '#000000',
          boxShadow: 'inset 0 4px 16px rgba(0, 0, 0, 0.8)',
        }}
      >
        {isEmpty ? (
          <div className="wankr-empty-state">
            <p>Start a conversation with Wankr</p>
            <p className="wankr-empty-hint">Ask anything. He&apos;s in a mood.</p>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`wankr-message ${m.role === 'user' ? 'user' : 'ai'}`}
              >
                {m.role !== 'user' && (
                  <div className="wankr-ai-avatar">
                    <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = LOGO_URL; }} />
                  </div>
                )}
                <div className="wankr-message-bubble">
                  {m.content}
                </div>
              </div>
            ))}
            {disabled && (
              <div className="wankr-message ai">
                <div className="wankr-ai-avatar">
                  <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = LOGO_URL; }} />
                </div>
                <div className="wankr-message-bubble wankr-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area with depth */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'calc(10px * var(--scale)) var(--dashboard-panel-padding)',
          background: 'linear-gradient(180deg, #161616 0%, #1c1c1c 100%)',
          borderTop: '2px solid rgba(100, 100, 100, 0.5)',
          boxShadow: `
            0 -4px 12px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
          flexShrink: 0,
        }}
      >
        <div
          className="chat-input-wrapper"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--dashboard-input-gap)',
            width: '100%',
            background: 'linear-gradient(180deg, #121212 0%, #161616 100%)',
            border: '1px solid rgba(55, 55, 55, 0.6)',
            borderRadius: 'var(--dashboard-input-border-radius)',
            padding: 'calc(8px * var(--scale)) calc(14px * var(--scale))',
            minHeight: 'calc(50px * var(--scale))',
            boxShadow: `
              0 2px 8px rgba(0, 0, 0, 0.6),
              inset 0 2px 4px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(50, 50, 50, 0.4)
            `,
            transition: 'all 0.25s ease',
          }}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Wankr..."
            disabled={disabled}
            autoComplete="off"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-content)',
              fontSize: 'var(--dashboard-input-font-size)',
              fontFamily: 'inherit',
              padding: 'calc(6px * var(--scale)) calc(11px * var(--scale))',
              resize: 'none',
              minHeight: 'calc(31px * var(--scale))',
              maxHeight: 'calc(168px * var(--scale))',
              overflowY: 'auto',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              display: 'block',
            }}
          />
          <button
            type="submit"
            title="Send"
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'calc(45px * var(--scale))',
              height: 'calc(45px * var(--scale))',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(0, 255, 0, 0.3) 0%, rgba(0, 255, 0, 0.15) 100%)',
              border: '1px solid rgba(55, 55, 55, 0.6)',
              color: 'var(--accent-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              boxShadow: `
                0 4px 12px rgba(0, 0, 0, 0.4),
                0 2px 4px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
              `,
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 'calc(25px * var(--scale))', height: 'calc(25px * var(--scale))' }}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
          <button
            type="button"
            title="Stop thinking"
            onClick={onStop}
            disabled={!isThinking}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(45px * var(--scale))',
              padding: '0 calc(20px * var(--scale))',
              borderRadius: 'var(--dashboard-input-border-radius)',
              background: isThinking
                ? 'linear-gradient(180deg, rgba(255, 80, 80, 0.25) 0%, rgba(255, 80, 80, 0.12) 100%)'
                : 'linear-gradient(180deg, rgba(120, 120, 120, 0.2) 0%, rgba(80, 80, 80, 0.2) 100%)',
              border: isThinking
                ? '1px solid rgba(255, 80, 80, 0.55)'
                : '1px solid rgba(55, 55, 55, 0.6)',
              color: isThinking ? '#ffb3b3' : 'rgba(200, 200, 200, 0.5)',
              fontSize: 'calc(18px * var(--scale))',
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              cursor: isThinking ? 'pointer' : 'not-allowed',
              boxShadow: isThinking
                ? '0 4px 12px rgba(255, 80, 80, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            Stop
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
