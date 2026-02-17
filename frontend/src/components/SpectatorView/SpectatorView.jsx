import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { getRestoreScrollTop } from './scrollRestore';
import './SpectatorView.css';
import { api } from '../../utils/api';
import LOGO_URL from '../../assets/logo.js';

function UserBubble({ user, onClick, isSelected }) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className={`user-bubble ${user.online ? 'online' : 'offline'} ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(user)}
      onMouseEnter={() => !user.online && setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <div className="user-avatar">
        {user.username.charAt(0).toUpperCase()}
      </div>
      <div className="user-info">
        <span className="username">{user.username}</span>
        <span className="status-dot" />
      </div>
      
      {/* Offline preview - limited messages */}
      {showPreview && !user.online && user.lastMessages.length > 0 && (
        <div className="offline-preview">
          <div className="preview-header">
            <span>Last conversation (limited)</span>
            <span className="offline-badge">OFFLINE</span>
          </div>
          <div className="preview-messages">
            {user.lastMessages.slice(-4).map((msg, idx) => (
              <div key={idx} className={`preview-msg ${msg.role}`}>
                <span className="msg-role">{msg.role === 'wankr' ? 'WANKR' : user.username}:</span>
                <span className="msg-content">{msg.content}</span>
              </div>
            ))}
          </div>
          <div className="preview-footer">
            User offline - full history available when online
          </div>
        </div>
      )}
    </div>
  );
}

const SCROLL_AT_BOTTOM_THRESHOLD = 60;

function ConversationView({ user, onClose }) {
  const [messages, setMessages] = useState(user?.lastMessages || []);
  const [loading, setLoading] = useState(false);
  const [grokStatus, setGrokStatus] = useState(null);
  const messagesContainerRef = useRef(null);
  const savedScrollTopRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);

  // Fetch full conversation for this user
  const fetchConversation = useCallback(async () => {
    if (!user) return;
    const el = messagesContainerRef.current;
    if (el) savedScrollTopRef.current = el.scrollTop;
    try {
      const res = await api.get(`/api/spectator/conversation/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversation?.messages) {
          setMessages(data.conversation.messages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    }
  }, [user]);

  // Fetch grok status (for pending response countdown)
  const fetchGrokStatus = useCallback(async () => {
    if (user?.id !== 'grok') return;
    try {
      const res = await api.get('/api/spectator/grok-status');
      if (res.ok) {
        const data = await res.json();
        setGrokStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch grok status:', err);
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetchConversation().finally(() => setLoading(false));
    fetchGrokStatus();

    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchConversation();
      fetchGrokStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, fetchConversation, fetchGrokStatus]);

  const checkAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= SCROLL_AT_BOTTOM_THRESHOLD;
    setAtBottom(isAtBottom);
  }, []);

  const scrollToCurrent = useCallback(() => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setAtBottom(true);
    }
  }, []);

  // Restore scroll position after poll updates messages so the user isn't forced back to bottom
  useLayoutEffect(() => {
    const saved = savedScrollTopRef.current;
    if (saved != null && messagesContainerRef.current) {
      savedScrollTopRef.current = null;
      const el = messagesContainerRef.current;
      el.scrollTop = getRestoreScrollTop(saved, el.scrollHeight, el.clientHeight);
    }
    if (messages.length > 0) checkAtBottom();
  }, [messages, checkAtBottom]);

  if (!user) return null;

  // Calculate time until next grok response
  const getCountdown = () => {
    if (!grokStatus?.nextResponseAt) return null;
    const remaining = grokStatus.nextResponseAt - Date.now();
    if (remaining <= 0) return 'Responding soon...';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `Next response in ${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="conversation-view">
      <div className="conversation-header">
        <button className="back-btn" onClick={onClose}>
          ← Back
        </button>
        <div className="conversation-user">
          <span className={`status-indicator ${user.online ? 'online' : 'offline'}`} />
          <span className="conv-username">{user.username}</span>
          <span className="conv-status">{user.online ? 'LIVE' : 'OFFLINE'}</span>
        </div>
        {grokStatus?.pendingResponses > 0 && (
          <div className="pending-indicator">
            <span className="pending-dot" />
            <span>{getCountdown()}</span>
          </div>
        )}
      </div>
      
      <div className="conversation-body">
        {loading ? (
          <div className="loading-conversation">Loading conversation...</div>
        ) : user.online ? (
          <div className="live-conversation">
            <div className="live-indicator">
              <span className="pulse" />
              <span>Live conversation with {user.username}</span>
            </div>
            {messages.length > 0 ? (
              <div className="live-messages-wrapper">
                <div
                  ref={messagesContainerRef}
                  className="live-messages"
                  onScroll={checkAtBottom}
                >
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.from || msg.role}`}>
                      <span className="message-author">
                        {(msg.from === 'wankr' || msg.role === 'wankr') ? 'WANKR' : 'GROK'}
                      </span>
                      <p className="message-content">{msg.content}</p>
                      {msg.timestamp && (
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {!atBottom && (
                  <button
                    type="button"
                    className="jump-to-current-btn"
                    onClick={scrollToCurrent}
                    title="Jump to latest message"
                  >
                    ↓ Current
                  </button>
                )}
              </div>
            ) : (
              <div className="no-messages">
                <p>Starting automated training conversation...</p>
                <p className="hint">Grok and Wankr will exchange messages every 5 minutes</p>
              </div>
            )}
            
            {/* Automated status indicator */}
            {user.id === 'grok' && grokStatus && (
              <div className="auto-status">
                <span className="auto-badge">AUTOMATED</span>
                <span className="auto-info">
                  {grokStatus.pendingResponses > 0 
                    ? `Next exchange: ${getCountdown()}`
                    : 'Conversation active'
                  }
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="offline-conversation">
            <div className="offline-notice">
              <span className="notice-icon">⚠</span>
              <span>User is offline - showing last available messages</span>
            </div>
            {messages.length > 0 ? (
              <div className="limited-messages">
                {messages.slice(-4).map((msg, idx) => (
                  <div key={idx} className={`message ${msg.from || msg.role}`}>
                    <span className="message-author">
                      {(msg.from === 'wankr' || msg.role === 'wankr') ? 'WANKR' : user.username.toUpperCase()}
                    </span>
                    <p className="message-content">{msg.content}</p>
                  </div>
                ))}
                <div className="limit-notice">
                  Full conversation available when user comes online
                </div>
              </div>
            ) : (
              <div className="no-messages">No messages available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpectatorView({ onExit }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch active users from API
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/api/spectator/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setError(null);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: online first, then alphabetically
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (a.online !== b.online) return b.online - a.online;
    return a.username.localeCompare(b.username);
  });

  const handleUserClick = useCallback((user) => {
    setSelectedUser(user);
  }, []);

  const handleCloseConversation = useCallback(() => {
    setSelectedUser(null);
  }, []);

  const onlineCount = users.filter(u => u.online).length;

  return (
    <div className="spectator-view">
      {/* Header */}
      <div className="spectator-header">
        <button className="exit-btn" onClick={onExit} title="Exit Spectator Mode">
          ✕
        </button>
        <div className="header-title">
          <img className="wankr-header-logo" src={LOGO_URL} alt="Wankr" />
          <span className="title-text">WANKR VISION</span>
          <span className="live-dot" />
        </div>
        <div className="header-stats">
          <span className="online-count">{onlineCount} online</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="spectator-content">
        {selectedUser ? (
          <ConversationView user={selectedUser} onClose={handleCloseConversation} />
        ) : loading ? (
          <div className="loading-users">
            <div className="loading-spinner" />
            <span>Loading active users...</span>
          </div>
        ) : error ? (
          <div className="error-state">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
            <button onClick={fetchUsers} className="retry-btn">Retry</button>
          </div>
        ) : (
          <div className="users-grid">
            {sortedUsers.length > 0 ? (
              sortedUsers.map(user => (
                <UserBubble
                  key={user.id}
                  user={user}
                  onClick={handleUserClick}
                  isSelected={selectedUser?.id === user.id}
                />
              ))
            ) : (
              <div className="no-users">
                <div className="empty-state">
                  <span className="empty-icon">👁️</span>
                  <p>{searchQuery ? 'No users match your search' : 'No active conversations'}</p>
                  <p className="empty-hint">The grok bot is always online and ready to chat</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search bar at bottom */}
      <div className="spectator-search">
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search active users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
