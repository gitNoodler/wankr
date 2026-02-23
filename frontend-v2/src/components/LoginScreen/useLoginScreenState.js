import { useState, useRef, useCallback, useEffect } from 'react';
import { getPrimaryDevDefaults, ALLOWED_DEV_DEFAULT_KEYS } from './loginScreenConfig';
import { buildSnapshotFrom, getSnapshotFallbacks, normalizeLoginBoxHeight } from './helpers';

/** Centralized state for the login screen layout and dev panel. Initial state = code defaults; backend sync applied in LoginScreen. */
export function useLoginScreenState({ appBackgroundBrightness, appBackgroundSharpness, onAppBackgroundBrightnessChange, onAppBackgroundSharpnessChange }) {
  const d = getPrimaryDevDefaults();
  const [defaultsReady] = useState(true);

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
  const [titleTopGap, setTitleTopGap] = useState(d.titleTopGap ?? 1);
  const [titleToSubtitleGap, setTitleToSubtitleGap] = useState(d.titleToSubtitleGap ?? 0.5);
  const [subtitleToUsernameGap, setSubtitleToUsernameGap] = useState(d.subtitleToUsernameGap ?? 1);
  const [usernamePasswordGap, setUsernamePasswordGap] = useState(d.usernamePasswordGap ?? 1);
  const [passwordToSubmitGap, setPasswordToSubmitGap] = useState(d.passwordToSubmitGap ?? 1);
  const [submitToButtonsGap, setSubmitToButtonsGap] = useState(d.submitToButtonsGap ?? 1);
  const [controlHeightScale, setControlHeightScale] = useState(d.controlHeightScale ?? 100);
  const [panelContentOffsetX, setPanelContentOffsetX] = useState(d.panelContentOffsetX ?? 0);
  const [panelRightMargin, setPanelRightMargin] = useState(d.panelRightMargin ?? 100);
  const [showLayerBackground, setShowLayerBackground] = useState(d.showLayerBackground ?? true);
  const [showLayerWankrBody, setShowLayerWankrBody] = useState(d.showLayerWankrBody ?? true);
  const [showLayerLogin, setShowLayerLogin] = useState(d.showLayerLogin ?? true);
  const [showLayerHands, setShowLayerHands] = useState(d.showLayerHands ?? true);
  const [characterSharpness, setCharacterSharpness] = useState(d.characterSharpness ?? 100);

  const stateRef = useRef({});
  const settersRef = useRef({});

  useEffect(() => {
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
      showLayerBackground, showLayerWankrBody, showLayerLogin, showLayerHands,
      characterSharpness,
    };
  });

  useEffect(() => {
    settersRef.current = {
      meanBrightness: setMeanBrightness, panelBorderBrightness: setPanelBorderBrightness, loginBrightness: setLoginBrightness,
    loginShadeOfGray: setLoginShadeOfGray, loginLightToBlack: setLoginLightToBlack,
    leftCushion: setLeftCushion, topCushion: setTopCushion, scaleX: setScaleX, scaleY: setScaleY, aspectLock: setAspectLock,
    backScaleX: setBackScaleX, backScaleY: setBackScaleY, backOffsetX: setBackOffsetX, backOffsetY: setBackOffsetY,
    sceneScaleX: setSceneScaleX, sceneScaleY: setSceneScaleY, sceneOffsetX: setSceneOffsetX, sceneOffsetY: setSceneOffsetY,
    robotScaleX: setRobotScaleX, robotScaleY: setRobotScaleY, robotOffsetX: setRobotOffsetX, robotOffsetY: setRobotOffsetY,
    shoulderScaleX: setShoulderScaleX, shoulderScaleY: setShoulderScaleY, shoulderOffsetX: setShoulderOffsetX, shoulderOffsetY: setShoulderOffsetY,
    handLeftScaleX: setHandLeftScaleX, handLeftScaleY: setHandLeftScaleY, handLeftOffsetX: setHandLeftOffsetX, handLeftOffsetY: setHandLeftOffsetY,
    handRightScaleX: setHandRightScaleX, handRightScaleY: setHandRightScaleY, handRightOffsetX: setHandRightOffsetX, handRightOffsetY: setHandRightOffsetY,
    loginBoxWidth: setLoginBoxWidth, loginBoxHeight: setLoginBoxHeight,
    titleOffsetX: setTitleOffsetX, titleOffsetY: setTitleOffsetY, titleScale: setTitleScale,
    subtitleOffsetX: setSubtitleOffsetX, subtitleOffsetY: setSubtitleOffsetY, subtitleScale: setSubtitleScale,
    formMarginTop: setFormMarginTop, inputHeightScale: setInputHeightScale, inputWidthScale: setInputWidthScale,
    formGap: setFormGap, submitMinHeightScale: setSubmitMinHeightScale, bottomButtonsHeightScale: setBottomButtonsHeightScale,
    buttonsVerticalGap: setButtonsVerticalGap, buttonsBottomGap: setButtonsBottomGap,
    titleTopGap: setTitleTopGap, titleToSubtitleGap: setTitleToSubtitleGap, subtitleToUsernameGap: setSubtitleToUsernameGap,
    usernamePasswordGap: setUsernamePasswordGap, passwordToSubmitGap: setPasswordToSubmitGap, submitToButtonsGap: setSubmitToButtonsGap,
    controlHeightScale: setControlHeightScale, panelContentOffsetX: setPanelContentOffsetX, panelRightMargin: setPanelRightMargin,
    showLayerBackground: setShowLayerBackground, showLayerWankrBody: setShowLayerWankrBody, showLayerLogin: setShowLayerLogin, showLayerHands: setShowLayerHands,
    characterSharpness: setCharacterSharpness,
    };
  }, []);

  const buildSnapshot = useCallback(() => buildSnapshotFrom(stateRef.current), []);
  const applySnapshotRef = useRef(null);
  const applySnapshot = useCallback((snap) => {
    if (!snap) return;
    const fallbacks = getSnapshotFallbacks();
    onAppBackgroundBrightnessChange?.(snap.appBackgroundBrightness ?? snap.meanBrightness ?? fallbacks.appBackgroundBrightness);
    onAppBackgroundSharpnessChange?.(snap.backlayerSharpness ?? fallbacks.backlayerSharpness);
    const setters = settersRef.current;
    for (const key of ALLOWED_DEV_DEFAULT_KEYS) {
      if (key === 'appBackgroundBrightness' || key === 'backlayerSharpness') continue;
      const setter = setters[key];
      if (!setter) continue;
      const value = key === 'loginBoxHeight' ? normalizeLoginBoxHeight(snap[key]) : (snap[key] ?? fallbacks[key]);
      setter(value);
    }
  }, [onAppBackgroundBrightnessChange, onAppBackgroundSharpnessChange]);

  useEffect(() => {
    applySnapshotRef.current = applySnapshot;
  }, [applySnapshot]);

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
    titleTopGap, setTitleTopGap,
    titleToSubtitleGap, setTitleToSubtitleGap,
    subtitleToUsernameGap, setSubtitleToUsernameGap,
    usernamePasswordGap, setUsernamePasswordGap,
    passwordToSubmitGap, setPasswordToSubmitGap,
    submitToButtonsGap, setSubmitToButtonsGap,
    controlHeightScale, setControlHeightScale,
    panelContentOffsetX, setPanelContentOffsetX,
    panelRightMargin, setPanelRightMargin,
    showLayerBackground, setShowLayerBackground,
    showLayerWankrBody, setShowLayerWankrBody,
    showLayerLogin, setShowLayerLogin,
    showLayerHands, setShowLayerHands,
    characterSharpness, setCharacterSharpness,
    buildSnapshot,
    applySnapshot,
    applySnapshotRef,
    defaultsReady,
  };
}
