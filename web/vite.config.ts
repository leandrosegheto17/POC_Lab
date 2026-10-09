import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Build via Vite/React 19 e testes via Vitest em ambiente jsdom.
// `@cloudflare/vite-plugin` soma o Worker (`web/worker/index.ts`,
// configurado em `web/wrangler.jsonc`) ao mesmo processo `vite dev`/`vite
// build`, servindo site (assets) e API (`/api/*`) juntos.
// A chave `test` é do Vitest, que traz sua própria cópia de tipos do vite
// (versão diferente da instalada aqui); por isso a configuração é montada
// numa constante (sem checagem de propriedade excedente) antes do defineConfig.
const configuracao = {
  plugins: [react(), cloudflare()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
};

export default defineConfig(configuracao);
