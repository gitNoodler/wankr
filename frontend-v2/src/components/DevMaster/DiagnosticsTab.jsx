import { useState, useCallback } from 'react';
import {
  clearActivityLog, logSystem,
  fetchStackStatus, fetchPortCheck, fetchEnvInfo,
} from './devMasterService';

const DIAG_COMMANDS = [
  { id: 'stack-status', label: 'Full Stack Status', icon: '\u25C9', category: 'Health', action: 'stack_status' },
  { id: 'check-api', label: 'Check API Status', icon: '\u2713', category: 'Health', action: 'check_api' },
  { id: 'check-ports', label: 'Check Ports', icon: '\u2B21', category: 'Health', action: 'check_ports' },
  { id: 'env-check', label: 'Environment Info', icon: '\u2699', category: 'Health', action: 'env_check' },
  { id: 'check-railway', label: 'Railway Status', icon: '\u2601', category: 'Infrastructure', action: 'check_railway' },
  { id: 'check-cloudflare', label: 'Cloudflare / wankrbot.com', icon: '\u26A1', category: 'Infrastructure', action: 'check_cloudflare' },
  { id: 'check-github', label: 'GitHub Repo', icon: '\u2318', category: 'Infrastructure', action: 'check_github' },
  { id: 'restart-backend', label: 'Restart Backend', icon: '\u21BB', category: 'Services', action: 'restart_backend' },
  { id: 'train-count', label: 'Training Count', icon: '\u2211', category: 'Data', action: 'train_count' },
  { id: 'clear-log', label: 'Clear Activity Log', icon: '\u2612', category: 'Maintenance', action: 'clear_log' },
];

export default function DiagnosticsTab() {
  const [output, setOutput] = useState(null);
  const handleCmd = useCallback(async (cmd) => {
    setOutput({ cmd: cmd.label, status: 'running', text: 'Executing...' });
    logSystem(`Diagnostic: ${cmd.label}`);
    try {
      if (cmd.action === 'stack_status') {
        const ss = await fetchStackStatus();
        if (ss.error) { setOutput({ cmd: cmd.label, status: 'error', text: ss.error }); return; }
        const lines = [
          `Backend: ${ss.backend?.ok ? 'OK' : 'DOWN'} (port ${ss.backend?.port}, uptime ${ss.backend?.uptime}s, ${ss.backend?.nodeVersion})`,
          `Frontend dist: ${ss.frontend?.ok ? 'OK' : 'MISSING'}`,
          `xAI/Grok: ${ss.xai?.ok ? 'CONFIGURED' : 'NOT SET'}`,
          `Infisical: ${ss.infisical?.ok ? 'CONFIGURED' : 'NOT SET'}`,
          `Railway: ${ss.railway?.detected ? `DETECTED (${ss.railway.env?.environment || 'env'})` : 'NOT DETECTED (local)'}`,
          `Cloudflare: ${ss.cloudflare?.ok ? `REACHABLE (${ss.cloudflare.statusCode})` : `DOWN (${ss.cloudflare?.error || 'unreachable'})`}`,
          `GitHub: ${ss.github?.ok ? `REPO FOUND${ss.github.remoteUrl ? ' → ' + ss.github.remoteUrl : ''}` : 'NO REPO'}`,
          `GrokBot: ${ss.grokBot?.active ? `ACTIVE (${ss.grokBot.activeUsers} users)` : ss.grokBot?.ok ? 'READY' : 'DISABLED'}`,
        ];
        setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
      } else if (cmd.action === 'check_api') {
        const res = await fetch('/api/train/count');
        const data = await res.json();
        setOutput({ cmd: cmd.label, status: 'ok', text: `API responding. Training count: ${data.count}` });
      } else if (cmd.action === 'check_ports') {
        const data = await fetchPortCheck();
        if (data.error) { setOutput({ cmd: cmd.label, status: 'error', text: data.error }); return; }
        const lines = data.checks.map(c => `Port ${c.port} (${c.service}): ${c.status}${c.statusCode ? ' [' + c.statusCode + ']' : ''}`);
        setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
      } else if (cmd.action === 'env_check') {
        const data = await fetchEnvInfo();
        if (data.error) { setOutput({ cmd: cmd.label, status: 'error', text: data.error }); return; }
        const lines = [
          `Node: ${data.nodeVersion} (${data.platform}/${data.arch})`,
          `Port: ${data.port} | Uptime: ${data.uptime}s | Memory: ${data.memoryMB}MB`,
          `xAI: ${data.xaiConfigured ? 'configured' : 'not set'} | Infisical: ${data.infisicalConfigured ? 'configured' : 'not set'}`,
          `Railway: ${data.isRailway ? data.railwayEnv : 'local'} | Dist: ${data.frontendDist ? 'built' : 'not built'}`,
        ];
        setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
      } else if (cmd.action === 'check_railway') {
        const ss = await fetchStackStatus();
        if (ss.railway?.detected) {
          const env = ss.railway.env;
          const lines = [
            `Environment: ${env.environment || 'unknown'}`,
            `Project ID: ${env.projectId || 'n/a'}`,
            `Service ID: ${env.serviceId || 'n/a'}`,
            `Deployment: ${env.deploymentId || 'n/a'}`,
            `Public Domain: ${env.publicDomain || 'not set'}`,
            `Static URL: ${env.staticUrl || 'not set'}`,
          ];
          setOutput({ cmd: cmd.label, status: 'ok', text: lines.join('\n') });
        } else {
          setOutput({ cmd: cmd.label, status: 'info', text: 'Not running on Railway (local dev mode). Railway env vars not detected.' });
        }
      } else if (cmd.action === 'check_cloudflare') {
        const ss = await fetchStackStatus();
        if (ss.cloudflare?.ok) {
          setOutput({ cmd: cmd.label, status: 'ok', text: `wankrbot.com is REACHABLE (HTTP ${ss.cloudflare.statusCode}). Cloudflare tunnel is active.` });
        } else {
          setOutput({ cmd: cmd.label, status: 'error', text: `wankrbot.com is UNREACHABLE: ${ss.cloudflare?.error || 'no response'}. Check Cloudflare tunnel.` });
        }
      } else if (cmd.action === 'check_github') {
        const ss = await fetchStackStatus();
        if (ss.github?.ok) {
          setOutput({ cmd: cmd.label, status: 'ok', text: `Git repo detected.${ss.github.remoteUrl ? '\nRemote: ' + ss.github.remoteUrl : ''}` });
        } else {
          setOutput({ cmd: cmd.label, status: 'error', text: 'No git repository detected at backend root.' });
        }
      } else if (cmd.action === 'train_count') {
        const res = await fetch('/api/train/count');
        const data = await res.json();
        setOutput({ cmd: cmd.label, status: 'ok', text: `Training examples: ${data.count}` });
      } else if (cmd.action === 'restart_backend') {
        await fetch('/api/restart/request');
        setOutput({ cmd: cmd.label, status: 'ok', text: 'Restart requested.' });
      } else if (cmd.action === 'clear_log') {
        clearActivityLog();
        setOutput({ cmd: cmd.label, status: 'ok', text: 'Activity log cleared.' });
      } else {
        setOutput({ cmd: cmd.label, status: 'info', text: `"${cmd.label}" queued.` });
      }
    } catch (err) { setOutput({ cmd: cmd.label, status: 'error', text: String(err.message) }); }
  }, []);

  const cats = [...new Set(DIAG_COMMANDS.map(c => c.category))];
  return (
    <div className="devmaster-diag">
      {cats.map(cat => (
        <div key={cat} className="devmaster-diag-section">
          <div className="devmaster-diag-section-title">{cat}</div>
          <div className="devmaster-diag-grid">
            {DIAG_COMMANDS.filter(c => c.category === cat).map(cmd => (
              <button key={cmd.id} className={`devmaster-diag-btn ${cmd.danger ? 'danger' : ''}`} onClick={() => handleCmd(cmd)}>
                <span className="devmaster-diag-btn-icon">{cmd.icon}</span>{cmd.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {output && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: output.status === 'error' ? 'rgba(255,0,68,0.08)' : 'rgba(0,255,65,0.05)', border: `1px solid ${output.status === 'error' ? 'rgba(255,0,68,0.25)' : 'rgba(0,255,65,0.15)'}`, borderRadius: 6, fontSize: 12 }}>
          <div style={{ color: output.status === 'error' ? '#ff0044' : '#00ff41', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{output.cmd} — {output.status}</div>
          <div style={{ color: '#ccc', whiteSpace: 'pre-wrap', fontFamily: 'VT323, monospace' }}>{output.text}</div>
        </div>
      )}
    </div>
  );
}
