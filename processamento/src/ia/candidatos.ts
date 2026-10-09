import type { SituacaoPagamento } from "../dominio/quitacao.js";

/** Tolerância monetária (mesma convenção de RN-02/RN-11). */
export const TOLERANCIA_VALOR = 0.01;

/** Número máximo de candidatos oferecidos ao provedor, por pagamento. */
export const MAXIMO_CANDIDATOS = 20;

/** Campos do resumo de um pedido que a montagem de candidatos lê. */
export type ResumoPedido = {
  id_pedido: string;
  valor_devido: number | null;
  valor_pago: number;
  data_limite: string | null;
  situacao_pagamento: SituacaoPagamento;
};

/** Campos do pagamento sem identificação que a montagem de candidatos lê. */
export type PagamentoParaCandidatos = {
  valor: number;
  momentoFato: string;
};

export type Candidato = {
  idPedido: string;
  devido: number;
  pago: number;
  dataPedido: string;
  diferencaSaldo: number;
};

/**
 * Monta, para um pagamento, os candidatos de pedido elegíveis (L-03):
 *
 *   1. não quitado (`situacao_pagamento !== 'quitado'`);
 *   2. "data do pedido" ≤ data do pagamento — a "data do pedido" usada é
 *      `pedido_resumo.data_limite` (vinda do evento `venda`; não há, no modelo
 *      atual, uma data de criação do pedido separada da data-limite). Pedidos
 *      sem `data_limite` ficam de fora: não há como aplicar este filtro sem
 *      essa data;
 *   3. `valor_devido` conhecido e saldo em aberto (`valor_devido - valor_pago`)
 *      compatível com o valor do pagamento, com a tolerância de RN-02/RN-11.
 *
 * Ordenados pela MENOR diferença absoluta entre saldo em aberto e valor do
 * pagamento (melhor candidato primeiro), limitado a `MAXIMO_CANDIDATOS`.
 */
export function montarCandidatos(
  pedidoResumo: readonly ResumoPedido[],
  pagamento: PagamentoParaCandidatos,
): Candidato[] {
  const candidatos: Candidato[] = [];

  for (const resumo of pedidoResumo) {
    if (resumo.situacao_pagamento === "quitado") {
      continue;
    }
    if (resumo.data_limite === null || resumo.valor_devido === null) {
      continue;
    }
    if (resumo.data_limite > pagamento.momentoFato) {
      continue;
    }

    const saldoEmAberto = resumo.valor_devido - resumo.valor_pago;
    if (saldoEmAberto < pagamento.valor - TOLERANCIA_VALOR) {
      continue;
    }

    candidatos.push({
      idPedido: resumo.id_pedido,
      devido: resumo.valor_devido,
      pago: resumo.valor_pago,
      dataPedido: resumo.data_limite,
      diferencaSaldo: Math.abs(saldoEmAberto - pagamento.valor),
    });
  }

  candidatos.sort((a, b) => a.diferencaSaldo - b.diferencaSaldo);
  return candidatos.slice(0, MAXIMO_CANDIDATOS);
}
