import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// @tauri-apps/cli sets TAURI_DEV_HOST when serving the desktop shell on a LAN.
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Tauri expects a fixed port and fails if it is not available.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    // Only enable the explicit HMR websocket when Tauri provides a host.
    ...(host
      ? { hmr: { protocol: "ws", host, port: 1421 } }
      : {}),
    watch: {
      // The frontend dev server should not watch the Rust backend.
      ignored: ["**/src-tauri/**"],
    },
  },

  // Produce a build the Tauri shell can load.
  build: {
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
  },
});
