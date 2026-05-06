import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@check-game/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    // Smaller initial bundle = faster first paint and faster navigation.
    // Split big vendor libraries into their own cacheable chunks so they
    // don't get re-downloaded after every code change.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion':       ['framer-motion'],
          'socket':       ['socket.io-client'],
          'emoji':        ['emoji-picker-react'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
