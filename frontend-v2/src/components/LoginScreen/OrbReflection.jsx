import React, { useState, useEffect, useRef } from 'react';
import { FEET_ANCHOR_PCT, USE_ANCHOR_OVERRIDES, ANCHOR_REFERENCE_PCT } from './loginScreenConfig';

/**
 * OrbReflection: Creates upward light reflections from the floor orb
 * onto the robot's legs, simulating light bouncing up from below.
 * When useAnchorOverrides: orb center is ANCHOR_REFERENCE_PCT.orbToPanelBottom above panel bottom (194px at 2048).
 */
export default function OrbReflection({
  sparkActive = false,
  panelBottomPct,
  useAnchorOverrides = USE_ANCHOR_OVERRIDES,
}) {
  const [time, setTime] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    let running = true;
    const animate = () => {
      if (!running || startTimeRef.current == null) return;
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setTime(elapsed);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const orbX = FEET_ANCHOR_PCT.x;
  const orbY =
    useAnchorOverrides && panelBottomPct != null
      ? panelBottomPct - ANCHOR_REFERENCE_PCT.orbToPanelBottom
      : FEET_ANCHOR_PCT.y;

  const baseOpacity = sparkActive ? 0.9 : 0.6;
  const pulseIntensity = 0.8 + Math.sin(time * 2) * 0.2;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 12, // Above body layer (10-11) to overlay on legs
        overflow: 'hidden',
        mixBlendMode: 'screen',
      }}
    >
      {/* Orb glow source */}
      <div
        style={{
          position: 'absolute',
          left: `${orbX - 8}%`,
          width: '16%',
          top: `${orbY - 4}%`,
          height: '10%',
          background: `
            radial-gradient(
              ellipse 100% 80% at 50% 50%,
              rgba(255, 255, 255, ${baseOpacity * 0.6 * pulseIntensity}) 0%,
              rgba(180, 255, 140, ${baseOpacity * 0.5 * pulseIntensity}) 20%,
              rgba(0, 255, 65, ${baseOpacity * 0.3 * pulseIntensity}) 50%,
              transparent 100%
            )
          `,
          filter: 'blur(4px)',
        }}
      />

      {/* Ambient upward rays */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          <linearGradient id="rayGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={`rgba(0, 255, 65, ${baseOpacity * 0.3 * pulseIntensity})`} />
            <stop offset="50%" stopColor={`rgba(0, 255, 65, ${baseOpacity * 0.1})`} />
            <stop offset="100%" stopColor="rgba(0, 255, 65, 0)" />
          </linearGradient>
          <filter id="rayBlur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        
        {/* Light rays from orb upward */}
        {[-15, -8, 0, 8, 15].map((angle, idx) => {
          const radians = (angle * Math.PI) / 180;
          const startX = orbX;
          const startY = orbY;
          const length = 40;
          const endX = orbX + Math.tan(radians) * length;
          const endY = orbY - length;
          const rayOpacity = (1 - Math.abs(angle) / 20) * pulseIntensity;
          
          return (
            <line
              key={idx}
              x1={`${startX}%`}
              y1={`${startY}%`}
              x2={`${endX}%`}
              y2={`${endY}%`}
              stroke={`rgba(0, 255, 65, ${baseOpacity * 0.15 * rayOpacity})`}
              strokeWidth="8"
              filter="url(#rayBlur)"
            />
          );
        })}
      </svg>

      {/* Floor reflection pool */}
      <div
        style={{
          position: 'absolute',
          left: '25%',
          right: '25%',
          bottom: '2%',
          height: '12%',
          background: `
            radial-gradient(
              ellipse 100% 60% at 50% 80%,
              rgba(0, 255, 65, ${baseOpacity * 0.25 * pulseIntensity}) 0%,
              rgba(180, 255, 120, ${baseOpacity * 0.15 * pulseIntensity}) 40%,
              transparent 80%
            )
          `,
        }}
      />

      {/* Feet/floor contact shadow */}
      <div
        style={{
          position: 'absolute',
          left: '26%',
          right: '26%',
          top: '86%',
          height: '8%',
          background: `radial-gradient(ellipse 100% 50% at 50% 50%,
            rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 35%,
            rgba(0,255,65,0.1) 65%, transparent 100%)`,
          filter: 'blur(4px)',
        }}
      />

      {/* Leg reflection (subtle upward green gradient) */}
      <div
        style={{
          position: 'absolute',
          left: '35%',
          right: '35%',
          top: '60%',
          height: '30%',
          background: `linear-gradient(to top,
            rgba(0,255,65,${baseOpacity * 0.12 * pulseIntensity}) 0%,
            rgba(0,255,65,${baseOpacity * 0.06 * pulseIntensity}) 40%,
            transparent 100%)`,
          filter: 'blur(8px)',
          borderRadius: '50%',
        }}
      />
    </div>
  );
}
