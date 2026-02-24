import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/* ── Face layer images (all 1536×1024, transparency-aligned) ─────────── *
 * FacelessHead  = robot head shell w/ dark screen (covers base face)     *
 * face_default  = normal expression: wink + circle eye + smile           *
 * face_blink    = blink: closed-eye arcs + smile                         */
const FACE_LAYERS = {
  head:    '/images/face/faceless_head.png',
  default: '/images/face/face_default.png',
  blink:   '/images/face/face_blink.png',
};

/* ── Shared image style — matches loginScreen.png's object-fit:contain ── */
const layerStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  objectPosition: 'center center',
  display: 'block',
  pointerEvents: 'none',
  userSelect: 'none',
};


/* ═══════════════════════════════════════════════════════════════════════ *
 * useBlink — random human-like blink timing                              *
 *                                                                         *
 *   interval:  1.8 – 4.6 s between blinks                                *
 *   duration:  80 – 120 ms eyes-closed                                    *
 *   double:    ~10% chance of a rapid second blink                        *
 * ═══════════════════════════════════════════════════════════════════════ */
function useBlink() {
  const [isBlinking, setIsBlinking] = useState(false);
  const timerRef = useRef(null);

  const doBlink = useCallback(() => {
    const closeDuration = 80 + Math.random() * 40; // 80–120 ms

    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), closeDuration);

    /* ~10% double-blink */
    if (Math.random() < 0.10) {
      const gap = closeDuration + 60 + Math.random() * 40; // brief reopen
      setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 60 + Math.random() * 30);
      }, gap);
    }
  }, []);

  useEffect(() => {
    const schedule = () => {
      const delay = 1800 + Math.random() * 2800; // 1.8 – 4.6 s
      timerRef.current = setTimeout(() => {
        doBlink();
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timerRef.current);
  }, [doBlink]);

  return isBlinking;
}


/* ═══════════════════════════════════════════════════════════════════════ *
 * RobotEyeBlink — Face expression layer with blink animation             *
 *                                                                         *
 * Compositing stack (inside the parent's scene):                          *
 *   z3  FacelessHead.png   (always visible — covers base face)            *
 *   z4  Expression layer   (face_default ↔ face_blink via crossfade)      *
 *                                                                         *
 * Both layers align to loginScreen.png via identical object-fit:contain.  *
 * ═══════════════════════════════════════════════════════════════════════ */
export default function RobotEyeBlink() {
  const isBlinking = useBlink();

  /* Pick the current face key — drives AnimatePresence */
  const faceKey = isBlinking ? 'blink' : 'default';
  const faceSrc = isBlinking ? FACE_LAYERS.blink : FACE_LAYERS.default;

  return (
    <>
      {/* ── z3: Faceless head (always visible) ──────────────────────── *
        * Covers the base loginScreen.png's baked-in face with the      *
        * dark robot screen so the expression layer can sit on top.     */}
      <img
        src={FACE_LAYERS.head}
        alt=""
        draggable={false}
        style={{ ...layerStyle, zIndex: 3 }}
      />

      {/* ── z4: Expression face layer (crossfade blink) ────────────── */}
      <AnimatePresence mode="sync">
        <motion.img
          key={faceKey}
          src={faceSrc}
          alt=""
          draggable={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: isBlinking ? 0.04 : 0.06, /* close fast, open slightly slower */
            ease: 'easeOut',
          }}
          style={{ ...layerStyle, zIndex: 4 }}
        />
      </AnimatePresence>
    </>
  );
}
