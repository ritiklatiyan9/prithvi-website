import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server on 5174 (admin uses 5173); /api proxies to the local backend so
// the site needs no CORS setup during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Bind to 0.0.0.0 so a phone on the same Wi-Fi can open the site at the
    // dev machine's LAN IP (http://<LAN-IP>:5174). The proxy still forwards
    // /api to the backend running on the dev machine.
    host: true,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
});
