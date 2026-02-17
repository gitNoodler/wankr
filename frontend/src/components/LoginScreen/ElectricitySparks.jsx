import React, { useState, useEffect, useRef } from 'react';

const SPARK_ZONES_KEY = 'wankr_spark_zones';

function loadSparkZones() {
  try {
    const raw = localStorage.getItem(SPARK_ZONES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.channelPoints && Array.isArray(parsed.channelPoints) && parsed.channelPoints.length >= 2) {
        return {
          channelPoints: parsed.channelPoints,
          shiftZone: parsed.shiftZone ?? null,
          origin: parsed.channelPoints[0],
          receiving: parsed.channelPoints[parsed.channelPoints.length - 1],
          fillArea: parsed.shiftZone ?? parsed.fillArea ?? null,
        };
      }
      const o = parsed?.origin;
      const r = parsed?.receiving;
      if (o && r && typeof o.x === 'number' && typeof o.y === 'number' && typeof r.x === 'number' && typeof r.y === 'number') {
        return {
          channelPoints: [o, r],
          shiftZone: parsed.fillArea ?? null,
          origin: o,
          receiving: r,
          fillArea: parsed.fillArea ?? null,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

/** Clamp value to vertical bounds (0–1) */
function clampY(y, top, bottom) {
  if (top != null && bottom != null) return Math.max(top, Math.min(bottom, y));
  return y;
}

/** Clamp point to rectangular fill area { left, top, right, bottom } in 0–1 */
function clampToRect(p, area) {
  if (!area) return p;
  return {
    x: Math.max(area.left, Math.min(area.right, p.x)),
    y: Math.max(area.top, Math.min(area.bottom, p.y)),
  };
}

/** Jagged lightning path with sharp angular turns and optional branching */
function makeJaggedLightning(startX, startY, endX, endY, options = {}) {
  const segments = options.segments ?? 14;
  const jitter = options.jitter ?? 0.12;
  const branches = options.branches ?? 3;
  const boundsTop = options.boundsTop;
  const boundsBottom = options.boundsBottom;
  const fillArea = options.fillArea;

  const clamp = (p) => {
    let out = p;
    if (fillArea) out = clampToRect(out, fillArea);
    if (boundsTop != null && boundsBottom != null) out = { ...out, y: clampY(out.y, boundsTop, boundsBottom) };
    return out;
  };

  const pts = [clamp({ x: startX, y: startY })];
  const dx = (endX - startX) / segments;
  const dy = (endY - startY) / segments;

  for (let i = 1; i < segments; i++) {
    let x = startX + dx * i + (Math.random() - 0.5) * jitter;
    let y = startY + dy * i + (Math.random() - 0.5) * jitter;
    const perpX = -dy;
    const perpY = dx;
    const wiggle = (Math.random() - 0.5) * jitter * 1.5;
    x += perpX * wiggle;
    y += perpY * wiggle;
    pts.push(clamp({ x, y }));
  }
  pts.push(clamp({ x: endX, y: endY }));

  const pathParts = [];
  const toD = (p) => `${p.x * 100} ${p.y * 100}`;
  const mainD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toD(p)}`).join(' ');
  pathParts.push(mainD);

  for (let b = 0; b < branches; b++) {
    const idx = 2 + Math.floor(Math.random() * (pts.length - 4));
    const from = pts[idx];
    const len = 0.03 + Math.random() * 0.06;
    const angle = Math.random() * Math.PI * 2;
    const bx = from.x + Math.cos(angle) * len;
    const by = from.y + Math.sin(angle) * len;
    const forkPts = [from, clamp({ x: bx, y: by })];
    pathParts.push(`M ${toD(forkPts[0])} L ${toD(forkPts[1])}`);
  }

  return pathParts;
}

/** Lightning along a path through waypoints (channel). Each segment is jagged; branches from main path. */
function makeJaggedLightningAlongPath(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) return [];
  const pathParts = [];
  const toD = (p) => `${p.x * 100} ${p.y * 100}`;
  const segmentsPerLeg = options.segmentsPerLeg ?? 5;
  const jitter = options.jitter ?? 0.08;
  const branches = options.branches ?? 2;
  const boundsTop = options.boundsTop;
  const boundsBottom = options.boundsBottom;
  const fillArea = options.fillArea;

  const clamp = (p) => {
    let out = p;
    if (fillArea) out = clampToRect(out, fillArea);
    if (boundsTop != null && boundsBottom != null) out = { ...out, y: clampY(out.y, boundsTop, boundsBottom) };
    return out;
  };

  for (let w = 0; w < waypoints.length - 1; w++) {
    const startX = waypoints[w].x;
    const startY = waypoints[w].y;
    const endX = waypoints[w + 1].x;
    const endY = waypoints[w + 1].y;
    const segs = Math.max(2, segmentsPerLeg);
    const pts = [clamp({ x: startX, y: startY })];
    const dx = (endX - startX) / segs;
    const dy = (endY - startY) / segs;
    for (let i = 1; i < segs; i++) {
      let x = startX + dx * i + (Math.random() - 0.5) * jitter;
      let y = startY + dy * i + (Math.random() - 0.5) * jitter;
      const perpX = -dy;
      const perpY = dx;
      const wiggle = (Math.random() - 0.5) * jitter * 1.5;
      x += perpX * wiggle;
      y += perpY * wiggle;
      pts.push(clamp({ x, y }));
    }
    pts.push(clamp({ x: endX, y: endY }));
    const mainD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toD(p)}`).join(' ');
    pathParts.push(mainD);
    for (let b = 0; b < branches; b++) {
      const idx = 1 + Math.floor(Math.random() * (pts.length - 2));
      const from = pts[idx];
      const len = 0.02 + Math.random() * 0.04;
      const angle = Math.random() * Math.PI * 2;
      const bx = from.x + Math.cos(angle) * len;
      const by = from.y + Math.sin(angle) * len;
      pathParts.push(`M ${toD(from)} L ${toD(clamp({ x: bx, y: by }))}`);
    }
  }
  return pathParts;
}

/** Generate scattered bright dots along a line or within bounds */
function makeScatteredDots(startX, startY, endX, endY, count = 10, boundsTop, boundsBottom, fillArea) {
  const dots = [];
  const minY = fillArea ? fillArea.top * 100 : (boundsTop != null ? boundsTop * 100 : 0);
  const maxY = fillArea ? fillArea.bottom * 100 : (boundsBottom != null ? boundsBottom * 100 : 100);
  const minX = fillArea ? fillArea.left * 100 : 0;
  const maxX = fillArea ? fillArea.right * 100 : 100;
  let attempts = 0;
  while (dots.length < count && attempts < 50) {
    attempts++;
    const t = Math.random();
    const x = (startX + (endX - startX) * t + (Math.random() - 0.5) * 0.15) * 100;
    const y = (startY + (endY - startY) * t + (Math.random() - 0.5) * 0.15) * 100;
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    dots.push({ x, y, r: 0.06 + Math.random() * 0.1 });
  }
  return dots;
}

/** Scatter dots along a path (waypoints) */
function makeScatteredDotsAlongPath(waypoints, count = 10) {
  if (!waypoints || waypoints.length < 2) return [];
  const dots = [];
  const totalLen = waypoints.slice(1).reduce((acc, p, i) => acc + Math.hypot(p.x - waypoints[i].x, p.y - waypoints[i].y), 0);
  for (let n = 0; n < count; n++) {
    let t = Math.random();
    let remain = t * totalLen;
    let i = 0;
    while (i < waypoints.length - 1 && remain > 0) {
      const seg = Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
      if (remain <= seg) {
        const s = seg > 0 ? remain / seg : 0;
        const x = (waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * s + (Math.random() - 0.5) * 0.02) * 100;
        const y = (waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * s + (Math.random() - 0.5) * 0.02) * 100;
        dots.push({ x, y, r: 0.06 + Math.random() * 0.1 });
        break;
      }
      remain -= seg;
      i++;
    }
  }
  return dots;
}

export default function ElectricitySparks({ boundsTop, boundsBottom, boltThickness = 100, onSparkActive }) {
  const [active, setActive] = useState(false);
  const [pathParts, setPathParts] = useState([]);
  const [dots, setDots] = useState([]);
  const directionRef = useRef(true);
  const timeoutRef = useRef(null);

  const top = boundsTop != null ? boundsTop / 100 : null;
  const bottom = boundsBottom != null ? boundsBottom / 100 : null;
  const zones = loadSparkZones();
  const fillArea = zones?.fillArea ?? zones?.shiftZone ?? null;
  const channelPoints = zones?.channelPoints ?? null;
  const shiftZone = zones?.shiftZone ?? null;
  const strokeMain = (boltThickness / 100) * 0.5;
  const strokeBranch = (boltThickness / 100) * 0.25;

  useEffect(() => {
    function getCoords() {
      const z = loadSparkZones();
      const pts = z?.channelPoints;
      if (pts && pts.length >= 2) {
        let waypoints = pts.map((p) => ({ x: p.x + (Math.random() - 0.5) * 0.02, y: p.y + (Math.random() - 0.5) * 0.02 }));
        if (z.shiftZone && waypoints.length >= 2) {
          const zone = z.shiftZone;
          const cx = waypoints.reduce((s, p) => s + p.x, 0) / waypoints.length;
          const cy = waypoints.reduce((s, p) => s + p.y, 0) / waypoints.length;
          const pickX = zone.left + Math.random() * (zone.right - zone.left);
          const pickY = zone.top + Math.random() * (zone.bottom - zone.top);
          const dx = pickX - cx;
          const dy = pickY - cy;
          waypoints = waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        }
        return { waypoints };
      }
      if (z?.origin && z?.receiving) {
        const jitter = 0.03;
        let startX = z.origin.x + (Math.random() - 0.5) * jitter;
        let startY = z.origin.y + (Math.random() - 0.5) * jitter;
        let endX = z.receiving.x + (Math.random() - 0.5) * jitter;
        let endY = z.receiving.y + (Math.random() - 0.5) * jitter;
        if (fillArea) {
          const s = clampToRect({ x: startX, y: startY }, fillArea);
          const e = clampToRect({ x: endX, y: endY }, fillArea);
          startX = s.x; startY = s.y; endX = e.x; endY = e.y;
        } else if (top != null && bottom != null) {
          startY = clampY(startY, top, bottom);
          endY = clampY(endY, top, bottom);
        }
        return { startX, startY, endX, endY };
      }
      const startYVal = top != null && bottom != null
        ? top + Math.random() * (bottom - top)
        : 0.38 + Math.random() * 0.1;
      const endYVal = top != null && bottom != null
        ? top + Math.random() * (bottom - top)
        : 0.38 + Math.random() * 0.1;
      return {
        startX: 0.16 + Math.random() * 0.05,
        startY: startYVal,
        endX: 0.80 + Math.random() * 0.04,
        endY: endYVal,
      };
    }

    const schedule = () => {
      const delay = 5000 + Math.random() * 12000;
      timeoutRef.current = setTimeout(() => {
        const coords = getCoords();
        let parts;
        let dotList;
        if (coords.waypoints && coords.waypoints.length >= 2) {
          const goRight = directionRef.current;
          directionRef.current = !directionRef.current;
          const waypoints = goRight ? coords.waypoints : [...coords.waypoints].reverse();
          const opts = { boundsTop: top, boundsBottom: bottom, fillArea };
          parts = makeJaggedLightningAlongPath(waypoints, opts);
          dotList = makeScatteredDotsAlongPath(waypoints, 10);
        } else {
          const { startX, startY, endX, endY } = coords;
          const goRight = directionRef.current;
          directionRef.current = !directionRef.current;
          const [sx, sy, ex, ey] = goRight
            ? [startX, startY, endX, endY]
            : [endX, endY, startX, startY];
          const opts = { boundsTop: top, boundsBottom: bottom, fillArea };
          parts = makeJaggedLightning(sx, sy, ex, ey, opts);
          dotList = makeScatteredDots(sx, sy, ex, ey, 10, top, bottom, fillArea);
        }
        setPathParts(parts);
        setDots(dotList);
        setActive(true);
        onSparkActive?.(true);
        const duration = 120 + Math.random() * 550;
        setTimeout(() => {
          setActive(false);
          onSparkActive?.(false);
        }, duration);
        schedule();
      }, delay);
    };
    const initialDelay = 4000 + Math.random() * 6000;
    timeoutRef.current = setTimeout(schedule, initialDelay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [top, bottom, fillArea, channelPoints, shiftZone, onSparkActive]);

  const showSparks = active && pathParts.length > 0;
  const showMarkers = false;

  if (!showSparks && !showMarkers) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="spark-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(200,255,80,0)" />
            <stop offset="12%" stopColor="rgba(200,255,100,0.95)" />
            <stop offset="50%" stopColor="rgba(230,255,140,1)" />
            <stop offset="88%" stopColor="rgba(200,255,100,0.95)" />
            <stop offset="100%" stopColor="rgba(200,255,80,0)" />
          </linearGradient>
        </defs>
        <g>
          {showSparks && pathParts.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="url(#spark-grad)"
              strokeWidth={i === 0 ? strokeMain : strokeBranch}
              strokeLinecap="round"
              strokeLinejoin="miter"
              filter="url(#spark-glow)"
              style={{ animation: 'sparkFlash 0.15s ease-out' }}
            />
          ))}
          {showSparks && dots.map((d, i) => (
            <circle
              key={`dot-${i}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="rgba(220,255,120,0.9)"
              filter="url(#spark-glow)"
              style={{ animation: 'sparkFlash 0.15s ease-out' }}
            />
          ))}
        </g>
        {showMarkers && zones && (
          <>
            {(zones.shiftZone || zones.fillArea) && (() => {
              const area = zones.shiftZone || zones.fillArea;
              return (
                <rect
                  x={area.left * 100}
                  y={area.top * 100}
                  width={(area.right - area.left) * 100}
                  height={(area.bottom - area.top) * 100}
                  fill="rgba(255,180,80,0.06)"
                  stroke="rgba(255,180,80,0.5)"
                  strokeWidth="0.25"
                  strokeDasharray="1 1"
                />
              );
            })()}
            {(zones.channelPoints || (zones.origin && [zones.origin, zones.receiving])).map((p, i) => (
              <circle
                key={i}
                cx={p.x * 100}
                cy={p.y * 100}
                r={1.2}
                fill="rgba(0,255,65,0.4)"
                stroke="rgba(0,255,65,0.8)"
                strokeWidth="0.3"
              />
            ))}
          </>
        )}
      </svg>
      <style>{`
        @keyframes sparkFlash {
          0% { opacity: 0; filter: brightness(0.5); }
          20% { opacity: 1; filter: brightness(1.6); }
          80% { opacity: 1; filter: brightness(1.3); }
          100% { opacity: 0; filter: brightness(0.8); }
        }
      `}</style>
    </div>
  );
}
