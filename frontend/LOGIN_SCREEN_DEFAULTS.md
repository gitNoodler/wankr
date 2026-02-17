# Login Screen Primary Defaults

Fallback reference for `loginScreenConfig.js`. Use when reverting layout or restoring defaults.

---

## Canvas & Panel

| Key | Default |
|-----|---------|
| `CANVAS` | `{ width: 1365, height: 2048 }` |
| `PANEL_BBOX_PCT` | `{ left: 26.3736, top: 31.4453, width: 45.4212, height: 25.3906 }` |

---

## Brightness & Color

| Key | Default |
|-----|---------|
| `meanBrightness` | 50 |
| `appBackgroundBrightness` | 62 |
| `panelBorderBrightness` | 5 |
| `loginBrightness` | 14 |
| `loginShadeOfGray` | 100 |
| `loginLightToBlack` | 95 |

---

## Scene & Robot Layout

| Key | Default |
|-----|---------|
| `leftCushion` | -1 |
| `topCushion` | 3 |
| `scaleX` | 95 |
| `scaleY` | 95 |
| `aspectLock` | true |
| `backScaleX` | 100 |
| `backScaleY` | 100 |
| `backOffsetX` | 0 |
| `backOffsetY` | 0 |
| `backlayerSharpness` | 162 |
| `sceneScaleX` | 100 |
| `sceneScaleY` | 100 |
| `sceneOffsetX` | 0 |
| `sceneOffsetY` | 0 |
| `robotScaleX` | 100 |
| `robotScaleY` | 100 |
| `robotOffsetX` | 0 |
| `robotOffsetY` | 0 |
| `characterSharpness` | 88 |

---

## Shoulders & Hands

| Key | Default |
|-----|---------|
| `shoulderScaleX` | 100 |
| `shoulderScaleY` | 100 |
| `shoulderOffsetX` | 0 |
| `shoulderOffsetY` | 32.5 |
| `handLeftScaleX` | 14 |
| `handLeftScaleY` | 16 |
| `handLeftOffsetX` | 65 |
| `handLeftOffsetY` | 35.5 |
| `handRightScaleX` | 10 |
| `handRightScaleY` | 13 |
| `handRightOffsetX` | -71 |
| `handRightOffsetY` | 36.5 |

---

## Login Panel & Form

| Key | Default |
|-----|---------|
| `loginBoxWidth` | 98 |
| `loginBoxHeight` | 92 |
| `panelContentOffsetX` | 0 |
| `panelRightMargin` | 100 |
| `titleOffsetX` | 0 |
| `titleOffsetY` | 0 |
| `titleScale` | 100 |
| `subtitleOffsetX` | 0 |
| `subtitleOffsetY` | 0 |
| `subtitleScale` | 100 |
| `formMarginTop` | 0 |
| `inputHeightScale` | 100 |
| `inputWidthScale` | 100 |
| `formGap` | 100 |
| `submitMinHeightScale` | 100 |
| `bottomButtonsHeightScale` | 100 |
| `buttonsVerticalGap` | 100 |
| `buttonsBottomGap` | 100 |
| `controlHeightScale` | 100 |
| `titleTopGap` | 1 |
| `titleToSubtitleGap` | 0.5 |
| `subtitleToUsernameGap` | 1 |
| `usernamePasswordGap` | 1 |
| `passwordToSubmitGap` | 1 |
| `submitToButtonsGap` | 1 |

---

## Effects & Sparks

| Key | Default |
|-----|---------|
| `sparkBoundsTop` | 10 |
| `sparkBoundsBottom` | 44 |
| `sparkBoltThickness` | 20 |

---

## Layer Visibility

| Key | Default |
|-----|---------|
| `showLayerBackground` | true |
| `showLayerWankrBody` | true |
| `showLayerLogin` | true |
| `showLayerHands` | true |

---

## Animations

| Name | Behavior |
|------|----------|
| `wankrWaiting` | 6s loop, subtle body glow at 94–96% |
| `glowReflectPulse` | Opacity 0.6 → 1 for leg reflection |
| `spin` | Loading/username availability check |

---

## iOS Overrides

Desktop → iOS overrides:

| Key | Desktop | iOS |
|-----|---------|-----|
| `loginBoxHeight` | 92 | 120 |
| `controlHeightScale` | 100 | 120 |

---

*Source: `frontend/src/components/LoginScreen/loginScreenConfig.js`*
