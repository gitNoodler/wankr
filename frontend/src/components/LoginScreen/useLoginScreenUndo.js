import { useState, useRef, useCallback } from 'react';
import { getPrimaryDevDefaults } from './loginScreenConfig';

/** Undo and reset logic for the login screen dev panel. Saved = backend; primary = code defaults. */
export function useLoginScreenUndo({ buildSnapshot, applySnapshotRef, getSavedDefaults, onResetToPrimaryApplied }) {
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
    const getSaved = getSavedDefaults ?? (() => Promise.resolve(null));
    getSaved().then((data) => {
      applySnapshotRef.current?.(data || getPrimaryDevDefaults());
    });
  }, [applySnapshotRef, getSavedDefaults]);

  const handleResetToPrimaryDefaults = useCallback(() => {
    undoHistoryRef.current = [];
    setUndoStackLength(0);
    const primary = getPrimaryDevDefaults();
    applySnapshotRef.current?.(primary);
    onResetToPrimaryApplied?.(primary);
  }, [applySnapshotRef, onResetToPrimaryApplied]);

  return { pushUndoHistory, handleUndo, handleResetToSaved, handleResetToPrimaryDefaults, undoStackLength };
}
