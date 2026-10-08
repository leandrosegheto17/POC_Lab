import type { PedidoVendas } from "../fontes/leitura-vendas.js";

/**
 * Seleciona, de forma determinística, o universo de pedidos "limpos"
 * elegíveis para o gerador de dados sintéticos (TP-0023 em diante).
 *
 * Decisão desta tarefa (TP-0023): o conceito de "plantio" de problemas
 * (duplicidade, atraso, pagamento parcial, etc.) ainda não existe — isso é
 * responsabilidade de tarefas futuras. Por isso, nesta tarefa,
 * `pedidosLimpos` devolve **todos** os pedidos recebidos, sem excluir
 * nenhum: não há ainda nenhum "problema" para reservar pedidos para.
 *
 * Ainda assim, a função já consome o PRNG recebido de forma determinística
 * (uma chamada por pedido, na mesma ordem da lista de entrada) mesmo não
 * usando o valor sorteado para decidir nada nesta tarefa. Isso é
 * proposital: reserva, na sequência do PRNG, exatamente os números que as
 * tarefas futuras de plantio vão precisar consumir para decidir quais
 * pedidos recebem problema — garantindo que, quando o plantio for
 * implementado, a ordem de consumo do PRNG (e portanto o resultado
 * determinístico ponta a ponta do gerador) não mude por causa desta função.
 */
export function pedidosLimpos(
  pedidos: PedidoVendas[],
  prng: () => number,
): PedidoVendas[] {
  for (let indice = 0; indice < pedidos.length; indice += 1) {
    // Consome um número do PRNG por pedido, na ordem de entrada, só para
    // reservar a sequência (ver comentário da função). O valor em si não é
    // usado nesta tarefa.
    prng();
  }

  return pedidos.slice();
}
