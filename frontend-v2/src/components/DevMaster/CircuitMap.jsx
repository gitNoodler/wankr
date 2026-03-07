import { useRef, useEffect, useCallback, useState } from 'react';
import { getCircuitNodes, getCircuitEdges } from './devMasterService';

const NODE_POS_KEY = 'devmaster_node_positions';

function loadNodePositions() {
  try { const s = localStorage.getItem(NODE_POS_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

function saveNodePositions(nodes) {
  const positions = {};
  nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y }; });
  try { localStorage.setItem(NODE_POS_KEY, JSON.stringify(positions)); } catch {}
}

function getInitialNodes() {
  const nodes = getCircuitNodes();
  const saved = loadNodePositions();
  if (saved) {
    nodes.forEach(n => {
      if (saved[n.id]) { n.x = saved[n.id].x; n.y = saved[n.id].y; }
    });
  }
  return nodes;
}

export default function CircuitMap({ agents = [], activityLog = [], stackStatus = null }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const nodesRef = useRef(getInitialNodes());
  const edgesRef = useRef(getCircuitEdges());
  const nodeStatusRef = useRef({});
  const dragRef = useRef(null); // { nodeId, offsetX, offsetY } when dragging
  const [, forceRender] = useState(0); // trigger re-render after drag ends

  /* ── Hit-test: find node under cursor ── */
  const hitTestNode = useCallback((cx, cy) => {
    // Check in reverse order so topmost (last drawn) nodes are picked first
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (cx >= n.x && cx <= n.x + n.w && cy >= n.y && cy <= n.y + n.h) return n;
    }
    return null;
  }, []);

  /* ── Canvas mouse → logical coords ── */
  const canvasToLogical = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  /* ── Drag handlers ── */
  const handleMouseDown = useCallback((e) => {
    const pos = canvasToLogical(e);
    const node = hitTestNode(pos.x, pos.y);
    if (!node) return;
    dragRef.current = { nodeId: node.id, offsetX: pos.x - node.x, offsetY: pos.y - node.y };
    canvasRef.current.style.cursor = 'grabbing';
  }, [canvasToLogical, hitTestNode]);

  const handleMouseMove = useCallback((e) => {
    const pos = canvasToLogical(e);
    if (dragRef.current) {
      const node = nodesRef.current.find(n => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = pos.x - dragRef.current.offsetX;
        node.y = pos.y - dragRef.current.offsetY;
      }
    } else {
      // Show grab cursor on hover
      const hovered = hitTestNode(pos.x, pos.y);
      canvasRef.current.style.cursor = hovered ? 'grab' : 'default';
    }
  }, [canvasToLogical, hitTestNode]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null;
      canvasRef.current.style.cursor = 'default';
      saveNodePositions(nodesRef.current);
      forceRender(n => n + 1);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null;
      canvasRef.current.style.cursor = 'default';
    }
  }, []);

  const updateEdgeStates = useCallback(() => {
    const now = Date.now();
    const recent = activityLog.filter(e => now - e.timestamp < 5000);
    const edges = edgesRef.current;
    edges.forEach(e => { e.active = false; e.pulseColor = null; });

    // Always-on connections
    const fb = edges.find(e => e.from === 'frontend' && e.to === 'backend');
    const fl = edges.find(e => e.from === 'frontend' && e.to === 'localstorage');
    if (fb) fb.active = true;
    if (fl) fl.active = true;

    // Stack status drives infra edges + node statuses
    const ss = stackStatus;
    const ns = nodeStatusRef.current;
    // Reset node statuses
    nodesRef.current.forEach(n => { ns[n.id] = 'unknown'; });
    if (ss && !ss.error) {
      ns.frontend = 'ok';
      ns.backend = ss.backend?.ok ? 'ok' : 'down';
      ns.railway = ss.railway?.detected ? 'ok' : 'inactive';
      ns.cloudflare = ss.cloudflare?.ok ? 'ok' : 'down';
      ns.wankrbot = ss.cloudflare?.ok ? 'ok' : 'down';
      ns.github = ss.github?.ok ? 'ok' : 'inactive';
      ns.xai = ss.xai?.ok ? 'ok' : 'inactive';
      ns.infisical = ss.infisical?.ok ? 'ok' : 'inactive';
      ns.agent = ss.grokBot?.active ? 'ok' : ss.grokBot?.ok ? 'ready' : 'inactive';
      ns.localstorage = 'ok';
      ns.training = 'ok';
      ns.koldb = 'ok';
      ns.backup_node = 'ok';
    }
    if (ss && !ss.error) {
      // Railway
      const railEdge = edges.find(e => e.from === 'backend' && e.to === 'railway');
      if (railEdge && ss.railway?.ok) { railEdge.active = true; railEdge.pulseColor = '#c084fc'; }

      // Cloudflare
      const cfEdge = edges.find(e => e.from === 'railway' && e.to === 'cloudflare');
      if (cfEdge && ss.cloudflare?.ok) { cfEdge.active = true; cfEdge.pulseColor = '#f97316'; }

      // wankrbot.com
      const wbEdge = edges.find(e => e.from === 'cloudflare' && e.to === 'wankrbot');
      if (wbEdge && ss.cloudflare?.ok) { wbEdge.active = true; wbEdge.pulseColor = '#fbbf24'; }

      // GitHub → Railway CI/CD
      const ghEdge = edges.find(e => e.from === 'github' && e.to === 'railway');
      if (ghEdge && ss.github?.ok) { ghEdge.active = true; ghEdge.pulseColor = '#e5e5e5'; }

      // xAI
      const xaiEdge = edges.find(e => e.from === 'backend' && e.to === 'xai');
      if (xaiEdge && ss.xai?.ok) { xaiEdge.active = true; xaiEdge.pulseColor = '#ffd700'; }

      // Infisical
      const infEdge = edges.find(e => e.from === 'backend' && e.to === 'infisical');
      if (infEdge && ss.infisical?.ok) { infEdge.active = true; infEdge.pulseColor = '#ffd700'; }

      // GrokBot agent
      const agentEdge = edges.find(e => e.from === 'backend' && e.to === 'agent');
      if (agentEdge && ss.grokBot?.active) { agentEdge.active = true; agentEdge.pulseColor = '#00ffff'; }
    }

    // Recent activity pulses
    recent.forEach(entry => {
      if (entry.type === 'restore' || entry.type === 'merge') {
        const bk = edges.find(e => e.from === 'backend' && e.to === 'backup_node');
        if (bk) { bk.active = true; bk.pulseColor = '#00ffff'; }
      }
      if (entry.type === 'edit' || entry.type === 'create') { if (fb) fb.pulseColor = '#00ff41'; }
      if (entry.type === 'delete') { if (fb) fb.pulseColor = '#ff0044'; }
    });

    const grok = agents.find(a => a.id === 'grok');
    if (grok?.status === 'active') {
      const xai = edges.find(e => e.from === 'backend' && e.to === 'xai');
      if (xai) { xai.active = true; xai.pulseColor = '#ffd700'; }
    }
  }, [activityLog, agents, stackStatus]);

  const spawnParticles = useCallback(() => {
    const nodeMap = {};
    nodesRef.current.forEach(n => { nodeMap[n.id] = n; });
    edgesRef.current.forEach(edge => {
      if (!edge.active || Math.random() > 0.03) return;
      const f = nodeMap[edge.from], t = nodeMap[edge.to];
      if (!f || !t) return;
      particlesRef.current.push({
        fx: f.x + f.w / 2, fy: f.y + f.h / 2,
        tx: t.x + t.w / 2, ty: t.y + t.h / 2,
        progress: 0, speed: 0.008 + Math.random() * 0.012,
        color: edge.pulseColor || '#00ff41', size: 2 + Math.random() * 2,
      });
    });
    particlesRef.current = particlesRef.current.filter(p => { p.progress += p.speed; return p.progress < 1; });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function render() {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth, h = parent.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      timeRef.current += 1;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const nodeMap = {};
      nodesRef.current.forEach(n => { nodeMap[n.id] = n; });
      updateEdgeStates();
      spawnParticles();

      // Edges
      edgesRef.current.forEach(edge => {
        const f = nodeMap[edge.from], t = nodeMap[edge.to];
        if (!f || !t) return;
        const fx = f.x + f.w / 2, fy = f.y + f.h / 2, tx = t.x + t.w / 2, ty = t.y + t.h / 2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        if (edge.active) {
          ctx.strokeStyle = edge.pulseColor || 'rgba(0, 255, 65, 0.35)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -timeRef.current * 0.5;
          ctx.shadowColor = edge.pulseColor || '#00ff41';
          ctx.shadowBlur = 8;
        } else {
          ctx.strokeStyle = 'rgba(180, 40, 40, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        if (edge.label) {
          ctx.font = '10px VT323';
          ctx.fillStyle = edge.active ? 'rgba(0, 255, 65, 0.5)' : 'rgba(100, 100, 100, 0.4)';
          ctx.textAlign = 'center';
          ctx.fillText(edge.label, (fx + tx) / 2, (fy + ty) / 2 - 6);
        }
      });

      // Particles
      particlesRef.current.forEach(p => {
        const x = p.fx + (p.tx - p.fx) * p.progress;
        const y = p.fy + (p.ty - p.fy) * p.progress;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Nodes
      const typeColors = { service: '#00ff41', external: '#ffd700', data: '#a78bfa', agent: '#00ffff', infra: '#c084fc' };
      const statusColors = { ok: '#00ff41', ready: '#00ffff', down: '#ff0044', inactive: '#666', unknown: '#444' };
      const ns = nodeStatusRef.current;
      nodesRef.current.forEach(n => {
        const { x, y, w: nw, h: nh, label, sublabel, color, type, id } = n;
        const nStatus = ns[id] || 'unknown';
        const isDragging = dragRef.current?.nodeId === id;
        ctx.fillStyle = isDragging ? '#111' : '#0a0a0a';
        ctx.beginPath();
        ctx.roundRect(x, y, nw, nh, 6);
        ctx.fill();
        // Left status bar color based on real status
        ctx.fillStyle = statusColors[nStatus] || typeColors[type] || '#555';
        ctx.fillRect(x, y + 4, 4, nh - 8);
        ctx.strokeStyle = isDragging ? '#fff' : nStatus === 'down' ? '#ff0044' : (color || '#444');
        ctx.lineWidth = isDragging ? 2.5 : nStatus === 'down' ? 2 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, nw, nh, 6);
        ctx.stroke();
        if ((type === 'service' || type === 'infra') && nStatus !== 'down') {
          ctx.shadowColor = color || '#00ff41';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = `${(color || '#00ff41')}33`;
          ctx.beginPath();
          ctx.roundRect(x, y, nw, nh, 6);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // Status dot in top-right corner
        const dotColor = statusColors[nStatus] || '#444';
        ctx.fillStyle = dotColor;
        ctx.shadowColor = dotColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(x + nw - 8, y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Labels
        ctx.fillStyle = '#e5e5e5';
        ctx.font = '14px VT323';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x + nw / 2, y + nh / 2 - (sublabel ? 6 : 0));
        if (sublabel) {
          ctx.fillStyle = color || '#666';
          ctx.font = '11px VT323';
          ctx.fillText(sublabel, x + nw / 2, y + nh / 2 + 10);
        }
      });

      ctx.font = '10px VT323';
      ctx.fillStyle = 'rgba(0, 255, 65, 0.15)';
      ctx.textAlign = 'right';
      ctx.fillText('DEVMASTER CIRCUIT MAP', w - 10, h - 8);
      animRef.current = requestAnimationFrame(render);
    }
    animRef.current = requestAnimationFrame(render);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [updateEdgeStates, spawnParticles]);

  return (
    <div className="devmaster-map-container">
      <div className="devmaster-map-canvas-wrap">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      <div className="devmaster-map-sidebar">
        <div className="devmaster-map-legend-title">Legend</div>
        {[{ color: '#00ff41', label: 'Service' }, { color: '#c084fc', label: 'Infrastructure' }, { color: '#00ffff', label: 'Agent' }, { color: '#ffd700', label: 'External API' }, { color: '#a78bfa', label: 'Data Store' }].map(i => (
          <div key={i.label} className="devmaster-map-legend-item">
            <div className="devmaster-map-legend-dot" style={{ background: i.color, boxShadow: `0 0 6px ${i.color}` }} />
            <span>{i.label}</span>
          </div>
        ))}
        <div className="devmaster-map-legend-title" style={{ marginTop: 16 }}>Status</div>
        {[{ color: '#00ff41', label: 'Active' }, { color: '#00ffff', label: 'Data Flow' }, { color: '#ffd700', label: 'Warning' }, { color: '#ff0044', label: 'Error' }, { color: '#444', label: 'Dormant' }].map(i => (
          <div key={i.label} className="devmaster-map-legend-item">
            <div className="devmaster-map-legend-dot" style={{ background: i.color, boxShadow: `0 0 4px ${i.color}` }} />
            <span>{i.label}</span>
          </div>
        ))}
        <div className="devmaster-map-legend-title" style={{ marginTop: 16 }}>Stack</div>
        <div className="devmaster-map-legend-item" style={{ color: '#00ff41' }}>:5174 Frontend</div>
        <div className="devmaster-map-legend-item" style={{ color: '#00ff41' }}>:5000 Backend</div>
        <div className="devmaster-map-legend-item" style={{ color: '#c084fc' }}>Railway Deploy</div>
        <div className="devmaster-map-legend-item" style={{ color: '#f97316' }}>Cloudflare CDN</div>
        <div className="devmaster-map-legend-item" style={{ color: '#fbbf24' }}>wankrbot.com</div>
      </div>
    </div>
  );
}
