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
  } catch {}
  return null;
}

export const DEV_DEFAULTS_KEY = 'wankr_login_dev_defaults';
export const LAYERS_LOCKED_KEY = 'wankr_layers_locked';
export const DEV_DEFAULTS = {
  meanBrightness: 50,
  appBackgroundBrightness: 50,
  panelBorderBrightness: 60,
  loginBrightness: 33,
  loginShadeOfGray: 100,
  loginLightToBlack: 100,
  leftCushion: -1,
  topCushion: 3,
  scaleX: 95,
  scaleY: 95,
  aspectLock: true,
  backScaleX: 100,
  backScaleY: 100,
  backOffsetX: 0,
  backOffsetY: 0,
  backlayerSharpness: 100,
  sceneScaleX: 100,
  sceneScaleY: 100,
  sceneOffsetX: 0,
  sceneOffsetY: 0,
  robotScaleX: 100,
  robotScaleY: 100,
  robotOffsetX: 0,
  robotOffsetY: 0,
  shoulderScaleX: 100,
  shoulderScaleY: 100,
  shoulderOffsetX: 0,
  shoulderOffsetY: 0,
  handLeftScaleX: 14,
  handLeftScaleY: 19,
  handLeftOffsetX: 72,
  handLeftOffsetY: -0.5,
  handRightScaleX: 14,
  handRightScaleY: 19,
  handRightOffsetX: -63,
  handRightOffsetY: -0.5,
  loginBoxWidth: 98,
  loginBoxHeight: 92,
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleScale: 100,
  subtitleOffsetX: 0,
  subtitleOffsetY: 0,
  subtitleScale: 100,
  formMarginTop: 0,
  inputHeightScale: 100,
  inputWidthScale: 100,
  formGap: 100,
  submitMinHeightScale: 100,
  bottomButtonsHeightScale: 100,
  buttonsVerticalGap: 100,
  buttonsBottomGap: 100,
  panelContentOffsetX: 0,
  panelRightMargin: 100,
  sparkBoundsTop: 10,
  sparkBoundsBottom: 90,
  sparkBoltThickness: 100,
  showLayerBackground: true,
  showLayerWankrBody: true,
  showLayerLogin: true,
  showLayerHands: true,
  characterSharpness: 100,
};

export function loadDevDefaults() {
  try {
    const raw = localStorage.getItem(DEV_DEFAULTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEV_DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...DEV_DEFAULTS };
}

export function saveDevDefaults(values) {
  try {
    localStorage.setItem(DEV_DEFAULTS_KEY, JSON.stringify(values));
  } catch {}
}
