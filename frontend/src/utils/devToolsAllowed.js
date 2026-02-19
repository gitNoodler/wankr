/**
 * UI architecture and developer tools are only available on the dev local port (Vite dev server).
 * Requests to use them anywhere else (e.g. production build on port 5000) are rejected.
 * When false: no Dashboard Settings, no dev panels, no Measure/GlowPoint/EffectsBounds tools.
 */
export const isDevToolsAllowed = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;
