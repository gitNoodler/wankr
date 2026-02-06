import { useRef, useLayoutEffect, useMemo, useState, useEffect } from 'react';

function ChatPanel({ messages, onSend, onStop, disabled }) {
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');

  const resizeTextarea = () => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = '31px';
    ta.style.height = `${Math.min(ta.scrollHeight, 168)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [inputValue]);

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
  const avatarSrc = '/static/avatar.png';

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
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(60, 60, 60, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0, 0, 0, 0.4)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
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
          gap: 'clamp(8px, 1vw, 14px)',
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
                    <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = '/static/logo.png'; }} />
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
                  <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = '/static/logo.png'; }} />
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
          padding: 'clamp(6px, 1vw, 10px) var(--dashboard-panel-padding)',
          background: 'linear-gradient(180deg, #111 0%, #1a1a1a 100%)',
          borderTop: '2px solid rgba(100, 100, 100, 0.4)',
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
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
            border: '1px solid rgba(0, 255, 0, 0.5)',
            borderRadius: 'var(--dashboard-input-border-radius)',
            padding: '8px 14px',
            minHeight: '50px',
            boxShadow: `
              0 2px 8px rgba(0, 0, 0, 0.6),
              inset 0 2px 4px rgba(0, 0, 0, 0.4),
              0 0 16px rgba(0, 255, 0, 0.15),
              0 0 32px rgba(0, 255, 0, 0.08)
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
              color: '#f0f0f0',
              fontSize: 'var(--dashboard-input-font-size)',
              fontFamily: 'inherit',
              padding: '6px 11px',
              resize: 'none',
              minHeight: '31px',
              maxHeight: '168px',
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
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, rgba(0, 255, 0, 0.3) 0%, rgba(0, 255, 0, 0.15) 100%)',
              border: '1px solid rgba(0, 255, 0, 0.6)',
              color: 'var(--accent)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              boxShadow: `
                0 4px 12px rgba(0, 255, 0, 0.25),
                0 2px 4px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
              `,
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '25px', height: '25px' }}>
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
              height: '45px',
              padding: '0 clamp(14px, 1.7vw, 20px)',
              borderRadius: 'var(--dashboard-input-border-radius)',
              background: isThinking
                ? 'linear-gradient(180deg, rgba(255, 80, 80, 0.25) 0%, rgba(255, 80, 80, 0.12) 100%)'
                : 'linear-gradient(180deg, rgba(120, 120, 120, 0.2) 0%, rgba(80, 80, 80, 0.2) 100%)',
              border: isThinking
                ? '1px solid rgba(255, 80, 80, 0.55)'
                : '1px solid rgba(100, 100, 100, 0.35)',
              color: isThinking ? '#ffb3b3' : 'rgba(200, 200, 200, 0.5)',
              fontSize: 'clamp(15px, 1.4vw, 18px)',
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
