import { calcularQuitacao } from '../quitacao.js';
import type { Divergencia } from '../modelo.js';

/**
 * Detecta pagamento parcial (RN-04): 0 < pago < devido.
 *
 * Reaproveita `calcularQuitacao` (RN-02) para somar os pagamentos e decidir a
 * situação, já com a tolerância de R$ 0,01 aplicada. Só gera achado quando a
 * situação resultante é exatamente `parcial` — parcelas que quitam o pedido
 * (`quitado`/`excedente`) ou ausência de pagamento (`sem_pagamento`) não
 * geram nada aqui.
 */
export function detectarParcial(
  valorDevido: number,
  pagamentos: Array<{ codigoEvento: string; valor: number }>,
): Divergencia | undefined {
  const { pago, situacao } = calcularQuitacao(
    valorDevido,
    pagamentos.map((pagamento) => pagamento.valor),
  );

  if (situacao !== 'parcial') {
    return undefined;
  }

  return {
    tipo: 'parcial',
    motivo: `pago R$${pago} de R$${valorDevido} devido`,
    idsEventos: pagamentos.map((pagamento) => pagamento.codigoEvento),
  };
}
