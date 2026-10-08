// TP-0041 — Esqueleto do Worker (Hono). Nenhuma rota de negócio aqui: isso é
// escopo de tarefa futura/paralela (TP-0042 em diante). Não importar nada de
// `node:*` nem de `web/src/` — o Worker roda no runtime do Cloudflare Workers.
//
// TP-0042 — erros centrais (404/405/500) e cabeçalhos de segurança/cache.
// Nenhuma rota de negócio real ainda (isso é Lote 9).
import { Hono } from "hono";
import { cabecalhos } from "./cabecalhos.js";
import { problema } from "./erros.js";

const app = new Hono();

// Cabeçalhos de segurança/cache em toda resposta — registrado primeiro,
// para envolver qualquer resposta produzida mais abaixo (incluindo as de
// erro do onError/notFound).
app.use("*", cabecalhos);

// Qualquer método diferente de GET/HEAD sob /api/* → 405 com `Allow`.
// Hono deriva HEAD do GET automaticamente, por isso não aparece aqui.
//
// ATENÇÃO (Lote 9): rotas reais que usem POST/PUT/PATCH/DELETE devem ser
// registradas ANTES deste catch-all (ordem de registro importa no Hono),
// senão esta regra genérica intercepta a rota real antes dela ser
// alcançada. Rotas GET reais não são afetadas, pois este catch-all não
// lista GET/HEAD — uma requisição GET para uma rota ainda inexistente
// continua caindo em `app.notFound` (404 `rota_nao_encontrada`), nunca
// aqui.
app.on(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"], "/api/*", (c) => {
  c.header("Allow", "GET, HEAD");
  return problema("metodo_nao_permitido", 405);
});

// Rota desconhecida sob /api/ → 404 rota_nao_encontrada.
app.notFound(() => problema("rota_nao_encontrada", 404));

// Exceção não tratada em qualquer handler → 500 erro_interno, sem nenhum
// detalhe da exceção original no corpo da resposta (log interno é
// aceitável, nunca exposto ao cliente).
app.onError((erro) => {
  console.error("Erro interno não tratado:", erro);
  return problema("erro_interno", 500);
});

export default app;
