import React, { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'wankr_surface_planes';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.surfaces)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load surface planes:', e);
  }
  return { surfaces: [], savedAt: null };
}

function saveSurfaces(surfaces) {
  try {
    const data = { surfaces, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('Saved surfaces:', data);
    return true;
  } catch (e) {
    console.error('Failed to save surfaces:', e);
    return false;
  }
}

export function loadSurfacePlanes() {
  return loadSaved();
}

// Surface colors for different planes
const SURFACE_COLORS = [
  { primary: '#00ff41', secondary: '#00ff4166', name: 'Green' },
  { primary: '#00ccff', secondary: '#00ccff66', name: 'Cyan' },
  { primary: '#ff00ff', secondary: '#ff00ff66', name: 'Magenta' },
  { primary: '#ffcc00', secondary: '#ffcc0066', name: 'Yellow' },
  { primary: '#ff6600', secondary: '#ff660066', name: 'Orange' },
];

export default function SurfacePlaneTool({ onClose, onSave, sceneRef }) {
  const saved = loadSaved();
  const [surfaces, setSurfaces] = useState(saved?.surfaces ?? []);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [rect, setRect] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [selectedSurface, setSelectedSurface] = useState(null);

  // Update rect when scene ref changes
  useEffect(() => {
    const el = sceneRef?.current;
    if (!el) {
      // Fallback to full viewport if no scene ref
      setRect({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [sceneRef]);

  // Handle click to add point
  const handleClick = useCallback(
    (e) => {
      if (!rect) return;
      if (e.target.closest('[data-panel]')) return;
      
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const xPct = Math.max(0, Math.min(100, x));
      const yPct = Math.max(0, Math.min(100, y));
      
      // Check if shift is held - if so, mark as break point
      const isBreak = e.shiftKey;
      
      setCurrentPoints(prev => [...prev, { 
        x: xPct, 
        y: yPct, 
        id: Date.now(),
        isBreak, // Break point - no line to previous
      }]);
      setSaveStatus(null);
    },
    [rect]
  );

  // Remove point from current
  const removeCurrentPoint = useCallback((index) => {
    setCurrentPoints(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Toggle break on a point
  const toggleBreak = useCallback((index) => {
    setCurrentPoints(prev => prev.map((p, i) => 
      i === index ? { ...p, isBreak: !p.isBreak } : p
    ));
  }, []);

  // Add current points as a new surface
  const addSurface = useCallback(() => {
    if (currentPoints.length < 2) return;
    
    const newSurface = {
      id: Date.now(),
      points: currentPoints.map(p => ({ x: p.x, y: p.y, isBreak: p.isBreak })),
      colorIndex: surfaces.length % SURFACE_COLORS.length,
    };
    
    setSurfaces(prev => [...prev, newSurface]);
    setCurrentPoints([]);
    setSaveStatus(null);
  }, [currentPoints, surfaces.length]);

  // Delete a saved surface
  const deleteSurface = useCallback((surfaceId) => {
    setSurfaces(prev => prev.filter(s => s.id !== surfaceId));
    setSaveStatus(null);
  }, []);

  // Save all surfaces to localStorage
  const saveAll = useCallback(() => {
    // Include current points as a surface if any
    let allSurfaces = [...surfaces];
    if (currentPoints.length >= 2) {
      allSurfaces.push({
        id: Date.now(),
        points: currentPoints.map(p => ({ x: p.x, y: p.y, isBreak: p.isBreak })),
        colorIndex: surfaces.length % SURFACE_COLORS.length,
      });
      setCurrentPoints([]);
    }
    
    const success = saveSurfaces(allSurfaces);
    if (success) {
      setSurfaces(allSurfaces);
      setSaveStatus({ type: 'success', message: `Saved ${allSurfaces.length} surface(s)` });
      onSave?.();
    } else {
      setSaveStatus({ type: 'error', message: 'Failed to save' });
    }
  }, [surfaces, currentPoints, onSave]);

  // Clear everything
  const clearAll = useCallback(() => {
    setSurfaces([]);
    setCurrentPoints([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSaveStatus({ type: 'success', message: 'Cleared all surfaces' });
    } catch (e) {
      setSaveStatus({ type: 'error', message: 'Failed to clear' });
    }
  }, []);

  // Get color for surface
  const getSurfaceColor = (colorIndex) => SURFACE_COLORS[colorIndex % SURFACE_COLORS.length];

  // Calculate total points
  const totalPoints = surfaces.reduce((sum, s) => sum + s.points.length, 0) + currentPoints.length;

  // Export data
  const exportData = {
    surfaces: surfaces.map(s => ({
      points: s.points.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), isBreak: p.isBreak || undefined }))
    })),
    currentPoints: currentPoints.length > 0 
      ? currentPoints.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), isBreak: p.isBreak || undefined }))
      : undefined,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.6)',
        cursor: 'crosshair',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 20,
        overflow: 'auto',
      }}
    >
      {/* Control Panel */}
      <div
        data-panel
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)',
          border: '2px solid var(--accent)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 0 24px rgba(0,255,65,0.3)',
          color: 'var(--accent)',
          fontSize: 13,
          minWidth: 420,
          maxWidth: '95vw',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Surface Plane Tool</span>
          <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>
            {surfaces.length} surface(s), {totalPoints} total points
          </span>
        </div>

        {/* Instructions */}
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          background: 'rgba(0,255,65,0.08)', 
          borderRadius: 8,
          fontSize: 12, 
          lineHeight: 1.6 
        }}>
          <div><strong>Click</strong> = Add point (connected to previous)</div>
          <div><strong>Shift+Click</strong> = Add break point (not connected - for out-of-sight areas)</div>
          <div><strong>Right-click point</strong> = Remove point</div>
          <div style={{ marginTop: 8, color: '#00ccff' }}>
            Create multiple surfaces by clicking "Finish Surface" then adding more points.
          </div>
        </div>

        {/* Save status */}
        {saveStatus && (
          <div style={{
            marginBottom: 12,
            padding: '8px 12px',
            borderRadius: 6,
            background: saveStatus.type === 'success' ? 'rgba(0,255,65,0.2)' : 'rgba(255,100,100,0.2)',
            border: `1px solid ${saveStatus.type === 'success' ? 'var(--accent)' : '#ff6b6b'}`,
            color: saveStatus.type === 'success' ? 'var(--accent)' : '#ff6b6b',
            fontSize: 12,
          }}>
            {saveStatus.message}
          </div>
        )}

        {/* Current points being placed */}
        {currentPoints.length > 0 && (
          <div style={{ 
            marginBottom: 16, 
            background: 'rgba(0,255,65,0.1)', 
            borderRadius: 8, 
            padding: 12,
            border: '1px solid rgba(0,255,65,0.3)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Current Surface ({currentPoints.length} points)</span>
              <button
                type="button"
                onClick={addSurface}
                disabled={currentPoints.length < 2}
                style={{
                  padding: '4px 10px',
                  fontSize: 10,
                  background: currentPoints.length >= 2 ? 'rgba(0,255,65,0.3)' : 'rgba(100,100,100,0.3)',
                  border: '1px solid var(--accent)',
                  borderRadius: 4,
                  color: 'var(--accent)',
                  cursor: currentPoints.length >= 2 ? 'pointer' : 'default',
                  marginLeft: 'auto',
                }}
              >
                Finish Surface
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {currentPoints.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleBreak(idx)}
                  onContextMenu={(e) => { e.preventDefault(); removeCurrentPoint(idx); }}
                  onMouseEnter={() => setHoveredPoint({ type: 'current', idx })}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    background: p.isBreak ? 'rgba(255,180,0,0.3)' : 'rgba(0,255,65,0.15)',
                    border: `1px solid ${p.isBreak ? '#ffb400' : '#00ff41'}`,
                    borderRadius: 4,
                    color: p.isBreak ? '#ffb400' : '#00ff41',
                    cursor: 'pointer',
                  }}
                  title={`${p.isBreak ? 'Break point' : 'Connected point'}\nClick to toggle break\nRight-click to remove`}
                >
                  {p.isBreak ? '⊘' : '●'} P{idx + 1}: {p.x.toFixed(1)}%, {p.y.toFixed(1)}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved surfaces */}
        {surfaces.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              Saved Surfaces:
            </div>
            {surfaces.map((surface, sIdx) => {
              const color = getSurfaceColor(surface.colorIndex);
              return (
                <div
                  key={surface.id}
                  style={{
                    marginBottom: 8,
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: 8,
                    padding: 10,
                    border: `1px solid ${color.primary}44`,
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    marginBottom: 6,
                  }}>
                    <span style={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      background: color.primary,
                      boxShadow: `0 0 8px ${color.primary}`,
                    }} />
                    <span style={{ fontSize: 11, color: color.primary }}>
                      Surface {sIdx + 1} ({surface.points.length} pts)
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSurface(surface.id)}
                      style={{
                        marginLeft: 'auto',
                        padding: '2px 8px',
                        fontSize: 10,
                        background: 'rgba(255,100,100,0.2)',
                        border: '1px solid rgba(255,100,100,0.5)',
                        borderRadius: 4,
                        color: '#ff6b6b',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {surface.points.map((p, pIdx) => (
                      <span
                        key={pIdx}
                        style={{
                          padding: '2px 6px',
                          fontSize: 9,
                          fontFamily: 'monospace',
                          background: p.isBreak ? 'rgba(255,180,0,0.2)' : `${color.primary}22`,
                          border: `1px solid ${p.isBreak ? '#ffb40066' : `${color.primary}44`}`,
                          borderRadius: 3,
                          color: p.isBreak ? '#ffb400' : color.primary,
                        }}
                      >
                        {p.isBreak ? '⊘' : '●'}{p.x.toFixed(0)}%,{p.y.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Export data */}
        {(surfaces.length > 0 || currentPoints.length > 0) && (
          <div style={{ 
            marginBottom: 16, 
            background: 'rgba(0,0,0,0.5)', 
            borderRadius: 8, 
            padding: 12,
          }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>
              Export JSON (copy for code):
            </div>
            <textarea
              readOnly
              value={JSON.stringify(exportData, null, 2)}
              style={{
                width: '100%',
                height: 100,
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(0,255,65,0.3)',
                borderRadius: 4,
                color: 'var(--accent)',
                fontSize: 10,
                fontFamily: 'monospace',
                padding: 8,
                resize: 'vertical',
              }}
              onClick={(e) => e.target.select()}
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={saveAll}
            disabled={surfaces.length === 0 && currentPoints.length < 2}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              background: 'rgba(0,255,65,0.25)',
              border: '2px solid var(--accent)',
              color: 'var(--accent)',
              cursor: (surfaces.length > 0 || currentPoints.length >= 2) ? 'pointer' : 'default',
              opacity: (surfaces.length > 0 || currentPoints.length >= 2) ? 1 : 0.5,
              fontWeight: 600,
            }}
          >
            💾 Save All
          </button>
          <button
            type="button"
            onClick={() => setCurrentPoints([])}
            disabled={currentPoints.length === 0}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              background: 'rgba(100,100,100,0.3)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              cursor: currentPoints.length > 0 ? 'pointer' : 'default',
              opacity: currentPoints.length > 0 ? 1 : 0.5,
            }}
          >
            Clear Current
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              background: 'rgba(255,100,100,0.15)',
              border: '1px solid rgba(255,100,100,0.5)',
              color: '#ff6b6b',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 12,
              background: 'rgba(100,100,100,0.3)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Render saved surfaces */}
      {rect && surfaces.map((surface, sIdx) => {
        const color = getSurfaceColor(surface.colorIndex);
        return (
          <React.Fragment key={surface.id}>
            {/* Surface lines */}
            <svg
              style={{
                position: 'fixed',
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                pointerEvents: 'none',
                zIndex: 9995 + sIdx,
              }}
            >
              <defs>
                <filter id={`glow-${surface.id}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {surface.points.map((p, idx) => {
                if (idx === 0 || p.isBreak) return null;
                const prev = surface.points[idx - 1];
                return (
                  <line
                    key={idx}
                    x1={`${prev.x}%`}
                    y1={`${prev.y}%`}
                    x2={`${p.x}%`}
                    y2={`${p.y}%`}
                    stroke={color.primary}
                    strokeWidth="2"
                    strokeOpacity="0.7"
                    filter={`url(#glow-${surface.id})`}
                  />
                );
              })}
            </svg>
            {/* Surface points */}
            {surface.points.map((p, pIdx) => (
              <div
                key={`${surface.id}-${pIdx}`}
                style={{
                  position: 'fixed',
                  left: rect.left + (p.x / 100) * rect.width - 6,
                  top: rect.top + (p.y / 100) * rect.height - 6,
                  width: 12,
                  height: 12,
                  borderRadius: p.isBreak ? '2px' : '50%',
                  background: p.isBreak ? '#ffb400' : color.primary,
                  boxShadow: `0 0 8px ${p.isBreak ? '#ffb400' : color.primary}`,
                  pointerEvents: 'none',
                  zIndex: 9996 + sIdx,
                  opacity: 0.8,
                }}
              />
            ))}
          </React.Fragment>
        );
      })}

      {/* Render current points */}
      {rect && currentPoints.map((p, idx) => (
        <div
          key={p.id}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            removeCurrentPoint(idx);
          }}
          onClick={(e) => {
            e.stopPropagation();
            toggleBreak(idx);
          }}
          style={{
            position: 'fixed',
            left: rect.left + (p.x / 100) * rect.width - 12,
            top: rect.top + (p.y / 100) * rect.height - 12,
            width: 24,
            height: 24,
            borderRadius: p.isBreak ? '4px' : '50%',
            border: `3px solid ${p.isBreak ? '#ffb400' : '#00ff41'}`,
            background: p.isBreak ? 'rgba(255,180,0,0.4)' : 'rgba(0,255,65,0.4)',
            boxShadow: `0 0 16px ${p.isBreak ? '#ffb400' : '#00ff41'}`,
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#000',
          }}
          title={`${p.isBreak ? 'Break' : 'Point'} ${idx + 1}\nClick to toggle break\nRight-click to remove`}
        >
          {idx + 1}
        </div>
      ))}

      {/* Draw current lines */}
      {rect && currentPoints.length >= 2 && (
        <svg
          style={{
            position: 'fixed',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            pointerEvents: 'none',
            zIndex: 9997,
          }}
        >
          <defs>
            <filter id="currentLineGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {currentPoints.map((p, idx) => {
            if (idx === 0 || p.isBreak) return null;
            const prev = currentPoints[idx - 1];
            return (
              <line
                key={idx}
                x1={`${prev.x}%`}
                y1={`${prev.y}%`}
                x2={`${p.x}%`}
                y2={`${p.y}%`}
                stroke="#00ff41"
                strokeWidth="3"
                strokeDasharray="10,5"
                filter="url(#currentLineGlow)"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
