import { describe, expect, it } from "vitest";
import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";
import { derivarEstado } from "processamento/dominio/estado.js";
import { eventoV1ParaDominio } from "../src/dados/evento-v1.ts";

const venda: EventoV1 = {
  fonte: "vendas",
  codigoEvento: "10248",
  momentoFato: "2026-01-01T10:00:00Z",
  tipo: "venda",
  valor_devido: 150,
  data_limite: "2026-01-20T00:00:00Z",
  transportadora: "Transp. Rápida",
  chegouForaDeOrdem: false,
};
const pagamento: EventoV1 = {
  fonte: "pagamentos",
  codigoEvento: "TX-1",
  momentoFato: "2026-01-02T10:00:00Z",
  tipo: "pagamento",
  valor: 150,
  referencia_original: "10248",
  chegouForaDeOrdem: true,
};
const rastreio = (tipo: "coleta" | "transporte" | "entrega", dia: string): EventoV1 => ({
  fonte: "rastreio",
  codigoEvento: `EVT-${tipo}`,
  momentoFato: `2026-01-${dia}T10:00:00Z`,
  tipo,
  transportadora: "Transp. Rápida",
  codigo_rastreio: "RS-1",
  chegouForaDeOrdem: false,
});

describe("eventoV1ParaDominio", () => {
  it("venda e pagamento chegam com versao_schema 1 e seus campos", () => {
    expect(eventoV1ParaDominio(venda)).toEqual({
      fonte: "vendas",
      codigoEvento: "10248",
      momentoFato: "2026-01-01T10:00:00Z",
      tipo: "venda",
      versao_schema: 1,
      valor_devido: 150,
      data_limite: "2026-01-20T00:00:00Z",
      transportadora: "Transp. Rápida",
    });
    expect(eventoV1ParaDominio(pagamento)).toEqual({
      fonte: "pagamentos",
      codigoEvento: "TX-1",
      momentoFato: "2026-01-02T10:00:00Z",
      tipo: "pagamento",
      versao_schema: 1,
      valor: 150,
      referencia_original: "10248",
    });
  });

  it.each(["coleta", "transporte", "entrega"] as const)(
    "%s leva transportadora e código de rastreio",
    (tipo) => {
      expect(eventoV1ParaDominio(rastreio(tipo, "03"))).toMatchObject({
        tipo,
        versao_schema: 1,
        transportadora: "Transp. Rápida",
        codigo_rastreio: "RS-1",
      });
    },
  );

  it("derivarEstado sobre os eventos adaptados reflete venda, pagamento e entrega", () => {
    const eventos = [
      venda,
      pagamento,
      rastreio("coleta", "03"),
      rastreio("transporte", "05"),
      rastreio("entrega", "10"),
    ].map(eventoV1ParaDominio);

    const antes = derivarEstado(eventos, "2026-01-01T23:59:59.999Z");
    const depois = derivarEstado(eventos, "2026-01-10T23:59:59.999Z");

    expect(antes.vendido).toBe(true);
    expect(depois.frase).not.toBe(antes.frase);
    expect(depois.frase.toLowerCase()).toContain("entregue");
  });
});
