import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the Instant Games zip works on Facebook's host.
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
  },
  server: {
    port: 5173,
    host: true,
  },
});
