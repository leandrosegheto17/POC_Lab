// Resolução, consultas e montagem de `pedido` comuns às rotas da linha do
// tempo (v1 e v2). Cada rota só mapeia os eventos para a sua forma e valida
// com o seu esquema. Todo acesso ao D1 passa por `./consultas.js`.
import { normalizarCodigo } from "processamento/contrato/codigo.js";
import { FONTES, type Fonte } from "processamento/dominio/modelo.js";

import {
  listarDivergenciasDoPedido,
  listarLinhaDoTempo,
  resolverPedidoComResumo,
} from "./consultas.js";

/** Formato armazenado em `pedido_resumo.fontes`. */
type FontesPedido = Partial<Record<Fonte, string>>;

export type LinhaEvento = Awaited<ReturnType<typeof listarLinhaDoTempo>>[number];

export interface LinhaDoTempoCarregada {
  pedido: {
    identidade: string;
    codigoBuscado: string;
    fontes: { fonte: Fonte; codigo: string }[];
    devido: number;
    pago: number;
    dataLimite: string;
    divergencias: { tipo: string; motivo: string }[];
  };
  linhas: LinhaEvento[];
}

/**
 * Resolve o código, lê pedido, eventos (já em ordem canônica) e divergências
 * (as duas últimas em paralelo) e monta `pedido`. Devolve `null` quando o
 * código não existe (a rota responde 404). `codigo` é o valor CRU da URL: é
 * ele que vai em `pedido.codigoBuscado`, nunca o normalizado.
 */
export async function carregarLinhaDoTempo(
  db: D1Database,
  codigo: string,
): Promise<LinhaDoTempoCarregada | null> {
  const pedidoResumo = await resolverPedidoComResumo(db, normalizarCodigo(codigo));
  if (pedidoResumo === null) {
    return null;
  }

  const [linhas, divergencias] = await Promise.all([
    listarLinhaDoTempo(db, pedidoResumo.id_pedido),
    listarDivergenciasDoPedido(db, pedidoResumo.id_pedido),
  ]);

  const fontes = JSON.parse(pedidoResumo.fontes) as FontesPedido;
  const fontesResposta = FONTES.filter((chave) => fontes[chave] !== undefined).map((chave) => ({
    fonte: chave,
    codigo: fontes[chave] as string,
  }));

  return {
    pedido: {
      identidade: pedidoResumo.id_pedido,
      codigoBuscado: codigo,
      fontes: fontesResposta,
      devido: pedidoResumo.valor_devido,
      pago: pedidoResumo.valor_pago,
      dataLimite: pedidoResumo.data_limite,
      divergencias: divergencias.map((linha) => ({ tipo: linha.tipo, motivo: linha.motivo })),
    },
    linhas,
  };
}
