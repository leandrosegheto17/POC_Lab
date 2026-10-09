import type { Evento } from "../evento.js";
import type { Divergencia } from "../modelo.js";
import { detectarDuplicado, type PagamentoDuplicado } from "./duplicado.js";
import { detectarParcial } from "./parcial.js";
import { detectarEnvioPagamento } from "./envio-pagamento.js";
import { detectarAtraso } from "./atraso.js";

/**
 * Aplica as 4 regras de divergência (RN-03 a RN-06) a TODOS os
 * eventos de UM pedido e devolve a lista de achados, numa ordem estável:
 * `duplicado`, `parcial`, `pago_nao_enviado`/`enviado_nao_pago`,
 * `entrega_atrasada` — a ordem em que as regras são chamadas abaixo, com os
 * `undefined` (regra que não encontrou nada) filtrados fora.
 *
 * `dataCorte` (RN-14) já chega pronta como parâmetro — o cálculo da data de
 * corte global é de outra camada, fora de escopo aqui.
 *
 * Função pura: só compõe as 4 funções já existentes em `duplicado.ts`,
 * `parcial.ts`, `envio-pagamento.ts` e `atraso.ts`, sem reimplementar
 * nenhuma regra e sem nenhum I/O.
 *
 * Pedido sem evento `venda` entre `eventos` não tem `valorDevido`/
 * `dataLimite` para calcular nada: devolve lista vazia.
 */
export function calcularDivergencias(eventos: Evento[], dataCorte: string): Divergencia[] {
  const eventoVenda = eventos.find((evento) => evento.tipo === "venda");
  if (eventoVenda === undefined) {
    return [];
  }

  const pagamentos: PagamentoDuplicado[] = eventos
    .filter((evento) => evento.tipo === "pagamento")
    .map((evento) => ({ codigoEvento: evento.codigoEvento, valor: evento.valor }));

  const eventoEntrega = eventos.find((evento) => evento.tipo === "entrega");

  const candidatos: Array<Divergencia | undefined> = [
    detectarDuplicado(eventoVenda.valor_devido, pagamentos),
    detectarParcial(eventoVenda.valor_devido, pagamentos),
    detectarEnvioPagamento(eventos, dataCorte),
    detectarAtraso(eventoVenda.data_limite, eventoEntrega),
  ];

  return candidatos.filter((divergencia): divergencia is Divergencia => divergencia !== undefined);
}
