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

/** Formato mínimo do corpo RFC 9457 usado nas asserções de erro. */
export interface CorpoErroTeste {
  codigo: string;
  status: number;
}

/** Pede a linha do tempo de um código (codificado na URL) e devolve status e corpo de erro. */
export async function pedirLinhaDoTempoComErro(
  app: ReturnType<typeof criarAppDeRota>,
  DB: D1Database,
  versao: "v1" | "v2",
  codigo: string,
): Promise<{ status: number; corpo: CorpoErroTeste }> {
  const resposta = await app.request(
    `/api/${versao}/pedidos/${encodeURIComponent(codigo)}/linha-do-tempo`,
    undefined,
    { DB },
  );
  return { status: resposta.status, corpo: await resposta.json<CorpoErroTeste>() };
}

/** Instância Hono só para o teste, com a rota informada registrada. */
export function criarAppDeRota(rota: Hono<{ Bindings: { DB: D1Database } }>) {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/", rota);
  return app;
}
