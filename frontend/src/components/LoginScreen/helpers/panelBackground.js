/**
 * Computes the login panel background RGB color from dev panel brightness/tint/darkness.
 * Pure function; used by LoginScreen so panel styling is not inlined.
 * @param {number} loginBrightness - 0..100
 * @param {number} loginShadeOfGray - 0..100 (tint)
 * @param {number} loginLightToBlack - 0..100 (darkness)
 * @returns {string} css rgb(r, g, b)
 */
/** Minimum panel luminance so the panel never goes fully black and stays usable. */
const MIN_PANEL_LUMINANCE = 18;

export function computePanelBackground(loginBrightness, loginShadeOfGray, loginLightToBlack) {
  const lightToBlack = loginLightToBlack / 100;
  let base = 220 - lightToBlack * 200;
  base *= 0.5 + (loginBrightness / 100) * 0.5;
  base = Math.round(base);
  const t = loginShadeOfGray / 100;
  let r = Math.round(base - t * 8);
  let g = Math.round(base + t * 8);
  let b = Math.round(base - t * 4);
  r = Math.max(MIN_PANEL_LUMINANCE, Math.min(255, r));
  g = Math.max(MIN_PANEL_LUMINANCE, Math.min(255, g));
  b = Math.max(MIN_PANEL_LUMINANCE, Math.min(255, b));
  return `rgb(${r}, ${g}, ${b})`;
}
