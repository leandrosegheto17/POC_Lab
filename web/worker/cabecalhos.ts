// TP-0042 — Cabeçalhos de segurança/cache aplicados a toda resposta da API.
import type { MiddlewareHandler } from "hono";

/**
 * Middleware Hono que adiciona, em TODA resposta (sucesso ou erro):
 *   - `X-Content-Type-Options: nosniff`
 *   - `Referrer-Policy: no-referrer`
 *   - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
 *
 * E, SÓ nas respostas com status 200:
 *   - `Cache-Control: public, max-age=60`
 *
 * NUNCA adiciona nenhum cabeçalho `Access-Control-*` (CORS) — a API não
 * tem CORS habilitado.
 */
export const cabecalhos: MiddlewareHandler = async (c, next) => {
  await next();

  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'",
  );

  if (c.res.status === 200) {
    c.header("Cache-Control", "public, max-age=60");
  }
};
