import type { Repositorio } from "../../src/armazenamento/repositorio.js";
import type { ProvedorSugestao } from "../../src/ia/porta.js";
import { sugerir as sugerirComResumo, type OpcoesSugerir } from "../../src/ia/sugerir.js";
import { montarPedidosEVinculos } from "../../src/publicacao/pedidos.js";

export function sugerir(repositorio: Repositorio, provedor: ProvedorSugestao | undefined, opcoes?: OpcoesSugerir) {
  return sugerirComResumo(repositorio, montarPedidosEVinculos(repositorio).pedidoResumo, provedor, opcoes);
}

/**
 * Insere um pedido com um evento de venda (`valor_devido`/`data_limite`) e,
 * opcionalmente, um evento de pagamento JÁ vinculado (para compor
 * `valor_pago`/`situacao_pagamento` em `pedido_resumo`).
 */
export function inserirPedidoComVenda(
  repositorio: Repositorio,
  idPedido: string,
  valorDevido: number,
  dataLimite: string,
  pagamentosVinculados: number[] = [],
): void {
  repositorio.inserirPedido(idPedido);
  repositorio.inserirEvento({
    fonte: "vendas",
    codigoEvento: `VENDA-${idPedido}`,
    idPedido,
    tipo: "venda",
    momentoFato: dataLimite,
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      valor_devido: valorDevido,
      data_limite: dataLimite,
      transportadora: "Transportadora X",
    }),
  });

  pagamentosVinculados.forEach((valor, indice) => {
    repositorio.inserirEvento({
      fonte: "pagamentos",
      codigoEvento: `PAG-${idPedido}-${String(indice)}`,
      idPedido,
      tipo: "pagamento",
      momentoFato: dataLimite,
      ordemChegada: null,
      versaoSchema: 1,
      dados: JSON.stringify({ valor, referencia_original: `ref-${idPedido}-${String(indice)}` }),
    });
  });
}

/**
 * Insere um pagamento sem identificação: evento `pagamento` com
 * `id_pedido = null` + achado `sem_identificacao` apontando para o mesmo
 * `codigo_evento` (mesmo padrão de `fontes/pagamentos.ts` +
 * `importacao/importar.ts`).
 */
export function inserirPagamentoSemIdentificacao(
  repositorio: Repositorio,
  codigoTransacao: string,
  valor: number,
  momentoFato: string,
  referenciaOriginal: string,
): void {
  repositorio.inserirEvento({
    fonte: "pagamentos",
    codigoEvento: codigoTransacao,
    idPedido: null,
    tipo: "pagamento",
    momentoFato,
    ordemChegada: null,
    versaoSchema: 1,
    dados: JSON.stringify({ valor, referencia_original: referenciaOriginal }),
  });
  repositorio.inserirAchadoQualidade({
    tipo: "sem_identificacao",
    fonte: "pagamentos",
    referencia: codigoTransacao,
    regra: "RN-09: referência de pagamento sem casamento único com pedido conhecido",
    detalhe: `referência "${referenciaOriginal}" não casou com exatamente 1 código de pedido conhecido`,
  });
}
