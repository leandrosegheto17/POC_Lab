// Eventos v1 de exemplo e consultas de DOM para os testes de `LinhaDoTempo`.
import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";

export function eventoVenda(overrides: Partial<EventoV1 & { tipo: "venda" }> = {}): EventoV1 {
  return {
    fonte: "vendas",
    codigoEvento: "10248",
    momentoFato: "2026-10-01T10:00:00.000Z",
    tipo: "venda",
    valor_devido: 150.5,
    data_limite: "2026-10-10T00:00:00.000Z",
    transportadora: "Transportadora X",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

export function eventoPagamento(
  overrides: Partial<EventoV1 & { tipo: "pagamento" }> = {},
): EventoV1 {
  return {
    fonte: "pagamentos",
    codigoEvento: "TX-88812",
    momentoFato: "2026-10-02T10:00:00.000Z",
    tipo: "pagamento",
    valor: 150.5,
    referencia_original: "10248",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

export function eventoColeta(overrides: Partial<EventoV1 & { tipo: "coleta" }> = {}): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-RS-000001",
    momentoFato: "2026-10-03T10:00:00.000Z",
    tipo: "coleta",
    transportadora: "Transportadora X",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

export function eventoTransporte(
  overrides: Partial<EventoV1 & { tipo: "transporte" }> = {},
): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-RS-000002",
    momentoFato: "2026-10-04T10:00:00.000Z",
    tipo: "transporte",
    transportadora: "Transportadora X",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

export function eventoEntrega(overrides: Partial<EventoV1 & { tipo: "entrega" }> = {}): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-RS-000003",
    momentoFato: "2026-10-05T10:00:00.000Z",
    tipo: "entrega",
    transportadora: "Transportadora X",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

export function todosOsTipos(): EventoV1[] {
  return [
    eventoVenda(),
    eventoPagamento(),
    eventoColeta(),
    eventoTransporte(),
    eventoEntrega(),
  ];
}

export function linhasDeData(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".linha-do-tempo__linha"),
  );
}

export function cartoes(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".evento"));
}
