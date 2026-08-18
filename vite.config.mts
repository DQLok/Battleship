import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "/Battleship/", // Thay <ten-repository-github> bằng tên repo trên GitHub của bạn (ví dụ: /battleship/)
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "zmp-ui": path.resolve(rootDir, "src/compat/zmp-ui.tsx"),
      "zmp-sdk": path.resolve(rootDir, "src/compat/zmp-sdk.ts"),
    },
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
    host: true,
  },
});
