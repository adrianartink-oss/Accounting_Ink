import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Buchhaltung Privat',
        short_name: 'Buchhaltung',
        description:
          'Private Buchhaltung (EÜR) für Einzelunternehmer – Einnahmen/Ausgaben nach Land & Sphäre, mit Claude-Beleg-Scan.',
        theme_color: '#0f766e',
        background_color: '#0b0f0e',
        display: 'standalone',
        orientation: 'any',
        lang: 'de',
        // start_url/scope werden aus `base` abgeleitet (Root oder Pages-Unterpfad).
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // HashRouter lädt immer die vorgecachte index.html – kein
        // navigateFallback nötig (funktioniert auch unter Unterpfad).
        // Große Belegbilder liegen in IndexedDB, nicht im SW-Cache.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
