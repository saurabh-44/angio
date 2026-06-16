import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// allowedHosts: 'all' lets ngrok / lan-IP / phone-on-hotspot all reach
// the dev server. Vite blocks unknown Host headers by default for
// safety, but tunneling will set Host to whatever ngrok-free.dev URL
// it generated.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true, // bind 0.0.0.0 so ngrok/LAN can connect
    allowedHosts: true,
    proxy: {
      // All /api/* calls are reverse-proxied to the backend at
      // localhost:4000 server-side. The browser sees same-origin
      // requests — no CORS, no separate base URL, cookies flow.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
