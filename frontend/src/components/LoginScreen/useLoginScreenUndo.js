import { useState, useRef, useCallback } from 'react';
import { loadDevDefaults } from './loginScreenConfig';

/** Undo and reset logic for the login screen dev panel. */
export function useLoginScreenUndo({ buildSnapshot, applySnapshot }) {
  const undoHistoryRef = useRef([]);
  const isRestoringRef = useRef(false);
  const [undoStackLength, setUndoStackLength] = useState(0);

  const pushUndoHistory = useCallback(() => {
    if (isRestoringRef.current) return;
    const snap = buildSnapshot();
    if (!snap) return;
    undoHistoryRef.current.push(snap);
    if (undoHistoryRef.current.length > 30) undoHistoryRef.current.shift();
    setUndoStackLength(undoHistoryRef.current.length);
  }, [buildSnapshot]);

  const handleUndo = useCallback(() => {
    const snap = undoHistoryRef.current.pop();
    if (!snap) return;
    isRestoringRef.current = true;
    applySnapshot(snap);
    setUndoStackLength(undoHistoryRef.current.length);
    queueMicrotask(() => { isRestoringRef.current = false; });
  }, [applySnapshot]);

  const handleResetToSaved = useCallback(() => {
    undoHistoryRef.current = [];
    setUndoStackLength(0);
    const d = loadDevDefaults();
    applySnapshot({
      meanBrightness: d.meanBrightness,
      appBackgroundBrightness: d.appBackgroundBrightness ?? d.meanBrightness ?? 50,
      panelBorderBrightness: d.panelBorderBrightness,
      loginBrightness: d.loginBrightness,
      loginShadeOfGray: d.loginShadeOfGray,
      loginLightToBlack: d.loginLightToBlack,
      leftCushion: d.leftCushion,
      topCushion: d.topCushion,
      scaleX: d.scaleX,
      scaleY: d.scaleY,
      aspectLock: d.aspectLock ?? true,
      backScaleX: d.backScaleX ?? 100,
      backScaleY: d.backScaleY ?? 100,
      backOffsetX: d.backOffsetX ?? 0,
      backOffsetY: d.backOffsetY ?? 0,
      backlayerSharpness: d.backlayerSharpness ?? 100,
      sceneScaleX: d.sceneScaleX ?? 100,
      sceneScaleY: d.sceneScaleY ?? 100,
      sceneOffsetX: d.sceneOffsetX ?? 0,
      sceneOffsetY: d.sceneOffsetY ?? 0,
      robotScaleX: d.robotScaleX ?? 100,
      robotScaleY: d.robotScaleY ?? 100,
      robotOffsetX: d.robotOffsetX ?? 0,
      robotOffsetY: d.robotOffsetY ?? 0,
      shoulderScaleX: d.shoulderScaleX ?? 100,
      shoulderScaleY: d.shoulderScaleY ?? 100,
      shoulderOffsetX: d.shoulderOffsetX ?? 0,
      shoulderOffsetY: d.shoulderOffsetY ?? 0,
      handLeftScaleX: d.handLeftScaleX ?? 100,
      handLeftScaleY: d.handLeftScaleY ?? 100,
      handLeftOffsetX: d.handLeftOffsetX ?? 0,
      handLeftOffsetY: d.handLeftOffsetY ?? 0,
      handRightScaleX: d.handRightScaleX ?? 100,
      handRightScaleY: d.handRightScaleY ?? 100,
      handRightOffsetX: d.handRightOffsetX ?? 0,
      handRightOffsetY: d.handRightOffsetY ?? 0,
      loginBoxWidth: d.loginBoxWidth,
      loginBoxHeight: d.loginBoxHeight,
      titleOffsetX: d.titleOffsetX ?? 0,
      titleOffsetY: d.titleOffsetY ?? 0,
      titleScale: d.titleScale ?? 100,
      subtitleOffsetX: d.subtitleOffsetX ?? 0,
      subtitleOffsetY: d.subtitleOffsetY ?? 0,
      subtitleScale: d.subtitleScale ?? 100,
      formMarginTop: d.formMarginTop ?? 0,
      inputHeightScale: d.inputHeightScale ?? 100,
      inputWidthScale: d.inputWidthScale ?? 100,
      formGap: d.formGap ?? 100,
      submitMinHeightScale: d.submitMinHeightScale ?? 100,
      bottomButtonsHeightScale: d.bottomButtonsHeightScale ?? 100,
      buttonsVerticalGap: d.buttonsVerticalGap ?? 100,
      buttonsBottomGap: d.buttonsBottomGap ?? 100,
      panelContentOffsetX: d.panelContentOffsetX ?? 0,
      panelRightMargin: d.panelRightMargin ?? 100,
      sparkBoundsTop: d.sparkBoundsTop ?? 10,
      sparkBoundsBottom: d.sparkBoundsBottom ?? 90,
      sparkBoltThickness: d.sparkBoltThickness ?? 100,
      showLayerBackground: d.showLayerBackground ?? true,
      showLayerWankrBody: d.showLayerWankrBody ?? true,
      showLayerLogin: d.showLayerLogin ?? true,
      showLayerHands: d.showLayerHands ?? true,
      characterSharpness: d.characterSharpness ?? 100,
    });
  }, [applySnapshot]);

  return { pushUndoHistory, handleUndo, handleResetToSaved, undoStackLength };
}
