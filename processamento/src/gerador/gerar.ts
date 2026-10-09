import type { PedidoVendas } from "../fontes/leitura-vendas.js";

/**
 * Seleciona, de forma determinística, o universo de pedidos "limpos"
 * elegíveis para o gerador de dados sintéticos.
 *
 * Devolve **todos** os pedidos recebidos, sem excluir nenhum: o plantio de
 * problemas (duplicidade, atraso, pagamento parcial, etc.) acontece depois,
 * em `plantar-pagamentos.ts` e `plantar-rastreio.ts`, que escolhem entre
 * esses pedidos.
 *
 * A função consome o PRNG recebido de forma determinística (uma chamada por
 * pedido, na mesma ordem da lista de entrada), sem usar o valor sorteado
 * para decidir nada. Isso é proposital: reserva, na sequência do PRNG, os
 * números que o plantio consome depois, de modo que a ordem de consumo do
 * PRNG (e portanto o resultado determinístico ponta a ponta do gerador) não
 * mude por causa desta função.
 */
export function pedidosLimpos(
  pedidos: PedidoVendas[],
  prng: () => number,
): PedidoVendas[] {
  for (let indice = 0; indice < pedidos.length; indice += 1) {
    // Consome um número do PRNG por pedido, na ordem de entrada, só para
    // reservar a sequência (ver comentário da função). O valor em si não é
    // usado.
    prng();
  }

  return pedidos.slice();
}
