// TP-0050 — Rota pretendida: `GET /api/v1/qualidade` (e `HEAD`, derivado
// automaticamente pelo Hono a partir do GET). Este arquivo só exporta o
// handler — o registro em `web/worker/index.ts` (`app.get('/api/v1/qualidade',
// handlerQualidade)`) é feito pelo orquestrador junto com as demais rotas do
// Lote 9 (TP-0046 a TP-0050), numa única edição sequencial.
import type { Context } from "hono";
import { EsquemaRespostaQualidade } from "processamento/contrato/qualidade.js";

import { buscarDocumento } from "../consultas.js";
import { problema } from "../erros.js";

/** Formato mínimo do `env` esperado por este handler (`c.env.DB`). */
interface AmbienteWorker {
  Bindings: {
    DB: D1Database;
  };
}

/**
 * `GET /api/v1/qualidade`: lê o documento `qualidade` publicado (TP-0038) via
 * `buscarDocumento` e devolve após validar contra `EsquemaRespostaQualidade`.
 *
 * Documento ausente (`null`) → 500 `erro_interno` (publicação nunca correu
 * ou falhou) — tratado explicitamente aqui, não é um erro inesperado.
 *
 * `JSON.parse`/`EsquemaRespostaQualidade.parse` NÃO são capturados aqui de
 * propósito: se o conteúdo publicado estiver corrompido ou fora do esquema
 * esperado, a exceção propaga para `app.onError` central
 * (`web/worker/index.ts`), que já devolve 500 `erro_interno` sem nenhum
 * detalhe da exceção no corpo.
 */
export async function handlerQualidade(
  c: Context<AmbienteWorker>,
): Promise<Response> {
  const conteudo = await buscarDocumento(c.env.DB, "qualidade");
  if (conteudo === null) {
    return problema("erro_interno", 500);
  }

  const resultado = EsquemaRespostaQualidade.parse(JSON.parse(conteudo));
  return c.json(resultado);
}
