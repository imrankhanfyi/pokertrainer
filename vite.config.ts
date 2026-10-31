import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the same build works on GitHub Pages (/repo-name/) and Netlify (/).
// Routing is hash-based, so no server rewrites are needed on either host.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Hold’em Coach',
        short_name: 'Hold’em',
        description: 'Learn the fundamentals of No-Limit Texas Hold’em with quick, calm practice.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f5f1',
        theme_color: '#1f5c4a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // No runtimeCaching on purpose: the service worker only serves the precached app
        // shell, so OpenAI requests ("Explain more") always go straight to the network.
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
  },
});
