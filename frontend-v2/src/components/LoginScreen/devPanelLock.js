/**
 * Dev panel lock — password gate for login-screen dev tools.
 * Uses sessionStorage so the unlock persists across HMR but not across tabs.
 */

const STORAGE_KEY = 'wankr_dev_panel_unlocked';

export const DEV_PANEL_PASSWORD = 'gitnoodler';

export function isDevPanelUnlocked() {
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function setDevPanelUnlocked() {
  sessionStorage.setItem(STORAGE_KEY, '1');
}

export function lockDevPanel() {
  sessionStorage.removeItem(STORAGE_KEY);
}
