export const CANVAS = { width: 1365, height: 2048 };
export const PANEL_BBOX_PCT = { left: 26.3736, top: 31.4453, width: 45.4212, height: 25.3906 };

export const GLOW_POINT_KEY = 'wankr_glow_point';

export function loadGlowPoint() {
  try {
    const raw = localStorage.getItem(GLOW_POINT_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.x != null && p?.y != null) return p;
    }
  } catch { /* ignore */ }
  return null;
}

/** True on iPhone, iPad, iPod (including iPadOS 13+ desktop UA). */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (['iPhone', 'iPad', 'iPod', 'iPhone Simulator', 'iPad Simulator', 'iPod Simulator'].includes(platform)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** True when viewport is portrait (tall). Used for iOS: portrait = 120/120 layout, landscape = desktop layout. */
export function isPortrait() {
  if (typeof window === 'undefined') return true;
  return window.innerHeight >= window.innerWidth;
}

export const DEV_DEFAULTS_KEY = 'wankr_login_dev_defaults';
export const DEV_DEFAULTS_KEY_IOS = 'wankr_login_dev_defaults_ios';
/** Bump this when code defaults change; stored data with an older version is ignored so new defaults apply automatically. */
export const DEFAULTS_VERSION = 7;
export const LAYERS_LOCKED_KEY = 'wankr_layers_locked';
export const DUCT_TAPE_STRIPS_KEY = 'wankr_duct_tape_strips';
export const RESPECT_DUCT_TAPE_KEY = 'wankr_respect_duct_tape';
export const PANE_LAYOUT_LOCKED_KEY = 'wankr_pane_layout_locked';
export const SHOULDERS_HANDS_LOCKED_KEY = 'wankr_shoulders_hands_locked';
export const BODY_PANEL_LOCKED_KEY = 'wankr_body_panel_locked';
/** Desktop defaults: locked-in layout from dev panel (scene, robot, body, hands, login pane, layout, effects). */
export const DEV_DEFAULTS = {
  meanBrightness: 50,
  appBackgroundBrightness: 62,
  panelBorderBrightness: 5,
  loginBrightness: 14,
  loginShadeOfGray: 100,
  loginLightToBlack: 95,
  backlayerSharpness: 162,
  characterSharpness: 88,
  leftCushion: -1,
  topCushion: 5.75,
  scaleX: 94,
  scaleY: 116,
  aspectLock: true,
  backScaleX: 90,
  backScaleY: 90,
  backOffsetX: 0,
  backOffsetY: 0,
  sceneScaleX: 95,
  sceneScaleY: 95,
  sceneOffsetX: 0,
  sceneOffsetY: 6,
  robotScaleX: 86,
  robotScaleY: 125,
  robotOffsetX: -0.5,
  robotOffsetY: -41.5,
  shoulderScaleX: 103,
  shoulderScaleY: 105,
  shoulderOffsetX: 0.5,
  shoulderOffsetY: 32.5,
  handLeftScaleX: 13,
  handLeftScaleY: 14,
  handLeftOffsetX: 68.5,
  handLeftOffsetY: 34.5,
  handRightScaleX: 11,
  handRightScaleY: 11,
  handRightOffsetX: -71.5,
  handRightOffsetY: 36,
  loginBoxWidth: 98,
  loginBoxHeight: 85,
  panelContentOffsetX: 0,
  panelRightMargin: 100,
  titleOffsetX: 0,
  titleOffsetY: 9,
  titleScale: 100,
  subtitleOffsetX: 0,
  subtitleOffsetY: -30.5,
  subtitleScale: 100,
  formMarginTop: 0,
  inputHeightScale: 100,
  inputWidthScale: 85,
  formGap: 100,
  submitMinHeightScale: 100,
  bottomButtonsHeightScale: 100,
  buttonsVerticalGap: 100,
  buttonsBottomGap: 37,
  titleTopGap: -5.5,
  titleToSubtitleGap: 0.5,
  subtitleToUsernameGap: 0,
  usernamePasswordGap: 3.2,
  passwordToSubmitGap: 2.7,
  submitToButtonsGap: 3.1,
  controlHeightScale: 115,
  sparkBoundsTop: 10,
  sparkBoundsBottom: 44,
  sparkBoltThickness: 20,
  showLayerBackground: true,
  showLayerWankrBody: true,
  showLayerLogin: true,
  showLayerHands: true,
};

/** iOS-specific defaults (taller panel/controls so content fits). */
export const DEV_DEFAULTS_IOS = {
  ...DEV_DEFAULTS,
  loginBoxHeight: 120,
  controlHeightScale: 120,
};

/** Allowed keys for dev defaults. Unknown keys from storage or API are dropped so layout cannot be broken by tampering. */
export const ALLOWED_DEV_DEFAULT_KEYS = Object.freeze([
  'meanBrightness', 'appBackgroundBrightness', 'panelBorderBrightness', 'loginBrightness', 'loginShadeOfGray', 'loginLightToBlack',
  'leftCushion', 'topCushion', 'scaleX', 'scaleY', 'aspectLock',
  'backScaleX', 'backScaleY', 'backOffsetX', 'backOffsetY', 'backlayerSharpness',
  'sceneScaleX', 'sceneScaleY', 'sceneOffsetX', 'sceneOffsetY',
  'robotScaleX', 'robotScaleY', 'robotOffsetX', 'robotOffsetY',
  'shoulderScaleX', 'shoulderScaleY', 'shoulderOffsetX', 'shoulderOffsetY',
  'handLeftScaleX', 'handLeftScaleY', 'handLeftOffsetX', 'handLeftOffsetY',
  'handRightScaleX', 'handRightScaleY', 'handRightOffsetX', 'handRightOffsetY',
  'loginBoxWidth', 'loginBoxHeight', 'titleOffsetX', 'titleOffsetY', 'titleScale',
  'subtitleOffsetX', 'subtitleOffsetY', 'subtitleScale', 'formMarginTop',
  'inputHeightScale', 'inputWidthScale', 'formGap', 'submitMinHeightScale',
  'bottomButtonsHeightScale', 'buttonsVerticalGap', 'buttonsBottomGap',
  'titleTopGap', 'titleToSubtitleGap', 'subtitleToUsernameGap', 'usernamePasswordGap',
  'passwordToSubmitGap', 'submitToButtonsGap', 'controlHeightScale',
  'panelContentOffsetX', 'panelRightMargin',
  'sparkBoundsTop', 'sparkBoundsBottom', 'sparkBoltThickness',
  'showLayerBackground', 'showLayerWankrBody', 'showLayerLogin', 'showLayerHands',
  'characterSharpness',
]);

/** [min, max] for numeric keys. Values outside range are clamped so saved/corrupt data cannot break layout. */
const DEV_DEFAULT_CLAMPS = {
  meanBrightness: [0, 100], appBackgroundBrightness: [0, 100], panelBorderBrightness: [0, 100],
  loginBrightness: [0, 100], loginShadeOfGray: [0, 100], loginLightToBlack: [0, 100],
  leftCushion: [-80, 150], topCushion: [-80, 150], scaleX: [50, 150], scaleY: [50, 150],
  backScaleX: [50, 200], backScaleY: [50, 200], backOffsetX: [-200, 200], backOffsetY: [-200, 200],
  backlayerSharpness: [50, 200], sceneScaleX: [50, 200], sceneScaleY: [50, 200],
  sceneOffsetX: [-200, 200], sceneOffsetY: [-200, 200],
  robotScaleX: [50, 200], robotScaleY: [50, 200], robotOffsetX: [-200, 200], robotOffsetY: [-200, 200],
  shoulderScaleX: [50, 200], shoulderScaleY: [50, 200], shoulderOffsetX: [-200, 200], shoulderOffsetY: [-200, 200],
  handLeftScaleX: [1, 50], handLeftScaleY: [1, 50], handLeftOffsetX: [-200, 200], handLeftOffsetY: [-50, 50],
  handRightScaleX: [1, 50], handRightScaleY: [1, 50], handRightOffsetX: [-200, 200], handRightOffsetY: [-50, 50],
  loginBoxWidth: [50, 100], loginBoxHeight: [60, 150],
  titleOffsetX: [-100, 100], titleOffsetY: [-100, 100], titleScale: [50, 200],
  subtitleOffsetX: [-100, 100], subtitleOffsetY: [-100, 100], subtitleScale: [50, 200],
  formMarginTop: [-50, 50], inputHeightScale: [50, 200], inputWidthScale: [50, 200],
  formGap: [50, 200], submitMinHeightScale: [50, 200], bottomButtonsHeightScale: [50, 200],
  buttonsVerticalGap: [50, 200], buttonsBottomGap: [20, 300],
  titleTopGap: [-10, 15], titleToSubtitleGap: [0, 5], subtitleToUsernameGap: [0, 5],
  usernamePasswordGap: [0, 5], passwordToSubmitGap: [0, 5], submitToButtonsGap: [0, 5],
  controlHeightScale: [80, 200], panelContentOffsetX: [-50, 50], panelRightMargin: [50, 150],
  sparkBoundsTop: [0, 100], sparkBoundsBottom: [0, 100],   sparkBoltThickness: [10, 200],
  characterSharpness: [50, 200],
};

function clampNum(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/** Allowlist and clamp parsed/saved values. Only known keys with valid ranges are applied. */
function sanitizeDevDefaults(obj, base) {
  const out = { ...base };
  const allowedSet = new Set(ALLOWED_DEV_DEFAULT_KEYS);
  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) continue;
    const baseVal = base[key];
    if (typeof baseVal === 'boolean') {
      out[key] = Boolean(obj[key]);
    } else if (typeof baseVal === 'number') {
      const range = DEV_DEFAULT_CLAMPS[key];
      out[key] = range ? clampNum(obj[key], range[0], range[1]) : (Number(obj[key]) || baseVal);
    }
  }
  return out;
}

const ALLOWED_KEYS_SET = new Set(ALLOWED_DEV_DEFAULT_KEYS);

/**
 * Returns true only if the stored object is from our save flow: has defaultsVersion
 * and contains no keys other than defaultsVersion and ALLOWED_DEV_DEFAULT_KEYS.
 * Rejects any script-injected or tampered payload.
 */
function isTrustedStoredDefaults(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (parsed.defaultsVersion !== DEFAULTS_VERSION) return false;
  for (const key of Object.keys(parsed)) {
    if (key === 'defaultsVersion') continue;
    if (!ALLOWED_KEYS_SET.has(key)) return false;
  }
  return true;
}

/**
 * Load dev defaults. Always defaults to code DEV_DEFAULTS (your defaults).
 * Only accepts storage that was saved by us with the current DEFAULTS_VERSION
 * and no extra keys. Rejects any other payload (scripts, tampering, old format):
 * returns code defaults and overwrites storage so the bad data is removed.
 */
export function loadDevDefaults() {
  const isIos = isIOS();
  const key = isIos ? DEV_DEFAULTS_KEY_IOS : DEV_DEFAULTS_KEY;
  const base = isIos ? { ...DEV_DEFAULTS_IOS } : { ...DEV_DEFAULTS };
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isTrustedStoredDefaults(parsed)) {
        const d = sanitizeDevDefaults(parsed, base);
        if (!isIos && d.loginBoxHeight === 92) d.loginBoxHeight = 85;
        return d;
      }
    }
  } catch { /* ignore */ }
  try {
    const desktopSafe = { ...DEV_DEFAULTS, defaultsVersion: DEFAULTS_VERSION };
    const iosSafe = { ...DEV_DEFAULTS_IOS, defaultsVersion: DEFAULTS_VERSION };
    localStorage.setItem(DEV_DEFAULTS_KEY, JSON.stringify(desktopSafe));
    localStorage.setItem(DEV_DEFAULTS_KEY_IOS, JSON.stringify(iosSafe));
  } catch { /* ignore */ }
  return base;
}

/** Code defaults (no storage). Use to revert layout to your primary defaults. */
export function getPrimaryDevDefaults() {
  return isIOS() ? { ...DEV_DEFAULTS_IOS } : { ...DEV_DEFAULTS };
}

export function saveDevDefaults(values) {
  try {
    const base = isIOS() ? { ...DEV_DEFAULTS_IOS } : { ...DEV_DEFAULTS };
    const sanitized = sanitizeDevDefaults(values ?? {}, base);
    sanitized.defaultsVersion = DEFAULTS_VERSION;
    const json = JSON.stringify(sanitized);
    localStorage.setItem(DEV_DEFAULTS_KEY, json);
    localStorage.setItem(DEV_DEFAULTS_KEY_IOS, json);
  } catch { /* ignore */ }
}

/** Load duct tape strips from storage. Each strip: { id, x1, y1, x2, y2 } in 0–1 (scene-normalized). */
export function loadDuctTapeStrips() {
  try {
    const raw = localStorage.getItem(DUCT_TAPE_STRIPS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.every((s) => s && typeof s.x1 === 'number' && typeof s.y1 === 'number' && typeof s.x2 === 'number' && typeof s.y2 === 'number')) {
        return arr.map((s, i) => ({ id: s.id ?? `tape-${i}`, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
      }
    }
  } catch { /* ignore */ }
  return [];
}

/** Persist duct tape strips. */
export function saveDuctTapeStrips(strips) {
  try {
    localStorage.setItem(DUCT_TAPE_STRIPS_KEY, JSON.stringify(strips));
  } catch { /* ignore */ }
}

export function loadRespectDuctTape() {
  try {
    const v = localStorage.getItem(RESPECT_DUCT_TAPE_KEY);
    return v !== 'false';
  } catch { /* ignore */ }
  return true;
}

export function saveRespectDuctTape(value) {
  try {
    localStorage.setItem(RESPECT_DUCT_TAPE_KEY, value ? 'true' : 'false');
  } catch { /* ignore */ }
}
