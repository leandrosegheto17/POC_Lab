// TP-0049 — Rota `GET /api/v1/indicadores`.
//
// Este arquivo SÓ exporta o handler (`handlerIndicadores`) — o registro da
// rota em `worker/index.ts` é feito pelo orquestrador depois, junto com as
// demais rotas do lote (TP-0046 a TP-0050), para evitar conflito de edição
// concorrente neste arquivo compartilhado.
import type { Context } from "hono";

import { EsquemaRespostaIndicadores } from "processamento/contrato/indicadores.js";

import { buscarDocumento } from "../consultas.js";
import { problema } from "../erros.js";

/** Bindings esperados por esta rota (só o que ela usa de `c.env`). */
interface BindingsIndicadores {
  DB: D1Database;
}

/**
 * Handler Hono de `GET /api/v1/indicadores`: lê o documento publicado
 * `indicadores` (TP-0039) e devolve a lista de blocos já validada contra
 * `EsquemaRespostaIndicadores`.
 *
 * Qualquer falha (documento ausente, JSON inválido, ou conteúdo fora do
 * esquema) resulta em 500 `erro_interno` — nunca expõe detalhe técnico no
 * corpo da resposta (G-xx, mesmo padrão de `erros.ts`). O `JSON.parse` e o
 * `.parse` do zod, se lançarem, são capturados pelo `onError` central do
 * Worker (`worker/index.ts`), que também devolve 500 `erro_interno`; aqui
 * tratamos explicitamente só o caso de documento ausente (`null`), que não
 * é uma exceção.
 */
export async function handlerIndicadores(
  c: Context<{ Bindings: BindingsIndicadores }>,
): Promise<Response> {
  const conteudo = await buscarDocumento(c.env.DB, "indicadores");

  if (conteudo === null) {
    return problema("erro_interno", 500);
  }

  const resultado = EsquemaRespostaIndicadores.parse(JSON.parse(conteudo));

  return c.json(resultado);
}
