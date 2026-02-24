/** True on iPhone, iPad, iPod (including iPadOS 13+ desktop UA). */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (['iPhone', 'iPad', 'iPod', 'iPhone Simulator', 'iPad Simulator', 'iPod Simulator'].includes(platform)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** True when viewport is portrait (tall). */
export function isPortrait() {
  if (typeof window === 'undefined') return true;
  return window.innerHeight >= window.innerWidth;
}
