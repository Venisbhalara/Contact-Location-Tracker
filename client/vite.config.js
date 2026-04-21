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
    port: 5173,   // ← default Vite port
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5005',
        ws: true,
      },
    },
  },

  build: {
    // Warn when a single chunk exceeds 600 kB
    chunkSizeWarningLimit: 2000,
  },
})
