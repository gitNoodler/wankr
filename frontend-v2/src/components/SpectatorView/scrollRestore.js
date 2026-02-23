/**
 * Pure helper for scroll restore logic (used by SpectatorView).
 * Exported so we can unit-test the clamping without React.
 * @param {number} savedScrollTop - scroll position before update
 * @param {number} scrollHeight - total scroll height after update
 * @param {number} clientHeight - visible height
 * @returns {number} scrollTop to apply (clamped to valid range)
 */
export function getRestoreScrollTop(savedScrollTop, scrollHeight, clientHeight) {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  return Math.min(Math.max(0, savedScrollTop), maxScroll);
}
