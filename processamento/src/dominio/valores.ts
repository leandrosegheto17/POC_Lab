/**
 * Item de pedido usado no cálculo de valor devido (RN-01).
 *
 * `desconto` é fracionário (0 a 1, ex.: 0.1 = 10%). A validação de faixa
 * (ex.: preço <= 0, desconto fora de 0–1) é responsabilidade de outra tarefa
 * (RN-10) e não é feita aqui.
 */
export type ItemPedido = {
  precoUnitario: number;
  quantidade: number;
  desconto: number;
};

/**
 * Arredonda um valor monetário para 2 casas decimais, evitando o erro de
 * ponto flutuante acumulado de um arredondamento ingênuo
 * (`Math.round(valor * 100) / 100`).
 *
 * O ruído de ponto flutuante típico de somas/multiplicações em cascata (ex.:
 * `10.1 * 3` já não é exatamente `30.3` em ponto flutuante) aparece a partir
 * da 13ª-16ª casa significativa. `toPrecision(12)` descarta esse ruído antes
 * de arredondar para 2 casas, então o `Math.round` final opera sobre o valor
 * matematicamente correto, não sobre o artefato de ponto flutuante.
 *
 * Pensada para ser reaproveitada por outras tarefas de domínio que também
 * precisem fechar um valor monetário no final de um cálculo (ex.:
 * quitação/saldo), nunca item a item.
 */
export function arredondarMoeda(valor: number): number {
  const semRuido = Number(valor.toPrecision(12));
  return Math.round(semRuido * 100) / 100;
}

/**
 * Calcula o valor devido de um pedido (RN-01):
 *
 *   Σ precoUnitario × quantidade × (1 − desconto)
 *
 * Frete nunca entra nesse cálculo — propositalmente, `ItemPedido` não tem
 * campo de frete, para não abrir porta a erro futuro.
 *
 * A soma é feita inteiramente em ponto flutuante, sem arredondar item a
 * item; o arredondamento a 2 casas decimais acontece só no total final.
 */
export function calcularValorDevido(itens: ItemPedido[]): number {
  const total = itens.reduce(
    (acumulado, item) =>
      acumulado + item.precoUnitario * item.quantidade * (1 - item.desconto),
    0,
  );

  return arredondarMoeda(total);
}
