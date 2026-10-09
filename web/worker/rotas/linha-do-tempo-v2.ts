// GET /api/v2/pedidos/{codigo}/linha-do-tempo.
//
// Mesma resolução, consultas e erros da v1 (`../linha-do-tempo-comum.js`); a
// diferença é a forma dos eventos, validada contra `EsquemaLinhaDoTempoV2`.
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { EsquemaParametroCodigo } from "processamento/contrato/codigo.js";
import { EsquemaLinhaDoTempoV2 } from "processamento/contrato/linha-do-tempo-v2.js";

import { hookValidacaoZod, problema } from "../erros.js";
import { carregarLinhaDoTempo } from "../linha-do-tempo-comum.js";

/** Sub-app Hono só com esta rota, composto por `index.ts` via `app.route`. */
export const rotaLinhaDoTempoV2 = new Hono<{ Bindings: { DB: D1Database } }>();

rotaLinhaDoTempoV2.get(
  "/api/v2/pedidos/:codigo/linha-do-tempo",
  zValidator("param", z.object({ codigo: EsquemaParametroCodigo }), hookValidacaoZod),
  async (c) => {
    const carregada = await carregarLinhaDoTempo(c.env.DB, c.req.valid("param").codigo);
    if (carregada === null) {
      return problema("pedido_nao_encontrado", 404);
    }

    const resposta = EsquemaLinhaDoTempoV2.parse({
      pedido: carregada.pedido,
      // `versao_schema` vem da coluna, não do payload. O payload gravado já
      // usa os nomes que `EsquemaEventoV2` espera (snake_case nos campos
      // específicos), então basta espalhá-lo por baixo do envelope.
      eventos: carregada.linhas.map((linha) => ({
        ...(JSON.parse(linha.dados) as Record<string, unknown>),
        fonte: linha.fonte,
        codigoEvento: linha.codigo_evento,
        momentoFato: linha.momento_fato,
        versao_schema: linha.versao_schema,
        chegouForaDeOrdem: Boolean(linha.fora_de_ordem),
      })),
    });

    return c.json(resposta);
  },
);
