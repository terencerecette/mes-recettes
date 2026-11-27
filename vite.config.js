import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Mes recettes',
        short_name: 'Mes recettes',
        description: 'Mon carnet de recettes personnel, recherche Frigo et liste de courses',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#FAF8F5',
        theme_color: '#FAF8F5',
        orientation: 'portrait-primary',
        icons: [
          {
            src: './pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: './pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
