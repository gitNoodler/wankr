import { useState, useCallback, useRef, useEffect } from 'react';
import { login, register, checkUsername } from '../../services/authService';

/*
 * Login panel — viewport-origin positioning.
 * Confirmed values from reference-image alignment (2026-03-01).
 * See: memory/login-panel-specs.md
 */
const PANEL = { left: 39.5, top: 41.3, width: 21.4, height: 21.5 };

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

// --- Audio analysis (module-level, survives mount/unmount & HMR) ---
function ensureAnalyser(audioElement) {
  if (!audioElement) return null;
  if (audioElement._wankrAnalyser) return audioElement._wankrAnalyser;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const source = ctx.createMediaElementSource(audioElement);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;
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
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const checkTimer = useRef(null);
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
  }, []);

  // Woofer kick-reactive animation loop
  useEffect(() => {
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
        const wasKickQuiet = kickRef.current < 0.15;
        if (rawKick > kickRef.current) {
          kickRef.current = rawKick;
        } else {
          kickRef.current *= 0.88;
        }
        const k = kickRef.current;
        const isKick = wasKickQuiet && k > 0.3;

        // Hi-hat envelope: bins 100-180 (~4.3-7.7kHz — sizzle/attack range)
        let hihatSum = 0;
        for (let i = 100; i <= 180; i++) hihatSum += data[i];
        const rawHihat = hihatSum / 81 / 255;
        const wasHihatQuiet = hihatRef.current < 0.10;
        if (rawHihat > hihatRef.current) {
          hihatRef.current = rawHihat;
        } else {
          hihatRef.current *= 0.75; // fast decay — hi-hats are short transients
        }
        const isHihat = wasHihatQuiet && hihatRef.current > 0.25;

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
          if (isKick) ts.leftSnapTime = now;
          if (isHihat) ts.rightSnapTime = now;

          if (now > ts.sessionEnd) {
            ts.sessionActive = false;
            ts.lastSessionEnd = now;
            ts.nextCooldown = 18000 + Math.random() * 22000;
          }
        }

        // Spring interpolation: snap down fast on beat, lift slowly between beats
        const SETTLE_MS = 80; // hold on panel briefly after snap
        for (const hand of ['left', 'right']) {
          const tKey = hand + 'T';
          const snapKey = hand + 'SnapTime';
          const sinceTap = now - ts[snapKey];
          if (ts.sessionActive && sinceTap > SETTLE_MS) {
            // Anticipation: lift slowly toward peak
            ts[tKey] += (1 - ts[tKey]) * 0.04;
          } else if (sinceTap <= SETTLE_MS) {
            // Just tapped: snap down fast
            ts[tKey] += (0 - ts[tKey]) * 0.35;
          } else {
            // Session inactive: ease back to rest
            ts[tKey] += (0 - ts[tKey]) * 0.08;
          }
          if (ts[tKey] < 0.005) ts[tKey] = 0;
          if (ts[tKey] > 0.995) ts[tKey] = 1;
        }

        // Compute image→viewport pivot (accounts for object-fit: contain offset)
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const vpRatio = vw / vh;
        const imgRatio = IMG_W / IMG_H;
        let imgScale, ox, oy;
        if (vpRatio > imgRatio) {
          imgScale = vh / IMG_H;
          ox = (vw - IMG_W * imgScale) / 2;
          oy = 0;
        } else {
          imgScale = vw / IMG_W;
          ox = 0;
          oy = (vh - IMG_H * imgScale) / 2;
        }

        // --- LEFT finger: 2-segment arc translation ---
        {
          const baseEl = fingerRefs.current.leftBase;
          const tipEl = fingerRefs.current.leftTip;
          const kn = KNUCKLE.left;
          const t = ts.leftT;
          if (t > 0.005 && baseEl) {
            const bpx = (kn.baseCx / 100) * IMG_W * imgScale + ox;
            const bpy = (kn.baseCy / 100) * IMG_H * imgScale + oy;
            const curMag = t * kn.mag;
            const rad = kn.dir * Math.PI / 180;
            const perp = rad + Math.PI / 2;
            const arcOfs = kn.arc * 15 * Math.sin(t * Math.PI);
            const tx = curMag * Math.cos(rad) + arcOfs * Math.cos(perp);
            const ty = curMag * Math.sin(rad) + arcOfs * Math.sin(perp);
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
          // Direction toward pinky: down-left (~210deg from horizontal)
          const sdx = -0.4;  // slight left
          const sdy = 1.0;   // mostly downward
          // Increasing magnitude: middle < ring < pinky
          const shuffles = [
            { el: shuffleRefs.current.lMid,   mag: 1.5 },
            { el: shuffleRefs.current.lRing,  mag: 2.8 },
            { el: shuffleRefs.current.lPinky, mag: 4.0 },
          ];
          for (const s of shuffles) {
            if (!s.el) continue;
            const el = s.el;
            if (shuffleT > 0.01) {
              const px = shuffleT * s.mag * sdx * imgScale;
              const py = shuffleT * s.mag * sdy * imgScale;
              el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
            } else if (el.style.transform) {
              el.style.transform = '';
            }
          }
        }

        // --- Right hand shuffle: mirrored — shift toward pinky (down-right) ---
        {
          const shuffleT = ts.rightT;
          // Mirrored: toward right pinky = down-right
          const sdx = 0.4;   // slight right (mirrored from left's -0.4)
          const sdy = 1.0;   // mostly downward
          const shuffles = [
            { el: shuffleRefs.current.rMid,   mag: 1.5 },
            { el: shuffleRefs.current.rRing,  mag: 2.8 },
            { el: shuffleRefs.current.rPinky, mag: 4.0 },
          ];
          for (const s of shuffles) {
            if (!s.el) continue;
            const el = s.el;
            if (shuffleT > 0.01) {
              const px = shuffleT * s.mag * sdx * imgScale;
              const py = shuffleT * s.mag * sdy * imgScale;
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
            const px = (kn.baseCx / 100) * IMG_W * imgScale + ox;
            const py = (kn.baseCy / 100) * IMG_H * imgScale + oy;
            const curMag = t * kn.mag;
            const rad = kn.dir * Math.PI / 180;
            const perp = rad + Math.PI / 2;
            const arcOfs = kn.arc * 15 * Math.sin(t * Math.PI);
            const tx = kn.restX + curMag * Math.cos(rad) + arcOfs * Math.cos(perp);
            const ty = kn.restY + curMag * Math.sin(rad) + arcOfs * Math.sin(perp);
            const scl = RIGHT_BASE_SCALE * (1 - t * 0.03);
            el.style.transformOrigin = `${px.toFixed(0)}px ${py.toFixed(0)}px`;
            el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scl.toFixed(3)})`;
          } else if (el) {
            // Rest state: hardcoded offset + base scale
            el.style.transform = `translate(${kn.restX}px, ${kn.restY}px) scale(${RIGHT_BASE_SCALE})`;
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
  }, [getAudio]);

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
      {/* Boombox reflection — behind the grid */}
      <div className="lp-boom-unit lp-boom-refl" style={{ transform: getBoomTransform(sidebarOffset) + ' translateY(-1.5%)' }}>
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
        <img src="/woofers.png" alt="" className="lp-layer lp-layer-woofers-static" />
        <img ref={wooferRef} src="/woofers.png" alt="" className="lp-layer lp-layer-woofers" />
      </div>

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

      <img src="/arms_layer1.png" alt="" className="lp-layer lp-layer-arms" />

      {/* Left hand — palm behind panel, index under other fingers */}
      <img src="/hand_leftPalm-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L lp-hand-palm" />

      {/* Left index FIRST in DOM = renders under middle/ring/pinky */}
      <div ref={el => { fingerRefs.current.leftBase = el; }} className="lp-finger-joint lp-layer-hand">
        <img src="/hand_leftIndexBase-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
        <div ref={el => { fingerRefs.current.leftTip = el; }} className="lp-finger-joint lp-finger-tip">
          <img src="/hand_leftIndexTip-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
        </div>
      </div>

      {/* Other left fingers — shuffle toward pinky during taps */}
      <div ref={el => { shuffleRefs.current.lMid = el; }} className="lp-shuffle-joint">
        <img src="/hand_leftMiddle-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
      </div>
      <div ref={el => { shuffleRefs.current.lRing = el; }} className="lp-shuffle-joint">
        <img src="/hand_leftRing-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
      </div>
      <div ref={el => { shuffleRefs.current.lPinky = el; }} className="lp-shuffle-joint">
        <img src="/hand_leftPinky-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-L" />
      </div>

      {/* Right hand — palm + fingers with shuffle */}
      <img src="/hand_rightPalm-layer.png"  alt="" className="lp-layer lp-layer-hand lp-hand-R lp-hand-palm" />
      <div ref={el => { shuffleRefs.current.rMid = el; }} className="lp-shuffle-joint">
        <img src="/hand_rightMiddle-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-R" />
      </div>
      <div ref={el => { shuffleRefs.current.rRing = el; }} className="lp-shuffle-joint">
        <img src="/hand_rightRing-layer.png"   alt="" className="lp-layer lp-layer-hand lp-hand-R" />
      </div>
      <div ref={el => { shuffleRefs.current.rPinky = el; }} className="lp-shuffle-joint">
        <img src="/hand_rightPinky-layer.png"  alt="" className="lp-layer lp-layer-hand lp-hand-R" />
      </div>

      {/* Right index — offset from KNUCKLE.right.restX/restY */}
      <div ref={el => { fingerRefs.current.right = el; }} className="lp-finger-joint lp-layer-hand lp-right-index-joint">
        <img src="/hand_rightIndex-layer.png" alt="" className="lp-layer lp-layer-hand lp-hand-R" />
      </div>

      <form onSubmit={handleSubmit} className="lp-panel">
        <div className="lp-title font-wankr">WankrBot</div>
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

        <button type="submit" className="lp-btn lp-btn-submit" disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'LOGIN' : 'REGISTER'}
        </button>

        <div className="lp-bottom-row">
          <button type="button" className="lp-btn lp-btn-secondary" onClick={toggleMode}>
            {mode === 'login' ? 'REGISTER' : 'BACK'}
          </button>
          <button type="button" className="lp-btn lp-btn-secondary" onClick={onSpectate}>
            SPECTATE
          </button>
        </div>
      </form>

      </div>{/* /lp-robot-body */}

      {/* Front layers — tissues hardcoded from drag positioning */}
      <img src="/tissue_box.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(378px, 119px)' }} />
      <img src="/tissue_grouped.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(326px, 197px)' }} />
      <img src="/tissue_crumpled_1.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(251px, 128px)' }} />
      <img src="/tissue_crumpled_2.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(-369px, 163px)' }} />
      <img src="/tissue_crumpled_3.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(-1559px, 270px)' }} />
      <img src="/tissue_crumpled_4.png" alt="" className="lp-layer lp-layer-tissue" style={{ transform: 'translate(26px, 96px)' }} />
      <img src="/magazines_1.png" alt="" className="lp-layer lp-layer-magazine" />

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
        .lp-layer-tissue {
          z-index: 6;
          image-rendering: auto;
          will-change: transform;
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
        .lp-layer-hand {
          z-index: 5;
          image-rendering: auto;
          transform: translateZ(0);
          backface-visibility: hidden;
          will-change: transform;
        }
        .lp-finger-joint {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          will-change: transform;
        }
        .lp-finger-tip { z-index: 6; }
        .lp-right-index-joint {
          transform: translate(50px, 25px) scale(0.90);
          transform-origin: 45% 32%;
        }
        .lp-shuffle-joint {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
          will-change: transform;
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
          will-change: transform, filter;
        }
        .lp-layer-boombox { z-index: 2; }
        .lp-layer-woofers-static {
          z-index: 3;
        }
        .lp-layer-woofers {
          z-index: 4;
          will-change: transform, filter;
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
          gap: 0.5vw;
          padding: 0.8vw 4vw 1.3vw;
          box-sizing: border-box;
          animation: lpGlow 4s ease-in-out infinite, lpFadeIn 0.4s ease-out;
        }
        .lp-subtitle {
          color: rgba(0, 255, 65, 0.5);
          font-size: clamp(10px, 0.9vw, 16px);
          letter-spacing: 3px;
          text-align: center;
          margin-top: -0.2vw;
        }
        .lp-title {
          color: #00ff41;
          font-size: clamp(18px, 2vw, 36px);
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
          padding: 0.35vw 0.5vw;
          background: #0a0a0a !important;
          border: 1px solid rgba(0, 255, 65, 0.25);
          border-radius: 3px;
          color: #00ff41 !important;
          font-size: clamp(10px, 0.9vw, 14px);
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
          font-size: clamp(9px, 0.8vw, 12px);
          font-family: 'VT323', monospace;
          pointer-events: none;
        }
        .lp-error {
          color: #ff4444;
          font-size: clamp(9px, 0.85vw, 12px);
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
          padding: 0.35vw 0;
          background: rgba(0, 255, 65, 0.08);
          border: 1.5px solid rgba(0, 255, 65, 0.5);
          border-radius: 3px;
          color: #00ff41;
          font-size: clamp(11px, 0.95vw, 16px);
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
          gap: 0.4vw;
        }
        .lp-btn-secondary {
          flex: 1;
          padding: 0.25vw 0;
          background: rgba(0, 255, 65, 0.04);
          border: 1px solid rgba(0, 255, 65, 0.2);
          border-radius: 3px;
          color: rgba(0, 255, 65, 0.5);
          font-size: clamp(9px, 0.75vw, 12px);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .lp-btn-secondary:hover {
          color: #00ff41;
          border-color: rgba(0, 255, 65, 0.4);
          background: rgba(0, 255, 65, 0.08);
        }
        @keyframes lpGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(0,255,65,0.2), 0 0 40px rgba(0,255,65,0.06), inset 0 0 15px rgba(0,255,65,0.02); }
          50%       { box-shadow: 0 0 18px rgba(0,255,65,0.3), 0 0 50px rgba(0,255,65,0.1), inset 0 0 25px rgba(0,255,65,0.04); }
        }
        @keyframes lpFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
