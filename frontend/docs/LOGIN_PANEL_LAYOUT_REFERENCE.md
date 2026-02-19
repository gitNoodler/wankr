# Login panel layout reference (for reimplementation)

Use this when re-adding the login panel and buttons after cleanup. The scene is **robot-only over black** until then.

## Panel position and size (scene %)

- **Source:** `frontend/src/components/LoginScreen/loginScreenConfig.js`
- **PANEL_BBOX_PCT:** `{ left: 26.3736, top: 31.4453, width: 45.4212, height: 25.3906 }`
- Panel is positioned in the scene unit; character (body, shoulders, hands) anchor to **panel center**:  
  `panelCenterX = PANEL_BBOX_PCT.left + leftCushion + (PANEL_BBOX_PCT.width * (loginBoxWidth/100)) / 2`  
  `panelCenterY = PANEL_BBOX_PCT.top + topCushion + (PANEL_BBOX_PCT.height * (loginBoxHeight/100)) / 2`

## Panel styling (when re-adding the panel div in RobotScene)

- Outer float: `left`, `top`, `width`, `height` from PANEL_BBOX_PCT + leftCushion/topCushion, loginBoxWidth/loginBoxHeight, scaleX/scaleY.
- Filter: `drop-shadow(0 0 8px rgba(0,255,65,0.15)) drop-shadow(0 0 24px rgba(0,255,65,0.08))`.
- Inner box: `panelBg` (from `computePanelBackground(loginBrightness, loginShadeOfGray, loginLightToBlack)`), border `2px solid rgba(0, 255, 65, panelBorderBrightness/100)`, boxShadow (see RobotScene history), borderRadius `2.5cqi`, padding `2*(buttonsBottomGap/100)cqi`, `1.25*(panelRightMargin/100)cqi`, `max(12px, 2*(buttonsBottomGap/100)cqi)`.
- Container: `containerType: 'size'`, flex column, `panelContent` as children.

## Panel content: LoginForm structure (vertical order)

1. **Title** – "WANKR BOT"  
   - `marginTop: titleTopGap cqi`, `fontSize: 12*titleScale/100 cqi`, transform `translate(titleOffsetX%, titleOffsetY%)`.

2. **Subtitle row** – "DEGEN LOGIN" / "NEW DEGEN" + optional Back button  
   - `marginTop: titleToSubtitleGap cqi`, transform `translate(subtitleOffsetX%, subtitleOffsetY%)`, `fontSize: 6*subtitleScale/100 cqi`.

3. **Error line** (if error).

4. **Form** – `marginTop: subtitleToUsernameGap cqi`  
   - Username row (icon + input), gap `1.5cqi`.  
   - Optional email row (register only), `marginTop: usernamePasswordGap cqi`.  
   - Password row, `marginTop: usernamePasswordGap cqi`.  
   - Confirm password row (register only), `marginTop: usernamePasswordGap cqi`.  
   - Submit button, `marginTop: passwordToSubmitGap cqi`, full width, minHeight `8*controlHeightScale/100 cqi`.

5. **Buttons row** (login mode only) – New User + Spectate  
   - `marginTop: submitToButtonsGap cqi`, flex gap `1.5cqi`.

6. **Tagline** – "Don't miss out!..."  
   - `marginTop: 2cqi`, `marginBottom: 2cqi`.

## LoginForm props (from buildDevPanelProps / state)

- Layout: `titleOffsetX`, `titleOffsetY`, `titleScale`, `subtitleOffsetX`, `subtitleOffsetY`, `subtitleScale`, `inputWidthScale`, `titleTopGap`, `titleToSubtitleGap`, `subtitleToUsernameGap`, `usernamePasswordGap`, `passwordToSubmitGap`, `submitToButtonsGap`, `controlHeightScale`.
- Auth: `username`, `password`, `confirmPassword`, `email`, `isRegistering`, `usernameStatus`, `loading`, `error`, `onUsernameChange`, `setPassword`, `onConfirmPasswordChange`, `onEmailChange`, `onSubmit`, `onNewUser`, `onSpectate`, `onBackToLogin`.

## Where to re-enable

- **RobotScene.jsx:** Restore the panel float block when `panelContent != null` (see git history for the exact div with `ref={panelFloatRef}` and inner box rendering `{panelContent}`).
- **LoginScreen.jsx:** Pass `panelContent={<LoginForm ... />}` again into RobotScene and restore any wrapper needed for the form (single uniform canvas can stay; panel is inside the scene).
