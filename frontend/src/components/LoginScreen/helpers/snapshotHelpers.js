import { ALLOWED_DEV_DEFAULT_KEYS } from '../loginScreenConfig';

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

/** Default values when applying a snapshot (missing or invalid key). Kept in sync with apply logic. */
export const SNAPSHOT_FALLBACKS = Object.freeze({
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
  loginBoxHeight: 85,
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
  titleTopGap: 1,
  titleToSubtitleGap: 0.5,
  subtitleToUsernameGap: 1,
  usernamePasswordGap: 1,
  passwordToSubmitGap: 1,
  submitToButtonsGap: 1,
  controlHeightScale: 100,
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
});

export function getSnapshotFallbacks() {
  return SNAPSHOT_FALLBACKS;
}

/** Normalize legacy loginBoxHeight 92 -> 85. */
export function normalizeLoginBoxHeight(value) {
  return value === 92 ? 85 : (value ?? SNAPSHOT_FALLBACKS.loginBoxHeight);
}
