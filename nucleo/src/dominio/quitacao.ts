import { arredondarMoeda } from './valores.js';

/**
 * Situação de pagamento de um pedido, derivada da comparação entre o valor
 * devido e o total pago (RN-02).
 */
export type SituacaoPagamento =
  | 'sem_pagamento'
  | 'parcial'
  | 'quitado'
  | 'excedente';

/**
 * Tolerância monetária (em reais) usada para considerar um pedido quitado
 * mesmo com diferença residual de centavos (ex.: arredondamento de parcelas).
 */
const TOLERANCIA_QUITACAO_CENTAVOS = 1;

/**
 * Calcula a quitação/saldo de um pedido (RN-02):
 *
 *   pago = Σ pagamentos
 *   saldo = valorDevido − pago
 *
 * `pagamentos` já deve vir filtrada/vinculada ao pedido por outra camada —
 * esta função não resolve vínculo de pagamento, apenas soma o que recebe.
 *
 * A situação é decidida a partir do saldo "bruto" (não arredondado), para
 * que a tolerância de R$ 0,01 funcione corretamente mesmo em fronteiras como
 * R$ 0,004 (que um saldo já arredondado a 2 casas poderia mascarar como
 * 0,00). O `saldo` retornado no resultado, por sua vez, é arredondado a 2
 * casas (via `arredondarMoeda`), pensado para exibição.
 */
export function calcularQuitacao(
  valorDevido: number,
  pagamentos: number[],
): { pago: number; saldo: number; situacao: SituacaoPagamento } {
  const pagoBruto = pagamentos.reduce((acumulado, valor) => acumulado + valor, 0);
  const saldoBruto = valorDevido - pagoBruto;
  // Remove só o ruído de ponto flutuante (ex.: 100 − 99.99 = 0.01000000000000512)
  // sem arredondar a centavos: saldos sub-centavo como 0,011 continuam fora
  // da tolerância.
  const saldoComparavel = Number(saldoBruto.toPrecision(12));
  const tolerancia = TOLERANCIA_QUITACAO_CENTAVOS / 100;

  let situacao: SituacaoPagamento;
  if (pagoBruto === 0) {
    situacao = 'sem_pagamento';
  } else if (Math.abs(saldoComparavel) <= tolerancia) {
    situacao = 'quitado';
  } else if (saldoComparavel > tolerancia) {
    situacao = 'parcial';
  } else {
    situacao = 'excedente';
  }

  return {
    pago: arredondarMoeda(pagoBruto),
    saldo: arredondarMoeda(saldoBruto),
    situacao,
  };
}
