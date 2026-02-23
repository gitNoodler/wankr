import { ALLOWED_DEV_DEFAULT_KEYS, DEV_DEFAULTS, getPrimaryDevDefaults } from '../loginScreenConfig';

/**
 * Builds a snapshot object from current dev state (for undo/save).
 * Single source of truth for snapshot shape; state uses appBackgroundSharpness, snapshot uses backlayerSharpness.
 */
export function buildSnapshotFrom(state) {
  const snap = {};
  for (const key of ALLOWED_DEV_DEFAULT_KEYS) {
    if (key === 'backlayerSharpness') {
      snap[key] = state.appBackgroundSharpness ?? 100;
    } else {
      snap[key] = state[key];
    }
  }
  return snap;
}

/** Default values when applying a snapshot (missing or invalid key). Derived from DEV_DEFAULTS (single source of truth). */
export const SNAPSHOT_FALLBACKS = Object.freeze(getPrimaryDevDefaults());

export function getSnapshotFallbacks() {
  return SNAPSHOT_FALLBACKS;
}

/** Normalize loginBoxHeight using DEV_DEFAULTS fallback. */
export function normalizeLoginBoxHeight(value) {
  return value ?? SNAPSHOT_FALLBACKS.loginBoxHeight;
}
