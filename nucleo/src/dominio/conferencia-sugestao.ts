import { calcularQuitacao } from './quitacao.js';

/**
 * Tolerância monetária (em reais) usada para considerar o valor da sugestão
 * compatível com o saldo em aberto do pedido (mesma convenção de RN-02).
 */
const TOLERANCIA_VALOR = 0.01;

/**
 * Pedido candidato à conferência de uma sugestão de vínculo (RN-11).
 */
export interface PedidoCandidato {
  devido: number;
  pago: number;
  dataPedido: string;
}

/**
 * Sugestão de vínculo (pagamento) a ser conferida contra um pedido candidato.
 */
export interface Sugestao {
  valor: number;
  dataPagamento: string;
}

/**
 * Resultado da conferência de uma sugestão (RN-11).
 */
export interface ResultadoConferencia {
  conferida: boolean;
  motivo: string;
}

/**
 * Confere uma sugestão de vínculo entre um pagamento e um pedido candidato
 * (RN-11). A sugestão só é considerada `conferida` quando TODAS as condições
 * abaixo são verdadeiras:
 *
 *   1. Valor compatível: a diferença entre o saldo em aberto do pedido
 *      (`devido - pago`) e o valor sugerido é menor ou igual a R$ 0,01.
 *   2. Data do pagamento ≥ data do pedido (comparação de string ISO-8601,
 *      sem uso de `Date.now()`).
 *   3. Pedido não quitado — reaproveita `calcularQuitacao` (RN-02) para
 *      obter a `situacao` e rejeita quando ela for `'quitado'`.
 *
 * O `motivo` sempre descreve os valores concretos envolvidos; quando a
 * sugestão é rejeitada, aponta exatamente qual(is) condição(ões) falhou(aram).
 */
export function conferirSugestao(
  pedidoCandidato: PedidoCandidato,
  sugestao: Sugestao,
): ResultadoConferencia {
  const { devido, pago, dataPedido } = pedidoCandidato;
  const { valor, dataPagamento } = sugestao;

  const saldoEmAberto = devido - pago;
  const diferencaValor = Math.abs(saldoEmAberto - valor);
  // Remove o ruído de ponto flutuante (ex.: |0,3 - 0,31| = 0,010000000000000009)
  // sem arredondar a centavos, para que 0,011 continue incompatível.
  const valorCompativel = Number(diferencaValor.toPrecision(12)) <= TOLERANCIA_VALOR;

  const dataCompativel = dataPagamento >= dataPedido;

  const { situacao } = calcularQuitacao(devido, [pago]);
  const naoQuitado = situacao !== 'quitado';

  if (valorCompativel && dataCompativel && naoQuitado) {
    return {
      conferida: true,
      motivo:
        `Sugestão conferida: valor sugerido ${valor.toFixed(2)} compatível com o saldo em aberto ${saldoEmAberto.toFixed(2)} (diferença de ${diferencaValor.toFixed(2)}), ` +
        `data do pagamento ${dataPagamento} é posterior ou igual à data do pedido ${dataPedido}, e o pedido não está quitado (situação: ${situacao}).`,
    };
  }

  const motivosFalha: string[] = [];

  if (!valorCompativel) {
    motivosFalha.push(
      `valor incompatível: saldo em aberto é ${saldoEmAberto.toFixed(2)}, valor sugerido é ${valor.toFixed(2)} (diferença de ${diferencaValor.toFixed(2)}, acima da tolerância de ${TOLERANCIA_VALOR.toFixed(2)})`,
    );
  }

  if (!dataCompativel) {
    motivosFalha.push(
      `data do pagamento inválida: data do pagamento ${dataPagamento} é anterior à data do pedido ${dataPedido}`,
    );
  }

  if (!naoQuitado) {
    motivosFalha.push(
      `pedido já quitado: devido ${devido.toFixed(2)}, pago ${pago.toFixed(2)} (situação: ${situacao})`,
    );
  }

  return {
    conferida: false,
    motivo: `Sugestão rejeitada: ${motivosFalha.join('; ')}.`,
  };
}
