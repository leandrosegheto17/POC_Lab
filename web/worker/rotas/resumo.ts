// TP-0046 — Rota pretendida: `GET /api/v1/resumo` (e `HEAD`, derivado
// automaticamente pelo Hono a partir do GET). Este arquivo só exporta o
// handler — o registro em `web/worker/index.ts` (`app.get('/api/v1/resumo',
// handlerResumo)`) é feito pelo orquestrador junto com as demais rotas do
// Lote 9 (TP-0046 a TP-0050), numa única edição sequencial.
import type { Context } from "hono";
import { EsquemaResumo } from "processamento/contrato/resumo.js";

import { buscarDocumento } from "../consultas.js";
import { problema } from "../erros.js";

/**
 * `GET /api/v1/resumo`: lê o documento `resumo` publicado (TP-0039) via
 * `buscarDocumento` e devolve após validar contra `EsquemaResumo`.
 *
 * Documento ausente (`null`) → 500 `erro_interno` (publicação nunca correu
 * ou falhou) — tratado explicitamente aqui, não é um erro inesperado.
 *
 * `JSON.parse`/`EsquemaResumo.parse` NÃO são capturados aqui de propósito:
 * se o conteúdo publicado estiver corrompido ou fora do esquema esperado,
 * a exceção propaga para `app.onError` central (`web/worker/index.ts`),
 * que já devolve 500 `erro_interno` sem nenhum detalhe da exceção no corpo.
 *
 * `c: Context` fica sem generic de `Bindings` de propósito (mesmo estilo
 * não tipado de `cabecalhos.ts`/`index.ts`) — evita acoplar este handler a
 * um tipo de `Env` que só o registro final em `index.ts` (fora de escopo
 * desta tarefa) vai de fato fixar; `c.env.DB` é lido via cast explícito.
 */
export async function handlerResumo(c: Context): Promise<Response> {
  const db = (c.env as { DB: D1Database }).DB;
  const conteudo = await buscarDocumento(db, "resumo");
  if (conteudo === null) {
    return problema("erro_interno", 500);
  }

  const resultado = EsquemaResumo.parse(JSON.parse(conteudo));
  return c.json(resultado);
}
