import { memo, useRef, useLayoutEffect, useMemo, useState, useEffect, useCallback } from 'react';
import { VariableSizeList } from 'react-window';
import { api } from '../../utils/api';
import LOGO_URL from '../../assets/logo.js';

const VIRTUAL_LIST_THRESHOLD = 50;

const AT_BOTTOM_THRESHOLD = 80;

// Color map for data card headers
const CARD_COLORS = {
  'red flag': '#ff3333',
  'warning': '#ff6633',
  'clean': '#00ff41',
  'verified': '#00ff41',
  'kol': '#ff6633',
  'contract': '#5ad8ff',
  'token': '#cc66ff',
  'security': '#ff3333',
  'launch': '#00ff41',
  'social': '#00bfff',
  'grok': '#ffcc00',
  'past': '#888',
  'live': '#00ff41',
  'mock': '#555',
  'probe': '#ff6633',
  'dex': '#cc66ff',
  'goplus': '#ff3333',
  'bankr': '#00ff41',
};

function getCardColor(header) {
  const lower = header.toLowerCase();
  for (const [key, color] of Object.entries(CARD_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return '#00ff41';
}

// Label badge colors
const LABEL_COLORS = {
  'FACTS': '#00ff41', 'VERIFIED': '#00ff41', 'CLEAN': '#00ff41', 'SAFE': '#00ff41',
  'RED FLAG': '#ff3333', 'WARNING': '#ff6633', 'DANGER': '#ff3333', 'HONEYPOT': '#ff3333', 'RUG': '#ff3333',
  'INFERENCE': '#ffcc00', 'UNVERIFIED': '#ffcc00', 'SUSPICIOUS': '#ffcc00', 'CAUTION': '#ffcc00',
  'MISSING': '#888', 'UNKNOWN': '#888', 'N/A': '#555',
};

// Highlight inline data: $TICKERS, @handles, 0x addresses, percentages, scores, [LABELS], **bold**
function highlightInline(text) {
  if (typeof text !== 'string') return text;
  const parts = [];
  let key = 0;
  // Combined regex: [LABEL], **bold**, $TICKER, @handle, 0xaddr, %, score patterns, key terms
  const rx = /(\[(?:FACTS|VERIFIED|CLEAN|SAFE|RED FLAG|WARNING|DANGER|HONEYPOT|RUG|INFERENCE|UNVERIFIED|SUSPICIOUS|CAUTION|MISSING|UNKNOWN|N\/A)\]|\*\*([^*]+)\*\*|\$[A-Z]{2,10}|@\w{2,15}|0x[a-fA-F0-9]{6,42}|\d+\.?\d*%|\b\d+\/\d+\b|Score:\s*\d+|Bot Level:\s*\d+|Sentiment:\s*\d+|\b(?:honeypot|rug ?pull|sybil|whale|pump|dump|mint(?:able)?|proxy|blacklist)\b)/gi;
  let lastIdx = 0;
  const matches = [];
  let match;
  while ((match = rx.exec(text)) !== null) matches.push({ index: match.index, val: match[0], bold: match[2] });
  if (matches.length === 0) return text;
  for (const m of matches) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const val = m.val;
    // [LABEL] badges
    if (val.startsWith('[') && val.endsWith(']')) {
      const label = val.slice(1, -1);
      const bg = LABEL_COLORS[label] || '#888';
      parts.push(
        <span key={key++} style={{
          background: `${bg}25`,
          color: bg,
          border: `1px solid ${bg}50`,
          borderRadius: 'calc(3px * var(--scale))',
          padding: '0 calc(5px * var(--scale))',
          fontSize: '0.85em',
          fontWeight: 800,
          letterSpacing: '0.5px',
          fontFamily: 'monospace',
        }}>{label}</span>
      );
    }
    // **bold**
    else if (m.bold) {
      parts.push(<span key={key++} style={{ color: '#fff', fontWeight: 800 }}>{m.bold}</span>);
    }
    // $TICKER
    else if (val.startsWith('$')) {
      parts.push(<span key={key++} style={{ color: '#cc66ff', fontWeight: 700 }}>{val}</span>);
    }
    // @handle
    else if (val.startsWith('@')) {
      parts.push(<span key={key++} style={{ color: '#00bfff', fontWeight: 700 }}>{val}</span>);
    }
    // 0x address
    else if (val.startsWith('0x') || val.startsWith('0X')) {
      parts.push(<span key={key++} style={{ color: '#5ad8ff', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9em' }}>{val}</span>);
    }
    // percentages
    else if (val.includes('%')) {
      const num = parseFloat(val);
      const color = num > 50 ? '#ff3333' : num > 10 ? '#ffcc00' : '#00ff41';
      parts.push(<span key={key++} style={{ color, fontWeight: 700 }}>{val}</span>);
    }
    // key warning terms
    else if (/honeypot|rug|sybil|whale|pump|dump|mint|proxy|blacklist/i.test(val)) {
      parts.push(<span key={key++} style={{ color: '#ff6633', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.9em' }}>{val}</span>);
    }
    // scores
    else {
      parts.push(<span key={key++} style={{ color: '#ffcc00', fontWeight: 700 }}>{val}</span>);
    }
    lastIdx = m.index + val.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

// Generate contextual follow-up suggestions based on AI response content
function generateSuggestions(content) {
  if (!content) return [];
  const lower = content.toLowerCase();
  const suggestions = [];

  // Always offer clarification
  if (content.length > 200) {
    suggestions.push({ label: 'Break it down simpler', msg: 'Can you break that down simpler? What\'s the bottom line here?' });
  }

  // If analysis was given, offer debate/challenge
  if (lower.includes('red flag') || lower.includes('suspicious') || lower.includes('honeypot') || lower.includes('rug')) {
    suggestions.push({ label: 'Challenge this', msg: 'I\'m not convinced. What if these red flags are just normal activity? Defend your case.' });
    suggestions.push({ label: 'How bad is it really?', msg: 'On a scale of "meh" to "run for your life" — how bad is this actually?' });
  }

  // If clean verdict
  if (lower.includes('clean') || lower.includes('legit') || lower.includes('safe')) {
    suggestions.push({ label: 'What could go wrong?', msg: 'Even if it looks clean — what\'s the worst case scenario? What am I missing?' });
  }

  // If contract/token data shown
  if (lower.includes('contract') || lower.includes('liquidity') || lower.includes('holder')) {
    suggestions.push({ label: 'Dig deeper on-chain', msg: 'Dig deeper on the on-chain data. Who are the top holders? Any wallet clusters?' });
  }

  // If social data shown
  if (lower.includes('social') || lower.includes('post') || lower.includes('sentiment') || lower.includes('bio')) {
    suggestions.push({ label: 'More social intel', msg: 'Give me more social intel. What\'s the community vibe? Any bot armies?' });
  }

  // If specific token mentioned
  const ticker = content.match(/\$([A-Z]{2,10})/);
  if (ticker) {
    suggestions.push({ label: `More on $${ticker[1]}`, msg: `Tell me everything you know about $${ticker[1]}. On-chain, social, the whole picture.` });
  }

  // If handle mentioned
  const handle = content.match(/@(\w{2,15})/);
  if (handle && !['bankrbot', 'bankr'].includes(handle[1].toLowerCase())) {
    suggestions.push({ label: `Deep scan @${handle[1]}`, msg: `Do a full deep scan on @${handle[1]}. History, connections, bot score — all of it.` });
  }

  return suggestions.slice(0, 4);
}

// Format message content: styled data cards + highlighted bullets
function formatMessage(content) {
  if (!content) return null;
  const lines = String(content).split('\n');
  const elements = [];
  let listBuffer = [];
  let cardLines = null; // accumulates lines inside a [HEADER] block
  let cardHeader = '';
  let cardColor = '#00ff41';

  const flushList = () => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} style={{
        margin: 'calc(4px * var(--scale)) 0',
        paddingLeft: '1.2em',
        listStyleType: 'none',
      }}>
        {listBuffer.map((text, i) => (
          <li key={i} style={{
            marginBottom: 'calc(4px * var(--scale))',
            position: 'relative',
            paddingLeft: 'calc(14px * var(--scale))',
          }}>
            <span style={{
              position: 'absolute',
              left: 0,
              color: '#00ff41',
              fontWeight: 700,
            }}>{'>'}</span>
            {highlightInline(text)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const flushCard = () => {
    if (!cardLines) return;
    const color = cardColor;
    elements.push(
      <div key={`card-${elements.length}`} style={{
        margin: 'calc(8px * var(--scale)) 0',
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'calc(6px * var(--scale))',
        background: `linear-gradient(90deg, ${color}08 0%, transparent 100%)`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'calc(6px * var(--scale)) calc(10px * var(--scale))',
          background: `${color}15`,
          borderBottom: `1px solid ${color}25`,
          fontSize: 'calc(10px * var(--scale))',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color,
          fontFamily: 'monospace',
        }}>
          {cardHeader}
        </div>
        <div style={{
          padding: 'calc(8px * var(--scale)) calc(10px * var(--scale))',
          fontSize: 'calc(12px * var(--scale))',
          lineHeight: 1.5,
        }}>
          {cardLines.map((line, i) => (
            <div key={i} style={{
              color: '#ccc',
              padding: 'calc(1px * var(--scale)) 0',
            }}>
              {highlightInline(line)}
            </div>
          ))}
        </div>
      </div>
    );
    cardLines = null;
    cardHeader = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect [HEADER] style data sections
    const headerMatch = line.match(/^\s*\[([^\]]+)\]/);
    if (headerMatch) {
      flushList();
      flushCard();
      cardHeader = headerMatch[1];
      cardColor = getCardColor(cardHeader);
      cardLines = [];
      // If there's text after the header on the same line
      const after = line.slice(line.indexOf(']') + 1).trim();
      if (after) cardLines.push(after);
      continue;
    }

    // Inside a card, indented lines belong to it
    if (cardLines !== null) {
      if (line.match(/^\s{2,}/) || line.trim() === '') {
        if (line.trim()) cardLines.push(line.trim());
        continue;
      } else {
        flushCard();
      }
    }

    const bulletMatch = line.match(/^\s*[-*•]\s+(.+)/);
    const numMatch = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (bulletMatch || numMatch) {
      listBuffer.push((bulletMatch || numMatch)[1]);
    } else {
      flushList();
      if (line.trim() === '') {
        if (elements.length > 0) elements.push(<br key={`br-${i}`} />);
      } else {
        if (elements.length > 0) elements.push(<br key={`br-${i}`} />);
        elements.push(<span key={`t-${i}`}>{highlightInline(line)}</span>);
      }
    }
  }
  flushList();
  flushCard();
  return elements;
}

function ChatPanel({ messages, onSend, onStop, disabled, isMobile, username, isDev }) {
  const scrollContainerRef = useRef(null);
  const listRef = useRef(null);
  const measureRef = useRef(null);
  const inputRef = useRef(null);
  const atBottomRef = useRef(true); // start at bottom; scroll up through history
  const [inputValue, setInputValue] = useState('');
  const [containerHeight, setContainerHeight] = useState(0);
  const [isSpectated, setIsSpectated] = useState(false);

  // Poll spectator status — check if any dev is watching
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await api.get('/api/spectator/grok-status');
        const data = await res.json();
        if (active) setIsSpectated(data.spectators > 0);
      } catch {}
    };
    check();
    const id = setInterval(check, 10000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const getScale = () => {
    if (typeof window === 'undefined') return 1;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--scale');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };

  const resizeTextarea = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    const scale = getScale();
    const minHeight = Math.max(12, Math.round(31 * scale));
    const maxHeight = Math.max(minHeight, Math.round(168 * scale));
    ta.style.height = `${minHeight}px`;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [inputValue, resizeTextarea]);

  useEffect(() => {
    const handleResize = () => resizeTextarea();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeTextarea]);

  const useVirtual = (messages?.length ?? 0) > VIRTUAL_LIST_THRESHOLD;
  const messageCount = messages?.length ?? 0;

  useLayoutEffect(() => {
    if (!measureRef.current || !useVirtual) return;
    const el = measureRef.current;
    const ro = new ResizeObserver(() => {
      setContainerHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setContainerHeight(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [useVirtual]);

  // Keep scroll at bottom only when user was already at bottom (newest at bottom; scroll up for history)
  const checkAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    atBottomRef.current = scrollHeight - scrollTop - clientHeight <= AT_BOTTOM_THRESHOLD;
  }, []);

  useLayoutEffect(() => {
    const id = setTimeout(() => {
      if (!atBottomRef.current) return; // user scrolled up; don't jerk to bottom
      if (useVirtual && listRef.current && messageCount > 0) {
        listRef.current.scrollToItem(messageCount - 1, 'end');
      } else if (scrollContainerRef.current && !useVirtual) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 10);
    return () => clearTimeout(id);
  }, [messageCount, disabled, useVirtual]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const msg = inputValue.trim();
    if (!msg || disabled) return;
    atBottomRef.current = true; // scroll to bottom to show new message
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

  const getItemSize = useCallback((index) => {
    const contentLen = (messages[index]?.content || '').length;
    const estimatedContent = 56 + Math.min(120, Math.ceil(contentLen / 2));
    return estimatedContent + 14;
  }, [messages]);

  const Row = useCallback(({ index, style, data }) => {
    const m = data[index];
    if (!m) return null;
    return (
      <div style={style} className={`wankr-message ${m.role === 'user' ? 'user' : 'ai'}`}>
        {m.role !== 'user' && (
          <div className="wankr-ai-avatar">
            <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = LOGO_URL; }} />
          </div>
        )}
        <div className="wankr-message-bubble">
          {formatMessage(m.content)}
        </div>
      </div>
    );
  }, [avatarSrc]);

  return (
    <div className="wankr-panel">
      {/* Simplified Chat Header */}
      <div
        style={{
          position: 'relative',
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
          {isSpectated && (
            <span
              title="You are being spectated"
              style={{
                display: 'inline-block',
                width: 'calc(8px * var(--scale))',
                height: 'calc(8px * var(--scale))',
                borderRadius: '50%',
                background: '#ff3333',
                boxShadow: '0 0 6px #ff3333, 0 0 12px rgba(255, 51, 51, 0.5)',
                animation: 'blink-spectate 1.5s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
          )}
          <span
            className={`training-light${trainingLightOn ? ' on' : ''}`}
            title={trainingLightOn ? 'Training mode active' : 'Training mode off'}
          />
          {username && (
            <>
              <span style={{ width: 1, height: 'calc(16px * var(--scale))', background: 'rgba(255,255,255,0.12)', marginLeft: 'calc(4px * var(--scale))' }} />
              {isDev && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    width: 'calc(16px * var(--scale))',
                    height: 'calc(16px * var(--scale))',
                    flexShrink: 0,
                  }}
                  title="Developer"
                >
                  <path
                    d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
                    fill="#00ff00"
                  />
                </svg>
              )}
              <span
                style={{
                  fontSize: 'calc(12px * var(--scale))',
                  color: isDev ? '#00ff00' : 'rgba(0, 255, 0, 0.6)',
                  fontWeight: 600,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
                title={username + (isDev ? ' (Developer)' : '')}
              >
                {username}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Messages Area: newest at bottom; scroll starts at bottom, scroll up for history */}
      <div
        ref={!useVirtual ? scrollContainerRef : undefined}
        className="wankr-messages scroll-area"
        style={{
          flex: 1,
          overflowY: useVirtual ? 'hidden' : 'auto',
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
        onScroll={!useVirtual ? checkAtBottom : undefined}
      >
        {isEmpty ? (
          <div className="wankr-empty-state">
            <p>Start a conversation with Wankr</p>
            <p className="wankr-empty-hint">Ask anything. He&apos;s in a mood.</p>
          </div>
        ) : useVirtual && containerHeight > 0 ? (
          <>
            <div ref={measureRef} style={{ flex: 1, minHeight: 0 }}>
              <VariableSizeList
                ref={listRef}
                outerRef={scrollContainerRef}
                onScroll={checkAtBottom}
                height={containerHeight}
                width="100%"
                itemCount={messageCount}
                itemSize={getItemSize}
                itemData={messages}
                style={{ overflowX: 'hidden' }}
              >
                {Row}
              </VariableSizeList>
            </div>
            {disabled && (
              <div className="wankr-message ai" style={{ flexShrink: 0 }}>
                <div className="wankr-ai-avatar">
                  <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = LOGO_URL; }} />
                </div>
                <div className="wankr-message-bubble wankr-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {!useVirtual && messages.map((m, i) => {
              const isLastAI = m.role !== 'user' && i === messages.length - 1;
              const suggestions = isLastAI && !disabled ? generateSuggestions(m.content) : [];
              return (
                <div key={m.id ?? i}>
                  <div className={`wankr-message ${m.role === 'user' ? 'user' : 'ai'}`}>
                    {m.role !== 'user' && (
                      <div className="wankr-ai-avatar">
                        <img src={avatarSrc} alt="" onError={(e) => { e.target.onerror = null; e.target.src = LOGO_URL; }} />
                      </div>
                    )}
                    <div className="wankr-message-bubble">
                      {formatMessage(m.content)}
                    </div>
                  </div>
                  {suggestions.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'calc(6px * var(--scale))',
                      marginTop: 'calc(8px * var(--scale))',
                      paddingLeft: 'calc(63px * var(--scale))',
                    }}>
                      {suggestions.map((s, si) => (
                        <button
                          key={si}
                          type="button"
                          onClick={() => { setInputValue(s.msg); onSend(s.msg); }}
                          style={{
                            background: 'rgba(0, 255, 65, 0.08)',
                            border: '1px solid rgba(0, 255, 65, 0.25)',
                            borderRadius: 'calc(12px * var(--scale))',
                            color: '#00ff41',
                            fontSize: 'calc(11px * var(--scale))',
                            padding: 'calc(5px * var(--scale)) calc(12px * var(--scale))',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(0, 255, 65, 0.18)'; e.target.style.borderColor = 'rgba(0, 255, 65, 0.5)'; }}
                          onMouseLeave={e => { e.target.style.background = 'rgba(0, 255, 65, 0.08)'; e.target.style.borderColor = 'rgba(0, 255, 65, 0.25)'; }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
              fontSize: isMobile ? '16px' : 'var(--dashboard-input-font-size)',
              fontFamily: 'inherit',
              padding: 'calc(6px * var(--scale)) calc(11px * var(--scale))',
              resize: 'none',
              minHeight: isMobile ? '44px' : 'calc(31px * var(--scale))',
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
              width: isMobile ? '44px' : 'calc(45px * var(--scale))',
              height: isMobile ? '44px' : 'calc(45px * var(--scale))',
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
              height: isMobile ? '44px' : 'calc(45px * var(--scale))',
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

export default memo(ChatPanel);
