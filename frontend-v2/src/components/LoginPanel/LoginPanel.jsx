import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { login, register, checkUsername } from '../../services/authService';
import { useResponsive } from '../../hooks/useResponsive';
import WalletLoginSection from './WalletLoginSection';

/*
 * Login panel — viewport-origin positioning.
 * Confirmed values from reference-image alignment (2026-03-01).
 * See: memory/login-panel-specs.md
 */
const PANEL = { left: 39.5, top: 41.3, width: 21.4, height: 21.5 };

// Canvas-space rects — ensures these elements scale identically to robot layers
const PANEL_CANVAS = { x: 794.6, y: 563.8, w: 467.3, h: 293.5 };

// Arm unit offsets — dx/dy as fraction of panel width/height, scale around panel center.
// Set DEV_DRAG = true, drag to position, copy logged values here, set DEV_DRAG = false.
const DEV_DRAG = false;
const LEFT_UNIT  = { dx: 0.1076, dy: 0.0395, scale: 1.0 };
const RIGHT_UNIT = { dx: -0.1221, dy: 0.0527, scale: 1.0 };

// Boombox+woofers transform — user-confirmed 2026-03-01
const BOOM = {
  perspective: 1200,
  rotateY: 6.1,
  rotate: -3.8,       // confirmed
  translateX: 12.9,    // confirmed
  translateY: 13.7,    // confirmed
};

// Build boombox transform with optional sidebar slide.
function getBoomTransform(sidebarPx = 0) {
  let t = `perspective(${BOOM.perspective}px) rotateY(${BOOM.rotateY}deg) rotate(${BOOM.rotate}deg) translateX(${BOOM.translateX}%) translateY(${BOOM.translateY}%)`;
  if (sidebarPx > 0) {
    t += ` translateX(-${sidebarPx}px)`;
  }
  return t;
}


// Index finger tap — rest = identity = finger ON panel.
// Animation: curl back along arc, then snap to rest = the TAP.
// User-confirmed values from debug tuning (2026-03-02).
const KNUCKLE = {
  left: {
    baseCx: 22.5, baseCy: 30.4,   // palm-base connection (base pivot)
    mag: 30, dir: 143, arc: 0.35, // recoil: 30px at 143° with arc curvature
    pinCx: 24.5, pinCy: 30.6,     // mid-joint pin (tuned +0.7)
  },
  right: {
    baseCx: 44.7, baseCy: 31.5,   // palm-base connection
    mag: 30, dir: 37, arc: -0.35, // mirrored: 37° (upper-right), arc inverted
    restX: 50, restY: 25,         // user-confirmed rest offset (px)
  },
};
const IMG_W = 2048, IMG_H = 1365;
// Contain-fit scale when tissue/magazine px offsets were tuned (2560×1440 display)
const TISSUE_REF_S = 0.96;
// Panel reference size — internal render dimensions; CSS zoom scales to contain-fit
const PANEL_REF_W = 493;
const PANEL_REF_H = 310;

// --- Audio analysis (module-level, survives mount/unmount & HMR) ---
function ensureAnalyser(audioElement) {
  if (!audioElement) return null;
  if (audioElement._wankrAnalyser) return audioElement._wankrAnalyser;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaElementSource(audioElement);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.15;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioElement._wankrCtx = ctx;
    audioElement._wankrAnalyser = analyser;
    return analyser;
  } catch (e) {
    console.warn('Analyser setup:', e.message);
    return null;
  }
}

export default function LoginPanel({ onLogin, onSpectate, getAudio, sidebarOffset = 0 }) {
  const { isMobile } = useResponsive();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [walletUsername, setWalletUsername] = useState(false);
  const checkTimer = useRef(null);
  const panelRef = useRef(null);
  const leftBackRef = useRef(null);
  const leftFrontRef = useRef(null);
  const rightBackRef = useRef(null);
  const rightFrontRef = useRef(null);
  const unitRef = useRef(null); // stores pcx, pcy, l, r for animation pivot adjustment
  // Live drag state — shared between resize handler and drag handler so resize doesn't reset drag
  const liveCfgRef = useRef({ l: { ...LEFT_UNIT }, r: { ...RIGHT_UNIT } });
  const devOverlayRef = useRef(null); // DOM element for on-screen readout (no React state to avoid re-renders)
  const bodyRef = useRef(null);
  const feetCanvasRef = useRef(null);
  const shinsCanvasRef = useRef(null);
  const thighsCanvasRef = useRef(null);
  const headFrameRef = useRef(null);
  const headFaceRef = useRef(null);
  const headImgsRef = useRef({ faces: null, loaded: false });
  const wooferRef = useRef(null);
  const wooferReflRef = useRef(null);
  const rafRef = useRef(null);
  const kickRef = useRef(0);
  const hihatRef = useRef(0);

  // Mobile scene zoom state
  const [mobileZoomed, setMobileZoomed] = useState(false);
  const [mobileZoomXf, setMobileZoomXf] = useState(null);

  const calcMobileZoom = useCallback(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const imgAspect = IMG_W / IMG_H;
    const scrAspect = vw / vh;
    let contentW, contentH, contentX, contentY;
    if (scrAspect > imgAspect) {
      contentH = vh; contentW = vh * imgAspect;
      contentX = (vw - contentW) / 2; contentY = 0;
    } else {
      contentW = vw; contentH = vw / imgAspect;
      contentX = 0; contentY = (vh - contentH) / 2;
    }
    const pw = (PANEL_CANVAS.w / IMG_W) * contentW;
    const ph = (PANEL_CANVAS.h / IMG_H) * contentH;
    const px = contentX + (PANEL_CANVAS.x / IMG_W) * contentW;
    const py = contentY + (PANEL_CANVAS.y / IMG_H) * contentH;
    const s = (vw * 0.92) / pw;
    const tx = vw / 2 - (px + pw / 2) * s;
    const ty = vh / 2 - (py + ph / 2) * s;
    return { s, tx, ty };
  }, []);

  const handleMobileZoomIn = useCallback(() => {
    setMobileZoomXf(calcMobileZoom());
    setMobileZoomed(true);
  }, [calcMobileZoom]);

  const handleMobileZoomOut = useCallback(() => {
    setMobileZoomed(false);
  }, []);

  // Recalculate zoom on resize/rotation while zoomed
  useEffect(() => {
    if (!isMobile || !mobileZoomed) return;
    const onResize = () => setMobileZoomXf(calcMobileZoom());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobile, mobileZoomed, calcMobileZoom]);

  // Finger tap + leg bounce state
  const fingerRefs = useRef({ leftBase: null, leftTip: null, right: null });
  const shuffleRefs = useRef({ lMid: null, lRing: null, lPinky: null, rMid: null, rRing: null, rPinky: null });
  const tapState = useRef({
    // Session timing
    sessionActive: false,
    sessionEnd: 0,
    lastSessionEnd: 0,
    nextCooldown: 6000,   // first session after 6s warmup
    // Per-finger spring state (0=on panel, 1=fully lifted)
    leftT: 0, rightT: 0,
    leftSnapTime: 0, rightSnapTime: 0,
    // Kick prediction for left index anticipation
    lastKickTime: 0,
    kickInterval: 500,
    // Energy: smoothed overall level (no fast/slow split — just one tracker)
    energy: 0,
    // Body + leg joints
    legSquash: 0,
    kneeAngle: 0,
    ankleAngle: 0,
    // Head bob + blink
    headBob: 0,
    blinkUntil: 0,
    nextBlink: 2000 + Math.random() * 3000,
    winkUntil: 0,
    nextWink: 12000 + Math.random() * 18000,
    faceDirty: true,
    browRaise: 0,
    rBrowRotate: 0,
  });

  // Lock panel + arm units to robot contain-fit scaling
  // useLayoutEffect prevents 1-frame flash of CSS position before JS override
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (isMobile) {
      el.style.left = ''; el.style.top = '';
      el.style.width = ''; el.style.height = '';
      el.style.zoom = '';
      return;
    }
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight;
      // Always scale by height — matches contain in landscape, cover in portrait
      const s = h / IMG_H;
      const oX = (w - IMG_W * s) / 2; // positive in landscape, negative in portrait
      const oY = 0;
      // Scale for tissue/magazine proportional positioning
      document.documentElement.style.setProperty('--fit-s', s / TISSUE_REF_S);
      // Panel
      const pe = panelRef.current;
      if (pe) {
        const zoom = (PANEL_CANVAS.w * s) / PANEL_REF_W;
        pe.style.left   = ((PANEL_CANVAS.x * s + oX) / zoom) + 'px';
        pe.style.top    = ((PANEL_CANVAS.y * s + oY) / zoom) + 'px';
        pe.style.width  = PANEL_REF_W + 'px';
        pe.style.height = PANEL_REF_H + 'px';
        pe.style.zoom   = zoom;
      }
      // Panel center for arm unit transforms
      const pw = PANEL_CANVAS.w * s, ph = PANEL_CANVAS.h * s;
      const pcx = PANEL_CANVAS.x * s + oX + pw / 2;
      const pcy = PANEL_CANVAS.y * s + oY + ph / 2;
      // Read live config (preserves drag state across resizes)
      const lCfg = liveCfgRef.current.l;
      const rCfg = liveCfgRef.current.r;
      // Store for animation loop pivot adjustment
      unitRef.current = {
        pcx, pcy,
        l: { tx: lCfg.dx * pw, ty: lCfg.dy * ph, s: lCfg.scale },
        r: { tx: rCfg.dx * pw, ty: rCfg.dy * ph, s: rCfg.scale },
      };
      // Position arm units (back + front halves get same transform)
      const leftRefs = [leftBackRef, leftFrontRef];
      const rightRefs = [rightBackRef, rightFrontRef];
      for (const [refs, u] of [[leftRefs, lCfg], [rightRefs, rCfg]]) {
        const origin = `${pcx}px ${pcy}px`;
        const xform = `translate(${u.dx * pw}px, ${u.dy * ph}px) scale(${u.scale})`;
        for (const ref of refs) {
          const e = ref.current;
          if (!e) continue;
          e.style.transformOrigin = origin;
          e.style.transform = xform;
        }
      }
    };
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      document.documentElement.style.removeProperty('--fit-s');
    };
  }, [isMobile]);

  // Resume AudioContext on first user gesture
  useEffect(() => {
    const resume = () => {
      const audio = getAudio?.();
      if (audio?._wankrCtx?.state === 'suspended') {
        audio._wankrCtx.resume().catch(() => {});
      }
    };
    document.addEventListener('click', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
    return () => {
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
  }, [getAudio]);

  // Composite leg segments into 3 joint-group canvases (feet / shins+knees / thighs)
  useEffect(() => {
    if (isMobile) return; // skip heavy canvas work on mobile
    const groups = [
      { ref: feetCanvasRef, srcs: ['/legs_leftFoot.png', '/legs_rightFoot.png'] },
      { ref: shinsCanvasRef, srcs: ['/legs_leftShin.png', '/legs_leftKnee.png', '/legs_rightShin.png', '/legs_rightKnee.png'] },
      { ref: thighsCanvasRef, srcs: ['/legs_bodyConnection.png', '/legs_leftThigh.png', '/legs_rightThigh.png'] },
    ];
    for (const g of groups) {
      const canvas = g.ref.current;
      if (!canvas) continue;
      canvas.width = IMG_W;
      canvas.height = IMG_H;
      const ctx = canvas.getContext('2d');
      let loaded = 0;
      const imgs = g.srcs.map(src => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          loaded++;
          if (loaded === g.srcs.length) {
            ctx.clearRect(0, 0, IMG_W, IMG_H);
            for (const im of imgs) ctx.drawImage(im, 0, 0, IMG_W, IMG_H);
          }
        };
        return img;
      });
    }

    // Head frame: outer shell + blank screen (static)
    const frameCanvas = headFrameRef.current;
    if (frameCanvas) {
      frameCanvas.width = IMG_W;
      frameCanvas.height = IMG_H;
      const fCtx = frameCanvas.getContext('2d');
      const frameSrcs = ['/head_blankScreen.png', '/head_outer.png'];
      let fLoaded = 0;
      const fImgs = frameSrcs.map(src => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          fLoaded++;
          if (fLoaded === frameSrcs.length) {
            fCtx.clearRect(0, 0, IMG_W, IMG_H);
            for (const im of fImgs) fCtx.drawImage(im, 0, 0, IMG_W, IMG_H);
          }
        };
        return img;
      });
    }

    // Head face: load individual features for independent eye/mouth control
    const faceCanvas = headFaceRef.current;
    if (faceCanvas) {
      faceCanvas.width = IMG_W;
      faceCanvas.height = IMG_H;
      const faceSrcs = {
        leftEye: '/head__leftEye.png',
        leftBrow: '/head__leftBrow.png',
        rightEyeOpen: '/head__rightEye_open.png',
        rightEyeClosed: '/head__rightEye_closed.png',
        rightBrow: '/head__rightBrow.png',
        mouthOpen: '/head__mouth.png',
        mouthClosed: '/head__mouth_closed.png',
        blink: '/head_facelayer_Blink.png',
      };
      const keys = Object.keys(faceSrcs);
      let faceLoaded = 0;
      const faceImgs = {};
      for (const key of keys) {
        const img = new Image();
        img.src = faceSrcs[key];
        img.onload = () => {
          faceLoaded++;
          if (faceLoaded === keys.length) {
            headImgsRef.current = { faces: faceImgs, loaded: true };
            // Trigger initial draw
            tapState.current.faceDirty = true;
          }
        };
        faceImgs[key] = img;
      }
    }
  }, [isMobile]);

  // Woofer kick-reactive animation loop
  useEffect(() => {
    if (isMobile) return; // skip animation on mobile — saves CPU
    if (!getAudio) return;
    let cancelled = false;

    const startLoop = () => {
      const audio = getAudio();
      const analyser = ensureAnalyser(audio);
      if (!analyser || cancelled) return;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (cancelled) return;
        analyser.getByteFrequencyData(data);
        // Kick envelope: bins 1-3 (~43-172Hz)
        const rawKick = (data[1] + data[2] + data[3]) / 3 / 255;
        const wasKickQuiet = kickRef.current < 0.12;
        if (rawKick > kickRef.current) {
          kickRef.current = rawKick;
        } else {
          kickRef.current *= 0.82; // faster decay = quicker re-arm for next beat
        }
        const k = kickRef.current;
        const isKick = wasKickQuiet && k > 0.25;

        // Hi-hat envelope: bins 100-180 (~4.3-7.7kHz — sizzle/attack range)
        let hihatSum = 0;
        for (let i = 100; i <= 180; i++) hihatSum += data[i];
        const rawHihat = hihatSum / 81 / 255;
        const wasHihatQuiet = hihatRef.current < 0.08;
        if (rawHihat > hihatRef.current) {
          hihatRef.current = rawHihat;
        } else {
          hihatRef.current *= 0.65; // faster decay — re-arm quickly for next hit
        }
        const isHihat = wasHihatQuiet && hihatRef.current > 0.20;

        // Overall energy: sum of all bins for intensity tracking
        let totalEnergy = 0;
        for (let i = 1; i < 200; i++) totalEnergy += data[i];
        totalEnergy = totalEnergy / 199 / 255;
        const dist = k * 0.6;
        const tx = -dist;
        const ty = dist * 0.18;
        const s = 1 + k * 0.005;
        const b = 1 + k * 0.5;
        const g1 = k * 24;
        const g2 = k * 50;
        const g3 = k * 10;
        const wTransform = `translate(${tx}%, ${ty}%) scale(${s})`;
        const wFilter = `brightness(${b}) drop-shadow(0 0 ${g1}px rgba(0, 255, 65, ${(k * 0.7).toFixed(2)})) drop-shadow(0 0 ${g2}px rgba(0, 255, 65, ${(k * 0.3).toFixed(2)})) drop-shadow(0 0 ${g3}px rgba(255, 255, 255, ${(k * 0.5).toFixed(2)}))`;
        if (wooferRef.current) {
          if (k < 0.01) {
            wooferRef.current.style.transform = '';
            wooferRef.current.style.filter = '';
          } else {
            wooferRef.current.style.transform = wTransform;
            wooferRef.current.style.filter = wFilter;
          }
        }
        if (wooferReflRef.current) {
          const rk = k * 0.4;
          if (rk < 0.01) {
            wooferReflRef.current.style.transform = '';
            wooferReflRef.current.style.filter = '';
          } else {
            const rDist = rk * 0.3;
            const rS = 1 + rk * 0.003;
            const rB = 1 + k * 1.2;
            const rG1 = k * 30;
            const rG2 = k * 60;
            const rTransform = `translate(${-rDist}%, ${rDist * 0.18}%) scale(${rS})`;
            const rFilter = `brightness(${rB}) drop-shadow(0 0 ${rG1}px rgba(0, 255, 65, ${(k * 0.7).toFixed(2)})) drop-shadow(0 0 ${rG2}px rgba(0, 255, 65, ${(k * 0.3).toFixed(2)}))`;
            wooferReflRef.current.style.transform = rTransform;
            wooferReflRef.current.style.filter = rFilter;
          }
        }

        // --- State + timing ---
        const ts = tapState.current;
        const now = performance.now();
        ts.energy += (totalEnergy - ts.energy) * 0.01;

        // --- Body bounce: feet planted on grid, whole robot absorbs beat ---
        {
          const body = bodyRef.current;
          if (body) {
            const squashTarget = k > 0.15 ? k * 0.012 : 0;
            ts.legSquash += (squashTarget - ts.legSquash) * 0.1;
            if (ts.legSquash < 0.0003) ts.legSquash = 0;
            const sec = now / 1000;
            const idle = Math.sin(sec * 0.5) * 0.0015;
            const sy = 1 - ts.legSquash + idle;
            body.style.transform = `scaleY(${sy.toFixed(4)})`;
          }
        }

        // --- Leg joints: knee bend + ankle rotation for organic bounce ---
        {
          // Knee: thighs tilt forward on kick
          const kneeTarget = k > 0.15 ? k * 3 : 0;
          ts.kneeAngle += (kneeTarget - ts.kneeAngle) * 0.12;
          if (Math.abs(ts.kneeAngle) < 0.01) ts.kneeAngle = 0;

          // Ankle: shins rotate slightly less
          const ankleTarget = k > 0.15 ? k * 1.5 : 0;
          ts.ankleAngle += (ankleTarget - ts.ankleAngle) * 0.1;
          if (Math.abs(ts.ankleAngle) < 0.01) ts.ankleAngle = 0;

          const thighEl = thighsCanvasRef.current;
          if (thighEl) {
            thighEl.style.transform = ts.kneeAngle > 0.01
              ? `rotate(${ts.kneeAngle.toFixed(2)}deg)` : '';
          }
          const shinEl = shinsCanvasRef.current;
          if (shinEl) {
            shinEl.style.transform = ts.ankleAngle > 0.01
              ? `rotate(${ts.ankleAngle.toFixed(2)}deg)` : '';
          }

        }

        // --- Head bob: natural nod on quarter notes (kicks) ---
        {
          // Apply same transform to both frame and face canvases
          const bobTarget = k > 0.1 ? k * 3 : 0;
          ts.headBob += (bobTarget - ts.headBob) * 0.18;
          if (ts.headBob < 0.01) ts.headBob = 0;
          const sec = now / 1000;
          const idle = Math.sin(sec * 0.6) * 0.15;
          const angle = ts.headBob + idle;
          const ty = ts.headBob * 0.6;
          const headTransform = (Math.abs(angle) > 0.01 || Math.abs(ty) > 0.01)
            ? `rotate(${angle.toFixed(2)}deg) translateY(${ty.toFixed(1)}px)` : '';
          if (headFrameRef.current) headFrameRef.current.style.transform = headTransform;
          if (headFaceRef.current) headFaceRef.current.style.transform = headTransform;
        }

        // --- Face state: eyes (normal/blink/wink) + mouth (open/closed) ---
        {
          const hi = headImgsRef.current;
          const faceCanvas = headFaceRef.current;
          if (hi.loaded && faceCanvas) {
            const f = hi.faces;
            // Eye state: 'normal' | 'blink' | 'wink'
            let eyeState = ts._eyeState || 'normal';

            // Wink: occasional, held 1.5-3s
            if (eyeState === 'normal' && now > ts.nextWink) {
              eyeState = 'wink';
              ts.winkUntil = now + 1500 + Math.random() * 1500;
              ts.faceDirty = true;
            }
            if (eyeState === 'wink' && now > ts.winkUntil) {
              eyeState = 'normal';
              ts.nextWink = now + 15000 + Math.random() * 20000;
              ts.faceDirty = true;
            }

            // Blink: quick, doesn't happen during wink
            if (eyeState === 'normal' && now > ts.nextBlink) {
              eyeState = 'blink';
              ts.blinkUntil = now + 120 + Math.random() * 60;
              ts.faceDirty = true;
            }
            if (eyeState === 'blink' && now > ts.blinkUntil) {
              eyeState = 'normal';
              ts.nextBlink = now + 2500 + Math.random() * 4000;
              ts.faceDirty = true;
            }
            ts._eyeState = eyeState;

            // Brow movement: tied to expression states, not beat
            let browTarget = 0;
            if (eyeState === 'blink') browTarget = -3;          // subtle lift on blink
            else if (eyeState === 'wink') browTarget = -5;      // expressive raise on wink
            else if (ts.sessionActive) browTarget = -2;          // slight raise when jamming
            // Slow idle drift
            browTarget += Math.sin(now / 1000 * 0.3) * 0.8;
            ts.browRaise += (browTarget - ts.browRaise) * 0.04; // very slow smoothing
            if (Math.abs(ts.browRaise) < 0.05) ts.browRaise = 0;

            // Right brow rotation: tilts more upright during expressions
            let rRotTarget = 0;
            if (eyeState === 'wink') rRotTarget = 12;           // skeptical raised arch
            else if (eyeState === 'blink') rRotTarget = 4;       // slight tilt on blink
            else if (ts.sessionActive) rRotTarget = 6;            // engaged tilt when jamming
            rRotTarget += Math.sin(now / 1000 * 0.25) * 1.5;     // slow idle drift
            ts.rBrowRotate += (rRotTarget - ts.rBrowRotate) * 0.04;
            if (Math.abs(ts.rBrowRotate) < 0.1) ts.rBrowRotate = 0;

            const browPx = Math.round(ts.browRaise);
            const rBrowRad = ts.rBrowRotate * Math.PI / 180;
            // Right brow pivot: center of brow on 2048x1365 canvas
            const rBrowPivotX = 1084;
            const rBrowPivotY = 280;
            const ctx = faceCanvas.getContext('2d');
            ctx.clearRect(0, 0, IMG_W, IMG_H);
            if (eyeState === 'blink') {
              ctx.drawImage(f.blink, 0, 0, IMG_W, IMG_H);
              // Brows still move during blink
              ctx.drawImage(f.leftBrow, 0, browPx, IMG_W, IMG_H);
              // Right brow: rotated around its center
              ctx.save();
              ctx.translate(rBrowPivotX, rBrowPivotY + browPx * 0.7);
              ctx.rotate(rBrowRad);
              ctx.translate(-rBrowPivotX, -(rBrowPivotY + browPx * 0.7));
              ctx.drawImage(f.rightBrow, 0, browPx * 0.7, IMG_W, IMG_H);
              ctx.restore();
            } else {
              ctx.drawImage(f.leftEye, 0, 0, IMG_W, IMG_H);
              ctx.drawImage(f.leftBrow, 0, browPx, IMG_W, IMG_H);
              ctx.drawImage(eyeState === 'wink' ? f.rightEyeClosed : f.rightEyeOpen, 0, 0, IMG_W, IMG_H);
              // Right brow: rotated around its center
              ctx.save();
              ctx.translate(rBrowPivotX, rBrowPivotY + browPx * 0.7);
              ctx.rotate(rBrowRad);
              ctx.translate(-rBrowPivotX, -(rBrowPivotY + browPx * 0.7));
              ctx.drawImage(f.rightBrow, 0, browPx * 0.7, IMG_W, IMG_H);
              ctx.restore();
              ctx.drawImage(f.mouthOpen, 0, 0, IMG_W, IMG_H);
            }
          }
        }

        // --- Finger tap sessions ---
        // Trigger: on any kick hit, after cooldown, if there's real audio energy
        const elapsed = now - ts.lastSessionEnd;
        if (!ts.sessionActive && isKick && elapsed > ts.nextCooldown && ts.energy > 0.02) {
          ts.sessionActive = true;
          const measures = 2 + Math.floor(Math.random() * 3);
          ts.sessionEnd = now + measures * 2000;
          // Opening accent: both snap down together
          ts.leftSnapTime = now;
          ts.rightSnapTime = now;
        }

        if (ts.sessionActive) {
          // Snap on beat — left on kick, right on hi-hat
          if (isKick) {
            // Track kick interval for anticipation
            if (ts.lastKickTime > 0) {
              const interval = now - ts.lastKickTime;
              if (interval > 200 && interval < 2000) {
                ts.kickInterval += (interval - ts.kickInterval) * 0.3;
              }
            }
            ts.lastKickTime = now;
            ts.leftSnapTime = now;
          }
          if (isHihat) ts.rightSnapTime = now;

          if (now > ts.sessionEnd) {
            ts.sessionActive = false;
            ts.lastSessionEnd = now;
            ts.nextCooldown = 18000 + Math.random() * 22000;
          }
        }

        // Spring interpolation: snap down instantly on beat, lift between beats
        const SETTLE_MS = 60; // hold on panel briefly after snap
        for (const hand of ['left', 'right']) {
          const tKey = hand + 'T';
          const snapKey = hand + 'SnapTime';
          const sinceTap = now - ts[snapKey];
          if (ts.sessionActive && sinceTap > SETTLE_MS) {
            if (hand === 'left' && ts.lastKickTime > 0) {
              // Predictive lift: accelerate as next kick approaches
              const progress = (now - ts.lastKickTime) / ts.kickInterval;
              const liftRate = 0.03 + Math.min(progress, 1) * 0.12;
              ts[tKey] += (1 - ts[tKey]) * liftRate;
            } else {
              // Right hand: constant anticipation lift
              ts[tKey] += (1 - ts[tKey]) * 0.06;
            }
          } else if (sinceTap <= SETTLE_MS) {
            // Just tapped: near-instant snap to panel
            ts[tKey] = ts[tKey] * 0.1;
          } else {
            // Session inactive: ease back to rest
            ts[tKey] += (0 - ts[tKey]) * 0.08;
          }
          if (ts[tKey] < 0.005) ts[tKey] = 0;
          if (ts[tKey] > 0.995) ts[tKey] = 1;
        }

        // Compute image→viewport pivot (height-based scale, matches cover in portrait)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const imgScale = vh / IMG_H;
        const ox = (vw - IMG_W * imgScale) / 2;
        const oy = 0;

        // Read wrapper params for pivot adjustment
        const uParams = unitRef.current;

        // --- LEFT finger: 2-segment arc translation ---
        {
          const baseEl = fingerRefs.current.leftBase;
          const tipEl = fingerRefs.current.leftTip;
          const kn = KNUCKLE.left;
          const t = ts.leftT;
          if (t > 0.005 && baseEl) {
            // Viewport-space pivot
            const vpPx = (kn.baseCx / 100) * IMG_W * imgScale + ox;
            const vpPy = (kn.baseCy / 100) * IMG_H * imgScale + oy;
            // Convert to wrapper-local space
            let bpx = vpPx, bpy = vpPy, adjS = 1;
            if (uParams) {
              const { pcx, pcy } = uParams;
              const u = uParams.l;
              bpx = (vpPx - pcx - u.tx) / u.s + pcx;
              bpy = (vpPy - pcy - u.ty) / u.s + pcy;
              adjS = u.s;
            }
            const curMag = t * kn.mag;
            const rad = kn.dir * Math.PI / 180;
            const perp = rad + Math.PI / 2;
            const arcOfs = kn.arc * 15 * Math.sin(t * Math.PI);
            const tx = (curMag * Math.cos(rad) + arcOfs * Math.cos(perp)) / adjS;
            const ty = (curMag * Math.sin(rad) + arcOfs * Math.sin(perp)) / adjS;
            const scl = 1 - t * 0.03;
            baseEl.style.transformOrigin = `${bpx.toFixed(0)}px ${bpy.toFixed(0)}px`;
            baseEl.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scl.toFixed(3)})`;
            if (tipEl?.style.transform) tipEl.style.transform = '';
          } else {
            if (baseEl?.style.transform) baseEl.style.transform = '';
            if (tipEl?.style.transform) tipEl.style.transform = '';
          }
        }

        // --- Left hand shuffle: other fingers shift toward pinky during taps ---
        {
          const shuffleT = ts.leftT;
          const sdx = -0.4;
          const sdy = 1.0;
          const adjS = uParams ? uParams.l.s : 1;
          const shuffles = [
            { el: shuffleRefs.current.lMid,   mag: 1.5 },
            { el: shuffleRefs.current.lRing,  mag: 2.8 },
            { el: shuffleRefs.current.lPinky, mag: 4.0 },
          ];
          for (const s of shuffles) {
            if (!s.el) continue;
            const el = s.el;
            if (shuffleT > 0.01) {
              const px = shuffleT * s.mag * sdx * imgScale / adjS;
              const py = shuffleT * s.mag * sdy * imgScale / adjS;
              el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
            } else if (el.style.transform) {
              el.style.transform = '';
            }
          }
        }

        // --- Right hand shuffle: mirrored — shift toward pinky (down-right) ---
        {
          const shuffleT = ts.rightT;
          const sdx = 0.4;
          const sdy = 1.0;
          const adjS = uParams ? uParams.r.s : 1;
          const shuffles = [
            { el: shuffleRefs.current.rMid,   mag: 1.5 },
            { el: shuffleRefs.current.rRing,  mag: 2.8 },
            { el: shuffleRefs.current.rPinky, mag: 4.0 },
          ];
          for (const s of shuffles) {
            if (!s.el) continue;
            const el = s.el;
            if (shuffleT > 0.01) {
              const px = shuffleT * s.mag * sdx * imgScale / adjS;
              const py = shuffleT * s.mag * sdy * imgScale / adjS;
              el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
            } else if (el.style.transform) {
              el.style.transform = '';
            }
          }
        }

        // --- RIGHT finger: mirrored arc translation (0.90 base scale, hardcoded rest offset) ---
        {
          const el = fingerRefs.current.right;
          const t = ts.rightT;
          const RIGHT_BASE_SCALE = 0.90;
          const kn = KNUCKLE.right;
          if (t > 0.005 && el) {
            // Viewport-space pivot
            const vpPx = (kn.baseCx / 100) * IMG_W * imgScale + ox;
            const vpPy = (kn.baseCy / 100) * IMG_H * imgScale + oy;
            // Convert to wrapper-local space
            let px = vpPx, py = vpPy, adjS = 1;
            if (uParams) {
              const { pcx, pcy } = uParams;
              const u = uParams.r;
              px = (vpPx - pcx - u.tx) / u.s + pcx;
              py = (vpPy - pcy - u.ty) / u.s + pcy;
              adjS = u.s;
            }
            const curMag = t * kn.mag;
            const rad = kn.dir * Math.PI / 180;
            const perp = rad + Math.PI / 2;
            const arcOfs = kn.arc * 15 * Math.sin(t * Math.PI);
            const rx = kn.restX * imgScale;
            const ry = kn.restY * imgScale;
            const tx = (rx + curMag * Math.cos(rad) + arcOfs * Math.cos(perp)) / adjS;
            const ty = (ry + curMag * Math.sin(rad) + arcOfs * Math.sin(perp)) / adjS;
            const scl = RIGHT_BASE_SCALE * (1 - t * 0.03);
            el.style.transformOrigin = `${px.toFixed(0)}px ${py.toFixed(0)}px`;
            el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scl.toFixed(3)})`;
          } else if (el) {
            const adjS = uParams ? uParams.r.s : 1;
            const rx = kn.restX * imgScale / adjS;
            const ry = kn.restY * imgScale / adjS;
            el.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px) scale(${RIGHT_BASE_SCALE})`;
            el.style.transformOrigin = '45% 32%';
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    const timer = setTimeout(startLoop, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getAudio, isMobile]);

  // Dev drag: position arm units by dragging, scroll-wheel to scale.
  // Uses mouse X vs panel center to pick left/right unit (no pointer-events needed).
  // Writes to liveCfgRef so resize handler preserves drag state.
  useEffect(() => {
    if (!DEV_DRAG || isMobile) return;
    const live = liveCfgRef.current;
    const units = [
      { refs: [leftBackRef, leftFrontRef],   key: 'LEFT_UNIT',  side: 'l' },
      { refs: [rightBackRef, rightFrontRef], key: 'RIGHT_UNIT', side: 'r' },
    ];
    let active = null;

    const pickUnit = (clientX) => {
      const up = unitRef.current;
      if (!up) return null;
      return clientX < up.pcx ? units[0] : units[1];
    };

    const getCfg = (u) => live[u.side];

    const applyUnit = (u) => {
      const cfg = getCfg(u);
      const w = window.innerWidth, h = window.innerHeight;
      const s = h / IMG_H;
      const oX = (w - IMG_W * s) / 2;
      const pw = PANEL_CANVAS.w * s, ph = PANEL_CANVAS.h * s;
      const pcx = PANEL_CANVAS.x * s + oX + pw / 2;
      const pcy = PANEL_CANVAS.y * s + ph / 2;
      const origin = `${pcx}px ${pcy}px`;
      const xform = `translate(${cfg.dx * pw}px, ${cfg.dy * ph}px) scale(${cfg.scale})`;
      for (const ref of u.refs) {
        const el = ref.current;
        if (!el) continue;
        el.style.transformOrigin = origin;
        el.style.transform = xform;
      }
      unitRef.current[u.side] = { tx: cfg.dx * pw, ty: cfg.dy * ph, s: cfg.scale };
    };

    const updateOverlay = () => {
      const el = devOverlayRef.current;
      if (!el) return;
      el.textContent =
        `L: dx=${live.l.dx.toFixed(4)} dy=${live.l.dy.toFixed(4)} s=${live.l.scale.toFixed(2)}\n` +
        `R: dx=${live.r.dx.toFixed(4)} dy=${live.r.dy.toFixed(4)} s=${live.r.scale.toFixed(2)}`;
    };

    const onDown = (e) => {
      // Skip drag when clicking inside the login form
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      const u = pickUnit(e.clientX);
      if (!u) return;
      const cfg = getCfg(u);
      active = { unit: u, startX: e.clientX, startY: e.clientY, startDx: cfg.dx, startDy: cfg.dy };
    };
    const onMove = (e) => {
      if (!active) return;
      const w = window.innerWidth, h = window.innerHeight;
      const s = h / IMG_H;
      const pw = PANEL_CANVAS.w * s, ph = PANEL_CANVAS.h * s;
      const cfg = getCfg(active.unit);
      cfg.dx = active.startDx + (e.clientX - active.startX) / pw;
      cfg.dy = active.startDy + (e.clientY - active.startY) / ph;
      applyUnit(active.unit);
      updateOverlay();
    };
    const onUp = () => {
      if (active) {
        const cfg = getCfg(active.unit);
        console.log(`${active.unit.key}:`, JSON.stringify(cfg));
        active = null;
      }
    };
    const onWheel = (e) => {
      // Skip wheel when over the login form
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      const u = pickUnit(e.clientX);
      if (!u) return;
      e.preventDefault();
      const cfg = getCfg(u);
      cfg.scale = Math.max(0.1, cfg.scale + (e.deltaY > 0 ? -0.02 : 0.02));
      applyUnit(u);
      updateOverlay();
      console.log(`${u.key}:`, JSON.stringify(cfg));
    };

    // Show initial values
    updateOverlay();

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, [isMobile]);

  useEffect(() => {
    if (mode !== 'register' || username.length < 2) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => {
      checkUsername(username)
        .then((d) => setUsernameStatus(d.available ? 'available' : 'taken'))
        .catch(() => setUsernameStatus(null));
    }, 400);
    return () => clearTimeout(checkTimer.current);
  }, [username, mode]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (loading) return;
      setError('');
      if (!username.trim() || !password.trim()) {
        setError('enter username and password');
        return;
      }
      setLoading(true);
      try {
        if (mode === 'register') {
          await register(username.trim(), password);
        } else {
          await login(username.trim(), password);
        }
        onLogin();
      } catch (err) {
        setError(err.message || 'auth failed');
      } finally {
        setLoading(false);
      }
    },
    [username, password, mode, loading, onLogin],
  );

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
    setUsernameStatus(null);
  };

  const statusLabel =
    usernameStatus === 'checking' ? { color: '#888', text: '...' }
    : usernameStatus === 'available' ? { color: '#00ff41', text: '\u2713' }
    : usernameStatus === 'taken' ? { color: '#ff4444', text: '\u2717' }
    : null;


  return (
    <div className="lp-backdrop">
      {!isMobile && (
        <>
        {/* Boombox reflection — behind the grid */}
        <div className="lp-boom-unit lp-boom-refl" style={{ transform: getBoomTransform(sidebarOffset) }}>
          <img src="/boombox_reflectionBase.png" alt="" className="lp-layer lp-layer-refl-base" />
          <div ref={wooferReflRef} className="lp-refl-subs">
            <img src="/boombox_reflectionLeftSub.png" alt="" className="lp-layer" />
            <img src="/boombox_reflectionRightSub.png" alt="" className="lp-layer" />
          </div>
        </div>

        <img src="/grid.png" alt="" className="lp-layer lp-layer-grid" />
        <div className="lp-layer lp-grid-sheen" />
        <div className="lp-layer lp-grid-vignette" />

        {/* Boombox */}
        <div
          className="lp-boom-unit"
          style={{ transform: getBoomTransform(sidebarOffset) }}
        >
          <img src="/boombox.png" alt="" className="lp-layer lp-layer-boombox" />
          {/* Static sub base — always visible at normal brightness */}
          <img src="/boombox_leftSub.png" alt="" className="lp-layer lp-layer-subs-static" />
          <img src="/boombox_rightSub.png" alt="" className="lp-layer lp-layer-subs-static" />
          {/* Animated sub overlay — kick-reactive glow/shift on top of static base */}
          <div ref={wooferRef} className="lp-woofer-subs">
            <img src="/boombox_leftSub.png" alt="" className="lp-layer" />
            <img src="/boombox_rightSub.png" alt="" className="lp-layer" />
          </div>
        </div>

        {/* Tissue box + grouped tissues — behind the robot on the grid floor */}
        <img src="/tissue_box.png" alt="" className="lp-layer lp-layer-tissue-back" style={{ transform: 'translate(calc(378 * var(--fit-s, 1) * 1px), calc(119 * var(--fit-s, 1) * 1px))' }} />
        <img src="/tissue_grouped.png" alt="" className="lp-layer lp-layer-tissue-back" style={{ transform: 'translate(calc(326 * var(--fit-s, 1) * 1px), calc(197 * var(--fit-s, 1) * 1px))' }} />

        {/* Feet — planted on grid, never move */}
        <canvas ref={feetCanvasRef} className="lp-layer lp-layer-leg lp-leg-feet" />

        {/* Robot body — beat bounce propagates through legs, arms, hands, panel */}
        <div ref={bodyRef} className="lp-robot-body">

        {/* Leg joints — 2 canvases for independent rotation at knee/ankle */}
        <canvas ref={thighsCanvasRef} className="lp-layer lp-layer-leg lp-leg-thighs" />
        <canvas ref={shinsCanvasRef} className="lp-layer lp-layer-leg lp-leg-shins" />

        {/* Head — frame (static) + face (blinks) */}
        <canvas ref={headFrameRef} className="lp-layer lp-layer-head" />
        <canvas ref={headFaceRef} className="lp-layer lp-layer-head" />

        {/* Left arm unit — back half (arm + palm, behind panel) */}
        <div ref={leftBackRef} className="lp-arm-unit lp-arm-unit-back">
          <img src="/arm_left.png" alt="" className="lp-layer lp-layer-arms" />
          <img src="/hand_leftPalm-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L lp-hand-palm" />
        </div>

        {/* Right arm unit — back half (arm + palm, behind panel) */}
        <div ref={rightBackRef} className="lp-arm-unit lp-arm-unit-back">
          <img src="/arm_right.png" alt="" className="lp-layer lp-layer-arms lp-arm-R" />
          <img src="/hand_rightPalm-layer.png"  alt="" className="lp-layer lp-layer-hand lp-hand-R lp-hand-palm" />
        </div>

        {/* Form inside robot body on desktop */}
        <form ref={panelRef} onSubmit={handleSubmit} className="lp-panel">
          <div className="lp-title font-wankr">WankrBot</div>

          {walletUsername ? (
            <WalletLoginSection parentMode={mode} onLogin={onLogin} onSpectate={onSpectate} onUsernameMode={setWalletUsername} takeover />
          ) : (
            <>
              <div className="lp-subtitle font-wankr">Login, Degen</div>

              <div className="lp-field-wrap">
                <input
                  className="lp-input"
                  type="text"
                  placeholder="username"
                  autoComplete="username"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {statusLabel && (
                  <span className="lp-status" style={{ color: statusLabel.color }}>
                    {statusLabel.text}
                  </span>
                )}
              </div>

              <input
                className="lp-input"
                type="password"
                placeholder="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <div className="lp-error">{error}</div>}

              <div className="lp-bottom-row">
                <button type="submit" className="lp-btn lp-btn-secondary lp-btn-primary-alt" disabled={loading}>
                  {loading ? '...' : mode === 'login' ? 'LOGIN' : 'REGISTER'}
                </button>
                {mode === 'login' && <WalletLoginSection parentMode={mode} onLogin={onLogin} onSpectate={onSpectate} onUsernameMode={setWalletUsername} inline />}
              </div>

              <div className="lp-bottom-row">
                <button type="button" className="lp-btn lp-btn-secondary" onClick={toggleMode}>
                  {mode === 'login' ? 'REGISTER' : 'BACK'}
                </button>
                <button type="button" className="lp-btn lp-btn-secondary" onClick={onSpectate}>
                  SPECTATE
                </button>
              </div>

              {mode !== 'login' && <WalletLoginSection parentMode={mode} onLogin={onLogin} onSpectate={onSpectate} onUsernameMode={setWalletUsername} />}
            </>
          )}
        </form>

        {/* Left arm unit — front half (fingers, in front of panel) */}
        <div ref={leftFrontRef} className="lp-arm-unit lp-arm-unit-front">
          <div ref={el => { fingerRefs.current.leftBase = el; }} className="lp-finger-joint lp-layer-hand">
            <img src="/hand_leftIndexBase-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
            <div ref={el => { fingerRefs.current.leftTip = el; }} className="lp-finger-joint lp-finger-tip">
              <img src="/hand_leftIndexTip-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
            </div>
          </div>
          <div ref={el => { shuffleRefs.current.lMid = el; }} className="lp-shuffle-joint">
            <img src="/hand_leftMiddle-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
          </div>
          <div ref={el => { shuffleRefs.current.lRing = el; }} className="lp-shuffle-joint">
            <img src="/hand_leftRing-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
          </div>
          <div ref={el => { shuffleRefs.current.lPinky = el; }} className="lp-shuffle-joint">
            <img src="/hand_leftPinky-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
          </div>
        </div>

        {/* Right arm unit — front half (fingers, in front of panel) */}
        <div ref={rightFrontRef} className="lp-arm-unit lp-arm-unit-front">
          <div ref={el => { shuffleRefs.current.rMid = el; }} className="lp-shuffle-joint">
            <img src="/hand_rightMiddle-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-R" />
          </div>
          <div ref={el => { shuffleRefs.current.rRing = el; }} className="lp-shuffle-joint">
            <img src="/hand_rightRing-layer.png"   alt="" className="lp-layer lp-layer-hand lp-hand-R" />
          </div>
          <div ref={el => { shuffleRefs.current.rPinky = el; }} className="lp-shuffle-joint">
            <img src="/hand_rightPinky-layer.png"  alt="" className="lp-layer lp-layer-hand lp-hand-R" />
          </div>
          <div ref={el => { fingerRefs.current.right = el; }} className="lp-finger-joint lp-layer-hand lp-right-index-joint">
            <img src="/hand_rightIndex-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-R" />
          </div>
        </div>

        </div>{/* /lp-robot-body */}

        {/* Front layers — crumpled tissues + magazine in front of robot */}
        <img src="/tissue_crumpled_1.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(calc(251 * var(--fit-s, 1) * 1px), calc(128 * var(--fit-s, 1) * 1px))' }} />
        <img src="/tissue_crumpled_2.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(calc(-369 * var(--fit-s, 1) * 1px), calc(163 * var(--fit-s, 1) * 1px))' }} />
        <img src="/tissue_crumpled_3.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(calc(-1559 * var(--fit-s, 1) * 1px), calc(270 * var(--fit-s, 1) * 1px))' }} />
        <img src="/tissue_crumpled_4.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(calc(26 * var(--fit-s, 1) * 1px), calc(96 * var(--fit-s, 1) * 1px))' }} />
        <img src="/magazines_1.png" alt="" className="lp-layer lp-layer-magazine" />
        </>
      )}

      {/* Mobile: full static scene with zoom-to-login */}
      {isMobile && (
        <>
        <div
          className="lp-mobile-zoom"
          style={{
            transform: mobileZoomed && mobileZoomXf
              ? `translate(${mobileZoomXf.tx}px, ${mobileZoomXf.ty}px) scale(${mobileZoomXf.s})`
              : 'translate(0, 0) scale(1)',
          }}
        >
          {/* Grid */}
          <img src="/grid.png" alt="" className="lp-layer lp-layer-grid" />
          <div className="lp-layer lp-grid-sheen" />

          {/* Boombox — static, no kick animation */}
          <div className="lp-boom-unit" style={{ transform: getBoomTransform(0) }}>
            <img src="/boombox.png" alt="" className="lp-layer lp-layer-boombox" />
            <img src="/boombox_leftSub.png" alt="" className="lp-layer lp-layer-subs-static" />
            <img src="/boombox_rightSub.png" alt="" className="lp-layer lp-layer-subs-static" />
          </div>

          {/* Static robot — img tags instead of canvases, rest pose */}
          <img src="/legs_leftFoot.png" alt="" className="lp-layer" style={{ zIndex: 2 }} />
          <img src="/legs_rightFoot.png" alt="" className="lp-layer" style={{ zIndex: 2 }} />
          <img src="/legs_bodyConnection.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/legs_leftThigh.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/legs_rightThigh.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/legs_leftShin.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/legs_rightShin.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/legs_leftKnee.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/legs_rightKnee.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/head_blankScreen.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/head_outer.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/arm_left.png" alt="" className="lp-layer lp-layer-arms" style={{ zIndex: 3 }} />
          <img src="/arm_right.png" alt="" className="lp-layer lp-layer-arms" style={{ zIndex: 3 }} />
          <img src="/hand_leftPalm-layer.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />
          <img src="/hand_rightPalm-layer.png" alt="" className="lp-layer" style={{ zIndex: 3 }} />

          {/* Login form — positioned via content-area wrapper */}
          <div className="lp-mob-content">
            <form onSubmit={handleSubmit} className="lp-panel lp-panel-mob">
              <div className="lp-title font-wankr">WankrBot</div>

              {walletUsername ? (
                <WalletLoginSection parentMode={mode} onLogin={onLogin} onSpectate={onSpectate} onUsernameMode={setWalletUsername} isMobile takeover />
              ) : (
                <>
                  <div className="lp-subtitle font-wankr">Login, Degen</div>

                  <div className="lp-field-wrap">
                    <input
                      className="lp-input"
                      type="text"
                      placeholder="username"
                      autoComplete="username"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    {statusLabel && (
                      <span className="lp-status" style={{ color: statusLabel.color }}>
                        {statusLabel.text}
                      </span>
                    )}
                  </div>

                  <input
                    className="lp-input"
                    type="password"
                    placeholder="password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  {error && <div className="lp-error">{error}</div>}

                  <div className="lp-bottom-row">
                    <button type="submit" className="lp-btn lp-btn-secondary lp-btn-primary-alt" disabled={loading}>
                      {loading ? '...' : mode === 'login' ? 'LOGIN' : 'REGISTER'}
                    </button>
                    {mode === 'login' && <WalletLoginSection parentMode={mode} onLogin={onLogin} onSpectate={onSpectate} onUsernameMode={setWalletUsername} isMobile inline />}
                  </div>

                  <div className="lp-bottom-row">
                    <button type="button" className="lp-btn lp-btn-secondary" onClick={toggleMode}>
                      {mode === 'login' ? 'REGISTER' : 'BACK'}
                    </button>
                    <button type="button" className="lp-btn lp-btn-secondary" onClick={onSpectate}>
                      SPECTATE
                    </button>
                  </div>

                  {mode !== 'login' && <WalletLoginSection parentMode={mode} onLogin={onLogin} onSpectate={onSpectate} onUsernameMode={setWalletUsername} isMobile />}
                </>
              )}
            </form>
          </div>

          {/* Front layer — magazine */}
          <img src="/magazines_1.png" alt="" className="lp-layer lp-layer-magazine" />
        </div>

        {/* Overlay — TAP TO LOGIN */}
        <div
          className="lp-mobile-overlay"
          style={{
            opacity: mobileZoomed ? 0 : 1,
            pointerEvents: mobileZoomed ? 'none' : 'auto',
          }}
          onClick={handleMobileZoomIn}
        >
          <div className="lp-mob-cta">
            <div className="lp-mob-cta-line" />
            <span className="lp-mob-cta-text font-wankr">TAP TO LOGIN</span>
            <div className="lp-mob-cta-line" />
          </div>
        </div>

        {/* Back button */}
        <button
          className="lp-mobile-back font-wankr"
          style={{
            opacity: mobileZoomed ? 1 : 0,
            pointerEvents: mobileZoomed ? 'auto' : 'none',
          }}
          onClick={handleMobileZoomOut}
        >
          ‹ BACK
        </button>
        </>
      )}

      {/* Dev overlay — on-screen position readout (DOM-driven, no React state) */}
      {DEV_DRAG && <div ref={devOverlayRef} className="lp-dev-overlay" />}

      <style>{`
        .lp-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: #000;
          overflow: hidden;
        }
        .lp-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }
        .lp-robot-body {
          position: absolute;
          inset: 0;
          z-index: 3;
          transform-origin: 50% 100%;
          will-change: transform;
        }
        .lp-layer-grid {
          z-index: 1;
          object-fit: cover;
          filter:
            brightness(1.2)
            contrast(1.1)
            drop-shadow(0 0 4px rgba(0,255,65,0.3))
            drop-shadow(0 0 12px rgba(0,255,65,0.08));
        }
        .lp-grid-sheen {
          z-index: 1;
          background:
            radial-gradient(ellipse 60% 20% at 50% 92%,
              rgba(0,255,65,0.14) 0%,
              rgba(0,255,65,0.05) 30%,
              transparent 60%),
            radial-gradient(ellipse 90% 35% at 50% 85%,
              rgba(0,255,65,0.08) 0%,
              rgba(0,255,65,0.02) 40%,
              transparent 70%),
            radial-gradient(ellipse 40% 15% at 35% 88%,
              rgba(0,255,65,0.06) 0%,
              transparent 50%),
            radial-gradient(ellipse 40% 15% at 65% 90%,
              rgba(0,255,65,0.06) 0%,
              transparent 50%),
            linear-gradient(to top,
              rgba(0,255,65,0.04) 0%,
              transparent 45%);
          pointer-events: none;
        }
        .lp-grid-vignette {
          z-index: 1;
          background:
            radial-gradient(ellipse 70% 12% at 50% 93%,
              rgba(255,255,255,0.03) 0%,
              transparent 100%),
            radial-gradient(ellipse 120% 80% at 50% 80%,
              transparent 30%,
              rgba(0,0,0,0.5) 100%);
          pointer-events: none;
        }
        .lp-layer-leg {
          z-index: 2;
          image-rendering: auto;
          backface-visibility: hidden;
        }
        .lp-leg-thighs {
          z-index: 2;
          transform-origin: 50% 78%;
          will-change: transform;
        }
        .lp-leg-feet {
          z-index: 3;
        }
        .lp-leg-shins {
          z-index: 4;
          transform-origin: 50% 92%;
          will-change: transform;
        }
        .lp-layer-head {
          z-index: 3;
          image-rendering: auto;
          backface-visibility: hidden;
          transform-origin: 50% 33%;
          will-change: transform;
        }
        .lp-layer-tissue-back {
          z-index: 2;
          image-rendering: auto;
        }
        .lp-layer-tissue {
          z-index: 6;
          image-rendering: auto;
        }
        .lp-layer-magazine {
          z-index: 6;
          image-rendering: auto;
        }
        .lp-boom-unit {
          position: absolute;
          inset: 0;
          width: 110%;
          height: 100%;
          z-index: 2;
          transition: transform 0.4s ease;
        }
        .lp-boom-unit .lp-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
        }
        .lp-arm-unit {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .lp-arm-unit-back  { z-index: 3; }
        .lp-arm-unit-front { z-index: 5; }
        .lp-dev-overlay {
          position: fixed;
          top: 8px;
          left: 8px;
          z-index: 9999;
          background: rgba(0,0,0,0.85);
          color: #00ff41;
          font: 13px/1.5 monospace;
          padding: 6px 10px;
          border-radius: 4px;
          pointer-events: none;
          white-space: pre;
        }
        .lp-layer-arms {
          z-index: 3;
          image-rendering: auto;
          transform: translateZ(0);
          backface-visibility: hidden;
          filter:
            brightness(1.15)
            contrast(1.3)
            saturate(1.2)
            hue-rotate(-5deg)
            drop-shadow(0 0 1px rgba(0, 255, 65, 0.3))
            drop-shadow(0 0 4px rgba(0, 255, 65, 0.1));
        }
        .lp-arm-R {
          filter:
            brightness(1.05)
            contrast(1.15)
            saturate(1.1)
            hue-rotate(-5deg);
        }
        .lp-layer-hand {
          z-index: 5;
          image-rendering: auto;
          backface-visibility: hidden;
        }
        .lp-finger-joint {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .lp-finger-tip { z-index: 6; }
        .lp-right-index-joint {
          transform-origin: 45% 32%;
        }
        .lp-shuffle-joint {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
        }
        /* Left hand — slightly warm green, nudge toward #00ff41 */
        .lp-hand-L {
          filter:
            brightness(1.1)
            contrast(1.6)
            saturate(1.3)
            hue-rotate(-8deg)
            drop-shadow(0 0 1px rgba(0, 255, 65, 0.6))
            drop-shadow(0 0 4px rgba(0, 255, 65, 0.15));
        }
        /* Right hand — cooler source, rotate + saturate to match left */
        .lp-hand-R {
          filter:
            brightness(1.05)
            contrast(1.8)
            saturate(1.6)
            hue-rotate(-12deg)
            drop-shadow(0 0 1px rgba(0, 255, 65, 0.6))
            drop-shadow(0 0 4px rgba(0, 255, 65, 0.15));
        }
        /* Palms sit BEHIND the panel (robot grips from behind), fingers in front */
        .lp-hand-palm { z-index: 3; }
        /* Left palm */
        .lp-hand-palm.lp-hand-L {
          filter:
            brightness(1.1)
            contrast(1.7)
            saturate(1.4)
            hue-rotate(-8deg)
            drop-shadow(0 0 1px rgba(0, 255, 65, 0.5))
            drop-shadow(0 0 3px rgba(0, 255, 65, 0.1));
        }
        /* Right palm */
        .lp-hand-palm.lp-hand-R {
          filter:
            brightness(1.05)
            contrast(1.9)
            saturate(1.7)
            hue-rotate(-12deg)
            drop-shadow(0 0 1px rgba(0, 255, 65, 0.5))
            drop-shadow(0 0 3px rgba(0, 255, 65, 0.1));
        }
        .lp-wankr-refl {
          z-index: 0;
        }
        .lp-boom-refl {
          z-index: 0 !important;
        }
        .lp-layer-refl-base {
          z-index: 1;
        }
        .lp-refl-subs {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 2;
        }
        .lp-layer-boombox { z-index: 2; }
        .lp-layer-subs-static { z-index: 3; }
        .lp-woofer-subs {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 4;
        }
        .lp-panel {
          position: absolute;
          left: ${PANEL.left}vw;
          top: ${PANEL.top}vh;
          width: ${PANEL.width}vw;
          height: ${PANEL.height}vh;
          z-index: 4;
          background: rgba(2, 2, 2, 0.96);
          border: 1.5px solid rgba(0, 255, 65, 0.55);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: center;
          gap: 11px;
          padding: 17px 86px 28px;
          box-sizing: border-box;
          box-shadow: 0 0 15px rgba(0,255,65,0.25), 0 0 45px rgba(0,255,65,0.08), inset 0 0 20px rgba(0,255,65,0.03);
          will-change: transform;
        }
        .lp-subtitle {
          color: rgba(0, 255, 65, 0.5);
          font-size: 16px;
          letter-spacing: 3px;
          text-align: center;
          margin-top: -4px;
        }
        .lp-title {
          color: #00ff41;
          font-size: 36px;
          font-weight: 700;
          letter-spacing: 6px;
          text-align: center;
          text-shadow: 0 0 10px rgba(0,255,65,0.6), 0 0 25px rgba(0,255,65,0.15);
        }
        .lp-field-wrap {
          position: relative;
          width: 100%;
        }
        .lp-input {
          width: 100%;
          padding: 8px 11px;
          background: #0a0a0a !important;
          border: 1px solid rgba(0, 255, 65, 0.25);
          border-radius: 3px;
          color: #00ff41 !important;
          font-size: 14px;
          font-family: 'VT323', monospace;
          letter-spacing: 1.5px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }
        .lp-input::placeholder {
          color: rgba(0, 255, 65, 0.3);
        }
        .lp-input:focus {
          border-color: rgba(0, 255, 65, 0.5);
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.15);
        }
        .lp-input:-webkit-autofill,
        .lp-input:-webkit-autofill:hover,
        .lp-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #00ff41 !important;
          -webkit-box-shadow: 0 0 0 1000px #0a0a0a inset !important;
          box-shadow: 0 0 0 1000px #0a0a0a inset !important;
          border-color: rgba(0, 255, 65, 0.25);
          transition: background-color 5000s ease-in-out 0s;
        }
        .lp-status {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          font-family: 'VT323', monospace;
          pointer-events: none;
        }
        .lp-error {
          color: #ff4444;
          font-size: 12px;
          font-family: 'VT323', monospace;
          letter-spacing: 1px;
          text-align: center;
          text-shadow: 0 0 6px rgba(255,68,68,0.3);
        }
        .lp-btn {
          font-family: 'VT323', monospace;
          cursor: pointer;
          transition: all 0.2s ease;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
        }
        .lp-btn-submit {
          width: 100%;
          padding: 8px 0;
          background: rgba(0, 255, 65, 0.08);
          border: 1.5px solid rgba(0, 255, 65, 0.5);
          border-radius: 3px;
          color: #00ff41;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          text-shadow: 0 0 8px rgba(0,255,65,0.4);
        }
        .lp-btn-submit:hover {
          background: rgba(0, 255, 65, 0.14);
          box-shadow: 0 0 12px rgba(0,255,65,0.2);
        }
        .lp-btn-submit:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .lp-bottom-row {
          display: flex;
          justify-content: space-between;
          width: 100%;
          gap: 9px;
        }
        .lp-btn-secondary {
          flex: 1;
          padding: 5px 0;
          background: rgba(0, 255, 65, 0.04);
          border: 1px solid rgba(0, 255, 65, 0.2);
          border-radius: 3px;
          color: rgba(0, 255, 65, 0.5);
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .lp-btn-secondary:hover {
          color: #00ff41;
          border-color: rgba(0, 255, 65, 0.4);
          background: rgba(0, 255, 65, 0.08);
        }
        .lp-btn-primary-alt {
          color: #00ff41;
          font-weight: 700;
          border-color: rgba(0, 255, 65, 0.5);
          background: rgba(0, 255, 65, 0.08);
          text-shadow: 0 0 8px rgba(0,255,65,0.4);
        }
        .lp-btn-primary-alt:hover {
          background: rgba(0, 255, 65, 0.14);
          box-shadow: 0 0 12px rgba(0,255,65,0.2);
        }
        .lp-btn-primary-alt:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .lp-btn-wallet-alt {
          color: rgba(0, 230, 255, 0.7);
          border-color: rgba(0, 230, 255, 0.3);
          background: rgba(0, 230, 255, 0.04);
        }
        .lp-btn-wallet-alt:hover {
          color: #00e6ff;
          border-color: rgba(0, 230, 255, 0.5);
          background: rgba(0, 230, 255, 0.08);
          text-shadow: 0 0 8px rgba(0,230,255,0.3);
        }
        .lp-btn-wallet-alt:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .lp-wallet-row {
          display: flex;
          justify-content: space-between;
          width: 100%;
          gap: 9px;
          margin-top: 2px;
        }
        .lp-btn-wallet {
          flex: 1;
          padding: 5px 0;
          background: rgba(0, 230, 255, 0.04);
          border: 1px solid rgba(0, 230, 255, 0.25);
          border-radius: 3px;
          color: rgba(0, 230, 255, 0.6);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .lp-btn-wallet:hover {
          color: #00e6ff;
          border-color: rgba(0, 230, 255, 0.5);
          background: rgba(0, 230, 255, 0.08);
          text-shadow: 0 0 8px rgba(0,230,255,0.3);
        }
        .lp-btn-wallet:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        button.lp-btn-submit.lp-btn-wallet {
          background: rgba(0, 230, 255, 0.08);
          border: 1.5px solid rgba(0, 230, 255, 0.5);
          color: #00e6ff;
          text-shadow: 0 0 8px rgba(0,230,255,0.4);
        }
        button.lp-btn-submit.lp-btn-wallet:hover {
          background: rgba(0, 230, 255, 0.14);
          box-shadow: 0 0 12px rgba(0,230,255,0.2);
        }
        /* lpGlow removed — static box-shadow used instead to prevent GPU layer invalidation */
        @keyframes lpFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Portrait: switch to cover so robot stays large ── */
        @media (max-aspect-ratio: 3/2) {
          .lp-layer {
            object-fit: cover;
          }
        }

        /* ── Mobile: scene zoom ── */
        @media (max-width: 767px) {
          .lp-backdrop {
            overflow: hidden;
          }
          /* Keep contain-fit on mobile so content-area wrapper aligns */
          .lp-mobile-zoom .lp-layer,
          .lp-mobile-zoom .lp-layer-grid {
            object-fit: contain;
          }
        }

        /* Mobile zoom wrapper */
        .lp-mobile-zoom {
          position: absolute;
          inset: 0;
          transform-origin: 0 0;
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }

        /* Content-area wrapper — matches object-fit:contain layout */
        .lp-mob-content {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 100%;
          max-width: calc(100vh * 2048 / 1365);
          height: 100%;
          max-height: calc(100vw * 1365 / 2048);
          pointer-events: none;
          z-index: 4;
        }

        /* Panel positioned within content area via percentage */
        .lp-panel.lp-panel-mob {
          position: absolute;
          left: 38.80%;
          top: 41.30%;
          width: 22.82%;
          height: 21.50%;
          max-width: none;
          zoom: unset;
          border-radius: 2px;
          animation: none;
          container-type: inline-size;
          padding: 4cqi 5cqi;
          gap: 2.5cqi;
          pointer-events: auto;
        }
        .lp-panel-mob .lp-title {
          font-size: 6cqi;
        }
        .lp-panel-mob .lp-subtitle {
          font-size: 3.5cqi;
          margin-top: 0;
        }
        .lp-panel-mob .lp-input {
          font-size: 4.5cqi !important;
          min-height: 8cqi;
          padding: 2cqi;
          border-radius: 1cqi;
        }
        .lp-panel-mob .lp-btn-submit {
          font-size: 4.5cqi;
          min-height: 9cqi;
          padding: 2cqi 0;
          border-radius: 1cqi;
        }
        .lp-panel-mob .lp-btn-secondary {
          font-size: 3.5cqi;
          min-height: 7cqi;
          padding: 1.5cqi 0;
          border-radius: 1cqi;
        }
        .lp-panel-mob .lp-bottom-row {
          gap: 1.5cqi;
        }
        .lp-panel-mob .lp-error {
          font-size: 3cqi;
        }
        .lp-panel-mob .lp-wallet-row {
          gap: 1.5cqi;
          margin-top: 0.5cqi;
        }
        .lp-panel-mob .lp-btn-wallet {
          font-size: 3cqi;
          min-height: 7cqi;
          padding: 1.5cqi 0;
          border-radius: 1cqi;
        }
        .lp-panel-mob .lp-field-wrap .lp-status {
          font-size: 3.5cqi;
        }

        /* Overlay */
        .lp-mobile-overlay {
          position: absolute;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 12vh;
          background: linear-gradient(transparent 40%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.7));
          transition: opacity 0.4s ease;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .lp-mob-cta {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lp-mob-cta-line {
          width: 32px;
          height: 1px;
          background: rgba(0, 255, 65, 0.4);
        }
        .lp-mob-cta-text {
          font-size: 20px;
          color: #00ff41;
          letter-spacing: 6px;
          text-shadow:
            0 0 8px rgba(0,255,65,0.6),
            0 0 24px rgba(0,255,65,0.25);
          animation: lpMobPulse 2.5s ease-in-out infinite;
        }
        @keyframes lpMobPulse {
          0%, 100% { opacity: 0.7; text-shadow: 0 0 8px rgba(0,255,65,0.4), 0 0 20px rgba(0,255,65,0.15); }
          50% { opacity: 1; text-shadow: 0 0 12px rgba(0,255,65,0.8), 0 0 32px rgba(0,255,65,0.35); }
        }

        /* Back button */
        .lp-mobile-back {
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 101;
          background: rgba(0, 0, 0, 0.65);
          border: 1px solid rgba(0, 255, 65, 0.35);
          color: #00ff41;
          font-size: 16px;
          padding: 8px 18px;
          border-radius: 4px;
          letter-spacing: 2px;
          cursor: pointer;
          transition: opacity 0.35s ease 0.3s;
          -webkit-tap-highlight-color: transparent;
          text-shadow: 0 0 6px rgba(0,255,65,0.4);
        }
        .lp-mobile-back:active {
          background: rgba(0, 255, 65, 0.1);
        }
      `}</style>
    </div>
  );
}
