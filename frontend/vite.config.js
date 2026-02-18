import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'warn',
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
  resolve: {
    alias: {
      '@mascot': path.resolve(__dirname, '../images_logo_banner_mascot'),
    },
  },
  // Pre-bundle deps to reduce dev request count and avoid slow reloads in larger apps
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'react-window'],
  },
  server: {
    port: 5173,
    strictPort: true,
    // Default localhost to avoid Windows ERR_ADDRESS_INVALID with 0.0.0.0 (use dev:mobile for LAN)
    host: 'localhost',
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
})
