import type { Evento } from "../../src/dominio/evento.js";

export function venda(partial: {
  codigoEvento: string;
  momentoFato: string;
  valor_devido: number;
}): Evento {
  return {
    fonte: "vendas",
    codigoEvento: partial.codigoEvento,
    momentoFato: partial.momentoFato,
    tipo: "venda",
    versao_schema: 1,
    valor_devido: partial.valor_devido,
    data_limite: "2026-01-10T00:00:00Z",
    transportadora: "Transportadora 1",
  };
}

export function pagamento(partial: {
  codigoEvento: string;
  momentoFato: string;
  valor: number;
}): Evento {
  return {
    fonte: "vendas",
    codigoEvento: partial.codigoEvento,
    momentoFato: partial.momentoFato,
    tipo: "pagamento",
    versao_schema: 1,
    valor: partial.valor,
    referencia_original: "ref-1",
  };
}

export function coleta(partial: { codigoEvento: string; momentoFato: string }): Evento {
  return {
    fonte: "rastreio",
    codigoEvento: partial.codigoEvento,
    momentoFato: partial.momentoFato,
    tipo: "coleta",
    versao_schema: 1,
    transportadora: "Transportadora 1",
    codigo_rastreio: "BR123",
  };
}
