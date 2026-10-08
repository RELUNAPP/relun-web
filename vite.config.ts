import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// The dev server forwards API and socket traffic to the backend, so the app
// talks to its own origin. That keeps https pages (needed for location on a
// phone) from being blocked for calling an http API.
const api = 'http://localhost:9000';
const proxy = {
  '/api': { target: api, changeOrigin: true },
  '/socket.io': { target: api, changeOrigin: true, ws: true },
};

export default defineConfig(({ mode }) => ({
  // `npm run dev:phone` serves https on your Wi-Fi with a self-signed certificate.
  plugins: [react(), ...(mode === 'phone' ? [basicSsl()] : [])],
  server: { port: 5173, proxy },
  preview: { proxy },
}));
