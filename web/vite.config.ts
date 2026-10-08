import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// TP-0003 — configuração mínima do pacote `web`: build via Vite/React 19 e
// testes via Vitest em ambiente jsdom. Não configura `@cloudflare/vite-plugin`
// nem Worker (isso é TP-0041, fora de escopo aqui).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
  },
});
