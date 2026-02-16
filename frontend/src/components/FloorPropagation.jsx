import React, { useState, useEffect, useRef, useMemo } from 'react';

/**
 * FloorPropagation: Creates depth and materialization effects across the entire screen.
 * - Smooth wave pulses that propagate from center outward
 * - Perspective-aware grid line glows spanning full height
 * - Surface shimmer effects that traverse all background strips
 * - Effects span from top to bottom of viewport
 */
export default function FloorPropagation({ sparkActive = false, glowPointVersion: _glowPointVersion = 0 }) {
  const [time, setTime] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(0);

  // Animation loop for smooth propagation
  useEffect(() => {
    startTimeRef.current = performance.now();
    let running = true;
    const animate = () => {
      if (!running) return;
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setTime(elapsed);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Configuration for full-screen effects
  const config = useMemo(() => ({
    vanishX: 50,  // % horizontal vanishing point (center)
    vanishY: 38,  // % vertical vanishing point (horizon)
  }), []);

  const baseOpacity = sparkActive ? 0.08 : 0.045;

  // Horizontal grid lines spanning full screen height
  const gridLines = useMemo(() => {
    const lines = [];
    // Lines moving downward from top
    for (let i = 0; i < 4; i++) {
      const cycleTime = 10 + i * 2;
      const phase = ((time / cycleTime) + i * 0.25) % 1;
      lines.push({
        y: phase * 100, // 0% to 100% of viewport
        opacity: Math.sin(phase * Math.PI) * 0.25,
        direction: 'down',
      });
    }
    // Lines moving upward from bottom
    for (let i = 0; i < 4; i++) {
      const cycleTime = 12 + i * 2;
      const phase = ((time / cycleTime) + i * 0.25) % 1;
      lines.push({
        y: 100 - phase * 100, // 100% to 0% of viewport
        opacity: Math.sin(phase * Math.PI) * 0.25,
        direction: 'up',
      });
    }
    return lines;
  }, [time]);

  // Surface shimmer (left-right traverse) - full height
  const shimmerPhase = useMemo(() => {
    const cycleTime = 6;
    return ((time / cycleTime) % 1) * 200 - 50; // -50% to 150%
  }, [time]);

  // Vertical shimmer (top-bottom traverse)
  const verticalShimmerPhase = useMemo(() => {
    const cycleTime = 8;
    return ((time / cycleTime) % 1) * 200 - 50;
  }, [time]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2.03,
        overflow: 'hidden',
      }}
    >
      {/* Horizontal grid line traversals - full screen height */}
      {gridLines.map((line, idx) => (
        <div
          key={`grid-${idx}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${line.y}%`,
            height: '1px',
            background: `linear-gradient(
              to right,
              rgba(0, 255, 65, ${line.opacity * 0.4}) 0%,
              rgba(0, 255, 65, ${line.opacity * 0.2}) 15%,
              rgba(180, 255, 120, ${line.opacity * 0.5}) 50%,
              rgba(0, 255, 65, ${line.opacity * 0.2}) 85%,
              rgba(0, 255, 65, ${line.opacity * 0.4}) 100%
            )`,
            boxShadow: `0 0 12px rgba(0, 255, 65, ${line.opacity * 0.3})`,
            opacity: line.opacity > 0.05 ? 1 : 0,
          }}
        />
      ))}

      {/* Vertical edge lines with pulsing */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {/* Radiating lines from vanishing point - both up and down */}
        {[-50, -35, -20, -10, 0, 10, 20, 35, 50].map((angle, idx) => {
          const radians = (angle * Math.PI) / 180;
          const startX = config.vanishX;
          const startY = config.vanishY;
          // Lines going down
          const endXDown = config.vanishX + Math.tan(radians) * 80;
          const endYDown = 100;
          // Lines going up
          const endXUp = config.vanishX - Math.tan(radians) * 50;
          const endYUp = 0;
          const pulseOffset = ((time / 5) + idx * 0.1) % 1;
          const lineOpacity = baseOpacity * (0.25 + Math.sin(pulseOffset * Math.PI * 2) * 0.15);
          
          return (
            <g key={`vline-${idx}`}>
              {/* Line going down */}
              <line
                x1={`${startX}%`}
                y1={`${startY}%`}
                x2={`${Math.max(0, Math.min(100, endXDown))}%`}
                y2={`${endYDown}%`}
                stroke={`rgba(0, 255, 65, ${lineOpacity})`}
                strokeWidth="1"
                style={{
                  filter: `drop-shadow(0 0 4px rgba(0, 255, 65, ${lineOpacity * 0.4}))`,
                }}
              />
              {/* Line going up */}
              <line
                x1={`${startX}%`}
                y1={`${startY}%`}
                x2={`${Math.max(0, Math.min(100, endXUp))}%`}
                y2={`${endYUp}%`}
                stroke={`rgba(0, 255, 65, ${lineOpacity * 0.6})`}
                strokeWidth="1"
                style={{
                  filter: `drop-shadow(0 0 4px rgba(0, 255, 65, ${lineOpacity * 0.3}))`,
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Horizontal shimmer effect - full screen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(
              90deg,
              transparent ${shimmerPhase - 25}%,
              rgba(180, 255, 140, ${baseOpacity * 0.3}) ${shimmerPhase - 8}%,
              rgba(200, 255, 180, ${baseOpacity * 0.6}) ${shimmerPhase}%,
              rgba(180, 255, 140, ${baseOpacity * 0.3}) ${shimmerPhase + 8}%,
              transparent ${shimmerPhase + 25}%
            )
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* Vertical shimmer effect - full screen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(
              180deg,
              transparent ${verticalShimmerPhase - 30}%,
              rgba(180, 255, 140, ${baseOpacity * 0.25}) ${verticalShimmerPhase - 10}%,
              rgba(200, 255, 180, ${baseOpacity * 0.5}) ${verticalShimmerPhase}%,
              rgba(180, 255, 140, ${baseOpacity * 0.25}) ${verticalShimmerPhase + 10}%,
              transparent ${verticalShimmerPhase + 30}%
            )
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* Left strip enhancement - full height */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '20%',
          height: '100%',
          background: `
            linear-gradient(
              to right,
              rgba(0, 255, 65, ${baseOpacity * 0.5}) 0%,
              rgba(0, 255, 65, ${baseOpacity * 0.25}) 40%,
              transparent 100%
            )
          `,
          opacity: 0.6 + Math.sin(time * 0.4) * 0.2,
        }}
      />

      {/* Right strip enhancement - full height */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '20%',
          height: '100%',
          background: `
            linear-gradient(
              to left,
              rgba(0, 255, 65, ${baseOpacity * 0.5}) 0%,
              rgba(0, 255, 65, ${baseOpacity * 0.25}) 40%,
              transparent 100%
            )
          `,
          opacity: 0.6 + Math.sin(time * 0.4 + Math.PI) * 0.2,
        }}
      />

      {/* Top strip enhancement */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '15%',
          background: `
            linear-gradient(
              to bottom,
              rgba(0, 255, 65, ${baseOpacity * 0.4}) 0%,
              rgba(0, 255, 65, ${baseOpacity * 0.2}) 50%,
              transparent 100%
            )
          `,
          opacity: 0.5 + Math.sin(time * 0.6 + Math.PI / 2) * 0.15,
        }}
      />

      {/* Bottom strip enhancement */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '20%',
          background: `
            linear-gradient(
              to top,
              rgba(0, 255, 65, ${baseOpacity * 0.6}) 0%,
              rgba(0, 255, 65, ${baseOpacity * 0.3}) 50%,
              transparent 100%
            )
          `,
          opacity: 0.6 + Math.sin(time * 0.5) * 0.2,
        }}
      />

      {/* Corner vignette pulses */}
      {[
        { left: 0, top: 0, origin: 'top left' },
        { right: 0, top: 0, origin: 'top right' },
        { left: 0, bottom: 0, origin: 'bottom left' },
        { right: 0, bottom: 0, origin: 'bottom right' },
      ].map((corner, idx) => (
        <div
          key={`corner-${idx}`}
          style={{
            position: 'absolute',
            ...corner,
            width: '35%',
            height: '35%',
            background: `
              radial-gradient(
                ellipse 100% 100% at ${corner.origin},
                rgba(0, 255, 65, ${baseOpacity * 0.4}) 0%,
                rgba(0, 255, 65, ${baseOpacity * 0.15}) 40%,
                transparent 70%
              )
            `,
            opacity: 0.4 + Math.sin(time * 0.3 + idx * Math.PI / 2) * 0.2,
          }}
        />
      ))}
    </div>
  );
}
