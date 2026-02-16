import { useState, useRef, useEffect, useCallback } from 'react';
import { DEV_DEFAULTS } from './loginScreenConfig';
import { api } from '../../utils/api';

/** Builds a snapshot object from current dev state (for undo). */
function buildSnapshotFrom(s) {
  return {
    meanBrightness: s.meanBrightness,
    appBackgroundBrightness: s.appBackgroundBrightness,
    panelBorderBrightness: s.panelBorderBrightness,
    loginBrightness: s.loginBrightness,
    loginShadeOfGray: s.loginShadeOfGray,
    loginLightToBlack: s.loginLightToBlack,
    leftCushion: s.leftCushion,
    topCushion: s.topCushion,
    scaleX: s.scaleX,
    scaleY: s.scaleY,
    aspectLock: s.aspectLock,
    backScaleX: s.backScaleX,
    backScaleY: s.backScaleY,
    backOffsetX: s.backOffsetX,
    backOffsetY: s.backOffsetY,
    backlayerSharpness: s.appBackgroundSharpness,
    sceneScaleX: s.sceneScaleX,
    sceneScaleY: s.sceneScaleY,
    sceneOffsetX: s.sceneOffsetX,
    sceneOffsetY: s.sceneOffsetY,
    robotScaleX: s.robotScaleX,
    robotScaleY: s.robotScaleY,
    robotOffsetX: s.robotOffsetX,
    robotOffsetY: s.robotOffsetY,
    shoulderScaleX: s.shoulderScaleX,
    shoulderScaleY: s.shoulderScaleY,
    shoulderOffsetX: s.shoulderOffsetX,
    shoulderOffsetY: s.shoulderOffsetY,
    handLeftScaleX: s.handLeftScaleX,
    handLeftScaleY: s.handLeftScaleY,
    handLeftOffsetX: s.handLeftOffsetX,
    handLeftOffsetY: s.handLeftOffsetY,
    handRightScaleX: s.handRightScaleX,
    handRightScaleY: s.handRightScaleY,
    handRightOffsetX: s.handRightOffsetX,
    handRightOffsetY: s.handRightOffsetY,
    loginBoxWidth: s.loginBoxWidth,
    loginBoxHeight: s.loginBoxHeight,
    titleOffsetX: s.titleOffsetX,
    titleOffsetY: s.titleOffsetY,
    titleScale: s.titleScale,
    subtitleOffsetX: s.subtitleOffsetX,
    subtitleOffsetY: s.subtitleOffsetY,
    subtitleScale: s.subtitleScale,
    formMarginTop: s.formMarginTop,
    inputHeightScale: s.inputHeightScale,
    inputWidthScale: s.inputWidthScale,
    formGap: s.formGap,
    submitMinHeightScale: s.submitMinHeightScale,
    bottomButtonsHeightScale: s.bottomButtonsHeightScale,
    buttonsVerticalGap: s.buttonsVerticalGap,
    buttonsBottomGap: s.buttonsBottomGap,
    panelContentOffsetX: s.panelContentOffsetX,
    panelRightMargin: s.panelRightMargin,
    sparkBoundsTop: s.sparkBoundsTop,
    sparkBoundsBottom: s.sparkBoundsBottom,
    sparkBoltThickness: s.sparkBoltThickness,
    showLayerBackground: s.showLayerBackground,
    showLayerWankrBody: s.showLayerWankrBody,
    showLayerLogin: s.showLayerLogin,
    showLayerHands: s.showLayerHands,
    characterSharpness: s.characterSharpness,
  };
}

/** Centralized state for the login screen layout and dev panel. */
export function useLoginScreenState({ appBackgroundBrightness, appBackgroundSharpness, onAppBackgroundBrightnessChange, onAppBackgroundSharpnessChange }) {
  // Same initial state on 5173 and 5000 so first paint is identical; API overwrites after fetch
  const d = { ...DEV_DEFAULTS };
  const [defaultsReady, setDefaultsReady] = useState(false);

  const [meanBrightness, setMeanBrightness] = useState(d.meanBrightness);
  const [panelBorderBrightness, setPanelBorderBrightness] = useState(d.panelBorderBrightness);
  const [loginBrightness, setLoginBrightness] = useState(d.loginBrightness);
  const [loginShadeOfGray, setLoginShadeOfGray] = useState(d.loginShadeOfGray);
  const [loginLightToBlack, setLoginLightToBlack] = useState(d.loginLightToBlack);
  const [leftCushion, setLeftCushion] = useState(d.leftCushion);
  const [topCushion, setTopCushion] = useState(d.topCushion);
  const [scaleX, setScaleX] = useState(d.scaleX);
  const [scaleY, setScaleY] = useState(d.scaleY);
  const [aspectLock, setAspectLock] = useState(d.aspectLock);
  const [backScaleX, setBackScaleX] = useState(d.backScaleX ?? 100);
  const [backScaleY, setBackScaleY] = useState(d.backScaleY ?? 100);
  const [backOffsetX, setBackOffsetX] = useState(d.backOffsetX ?? 0);
  const [backOffsetY, setBackOffsetY] = useState(d.backOffsetY ?? 0);
  const [sceneScaleX, setSceneScaleX] = useState(d.sceneScaleX ?? 100);
  const [sceneScaleY, setSceneScaleY] = useState(d.sceneScaleY ?? 100);
  const [sceneOffsetX, setSceneOffsetX] = useState(d.sceneOffsetX ?? 0);
  const [sceneOffsetY, setSceneOffsetY] = useState(d.sceneOffsetY ?? 0);
  const [robotScaleX, setRobotScaleX] = useState(d.robotScaleX ?? 100);
  const [robotScaleY, setRobotScaleY] = useState(d.robotScaleY ?? 100);
  const [robotOffsetX, setRobotOffsetX] = useState(d.robotOffsetX ?? 0);
  const [robotOffsetY, setRobotOffsetY] = useState(d.robotOffsetY ?? 0);
  const [shoulderScaleX, setShoulderScaleX] = useState(d.shoulderScaleX ?? 100);
  const [shoulderScaleY, setShoulderScaleY] = useState(d.shoulderScaleY ?? 100);
  const [shoulderOffsetX, setShoulderOffsetX] = useState(d.shoulderOffsetX ?? 0);
  const [shoulderOffsetY, setShoulderOffsetY] = useState(d.shoulderOffsetY ?? 0);
  const [handLeftScaleX, setHandLeftScaleX] = useState(d.handLeftScaleX ?? 100);
  const [handLeftScaleY, setHandLeftScaleY] = useState(d.handLeftScaleY ?? 100);
  const [handLeftOffsetX, setHandLeftOffsetX] = useState(d.handLeftOffsetX ?? 0);
  const [handLeftOffsetY, setHandLeftOffsetY] = useState(d.handLeftOffsetY ?? 0);
  const [handRightScaleX, setHandRightScaleX] = useState(d.handRightScaleX ?? 100);
  const [handRightScaleY, setHandRightScaleY] = useState(d.handRightScaleY ?? 100);
  const [handRightOffsetX, setHandRightOffsetX] = useState(d.handRightOffsetX ?? 0);
  const [handRightOffsetY, setHandRightOffsetY] = useState(d.handRightOffsetY ?? 0);
  const [loginBoxWidth, setLoginBoxWidth] = useState(d.loginBoxWidth);
  const [loginBoxHeight, setLoginBoxHeight] = useState(d.loginBoxHeight);
  const [titleOffsetX, setTitleOffsetX] = useState(d.titleOffsetX ?? 0);
  const [titleOffsetY, setTitleOffsetY] = useState(d.titleOffsetY ?? 0);
  const [titleScale, setTitleScale] = useState(d.titleScale ?? 100);
  const [subtitleOffsetX, setSubtitleOffsetX] = useState(d.subtitleOffsetX ?? 0);
  const [subtitleOffsetY, setSubtitleOffsetY] = useState(d.subtitleOffsetY ?? 0);
  const [subtitleScale, setSubtitleScale] = useState(d.subtitleScale ?? 100);
  const [formMarginTop, setFormMarginTop] = useState(d.formMarginTop ?? 0);
  const [inputHeightScale, setInputHeightScale] = useState(d.inputHeightScale ?? 100);
  const [inputWidthScale, setInputWidthScale] = useState(d.inputWidthScale ?? 100);
  const [formGap, setFormGap] = useState(d.formGap ?? 100);
  const [submitMinHeightScale, setSubmitMinHeightScale] = useState(d.submitMinHeightScale ?? 100);
  const [bottomButtonsHeightScale, setBottomButtonsHeightScale] = useState(d.bottomButtonsHeightScale ?? 100);
  const [buttonsVerticalGap, setButtonsVerticalGap] = useState(d.buttonsVerticalGap ?? 100);
  const [buttonsBottomGap, setButtonsBottomGap] = useState(d.buttonsBottomGap ?? 100);
  const [panelContentOffsetX, setPanelContentOffsetX] = useState(d.panelContentOffsetX ?? 0);
  const [panelRightMargin, setPanelRightMargin] = useState(d.panelRightMargin ?? 100);
  const [sparkBoundsTop, setSparkBoundsTop] = useState(d.sparkBoundsTop ?? 10);
  const [sparkBoundsBottom, setSparkBoundsBottom] = useState(d.sparkBoundsBottom ?? 90);
  const [sparkBoltThickness, setSparkBoltThickness] = useState(d.sparkBoltThickness ?? 100);
  const [showLayerBackground, setShowLayerBackground] = useState(d.showLayerBackground ?? true);
  const [showLayerWankrBody, setShowLayerWankrBody] = useState(d.showLayerWankrBody ?? true);
  const [showLayerLogin, setShowLayerLogin] = useState(d.showLayerLogin ?? true);
  const [showLayerHands, setShowLayerHands] = useState(d.showLayerHands ?? true);
  const [characterSharpness, setCharacterSharpness] = useState(d.characterSharpness ?? 100);

  const stateRef = useRef({});
  stateRef.current = {
    meanBrightness, appBackgroundBrightness, panelBorderBrightness, loginBrightness, loginShadeOfGray, loginLightToBlack,
    leftCushion, topCushion, scaleX, scaleY, aspectLock,
    backScaleX, backScaleY, backOffsetX, backOffsetY, appBackgroundSharpness,
    sceneScaleX, sceneScaleY, sceneOffsetX, sceneOffsetY,
    robotScaleX, robotScaleY, robotOffsetX, robotOffsetY,
    shoulderScaleX, shoulderScaleY, shoulderOffsetX, shoulderOffsetY,
    handLeftScaleX, handLeftScaleY, handLeftOffsetX, handLeftOffsetY,
    handRightScaleX, handRightScaleY, handRightOffsetX, handRightOffsetY,
    loginBoxWidth, loginBoxHeight, titleOffsetX, titleOffsetY, titleScale,
    subtitleOffsetX, subtitleOffsetY, subtitleScale, formMarginTop, inputHeightScale, inputWidthScale, formGap,
    submitMinHeightScale, bottomButtonsHeightScale, buttonsVerticalGap, buttonsBottomGap, panelContentOffsetX, panelRightMargin,
    sparkBoundsTop, sparkBoundsBottom, sparkBoltThickness,
    showLayerBackground, showLayerWankrBody, showLayerLogin, showLayerHands,
    characterSharpness,
  };

  const buildSnapshot = useCallback(() => buildSnapshotFrom(stateRef.current), []);
  const applySnapshotRef = useRef(null);
  const applySnapshot = useCallback((snap) => {
    if (!snap) return;
    setMeanBrightness(snap.meanBrightness);
    onAppBackgroundBrightnessChange?.(snap.appBackgroundBrightness ?? snap.meanBrightness ?? 50);
    setPanelBorderBrightness(snap.panelBorderBrightness);
    setLoginBrightness(snap.loginBrightness);
    setLoginShadeOfGray(snap.loginShadeOfGray);
    setLoginLightToBlack(snap.loginLightToBlack);
    setLeftCushion(snap.leftCushion);
    setTopCushion(snap.topCushion);
    setScaleX(snap.scaleX);
    setScaleY(snap.scaleY);
    setAspectLock(snap.aspectLock ?? true);
    setBackScaleX(snap.backScaleX ?? 100);
    setBackScaleY(snap.backScaleY ?? 100);
    setBackOffsetX(snap.backOffsetX ?? 0);
    setBackOffsetY(snap.backOffsetY ?? 0);
    onAppBackgroundSharpnessChange?.(snap.backlayerSharpness ?? 100);
    setSceneScaleX(snap.sceneScaleX ?? 100);
    setSceneScaleY(snap.sceneScaleY ?? 100);
    setSceneOffsetX(snap.sceneOffsetX ?? 0);
    setSceneOffsetY(snap.sceneOffsetY ?? 0);
    setRobotScaleX(snap.robotScaleX ?? 100);
    setRobotScaleY(snap.robotScaleY ?? 100);
    setRobotOffsetX(snap.robotOffsetX ?? 0);
    setRobotOffsetY(snap.robotOffsetY ?? 0);
    setShoulderScaleX(snap.shoulderScaleX ?? 100);
    setShoulderScaleY(snap.shoulderScaleY ?? 100);
    setShoulderOffsetX(snap.shoulderOffsetX ?? 0);
    setShoulderOffsetY(snap.shoulderOffsetY ?? 0);
    setHandLeftScaleX(snap.handLeftScaleX ?? 100);
    setHandLeftScaleY(snap.handLeftScaleY ?? 100);
    setHandLeftOffsetX(snap.handLeftOffsetX ?? 0);
    setHandLeftOffsetY(snap.handLeftOffsetY ?? 0);
    setHandRightScaleX(snap.handRightScaleX ?? 100);
    setHandRightScaleY(snap.handRightScaleY ?? 100);
    setHandRightOffsetX(snap.handRightOffsetX ?? 0);
    setHandRightOffsetY(snap.handRightOffsetY ?? 0);
    setLoginBoxWidth(snap.loginBoxWidth ?? 98);
    setLoginBoxHeight(snap.loginBoxHeight ?? 92);
    setTitleOffsetX(snap.titleOffsetX ?? 0);
    setTitleOffsetY(snap.titleOffsetY ?? 0);
    setTitleScale(snap.titleScale ?? 100);
    setSubtitleOffsetX(snap.subtitleOffsetX ?? 0);
    setSubtitleOffsetY(snap.subtitleOffsetY ?? 0);
    setSubtitleScale(snap.subtitleScale ?? 100);
    setFormMarginTop(snap.formMarginTop ?? 0);
    setInputHeightScale(snap.inputHeightScale ?? 100);
    setInputWidthScale(snap.inputWidthScale ?? 100);
    setFormGap(snap.formGap ?? 100);
    setSubmitMinHeightScale(snap.submitMinHeightScale ?? 100);
    setBottomButtonsHeightScale(snap.bottomButtonsHeightScale ?? 100);
    setButtonsVerticalGap(snap.buttonsVerticalGap ?? 100);
    setButtonsBottomGap(snap.buttonsBottomGap ?? 100);
    setPanelContentOffsetX(snap.panelContentOffsetX ?? 0);
    setPanelRightMargin(snap.panelRightMargin ?? 100);
    setSparkBoundsTop(snap.sparkBoundsTop ?? 10);
    setSparkBoundsBottom(snap.sparkBoundsBottom ?? 90);
    setSparkBoltThickness(snap.sparkBoltThickness ?? 100);
    setShowLayerBackground(snap.showLayerBackground ?? true);
    setShowLayerWankrBody(snap.showLayerWankrBody ?? true);
    setShowLayerLogin(snap.showLayerLogin ?? true);
    setShowLayerHands(snap.showLayerHands ?? true);
    setCharacterSharpness(snap.characterSharpness ?? 100);
  }, [onAppBackgroundBrightnessChange, onAppBackgroundSharpnessChange]);
  applySnapshotRef.current = applySnapshot;

  // Sync sliders from backend (so 5000 and 5173 match); gate first paint until done so layout is identical
  useEffect(() => {
    let done = false;
    const markReady = () => {
      if (!done) { done = true; setDefaultsReady(true); }
    };
    api.get('/api/settings/dev-defaults')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && applySnapshotRef.current) applySnapshotRef.current(data);
      })
      .catch(() => {})
      .finally(markReady);
    const t = setTimeout(markReady, 1500);
    return () => clearTimeout(t);
  }, []);

  return {
    meanBrightness, setMeanBrightness,
    panelBorderBrightness, setPanelBorderBrightness,
    loginBrightness, setLoginBrightness,
    loginShadeOfGray, setLoginShadeOfGray,
    loginLightToBlack, setLoginLightToBlack,
    leftCushion, setLeftCushion,
    topCushion, setTopCushion,
    scaleX, setScaleX, scaleY, setScaleY,
    aspectLock, setAspectLock,
    backScaleX, setBackScaleX, backScaleY, setBackScaleY,
    backOffsetX, setBackOffsetX, backOffsetY, setBackOffsetY,
    sceneScaleX, setSceneScaleX, sceneScaleY, setSceneScaleY,
    sceneOffsetX, setSceneOffsetX, sceneOffsetY, setSceneOffsetY,
    robotScaleX, setRobotScaleX, robotScaleY, setRobotScaleY,
    robotOffsetX, setRobotOffsetX, robotOffsetY, setRobotOffsetY,
    shoulderScaleX, setShoulderScaleX, shoulderScaleY, setShoulderScaleY,
    shoulderOffsetX, setShoulderOffsetX, shoulderOffsetY, setShoulderOffsetY,
    handLeftScaleX, setHandLeftScaleX, handLeftScaleY, setHandLeftScaleY,
    handLeftOffsetX, setHandLeftOffsetX, handLeftOffsetY, setHandLeftOffsetY,
    handRightScaleX, setHandRightScaleX, handRightScaleY, setHandRightScaleY,
    handRightOffsetX, setHandRightOffsetX, handRightOffsetY, setHandRightOffsetY,
    loginBoxWidth, setLoginBoxWidth, loginBoxHeight, setLoginBoxHeight,
    titleOffsetX, setTitleOffsetX, titleOffsetY, setTitleOffsetY,
    titleScale, setTitleScale,
    subtitleOffsetX, setSubtitleOffsetX, subtitleOffsetY, setSubtitleOffsetY,
    subtitleScale, setSubtitleScale,
    formMarginTop, setFormMarginTop,
    inputHeightScale, setInputHeightScale, inputWidthScale, setInputWidthScale,
    formGap, setFormGap,
    submitMinHeightScale, setSubmitMinHeightScale,
    bottomButtonsHeightScale, setBottomButtonsHeightScale,
    buttonsVerticalGap, setButtonsVerticalGap,
    buttonsBottomGap, setButtonsBottomGap,
    panelContentOffsetX, setPanelContentOffsetX,
    panelRightMargin, setPanelRightMargin,
    sparkBoundsTop, setSparkBoundsTop, sparkBoundsBottom, setSparkBoundsBottom,
    sparkBoltThickness, setSparkBoltThickness,
    showLayerBackground, setShowLayerBackground,
    showLayerWankrBody, setShowLayerWankrBody,
    showLayerLogin, setShowLayerLogin,
    showLayerHands, setShowLayerHands,
    characterSharpness, setCharacterSharpness,
    buildSnapshot,
    applySnapshot,
    defaultsReady,
  };
}
