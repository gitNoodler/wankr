import React, { forwardRef, useEffect } from 'react';
import useKickDetector from './useKickDetector';

/* ── Cropped layer images served from public/images/boombox/ ────────── */
const IMG = '/images/boombox/';

/* ── Layer manifest (from Python crop — pixel coords in 1536×1024 canvas) ── */
const CANVAS = { w: 1536, h: 1024 };

const LAYERS = {
  boombox_base: { file: 'boombox_base.png', x: 1184, y: 409, w: 352, h: 311 },
  subLeft_1:    { file: 'subLeft_1.png',    x: 1239, y: 564, w: 37,  h: 39  },
  subLeft_2:    { file: 'subLeft_2.png',    x: 1207, y: 533, w: 89,  h: 102 },
  subLeft_3:    { file: 'subLeft_3.png',    x: 1203, y: 521, w: 101, h: 127 },
  subLeft_4:    { file: 'subLeft_4.png',    x: 1197, y: 512, w: 115, h: 143 },
  subRight_1:   { file: 'subRight_1.png',   x: 1451, y: 589, w: 51,  h: 52  },
  subRight_2:   { file: 'subRight_2.png',   x: 1412, y: 549, w: 124, h: 135 },
  subRight_3:   { file: 'subRight_3.png',   x: 1403, y: 538, w: 133, h: 156 },
  subRight_4:   { file: 'subRight_4.png',   x: 1395, y: 533, w: 141, h: 168 },
  musicNote_1:  { file: 'musicNote_1.png',  x: 1231, y: 316, w: 149, h: 134 },
  musicNote_2:  { file: 'musicNote_2.png',  x: 1382, y: 340, w: 103, h: 113 },
  sparkles:     { file: 'sparkles.png',     x: 1071, y: 337, w: 364, h: 121 },
  reflection:   { file: 'boombox_reflection.png', x: 1201, y: 666, w: 335, h: 203 },
};

/* Convert canvas px → percentage of the full 1536×1024 image */
const canvasPct = (layer) => ({
  left:   (layer.x / CANVAS.w * 100).toFixed(3) + '%',
  top:    (layer.y / CANVAS.h * 100).toFixed(3) + '%',
  width:  (layer.w / CANVAS.w * 100).toFixed(3) + '%',
  height: (layer.h / CANVAS.h * 100).toFixed(3) + '%',
});

const SUB_LEFT_RINGS  = [LAYERS.subLeft_1, LAYERS.subLeft_2, LAYERS.subLeft_3, LAYERS.subLeft_4];
const SUB_RIGHT_RINGS = [LAYERS.subRight_1, LAYERS.subRight_2, LAYERS.subRight_3, LAYERS.subRight_4];


/* ── Inline keyframes (injected once) ───────────────────────────────── */
/* boomboxFadeIn lives in LoginScreen.css with perspective transforms   */
const KEYFRAMES = `
@keyframes noteFloat1 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.85; }
  25%      { transform: translate(6px, -10px) rotate(5deg); opacity: 1; }
  50%      { transform: translate(-3px, -18px) rotate(-3deg); opacity: 0.9; }
  75%      { transform: translate(8px, -8px) rotate(4deg); opacity: 1; }
}
@keyframes noteFloat2 {
  0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
  30%      { transform: translate(-8px, -12px) rotate(-6deg); opacity: 1; }
  60%      { transform: translate(4px, -20px) rotate(4deg); opacity: 0.85; }
  80%      { transform: translate(-5px, -6px) rotate(-2deg); opacity: 1; }
}
@keyframes sparkleShimmer {
  0%, 100% { opacity: 0.5; filter: brightness(1); }
  50%      { opacity: 1;   filter: brightness(1.6); }
}
`;
let injected = false;
function injectKeyframes() {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = KEYFRAMES;
  document.head.appendChild(s);
}

/* ── Sub Layer — a single subwoofer ring image ──────────────────────── */
function SubLayer({ layer, kick, ringIndex, totalRings }) {
  const fraction = 1 - ringIndex / totalRings;
  const scaleAmount = kick * 0.22 * fraction;
  const scale = 1 + scaleAmount;

  const pos = canvasPct(layer);
  return (
    <img
      src={IMG + layer.file}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        ...pos,
        transform: `scale(${scale})`,
        transition: kick > 0.3 ? 'transform 0.04s ease-out' : 'transform 0.12s ease-out',
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    />
  );
}


/* ── Main Boombox Component ─────────────────────────────────────────── *
 * This component is an OVERLAY that covers the same area as the base   *
 * loginScreen.png image. Each layer is positioned using canvas-relative *
 * percentages so they land exactly where they belong in the scene.     *
 *                                                                       *
 * The parent must render this with the same container that holds the    *
 * base image (position: absolute, inset: 0) and matching object-fit.   */
const Boombox = forwardRef(function Boombox({ playing, onToggle, getAudio }, ref) {
  const { kick, connect } = useKickDetector();

  useEffect(injectKeyframes, []);

  /* Wire up the audio analyser when music starts playing */
  useEffect(() => {
    if (playing && getAudio) {
      try {
        const audioEl = getAudio();
        if (audioEl) connect(audioEl);
      } catch { /* audio not ready yet */ }
    }
  }, [playing, getAudio, connect]);

  /* Kick-reactive glow */
  const glowIntensity = Math.min(1, kick * 1.5);
  const glowRadius = 12 + glowIntensity * 20;
  const glowOpacity = 0.15 + glowIntensity * 0.3;

  return (
    <div
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      style={{
        /* Same container as the base image — fills parent, aspect-aware */
        position: 'absolute',
        inset: 0,
        /* Mimic object-fit:contain by centering a 1536:1024 aspect box */
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25,  /* Above arm overlays (z18) */
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      title={playing ? 'Click to stop music' : 'Click to play music'}
    >
      {/* Inner box maintains the same aspect ratio as the image canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          maxWidth: `calc(100vh * ${CANVAS.w / CANVAS.h})`,
          maxHeight: `calc(100vw * ${CANVAS.h / CANVAS.w})`,
          /* This box now matches exactly where loginScreen.png renders */
          pointerEvents: 'none',
        }}
      >
        {/* ── Boombox base body ─────────────────────────────────────── */}
        <img
          src={IMG + LAYERS.boombox_base.file}
          alt="Boombox"
          draggable={false}
          style={{
            position: 'absolute',
            ...canvasPct(LAYERS.boombox_base),
            filter: `drop-shadow(0 0 ${glowRadius}px rgba(0,255,65,${glowOpacity}))`,
            transition: 'filter 0.08s ease-out',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        />

        {/* ── Left subwoofer rings (outer → inner for z-order) ──────── */}
        {[...SUB_LEFT_RINGS].reverse().map((ring, i) => (
          <SubLayer
            key={ring.file}
            layer={ring}
            kick={kick}
            ringIndex={SUB_LEFT_RINGS.length - 1 - i}
            totalRings={SUB_LEFT_RINGS.length}
          />
        ))}

        {/* ── Right subwoofer rings (outer → inner for z-order) ─────── */}
        {[...SUB_RIGHT_RINGS].reverse().map((ring, i) => (
          <SubLayer
            key={ring.file}
            layer={ring}
            kick={kick}
            ringIndex={SUB_RIGHT_RINGS.length - 1 - i}
            totalRings={SUB_RIGHT_RINGS.length}
          />
        ))}

        {/* ── Music notes — float when playing ─────────────────────── */}
        <img
          src={IMG + LAYERS.musicNote_1.file}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            ...canvasPct(LAYERS.musicNote_1),
            animation: playing ? 'noteFloat1 2.8s ease-in-out infinite' : 'none',
            opacity: playing ? undefined : 0.5,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}
        />
        <img
          src={IMG + LAYERS.musicNote_2.file}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            ...canvasPct(LAYERS.musicNote_2),
            animation: playing ? 'noteFloat2 3.4s ease-in-out infinite 0.3s' : 'none',
            opacity: playing ? undefined : 0.5,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}
        />

        {/* ── Sparkles — shimmer when playing ───────────────────────── */}
        <img
          src={IMG + LAYERS.sparkles.file}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            ...canvasPct(LAYERS.sparkles),
            animation: playing ? 'sparkleShimmer 1.5s ease-in-out infinite' : 'none',
            opacity: playing ? undefined : 0.3,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}
        />

        {/* ── Floor reflection subs (kick-reactive) ──────────────────
          * The reflection tile now contains ONLY the sub speaker
          * reflections. Scale it on kick so they pulse with the beat.
          * Position is kept exactly as the user placed it in Affinity.
          * ──────────────────────────────────────────────────────────── */}
        <img
          src={IMG + LAYERS.reflection.file}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            ...canvasPct(LAYERS.reflection),
            transform: `scale(${1 + kick * 0.06})`,
            transition: kick > 0.3
              ? 'transform 0.04s ease-out, filter 0.04s ease-out'
              : 'transform 0.12s ease-out, filter 0.12s ease-out',
            filter: `brightness(${0.85 + glowIntensity * 0.4})`,
            willChange: 'transform, filter',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
});

export default Boombox;
