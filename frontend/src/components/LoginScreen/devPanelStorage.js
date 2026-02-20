/** Password and storage for dev panel gate. Same as gitNoodler. */
export const DEV_PANEL_PASSWORD = 'gitNoodler';
const STORAGE_KEY = 'wankr_dev_panel_unlocked';

export function isDevPanelUnlocked() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDevPanelUnlocked() {
  try {
    sessionStorage.setItem(STORAGE_KEY, 'true');
  } catch { /* ignore */ }
}

/** Clear unlock state so the next dev panel open will show the password gate. */
export function lockDevPanel() {
  try {
    sessionStorage.setItem(STORAGE_KEY, 'false');
  } catch { /* ignore */ }
}
