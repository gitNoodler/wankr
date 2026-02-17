/**
 * Computes the login panel background RGB color from dev panel brightness/tint/darkness.
 * Pure function; used by LoginScreen so panel styling is not inlined.
 * @param {number} loginBrightness - 0..100
 * @param {number} loginShadeOfGray - 0..100 (tint)
 * @param {number} loginLightToBlack - 0..100 (darkness)
 * @returns {string} css rgb(r, g, b)
 */
export function computePanelBackground(loginBrightness, loginShadeOfGray, loginLightToBlack) {
  const lightToBlack = loginLightToBlack / 100;
  let base = 220 - lightToBlack * 200;
  base *= 0.5 + (loginBrightness / 100) * 0.5;
  base = Math.round(base);
  const t = loginShadeOfGray / 100;
  const r = Math.max(0, Math.min(255, Math.round(base - t * 8)));
  const g = Math.max(0, Math.min(255, Math.round(base + t * 8)));
  const b = Math.max(0, Math.min(255, Math.round(base - t * 4)));
  return `rgb(${r}, ${g}, ${b})`;
}
