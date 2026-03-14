import { useState, useEffect } from 'react';
import {
  getMethodRules, addMethodRule, removeMethodRule,
  fetchRulesFromBackend, addRuleBackend, removeRuleBackend,
} from './devMasterService';

export default function RulesTab() {
  const [rules, setRulesState] = useState(getMethodRules);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general' });
  // Sync from backend on mount (was useState — fixed to useEffect)
  useEffect(() => { fetchRulesFromBackend().then(backendRules => { if (backendRules.length) setRulesState(backendRules); }); }, []);
  const handleAdd = () => {
    if (!form.title.trim()) return;
    addMethodRule(form);
    addRuleBackend(form);
    setRulesState(getMethodRules());
    setForm({ title: '', description: '', category: 'general' });
    setAdding(false);
  };
  const handleRemove = (id) => {
    removeMethodRule(id);
    removeRuleBackend(id);
    setRulesState(getMethodRules());
  };
  const categories = ['general', 'security', 'architecture', 'performance', 'style', 'testing'];
  return (
    <div className="devmaster-rules">
      <div className="devmaster-rules-header">
        <div className="devmaster-rules-title">Method Rule Book</div>
        <button className="devmaster-add-btn" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add Rule'}</button>
      </div>
      {adding && (
        <div style={{ padding: 12, background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 6, marginBottom: 12 }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Rule title..." style={{ width: '100%', background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 4, padding: '6px 10px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none', marginBottom: 6 }} />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={3} style={{ width: '100%', background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 4, padding: '6px 10px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none', resize: 'vertical', marginBottom: 6 }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ background: '#111', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 4, padding: '4px 8px', color: '#ccc', fontSize: 12, fontFamily: 'VT323, monospace', outline: 'none' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="devmaster-add-btn" onClick={handleAdd}>Save Rule</button>
          </div>
        </div>
      )}
      {rules.length === 0 ? (
        <div className="devmaster-quarantine-empty"><span style={{ fontSize: 32, opacity: 0.3 }}>{'\u{1F4D6}'}</span><span>No rules defined yet</span></div>
      ) : rules.map(rule => (
        <div key={rule.id} className="devmaster-rule-item">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="devmaster-rule-item-title">{rule.title}</div>
            <button onClick={() => handleRemove(rule.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>{'\u2717'}</button>
          </div>
          <div className="devmaster-rule-item-desc">{rule.description}</div>
          <div className="devmaster-rule-item-meta"><span>{rule.category}</span><span>{new Date(rule.createdAt).toLocaleDateString()}</span></div>
        </div>
      ))}
    </div>
  );
}
