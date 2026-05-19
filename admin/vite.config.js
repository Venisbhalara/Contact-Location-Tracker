import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: true,   // ← exposes to local network (needed for phone access)
    port: 5174,   // ← matches package.json --port 5174
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
        secure: false,
        // Suppress noisy proxy errors (e.g. client disconnects mid-request)
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code !== 'ECONNRESET' && err.code !== 'ECONNABORTED') {
              console.error('[proxy /api] error:', err.message);
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:5005',
        changeOrigin: true,   // ← REQUIRED — fixes Origin header mismatch
        rewriteWsOrigin: true, // ← REQUIRED in Vite 5+ for ws upgrades
        ws: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // ECONNABORTED / ECONNRESET are normal when a browser tab closes.
            // Swallow them so the console stays clean.
            if (err.code !== 'ECONNRESET' && err.code !== 'ECONNABORTED') {
              console.error('[proxy /socket.io] error:', err.message);
            }
          });
        },
      },
    },
  },

  build: {
    // Warn when a single chunk exceeds 600 kB
    chunkSizeWarningLimit: 2000,
  },
})

