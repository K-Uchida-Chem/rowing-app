import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 新しい版が出たら自動で入れ替える(古いキャッシュが残って更新されない問題を避ける)
      registerType: 'autoUpdate',
      workbox: { skipWaiting: true, clientsClaim: true },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Rowing Log',
        short_name: 'Rowing Log',
        description: 'ローイングの練習記録',
        lang: 'ja',
        theme_color: '#1b365d',
        background_color: '#f6f4ef',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
