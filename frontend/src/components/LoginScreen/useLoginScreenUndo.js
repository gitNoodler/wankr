import { useState, useRef, useCallback } from 'react';
import { loadDevDefaults, getPrimaryDevDefaults, saveDevDefaults } from './loginScreenConfig';

/** Undo and reset logic for the login screen dev panel. Uses applySnapshotRef so we always call the latest apply (avoids stale closure so Reset to saved works). */
export function useLoginScreenUndo({ buildSnapshot, applySnapshotRef }) {
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
    applySnapshotRef.current?.(snap);
    setUndoStackLength(undoHistoryRef.current.length);
    queueMicrotask(() => { isRestoringRef.current = false; });
  }, [applySnapshotRef]);

  const handleResetToSaved = useCallback(() => {
    undoHistoryRef.current = [];
    setUndoStackLength(0);
    const saved = loadDevDefaults();
    applySnapshotRef.current?.(saved);
  }, [applySnapshotRef]);

  const handleResetToPrimaryDefaults = useCallback(() => {
    undoHistoryRef.current = [];
    setUndoStackLength(0);
    const primary = getPrimaryDevDefaults();
    applySnapshotRef.current?.(primary);
    saveDevDefaults(primary);
  }, [applySnapshotRef]);

  return { pushUndoHistory, handleUndo, handleResetToSaved, handleResetToPrimaryDefaults, undoStackLength };
}
