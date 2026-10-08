import { describe, expect, it } from "vitest";
import type { Evento } from "../../../src/dominio/evento.js";
import { detectarEnvioPagamento } from "../../../src/dominio/divergencias/envio-pagamento.js";

function venda(partial: {
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

function pagamento(partial: {
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

function coleta(partial: { codigoEvento: string; momentoFato: string }): Evento {
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

describe("detectarEnvioPagamento (RN-05 + RN-14)", () => {
  it("quitado e sem evento coleta até a dataCorte → achado pago_nao_enviado", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 100 }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toEqual({
      tipo: "pago_nao_enviado",
      motivo: expect.stringContaining("quitado"),
      idsEventos: ["evt-venda", "evt-pagamento"],
    });
  });

  it("evento coleta (<= corte) e nenhum pagamento vinculado → achado enviado_nao_pago", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toEqual({
      tipo: "enviado_nao_pago",
      motivo: expect.stringContaining("coletado"),
      idsEventos: ["evt-venda", "evt-coleta"],
    });
  });

  it("quitado e coleta antes do corte → nenhum achado", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toBeUndefined();
  });

  it("situação parcial sem coleta → nenhum achado (RN-05 exige quitado, não qualquer pagamento)", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 40 }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toBeUndefined();
  });

  it("evento coleta com momentoFato posterior à dataCorte → tratado como ainda não coletado, mas sem pagamento gera enviado_nao_pago só se coletado até o corte (aqui: nenhum achado)", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-06T10:00:00Z" }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toBeUndefined();
  });

  it("coleta posterior à dataCorte, mas pedido quitado antes do corte → pago_nao_enviado (coleta ignorada pelo filtro de data)", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-06T10:00:00Z" }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toEqual({
      tipo: "pago_nao_enviado",
      motivo: expect.stringContaining("quitado"),
      idsEventos: ["evt-venda", "evt-pagamento"],
    });
  });

  it("pedido sem nenhum pagamento e sem coleta → nenhum dos dois achados", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toBeUndefined();
  });

  it("sem evento venda até o corte → nenhum achado", () => {
    const eventos = [
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-01T10:00:00Z" }),
    ];

    const resultado = detectarEnvioPagamento(eventos, "2026-01-05T00:00:00Z");

    expect(resultado).toBeUndefined();
  });
});
