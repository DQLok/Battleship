import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages needs /Battleship/; local `npm run dev` must serve at `/`
  // so http://localhost:5173/?mockId=player1 works.
  base: command === "build" ? "/Battleship/" : "/",
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
    port: 5173,
    host: true,
  },
}));
