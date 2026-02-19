export const CANVAS = { width: 1365, height: 2048 };
export const PANEL_BBOX_PCT = { left: 26.3736, top: 31.4453, width: 45.4212, height: 25.3906 };
/** Foot heels anchor on background (scene %). Character scales from here so heels stay fixed on the grid. */
export const FEET_ANCHOR_PCT = { x: 50, y: 92 };

/** Reference dimensions at CANVAS 1365×2048. Used to anchor layout; overrides other defaults when applied. */
export const ANCHOR_REFERENCE_PX = {
  fingerTipToFingerTip: 410,
  heelCornerToHeelCorner: 136,
  orbCenterToPanelBottomCenter: 194,
};
/** Scene % from reference px (1365 wide, 2048 tall). */
export const ANCHOR_REFERENCE_PCT = {
  fingerSpan: (ANCHOR_REFERENCE_PX.fingerTipToFingerTip / CANVAS.width) * 100,
  heelSpan: (ANCHOR_REFERENCE_PX.heelCornerToHeelCorner / CANVAS.width) * 100,
  orbToPanelBottom: (ANCHOR_REFERENCE_PX.orbCenterToPanelBottomCenter / CANVAS.height) * 100,
};
/** Neck point on body image (%). Placed at panel top when anchor overrides apply. */
export const NECK_ON_BODY_PCT = { x: 50, y: 22 };
/** Body point for left neck line (align with N stem). Used as transform origin when anchoring to N. */
export const NECK_LEFT_ON_BODY_PCT = { x: 48, y: 22 };
/** Left stem of "N" in title: offset from panel left as % of panel width (approx). Keeps left neck line inline with N. */
export const TITLE_N_LEFT_OFFSET_PANEL_PCT = 28;
/** When true, anchor overrides (neck, N, ring fingers, shoulders, 410/136/194px) override all other defaults. */
export const USE_ANCHOR_OVERRIDES = true;
/** Ring-finger line: offset above panel bottom as % of scene height (align with bottom buttons). */
export const RING_FINGER_ABOVE_PANEL_BOTTOM_PCT = 2.5;

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
export const DEFAULTS_VERSION = 14;
export const LAYERS_LOCKED_KEY = 'wankr_layers_locked';
export const PANE_LAYOUT_LOCKED_KEY = 'wankr_pane_layout_locked';
export const SHOULDERS_HANDS_LOCKED_KEY = 'wankr_shoulders_hands_locked';
export const BODY_PANEL_LOCKED_KEY = 'wankr_body_panel_locked';
/** Desktop defaults: locked-in layout from dev panel. Perma-saved values for instant revert via RESET TO PRIMARY DEFAULTS. */
export const DEV_DEFAULTS = {
  meanBrightness: 50,
  appBackgroundBrightness: 68,
  panelBorderBrightness: 46,
  loginBrightness: 14,
  loginShadeOfGray: 0,
  loginLightToBlack: 100,
  backlayerSharpness: 191,
  characterSharpness: 97,
  leftCushion: -3.5,
  topCushion: 12.25,
  scaleX: 106,
  scaleY: 133,
  aspectLock: true,
  backScaleX: 90,
  backScaleY: 90,
  backOffsetX: 0,
  backOffsetY: 0,
  sceneScaleX: 130,
  sceneScaleY: 130,
  sceneOffsetX: 0,
  sceneOffsetY: 0,
  robotScaleX: 84,
  robotScaleY: 108,
  robotOffsetX: 2,
  robotOffsetY: 0,
  shoulderScaleX: 97,
  shoulderScaleY: 114,
  shoulderOffsetX: 0,
  shoulderOffsetY: 0,
  handLeftScaleX: 14,
  handLeftScaleY: 15,
  handLeftOffsetX: 65,
  handLeftOffsetY: 1.5,
  handRightScaleX: 13,
  handRightScaleY: 13,
  handRightOffsetX: -68,
  handRightOffsetY: 2.5,
  loginBoxWidth: 109.5,
  loginBoxHeight: 96,
  panelContentOffsetX: -1,
  panelRightMargin: 140,
  titleOffsetX: 0,
  titleOffsetY: 18,
  titleScale: 129,
  subtitleOffsetX: 0,
  subtitleOffsetY: -8,
  subtitleScale: 100,
  formMarginTop: 0,
  inputHeightScale: 100,
  inputWidthScale: 94,
  formGap: 100,
  submitMinHeightScale: 100,
  bottomButtonsHeightScale: 100,
  buttonsVerticalGap: 100,
  buttonsBottomGap: 9,
  titleTopGap: -5.5,
  titleToSubtitleGap: 0,
  subtitleToUsernameGap: 0.7,
  usernamePasswordGap: 3,
  passwordToSubmitGap: 2.9,
  submitToButtonsGap: 3,
  controlHeightScale: 108,
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

/**
 * Anchor-override defaults: force robot centered on screen. Merged on top of loaded defaults when USE_ANCHOR_OVERRIDES.
 * All position offsets 0 so scene and character stay centered (scene unit and body/robot/hands use their anchors with no shift).
 */
export const ANCHOR_OVERRIDE_DEFAULTS = {
  sceneOffsetX: 0,
  sceneOffsetY: 0,
  backOffsetX: 0,
  backOffsetY: 0,
  robotOffsetX: 0,
  robotOffsetY: 0,
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
  loginBoxWidth: [50, 150], loginBoxHeight: [60, 150],
  titleOffsetX: [-100, 100], titleOffsetY: [-100, 100], titleScale: [50, 200],
  subtitleOffsetX: [-100, 100], subtitleOffsetY: [-100, 100], subtitleScale: [50, 200],
  formMarginTop: [-50, 50], inputHeightScale: [50, 200], inputWidthScale: [50, 200],
  formGap: [50, 200], submitMinHeightScale: [50, 200], bottomButtonsHeightScale: [50, 200],
  buttonsVerticalGap: [50, 200], buttonsBottomGap: [0, 300],
  titleTopGap: [-10, 15], titleToSubtitleGap: [0, 5], subtitleToUsernameGap: [0, 5],
  usernamePasswordGap: [0, 5], passwordToSubmitGap: [0, 5], submitToButtonsGap: [0, 5],
  controlHeightScale: [80, 200], panelContentOffsetX: [-50, 50], panelRightMargin: [50, 150],
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
 * Load dev defaults. Returns code defaults only (no localStorage).
 * Saved layout lives on the backend; all locations get it from GET /api/settings/dev-defaults.
 */
export function loadDevDefaults() {
  return getPrimaryDevDefaults();
}

/** Code defaults (no storage). Use to revert layout to your primary defaults. */
export function getPrimaryDevDefaults() {
  const base = isIOS() ? { ...DEV_DEFAULTS_IOS } : { ...DEV_DEFAULTS };
  return USE_ANCHOR_OVERRIDES ? { ...base, ...ANCHOR_OVERRIDE_DEFAULTS } : base;
}

/**
 * Fetch saved dev defaults from backend (single source of truth for all ports).
 * Returns sanitized object or null if 404/error.
 */
export function fetchDevDefaultsFromBackend(api) {
  if (!api || typeof api.get !== 'function') return Promise.resolve(null);
  return api
    .get('/api/settings/dev-defaults')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || typeof data !== 'object') return null;
      const base = isIOS() ? { ...DEV_DEFAULTS_IOS } : { ...DEV_DEFAULTS };
      const sanitized = sanitizeDevDefaults(data, base);
      return USE_ANCHOR_OVERRIDES ? { ...sanitized, ...ANCHOR_OVERRIDE_DEFAULTS } : sanitized;
    })
    .catch(() => null);
}

/** No-op: saved layout is only on backend. Callers POST to /api/settings/dev-defaults. */
export function saveDevDefaults() {
  // Single source of truth is backend; no per-port localStorage.
}

/** Remove all wankr-related keys from localStorage and sessionStorage. Call then refresh to get fresh code defaults and reset app state. */
export function clearAllWankrCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wankr_')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('wankr_')) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}
