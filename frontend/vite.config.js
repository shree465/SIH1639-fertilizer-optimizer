import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SIH1639 Fertilizer Optimizer',
        short_name: 'Fertilizer Optimizer',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#166534',
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
