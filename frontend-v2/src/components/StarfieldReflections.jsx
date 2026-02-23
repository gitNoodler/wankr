import React, { useState, useEffect, useLayoutEffect } from 'react';

const REFLECTION_PLANE_Y = 0.45;
const REFLECTION_ZONE_TOP = 0.68;
const REFLECTION_ZONE_BOTTOM = 1.0;
const NUM_POINTS = 45;
const BASE_SIZE = 48;

function LightAura({ id, x, y, speed, intensity, delay, sizeScale, isSource }) {
  const [currentSpeed, setCurrentSpeed] = useState(speed);
  const minOp = 0.35 + intensity * 0.35;
  const maxOp = 0.75 + intensity * 0.4;
  const size = Math.round(BASE_SIZE * sizeScale);

  useEffect(() => {
    let timeoutId;
    const scheduleNext = () => {
      const nextSpeed = 0.6 + Math.random() * 2.9;
      const nextInterval = 3000 + Math.random() * 5000;
      setCurrentSpeed(nextSpeed);
      timeoutId = setTimeout(scheduleNext, nextInterval);
    };
    timeoutId = setTimeout(scheduleNext, 2000 + Math.random() * 4000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        pointerEvents: 'none',
        '--pulse-min': minOp,
        '--pulse-max': maxOp,
        animation: `auraPulse ${currentSpeed}s ease-in-out ${delay}s infinite`,
      }}
    >
      <svg width={size} height={size} viewBox="-24 -24 48 48">
        <defs>
          <linearGradient id={`starfield-${id}-h`} x1="0" y1="0.5" x2="1" y2="0.5">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="35%" stopColor={isSource ? 'rgba(180,220,120,0.4)' : 'rgba(255,180,120,0.35)'} />
            <stop offset="50%" stopColor={isSource ? 'rgba(255,255,200,0.7)' : 'rgba(255,220,180,0.6)'} />
            <stop offset="65%" stopColor={isSource ? 'rgba(180,220,120,0.4)' : 'rgba(255,180,120,0.35)'} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id={`starfield-${id}-v`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="35%" stopColor={isSource ? 'rgba(180,220,120,0.4)' : 'rgba(255,180,120,0.35)'} />
            <stop offset="50%" stopColor={isSource ? 'rgba(255,255,200,0.7)' : 'rgba(255,220,180,0.6)'} />
            <stop offset="65%" stopColor={isSource ? 'rgba(180,220,120,0.4)' : 'rgba(255,180,120,0.35)'} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <radialGradient id={`starfield-${id}-c`}>
            <stop offset="0%" stopColor={isSource ? 'rgba(255,255,240,0.9)' : 'rgba(255,245,220,0.85)'} />
            <stop offset="40%" stopColor={isSource ? 'rgba(220,255,180,0.5)' : 'rgba(255,220,160,0.45)'} />
            <stop offset="70%" stopColor={isSource ? 'rgba(140,200,100,0.2)' : 'rgba(255,180,100,0.18)'} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id={`starfield-${id}-blur`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#starfield-${id}-blur)`}>
          <rect x="-20" y="-5" width="40" height="10" rx="2" fill={`url(#starfield-${id}-h)`} />
          <rect x="-5" y="-20" width="10" height="40" rx="2" fill={`url(#starfield-${id}-v)`} />
          <circle cx="0" cy="0" r="6" fill={`url(#starfield-${id}-c)`} />
        </g>
      </svg>
    </div>
  );
}

function generatePoints() {
  const greens = [];
  for (let i = 0; i < NUM_POINTS; i++) {
    const x = 0.05 + Math.random() * 0.9;
    const y = Math.random() * REFLECTION_PLANE_Y;
    const speed = 0.8 + Math.random() * 2.5;
    const intensity = Math.random();
    const delay = Math.random() * speed;
    const sizeScale = 0.12 + Math.random() * 1.5;
    greens.push({ x, y, speed, intensity, delay, sizeScale });
  }
  const reds = greens
    .map((p) => ({
      ...p,
      y: 2 * REFLECTION_PLANE_Y - p.y,
    }))
    .filter((p) => p.y >= REFLECTION_ZONE_TOP && p.y <= REFLECTION_ZONE_BOTTOM);
  const excludeCenter = (p) => p.x < 0.35 || p.x > 0.65;
  return {
    greenPoints: greens.filter(excludeCenter),
    redPoints: reds.filter(excludeCenter),
  };
}

export default function StarfieldReflections() {
  const [points, setPoints] = useState(null);
  useLayoutEffect(() => {
    if (points === null) queueMicrotask(() => setPoints(generatePoints()));
  }, [points]);

  if (points === null) return null;

  const { greenPoints, redPoints } = points;

  return (
    <>
      {/* Base propagation – soft ambient fill so starfield light spreads across screen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 75% 55% at 20% 25%, rgba(180,220,140,0.02) 0%, transparent 50%),
            radial-gradient(ellipse 75% 55% at 80% 25%, rgba(180,220,140,0.02) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 70%, rgba(200,230,160,0.015) 0%, transparent 40%),
            linear-gradient(to bottom, rgba(180,255,130,0.02) 0%, rgba(180,255,130,0.015) 25%, rgba(180,255,130,0.015) 50%, rgba(180,255,130,0.015) 75%, rgba(180,255,130,0.02) 100%)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%',
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        {greenPoints.map((p, i) => (
          <LightAura
            key={`g-${i}`}
            id={`g-${i}`}
            x={p.x}
            y={p.y}
            speed={p.speed}
            intensity={p.intensity}
            delay={p.delay}
            sizeScale={p.sizeScale}
            isSource
          />
        ))}
        {redPoints.map((p, i) => (
          <LightAura
            key={`r-${i}`}
            id={`r-${i}`}
            x={p.x}
            y={p.y}
            speed={p.speed}
            intensity={p.intensity}
            delay={p.delay}
            sizeScale={p.sizeScale}
            isSource={false}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: `${REFLECTION_PLANE_Y * 100}%`,
            right: 0,
            height: 1,
            borderTop: '1px dashed rgba(255,255,255,0.3)',
          }}
        />
      </div>
      <style>{`
        @keyframes auraPulse {
          0%, 100% { transform: scale(0.85); opacity: var(--pulse-min, 0.6); }
          50%      { transform: scale(1.15); opacity: var(--pulse-max, 1); }
        }
      `}</style>
    </>
  );
}
