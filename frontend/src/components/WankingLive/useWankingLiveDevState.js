import { useState, useCallback } from 'react';
import { loadElements, saveElements, loadBoundaries, saveBoundaries, clampToBoundaries, BOUNDARY_LAYERS } from './wankingLiveLayoutStorage';

/**
 * Shared state for dev1 (WankingLiveDevPanel). Use from both login screen and PlaceholderPanel
 * so the same panel and data (elements, boundaries) are available in both places.
 */
export function useWankingLiveDevState() {
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [placementMode, setPlacementMode] = useState(null);
  const [elements, setElements] = useState(loadElements);
  const [boundaries, setBoundaries] = useState(loadBoundaries);
  const [hideBoundariesVisual, setHideBoundariesVisual] = useState(false);
  const [isIndentionPanel, setIsIndentionPanel] = useState(false);
  const [selectedBoundaryLayer, setSelectedBoundaryLayer] = useState(BOUNDARY_LAYERS[0] ?? 'Hand layer');

  const handleElementsChange = useCallback((next) => {
    setElements(next);
    saveElements(next);
  }, []);
  const handleBoundariesChange = useCallback((next) => {
    setBoundaries(next);
    saveBoundaries(next);
  }, []);
  const handleAddElement = useCallback(
    (el) => {
      const rect = { left: el.left, top: el.top, width: el.width, height: el.height };
      const clamped = clampToBoundaries(rect, boundaries);
      const clampedEl = { ...el, ...clamped };
      handleElementsChange([...elements, clampedEl]);
      setSelectedElementId(clampedEl.id);
    },
    [elements, boundaries, handleElementsChange]
  );
  const handleUpdateElement = useCallback(
    (id, updates) => {
      const next = elements.map((e) => {
        if (e.id !== id) return e;
        const prevRect = { left: e.left, top: e.top, width: e.width, height: e.height };
        const merged = { ...e, ...updates };
        const rect = { left: merged.left, top: merged.top, width: merged.width, height: merged.height };
        const clamped = clampToBoundaries(rect, boundaries, prevRect);
        return { ...merged, ...clamped };
      });
      handleElementsChange(next);
    },
    [elements, boundaries, handleElementsChange]
  );
  const handleDeleteElement = useCallback(
    (id) => {
      handleElementsChange(elements.filter((e) => e.id !== id));
      setSelectedElementId(null);
    },
    [elements, handleElementsChange]
  );
  const handleAddBoundary = useCallback(
    (b) => {
      handleBoundariesChange([...boundaries, { ...b, layer: selectedBoundaryLayer }]);
    },
    [boundaries, handleBoundariesChange, selectedBoundaryLayer]
  );
  const handleUpdateBoundary = useCallback(
    (id, updates) => {
      handleBoundariesChange(
        boundaries.map((b) => (b.id !== id ? b : { ...b, ...updates }))
      );
    },
    [boundaries, handleBoundariesChange]
  );
  const handleDeleteBoundary = useCallback(
    (id) => {
      handleBoundariesChange(boundaries.filter((b) => b.id !== id));
    },
    [boundaries, handleBoundariesChange]
  );
  const handlePlacementCancel = useCallback(() => setPlacementMode(null), []);

  return {
    elements,
    boundaries,
    selectedElementId,
    setSelectedElementId,
    placementMode,
    setPlacementMode,
    hideBoundariesVisual,
    setHideBoundariesVisual,
    isIndentionPanel,
    setIsIndentionPanel,
    selectedBoundaryLayer,
    setSelectedBoundaryLayer,
    handleElementsChange,
    handleBoundariesChange,
    handleAddElement,
    handleUpdateElement,
    handleDeleteElement,
    handleAddBoundary,
    handleUpdateBoundary,
    handleDeleteBoundary,
    handlePlacementCancel,
  };
}
