const ELEMENTS_KEY = 'wankr_wanking_live_elements';
const BOUNDARIES_KEY = 'wankr_wanking_live_boundaries';

/** Login screen layer names for boundaries (which layer the boundary applies to). */
export const BOUNDARY_LAYERS = [
  'Hand layer',
  'Arm layer',
  'Login panel layer',
  'Login button layer',
];

function loadElements() {
  try {
    const raw = localStorage.getItem(ELEMENTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch { /* ignore */ }
  return [];
}

function saveElements(elements) {
  try {
    if (elements && elements.length > 0) {
      localStorage.setItem(ELEMENTS_KEY, JSON.stringify(elements));
    } else {
      localStorage.removeItem(ELEMENTS_KEY);
    }
  } catch { /* ignore */ }
}

function loadBoundaries() {
  try {
    const raw = localStorage.getItem(BOUNDARIES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch { /* ignore */ }
  return [];
}

function saveBoundaries(boundaries) {
  try {
    if (boundaries && boundaries.length > 0) {
      localStorage.setItem(BOUNDARIES_KEY, JSON.stringify(boundaries));
    } else {
      localStorage.removeItem(BOUNDARIES_KEY);
    }
  } catch { /* ignore */ }
}

/**
 * Clamp element rect so it never crosses any boundary -- even if a large
 * slider jump would teleport it past the wall entirely.
 *
 * When prevRect is supplied the check is a swept test: did the element's
 * footprint cross a boundary edge between the old and new position?
 * Only the axis of motion is constrained (no sideways deflection).
 *
 * Rect uses %: { left, top, width, height }.
 * Boundaries use 0-1: { left, top, right, bottom }.
 */
function clampToBoundaries(rect, boundaries, prevRect) {
  if (!boundaries || boundaries.length === 0) return rect;

  const r = { ...rect };

  for (const b of boundaries) {
    const bL = b.left * 100;
    const bT = b.top * 100;
    const bR = b.right * 100;
    const bB = b.bottom * 100;

    if (prevRect) {
      const pL = prevRect.left;
      const pT = prevRect.top;
      const pW = prevRect.width  ?? r.width;
      const pH = prevRect.height ?? r.height;
      const pR = pL + pW;
      const pB = pT + pH;

      // Vertical band overlap (prev and new share vertical range with boundary)
      const vertOverlap = (top, bot) => bot > bT && top < bB;
      const horizOverlap = (left, right) => right > bL && left < bR;

      // --- Horizontal sweep ---
      const newR = r.left + r.width;
      // Was the prev right edge at or before the boundary's left, and new right edge past it?
      if (pR <= bL && newR > bL && vertOverlap(r.top, r.top + r.height)) {
        r.left = bL - r.width;
      }
      // Was the prev left edge at or past the boundary's right, and new left edge before it?
      else if (pL >= bR && r.left < bR && vertOverlap(r.top, r.top + r.height)) {
        r.left = bR;
      }

      // --- Vertical sweep (re-read r.left since horizontal may have changed) ---
      const newB = r.top + r.height;
      if (pB <= bT && newB > bT && horizOverlap(r.left, r.left + r.width)) {
        r.top = bT - r.height;
      }
      else if (pT >= bB && r.top < bB && horizOverlap(r.left, r.left + r.width)) {
        r.top = bB;
      }

      // --- Width/height growth can also cause overlap ---
      const rR2 = r.left + r.width;
      const rB2 = r.top  + r.height;
      if (rR2 > bL && r.left < bR && rB2 > bT && r.top < bB) {
        const dw = r.width - pW;
        const dh = r.height - pH;
        if (dw > 0 && pR <= bL) r.left = bL - r.width;
        if (dh > 0 && pB <= bT) r.top  = bT - r.height;
      }
    } else {
      // Initial placement -- push to nearest clear side
      if (r.left + r.width <= bL || r.left >= bR || r.top + r.height <= bT || r.top >= bB) continue;
      const pushL = (r.left + r.width) - bL;
      const pushR = bR - r.left;
      const pushU = (r.top + r.height) - bT;
      const pushD = bB - r.top;
      const min = Math.min(pushL, pushR, pushU, pushD);
      if      (min === pushL) r.left = bL - r.width;
      else if (min === pushR) r.left = bR;
      else if (min === pushU) r.top  = bT - r.height;
      else                    r.top  = bB;
    }
  }

  r.left = Math.max(0, Math.min(100 - r.width, r.left));
  r.top  = Math.max(0, Math.min(100 - r.height, r.top));
  return r;
}

export { loadElements, saveElements, loadBoundaries, saveBoundaries, clampToBoundaries };
