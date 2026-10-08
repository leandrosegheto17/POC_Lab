/**
 * RN-10: detecta valores fora do padrão esperado em itens de pedido e em
 * pagamentos.
 *
 * Funções puras: não fazem I/O e não conhecem os tipos `AchadoQualidade`,
 * `Fonte` ou `referencia` — devolvem apenas `{ regra, detalhe }`. Cabe ao
 * adaptador que as chama completar o restante do achado de qualidade.
 */

/**
 * Item de pedido mínimo necessário para validar RN-10.
 */
export type ItemPedidoParaValidacao = {
  precoUnitario: number;
  quantidade: number;
  desconto: number;
};

/**
 * Achado consolidado de valor fora do padrão: uma única regra em texto e um
 * detalhe que lista todas as condições violadas.
 */
export type AchadoValorForaDoPadrao = {
  regra: string;
  detalhe: string;
};

/**
 * Verifica se um item de pedido tem preço, quantidade ou desconto fora do
 * padrão (RN-10). Desconto é válido no intervalo [0, 1] (fronteira
 * inclusiva). Se nenhuma condição for violada, devolve `null`. Se mais de
 * uma condição for violada, consolida todas num único achado.
 */
export function verificarItemPedido(
  item: ItemPedidoParaValidacao,
): AchadoValorForaDoPadrao | null {
  const violacoes: string[] = [];

  if (!Number.isFinite(item.precoUnitario)) {
    violacoes.push(
      `preço unitário deveria ser um número finito, mas é ${String(item.precoUnitario)}`,
    );
  } else if (item.precoUnitario <= 0) {
    violacoes.push(
      `preço unitário deveria ser maior que zero, mas é ${String(item.precoUnitario)}`,
    );
  }

  if (!Number.isFinite(item.quantidade)) {
    violacoes.push(
      `quantidade deveria ser um número finito, mas é ${String(item.quantidade)}`,
    );
  } else if (item.quantidade <= 0) {
    violacoes.push(
      `quantidade deveria ser maior que zero, mas é ${String(item.quantidade)}`,
    );
  }

  if (!Number.isFinite(item.desconto)) {
    violacoes.push(
      `desconto deveria ser um número finito, mas é ${String(item.desconto)}`,
    );
  } else if (item.desconto < 0 || item.desconto > 1) {
    violacoes.push(
      `desconto deveria estar entre 0 e 1, mas é ${String(item.desconto)}`,
    );
  }

  if (violacoes.length === 0) {
    return null;
  }

  return {
    regra: "RN-10: item de pedido com valor fora do padrão",
    detalhe: violacoes.join("; "),
  };
}

/**
 * Verifica se um pagamento tem valor fora do padrão (RN-10): valor
 * de pagamento deveria ser maior que zero e não deveria exceder o dobro do
 * valor devido. Pagamento igual a exatamente 2x o valor devido é válido
 * (fronteira inclusiva). Se nenhuma condição for violada, devolve `null`.
 */
export function verificarPagamento(
  valorPagamento: number,
  valorDevido: number,
): AchadoValorForaDoPadrao | null {
  const violacoes: string[] = [];

  const pagamentoFinito = Number.isFinite(valorPagamento);
  const devidoFinito = Number.isFinite(valorDevido);

  if (!pagamentoFinito) {
    violacoes.push(
      `valor de pagamento deveria ser um número finito, mas é ${String(valorPagamento)}`,
    );
  } else if (valorPagamento <= 0) {
    violacoes.push(
      `valor de pagamento deveria ser maior que zero, mas é ${String(valorPagamento)}`,
    );
  }

  if (!devidoFinito) {
    violacoes.push(
      `valor devido deveria ser um número finito, mas é ${String(valorDevido)}`,
    );
  }

  const limiteMaximo = 2 * valorDevido;
  if (pagamentoFinito && devidoFinito && valorPagamento > limiteMaximo) {
    violacoes.push(
      `valor de pagamento (${String(valorPagamento)}) excede o dobro do valor devido (${String(valorDevido)}, limite ${String(limiteMaximo)})`,
    );
  }

  if (violacoes.length === 0) {
    return null;
  }

  return {
    regra: "RN-10: pagamento com valor fora do padrão",
    detalhe: violacoes.join("; "),
  };
}
