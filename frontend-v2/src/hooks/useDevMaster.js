import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getActivityLog, onActivity, getAgents, setAgentStatus,
  getQuarantineList, getMethodRules, logSystem,
  fetchStackStatus, onStackStatus, getStackStatus,
} from '../components/DevMaster/devMasterService';

const POS_KEY = 'devmaster_position';
const SIZE_KEY = 'devmaster_size';
const DEF_POS = { x: 60, y: 60 };
const DEF_SIZE = { w: 780, h: 520 };

export function useDevMaster() {
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [activityLog, setActivityLog] = useState(getActivityLog);
  const [agents, setAgentsState] = useState(getAgents);
  const [unreadCount, setUnreadCount] = useState(0);

  const [position, setPosition] = useState(() => {
    try { const s = localStorage.getItem(POS_KEY); return s ? JSON.parse(s) : DEF_POS; } catch { return DEF_POS; }
  });
  const [size, setSize] = useState(() => {
    try { const s = localStorage.getItem(SIZE_KEY); return s ? JSON.parse(s) : DEF_SIZE; } catch { return DEF_SIZE; }
  });

  useEffect(() => { localStorage.setItem(POS_KEY, JSON.stringify(position)); }, [position]);
  useEffect(() => { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); }, [size]);

  useEffect(() => {
    const unsub = onActivity((_entry, log) => {
      setActivityLog([...log]);
      if (!visible) setUnreadCount(c => c + 1);
    });
    return unsub;
  }, [visible]);

  useEffect(() => {
    const interval = setInterval(() => setAgentsState(getAgents()), 2000);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+Shift+D keyboard shortcut
  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setVisible(v => {
          if (!v) { setUnreadCount(0); logSystem('DevMaster panel opened'); }
          return !v;
        });
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const togglePanel = useCallback(() => {
    setVisible(v => { if (!v) { setUnreadCount(0); logSystem('DevMaster panel opened'); } return !v; });
  }, []);
  const closePanel = useCallback(() => setVisible(false), []);

  // Stack status (real health checks)
  const [stackStatus, setStackStatus] = useState(getStackStatus);
  useEffect(() => {
    const unsub = onStackStatus(setStackStatus);
    // Initial fetch + periodic polling every 15s when panel is visible
    fetchStackStatus();
    if (!visible) return unsub;
    const poll = setInterval(fetchStackStatus, 15000);
    return () => { unsub(); clearInterval(poll); };
  }, [visible]);

  // Update agent statuses from real stack status
  useEffect(() => {
    if (!stackStatus || stackStatus.error) return;
    setAgentStatus('grokbot', stackStatus.xai?.ok ? 'active' : 'dormant');
    setAgentStatus('hookify', 'watching');
    setAgentStatus('backup', 'watching');
    if (stackStatus.grokBot?.active) setAgentStatus('grok', 'active');
  }, [stackStatus]);

  // Init agent states
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setAgentStatus('hookify', 'watching');
      setAgentStatus('backup', 'watching');
      logSystem('DevMaster initialized - monitoring active');
    }
  }, []);

  // Drag
  const dragRef = useRef(null);
  const startDrag = useCallback((e) => {
    if (e.target.closest('.devmaster-titlebar-btn')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: position.x, py: position.y };
    function onMove(ev) {
      if (!dragRef.current) return;
      setPosition({ x: Math.max(0, dragRef.current.px + ev.clientX - dragRef.current.startX), y: Math.max(0, dragRef.current.py + ev.clientY - dragRef.current.startY) });
    }
    function onUp() { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [position]);

  // Resize
  const resizeRef = useRef(null);
  const startResize = useCallback((e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, w: size.w, h: size.h, dir };
    function onMove(ev) {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      const d = resizeRef.current.dir;
      setSize(s => ({
        w: d.includes('right') || d === 'corner' ? Math.max(680, resizeRef.current.w + dx) : s.w,
        h: d.includes('bottom') || d === 'corner' ? Math.max(480, resizeRef.current.h + dy) : s.h,
      }));
    }
    function onUp() { resizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size]);

  return {
    visible, activeTab, setActiveTab, activityLog, agents,
    unreadCount, position, size, stackStatus,
    togglePanel, closePanel, startDrag, startResize,
  };
}
