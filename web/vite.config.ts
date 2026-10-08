import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// TP-0003 — build via Vite/React 19 e testes via Vitest em ambiente jsdom.
// TP-0041 — `@cloudflare/vite-plugin` soma o Worker (`web/worker/index.ts`,
// configurado em `web/wrangler.jsonc`) ao mesmo processo `vite dev`/`vite
// build`, servindo site (assets) e API (`/api/*`) juntos.
export default defineConfig({
  plugins: [react(), cloudflare()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
