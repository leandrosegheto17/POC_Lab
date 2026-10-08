import type { Divergencia } from "../modelo.js";
import type { EnvelopeEvento, PayloadPagamentoV1 } from "../evento.js";

/**
 * Tolerância para considerar um pagamento como "valor integral" em relação
 * ao valor devido, absorvendo arredondamento de centavos.
 */
const TOLERANCIA_VALOR_INTEGRAL = 0.01;

/**
 * Dados de um pagamento relevantes para a detecção de RN-03 (pagamento
 * duplicado): o código do evento (identifica a transação) e o valor pago.
 */
export type PagamentoDuplicado = Pick<EnvelopeEvento, "codigoEvento"> &
  Pick<PayloadPagamentoV1, "valor">;

/**
 * RN-03 — pagamento duplicado.
 *
 * `pagamentos` já chega deduplicado por `codigoEvento` (idempotência é
 * responsabilidade de outra camada); "mesmo código repetido" não é tratado
 * aqui.
 *
 * Considera apenas pagamentos de valor integral (≈ `valorDevido`, tolerância
 * de R$ 0,01). Se houver 2 ou mais pagamentos distintos (códigos de
 * transação diferentes) nessas condições e a soma paga exceder o valor
 * devido, retorna um achado `duplicado` citando os valores envolvidos.
 *
 * Parcelas que somam ao valor devido (RN-04) não são tratadas aqui — essa é
 * outra função, fora de escopo desta.
 */
export function detectarDuplicado(
  valorDevido: number,
  pagamentos: PagamentoDuplicado[],
): Divergencia | undefined {
  const pagamentosIntegrais = pagamentos.filter(
    (pagamento) =>
      Math.abs(pagamento.valor - valorDevido) <= TOLERANCIA_VALOR_INTEGRAL,
  );

  if (pagamentosIntegrais.length < 2) {
    return undefined;
  }

  const totalPago = pagamentosIntegrais.reduce(
    (soma, pagamento) => soma + pagamento.valor,
    0,
  );

  if (totalPago <= valorDevido) {
    return undefined;
  }

  const idsEventos = pagamentosIntegrais.map(
    (pagamento) => pagamento.codigoEvento,
  );

  return {
    tipo: "duplicado",
    motivo: `pago R$${totalPago.toFixed(2)} em ${pagamentosIntegrais.length} transações, devido R$${valorDevido.toFixed(2)}`,
    idsEventos,
  };
}
