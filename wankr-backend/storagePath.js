/**
 * storagePath.js — Resolve storage root for Railway volume or local dev.
 *
 * Railway: volume is mounted at /workspace/wankr-backend/storage (matches __dirname/storage).
 *          Optionally set RAILWAY_VOLUME_MOUNT_PATH to override.
 * Local:   uses __dirname/storage (wankr-backend/storage).
 */
const path = require('path');

const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH;
const STORAGE_ROOT = VOLUME || path.join(__dirname, 'storage');

const isRailway = !!process.env.RAILWAY_ENVIRONMENT;
if (isRailway) {
  console.log(`💾 Storage: Railway → ${STORAGE_ROOT}`);
} else {
  console.log(`💾 Storage: local → ${STORAGE_ROOT}`);
}

module.exports = STORAGE_ROOT;
