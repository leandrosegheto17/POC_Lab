// GET /api/v1/pedidos/{codigo}/linha-do-tempo.
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { EsquemaParametroCodigo } from "nucleo/contrato/codigo.js";
import { EsquemaLinhaDoTempoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";

import { hookValidacaoZod, problema } from "../erros.js";
import { carregarLinhaDoTempo } from "../linha-do-tempo-comum.js";

/** Sub-app Hono só com esta rota, composto por `index.ts` via `app.route`. */
export const rotaLinhaDoTempo = new Hono<{ Bindings: { DB: D1Database } }>();

rotaLinhaDoTempo.get(
  "/api/v1/pedidos/:codigo/linha-do-tempo",
  zValidator("param", z.object({ codigo: EsquemaParametroCodigo }), hookValidacaoZod),
  async (c) => {
    const carregada = await carregarLinhaDoTempo(c.env.DB, c.req.valid("param").codigo);
    if (carregada === null) {
      return problema("pedido_nao_encontrado", 404);
    }

    const resposta = EsquemaLinhaDoTempoV1.parse({
      pedido: carregada.pedido,
      // Sem `versao_schema`: o esquema v1 usa `z.object()` simples e descarta
      // campos posteriores do payload (G-21).
      eventos: carregada.linhas.map((linha) => ({
        ...(JSON.parse(linha.dados) as Record<string, unknown>),
        fonte: linha.fonte,
        codigoEvento: linha.codigo_evento,
        momentoFato: linha.momento_fato,
        chegouForaDeOrdem: Boolean(linha.fora_de_ordem),
      })),
    });

    return c.json(resposta);
  },
);
