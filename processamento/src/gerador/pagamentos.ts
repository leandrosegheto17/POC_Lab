import { arredondarMoeda, calcularValorDevido } from "../dominio/valores.js";
import type { PedidoVendas } from "../fontes/leitura-vendas.js";

/**
 * Fração determinística dos pedidos "limpos" que recebe pagamento em 2
 * parcelas (em vez de 1 transação integral). A decisão de qual pedido cai
 * em cada caso é feita sorteando um número do PRNG recebido — por isso é
 * importante que `gerarPagamentos` seja chamada com um PRNG já avançado da
 * mesma forma entre execuções (ver `pedidosLimpos`).
 */
export const PROPORCAO_PARCELADO = 0.2;

/**
 * Resultado da geração de pagamentos: as linhas de dados do
 * `pagamentos.csv` (sem cabeçalho, já formatadas) e o último número de
 * sequência de `codigo_transacao` usado (para eventuais chamadas futuras
 * encadeadas que precisem continuar a numeração a partir daqui).
 */
export type ResultadoGeracaoPagamentos = {
  linhasCsv: string[];
  transacaoSeq: number;
};

function formatarCodigoTransacao(numero: number): string {
  return `TX-${String(numero).padStart(6, "0")}`;
}

function formatarReferencia(idPedido: string): string {
  return `PV-${idPedido.padStart(6, "0")}`;
}

function formatarValor(valor: number): string {
  return valor.toFixed(2);
}

function formatarLinhaCsv(
  codigoTransacao: string,
  referencia: string,
  valor: number,
  dataPagamento: string,
): string {
  return `${codigoTransacao},${referencia},${formatarValor(valor)},${dataPagamento}`;
}

/**
 * Gera as linhas de pagamento (`pagamentos.csv`) para os pedidos recebidos,
 * de forma determinística a partir do PRNG informado.
 *
 * Para cada pedido:
 * - calcula o valor devido via `calcularValorDevido` (RN-01);
 * - sorteia (via `prng()`) se o pagamento é integral (1 transação) ou
 *   parcelado (2 parcelas que somam exatamente o valor devido — a segunda
 *   parcela é ajustada com `arredondarMoeda` para que a soma bata
 *   centavo a centavo, mesmo quando a metade exata teria dízima);
 * - usa `codigo_transacao` sequencial determinístico (`TX-000001`,
 *   `TX-000002`, ...), continuando a sequência entre pedidos;
 * - usa como `referencia` o código do pedido (`PV-` + zeros à esquerda até
 *   6 dígitos — sem variação de formatação, isso é de outra tarefa futura);
 * - usa como `data_pagamento` a mesma data do pedido
 *   (`pedido.dataPedido.iso`): decisão desta tarefa, já que ainda não há
 *   regra de negócio que justifique uma data de pagamento diferente da data
 *   do pedido (isso poderá mudar em tarefas futuras de plantio de atraso).
 *
 * Função pura: não lê nem escreve nada em disco.
 */
export function gerarPagamentos(
  pedidos: PedidoVendas[],
  prng: () => number,
): ResultadoGeracaoPagamentos {
  const linhasCsv: string[] = [];
  let transacaoSeq = 0;

  for (const pedido of pedidos) {
    const valorDevido = calcularValorDevido(pedido.itens);
    const referencia = formatarReferencia(pedido.idPedido);
    const dataPagamento = pedido.dataPedido.iso;
    const sorteio = prng();

    if (sorteio < PROPORCAO_PARCELADO) {
      const primeiraParcela = arredondarMoeda(valorDevido / 2);
      const segundaParcela = arredondarMoeda(valorDevido - primeiraParcela);

      transacaoSeq += 1;
      linhasCsv.push(
        formatarLinhaCsv(
          formatarCodigoTransacao(transacaoSeq),
          referencia,
          primeiraParcela,
          dataPagamento,
        ),
      );

      transacaoSeq += 1;
      linhasCsv.push(
        formatarLinhaCsv(
          formatarCodigoTransacao(transacaoSeq),
          referencia,
          segundaParcela,
          dataPagamento,
        ),
      );
    } else {
      transacaoSeq += 1;
      linhasCsv.push(
        formatarLinhaCsv(
          formatarCodigoTransacao(transacaoSeq),
          referencia,
          valorDevido,
          dataPagamento,
        ),
      );
    }
  }

  return { linhasCsv, transacaoSeq };
}
