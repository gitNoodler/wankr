const STORAGE_KEY = 'wankr_effects_bounds';

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.left != null && p?.top != null && p?.right != null && p?.bottom != null) return p;
    }
  } catch { /* ignore */ }
  return null;
}

export function loadEffectsBounds() {
  return loadSaved();
}

export function saveBounds(bounds) {
  try {
    if (bounds) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bounds));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* ignore */ }
}

export { loadSaved };
