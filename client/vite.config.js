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
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
  },

  build: {
    // Warn when a single chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // ── Split heavy vendor libraries into their own cached chunks ──────
        // These rarely change, so browsers cache them across deployments.
        manualChunks(id) {
          // React core — tiny but critical, give it its own chunk
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react'
          }
          // Leaflet + react-leaflet (the map library) — ~150 kB
          if (id.includes('node_modules/leaflet') ||
              id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet'
          }
          // Socket.io client — ~80 kB
          if (id.includes('node_modules/socket.io-client') ||
              id.includes('node_modules/engine.io-client')) {
            return 'vendor-socket'
          }
          // Lenis smooth scroll
          if (id.includes('node_modules/lenis')) {
            return 'vendor-lenis'
          }
          // Everything else in node_modules
          if (id.includes('node_modules')) {
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
