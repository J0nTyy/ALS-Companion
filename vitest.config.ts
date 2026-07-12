import { defineConfig } from "vitest/config";
import path from "node:path";

// Focused, minimal test setup: pure application + infrastructure-mapping logic
// runs in a plain Node environment (no DOM, no Tauri).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
