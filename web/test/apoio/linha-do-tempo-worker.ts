// Apoio comum aos testes de rota da linha do tempo no Worker (v1 e v2).
import { Hono } from "hono";

import type { TabelasParaPublicacao } from "processamento/publicacao/escritor-sql.js";

type Divergencia = TabelasParaPublicacao["divergencia"][number];

/** Divergência de tipo válido (`parcial`) associada ao pedido informado. */
export function divergenciaParcial(idPedido: string): Divergencia {
  return {
    tipo: "parcial",
    id_pedido: idPedido,
    motivo: "Pagamento parcial identificado.",
    eventos: "[]",
  };
}

/** Instância Hono só para o teste, com a rota informada registrada. */
export function criarAppDeRota(rota: Hono<{ Bindings: { DB: D1Database } }>) {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/", rota);
  return app;
}
