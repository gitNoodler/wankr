// DevMaster Service — Global activity tracking & event bus for frontend-v2

const STORAGE_KEY = 'devmaster_activity_log';
const RULES_KEY = 'devmaster_method_rules';
const QUARANTINE_KEY = 'devmaster_quarantine';
const MAX_LOG = 500;
const PERSIST_N = 200;

let activityLog = [];
let listeners = [];
let idCounter = 0;

try { const s = localStorage.getItem(STORAGE_KEY); if (s) activityLog = JSON.parse(s); } catch {}

// ── Activity Log ──
export function addActivity(entry) {
  const enriched = { ...entry, id: `dm_${Date.now()}_${++idCounter}`, timestamp: Date.now() };
  activityLog.push(enriched);
  if (activityLog.length > MAX_LOG) activityLog = activityLog.slice(-PERSIST_N);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activityLog.slice(-PERSIST_N))); } catch {}
  listeners.forEach(fn => fn(enriched, activityLog));
  return enriched;
}

export function getActivityLog() { return [...activityLog]; }
export function clearActivityLog() { activityLog = []; localStorage.removeItem(STORAGE_KEY); listeners.forEach(fn => fn(null, [])); }
export function onActivity(cb) { listeners.push(cb); return () => { listeners = listeners.filter(fn => fn !== cb); }; }

export const ActivityType = {
  RESTORE: 'restore', MERGE: 'merge', DELETE: 'delete', OVERRIDE: 'override',
  CREATE: 'create', EDIT: 'edit', QUARANTINE: 'quarantine', RULE_ADD: 'rule_add',
  AGENT_START: 'agent_start', AGENT_STOP: 'agent_stop', ERROR: 'error', SYSTEM: 'system',
};

export function logRestore(filePath, source, agent) { return addActivity({ type: ActivityType.RESTORE, filePath, source, agent }); }
export function logMerge(filePath, source, agent) { return addActivity({ type: ActivityType.MERGE, filePath, source, agent }); }
export function logDelete(filePath, source, agent) { return addActivity({ type: ActivityType.DELETE, filePath, source, agent }); }
export function logOverride(filePath, source, agent) { return addActivity({ type: ActivityType.OVERRIDE, filePath, source, agent }); }
export function logCreate(filePath, source, agent) { return addActivity({ type: ActivityType.CREATE, filePath, source, agent }); }
export function logEdit(filePath, source, agent) { return addActivity({ type: ActivityType.EDIT, filePath, source, agent }); }
export function logSystem(message, agent = 'DevMaster') { return addActivity({ type: ActivityType.SYSTEM, filePath: message, source: 'system', agent }); }

// ── File Quarantine ──
export function getQuarantineList() { try { const s = localStorage.getItem(QUARANTINE_KEY); return s ? JSON.parse(s) : []; } catch { return []; } }
export function quarantineFile(filePath, reason, agent = 'DevMaster') {
  const list = getQuarantineList();
  const entry = { id: `q_${Date.now()}_${++idCounter}`, filePath, reason, agent, timestamp: Date.now() };
  list.push(entry);
  localStorage.setItem(QUARANTINE_KEY, JSON.stringify(list));
  addActivity({ type: ActivityType.QUARANTINE, filePath, source: reason, agent });
  return entry;
}
export function releaseFromQuarantine(id) {
  let list = getQuarantineList();
  list = list.filter(item => item.id !== id);
  localStorage.setItem(QUARANTINE_KEY, JSON.stringify(list));
}

// ── Method Rule Book ──
export function getMethodRules() { try { const s = localStorage.getItem(RULES_KEY); return s ? JSON.parse(s) : []; } catch { return []; } }
export function addMethodRule(rule) {
  const rules = getMethodRules();
  const entry = { ...rule, id: `rule_${Date.now()}_${++idCounter}`, createdAt: Date.now() };
  rules.push(entry);
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  addActivity({ type: ActivityType.RULE_ADD, filePath: rule.title, source: 'rulebook', agent: 'User' });
  return entry;
}
export function removeMethodRule(id) {
  let rules = getMethodRules();
  rules = rules.filter(r => r.id !== id);
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

// ── Agent Status Tracking ──
const AGENTS = [
  { id: 'wankr',     name: 'Wankr',          icon: '\u{1F608}', desc: 'Main personality agent' },
  { id: 'grok',      name: 'Grok LLM',       icon: '\u{1F916}', desc: 'xAI language model' },
  { id: 'router',    name: 'Trait Router',    icon: '\u{1F500}', desc: 'Input trait detection' },
  { id: 'retriever', name: 'Style Retriever', icon: '\u{1F50D}', desc: 'Style example lookup' },
  { id: 'composer',  name: 'Composer',        icon: '\u{270D}\u{FE0F}', desc: 'Prompt composition' },
  { id: 'trainer',   name: 'Training',        icon: '\u{1F4DA}', desc: 'Training data system' },
  { id: 'backup',    name: 'Backup',          icon: '\u{1F4BE}', desc: 'Chat backup/restore' },
  { id: 'hookify',   name: 'Hookify',         icon: '\u{1F6A8}', desc: 'Hook monitoring' },
  { id: 'claude',    name: 'Claude',          icon: '\u{2728}', desc: 'Claude Code assistant' },
  { id: 'grokbot',   name: 'GrokBot',         icon: '\u{1F47E}', desc: 'Autonomous Grok bot' },
  { id: 'kol',       name: 'KOL Analysis',    icon: '\u{1F4CA}', desc: 'KOL intelligence' },
];

let agentStatuses = {};
AGENTS.forEach(a => { agentStatuses[a.id] = 'dormant'; });

export function getAgents() { return AGENTS.map(a => ({ ...a, status: agentStatuses[a.id] || 'dormant' })); }
export function setAgentStatus(agentId, status) {
  agentStatuses[agentId] = status;
  if (status === 'active') addActivity({ type: ActivityType.AGENT_START, filePath: agentId, source: 'agent-monitor', agent: agentId });
}

// ── Circuit Map ──
export function getCircuitNodes() {
  return [
    // Row 1 — Request path (straight horizontal line)
    { id: 'browser',      label: 'User Browser',    sublabel: 'wankrbot.com', x: 40,  y: 40,  w: 120, h: 50, type: 'service',  color: '#fbbf24' },
    { id: 'cloudflare',   label: 'Cloudflare',      sublabel: 'CDN/Proxy',    x: 200, y: 40,  w: 120, h: 50, type: 'infra',    color: '#f97316' },
    { id: 'tunnel',       label: 'CF Tunnel',       sublabel: 'cloudflared',  x: 360, y: 40,  w: 120, h: 50, type: 'infra',    color: '#f97316' },
    { id: 'railway',      label: 'Railway',         sublabel: 'Platform',     x: 520, y: 40,  w: 120, h: 50, type: 'infra',    color: '#c084fc' },
    // Row 2 — Backend (below Railway) + deploy source + local dev
    { id: 'vite',         label: ':5174',           sublabel: 'Vite',         x: 140, y: 140, w: 40,  h: 40, type: 'service',  color: '#a855f7', shape: 'circle' },
    { id: 'github',       label: 'GitHub',          sublabel: 'Repo',         x: 360, y: 140, w: 120, h: 50, type: 'infra',    color: '#e5e5e5' },
    { id: 'backend',      label: 'Backend',         sublabel: ':5000 + UI',   x: 520, y: 140, w: 120, h: 50, type: 'service',  color: '#00ff41' },
    // Row 3 — External APIs (called by backend)
    { id: 'xai',          label: 'xAI / Grok',      sublabel: 'Chat API',     x: 360, y: 240, w: 120, h: 50, type: 'external', color: '#ffd700' },
    { id: 'infisical',    label: 'Infisical',       sublabel: 'Secrets',      x: 520, y: 240, w: 120, h: 50, type: 'external', color: '#ffd700' },
    // Row 4 — Local files (backend filesystem)
    { id: 'training',     label: 'Training Data',   sublabel: 'local .json',  x: 360, y: 340, w: 120, h: 50, type: 'data',     color: '#a78bfa' },
    { id: 'backup_node',  label: 'Chat Backup',     sublabel: 'local .json',  x: 520, y: 340, w: 120, h: 50, type: 'data',     color: '#a78bfa' },
    { id: 'koldb',        label: 'KOL Database',    sublabel: 'local .csv',   x: 200, y: 340, w: 120, h: 50, type: 'data',     color: '#a78bfa' },
  ];
}

export function getCircuitEdges() {
  return [
    // === REQUEST PATH (horizontal row 1, then down to backend) ===
    { from: 'browser',    to: 'cloudflare',   label: 'HTTPS',    active: false, bidir: true },
    { from: 'cloudflare', to: 'tunnel',       label: 'Tunnel',   active: false, bidir: true },
    { from: 'tunnel',     to: 'railway',      label: 'Internal', active: false, bidir: true },
    { from: 'railway',    to: 'backend',      label: 'Route',    active: false, bidir: true },
    // === LOCAL DEV: Vite serves frontend + proxies /api to backend ===
    { from: 'browser',    to: 'vite',        label: 'Dev',      active: false, bidir: true },
    { from: 'vite',       to: 'backend',     label: 'Proxy',    active: false, bidir: true },
    // === DEPLOY ===
    { from: 'github',     to: 'railway',      label: 'CI/CD',    active: false },
    // === EXTERNAL API CALLS (backend → internet) ===
    { from: 'backend',    to: 'xai',          label: 'HTTPS',    active: false, bidir: true },
    { from: 'backend',    to: 'infisical',    label: 'Boot',     active: false },
    // === LOCAL FILESYSTEM (same container) ===
    { from: 'backend',    to: 'training',     label: 'fs R/W',   active: false, bidir: true },
    { from: 'backend',    to: 'backup_node',  label: 'fs R/W',   active: false, bidir: true },
    { from: 'backend',    to: 'koldb',        label: 'fs Read',  active: false },
  ];
}

// ── Stack Status (real health checks) ──
let _stackStatus = null;
let _stackStatusListeners = [];

export function getStackStatus() { return _stackStatus; }
export function onStackStatus(cb) { _stackStatusListeners.push(cb); return () => { _stackStatusListeners = _stackStatusListeners.filter(fn => fn !== cb); }; }

export async function fetchStackStatus() {
  try {
    const res = await fetch('/api/devmaster/stack-status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _stackStatus = await res.json();
    _stackStatusListeners.forEach(fn => fn(_stackStatus));
    return _stackStatus;
  } catch (err) {
    _stackStatus = { error: err.message, timestamp: Date.now() };
    _stackStatusListeners.forEach(fn => fn(_stackStatus));
    return _stackStatus;
  }
}

export async function fetchPortCheck() {
  try {
    const res = await fetch('/api/devmaster/diag/ports');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) { return { error: err.message }; }
}

export async function fetchEnvInfo() {
  try {
    const res = await fetch('/api/devmaster/diag/env');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) { return { error: err.message }; }
}

// ── Backend-synced quarantine ──
export async function fetchQuarantineFromBackend() {
  try { const r = await fetch('/api/devmaster/quarantine'); const d = await r.json(); return d.items || []; } catch { return []; }
}
export async function quarantineFileBackend(filePath, reason, agent) {
  try { await fetch('/api/devmaster/quarantine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filePath, reason, agent }) }); } catch {}
}
export async function releaseQuarantineBackend(id) {
  try { await fetch('/api/devmaster/quarantine/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); } catch {}
}

// ── Backend-synced rules ──
export async function fetchRulesFromBackend() {
  try { const r = await fetch('/api/devmaster/rules'); const d = await r.json(); return d.rules || []; } catch { return []; }
}
export async function addRuleBackend(rule) {
  try { await fetch('/api/devmaster/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rule) }); } catch {}
}
export async function removeRuleBackend(id) {
  try { await fetch(`/api/devmaster/rules/${id}`, { method: 'DELETE' }); } catch {}
}

// ── Global window API ──
if (typeof window !== 'undefined') {
  window.__devmaster = {
    addActivity, logRestore, logMerge, logDelete, logOverride, logCreate, logEdit, logSystem,
    quarantineFile, setAgentStatus, getAgents, getActivityLog,
  };
}
