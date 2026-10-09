import { describe, expect, it } from "vitest";
import type { Evento } from "../../src/dominio/evento.js";
import { derivarEstado } from "../../src/dominio/estado.js";
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import { coleta, pagamento, venda } from "../apoio/eventos.js";

function transporte(partial: { codigoEvento: string; momentoFato: string }): Evento {
  return {
    fonte: "rastreio",
    codigoEvento: partial.codigoEvento,
    momentoFato: partial.momentoFato,
    tipo: "transporte",
    versao_schema: 1,
    transportadora: "Transportadora 1",
    codigo_rastreio: "BR123",
  };
}

function entrega(partial: { codigoEvento: string; momentoFato: string }): Evento {
  return {
    fonte: "rastreio",
    codigoEvento: partial.codigoEvento,
    momentoFato: partial.momentoFato,
    tipo: "entrega",
    versao_schema: 1,
    transportadora: "Transportadora 1",
    codigo_rastreio: "BR123",
  };
}

describe("validação: auditoria em data", () => {
  it("vendido só, sem pagamento/coleta → sem_pagamento, não coletado, não entregue", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
    ];

    const resultado = derivarEstado(eventos);

    expect(resultado).toEqual({
      vendido: true,
      situacaoPagamento: "sem_pagamento",
      coletado: false,
      emTransporte: false,
      entregue: false,
      frase: "vendido, aguardando pagamento, ainda não coletado",
    });
  });

  it("vendido + pago parcial + coletado → parcial, coletado true, emTransporte/entregue false", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 40 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
    ];

    const resultado = derivarEstado(eventos);

    expect(resultado).toEqual({
      vendido: true,
      situacaoPagamento: "parcial",
      coletado: true,
      emTransporte: false,
      entregue: false,
      frase: "vendido, pagamento parcial, coletado, ainda não em transporte",
    });
  });

  it("vendido + quitado + coleta + transporte + entrega, todos até a dataCorte → entregue true e frase completa", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
      transporte({ codigoEvento: "evt-transporte", momentoFato: "2026-01-04T10:00:00Z" }),
      entrega({ codigoEvento: "evt-entrega", momentoFato: "2026-01-05T10:00:00Z" }),
    ];

    const resultado = derivarEstado(eventos, "2026-01-05T10:00:00Z");

    expect(resultado).toEqual({
      vendido: true,
      situacaoPagamento: "quitado",
      coletado: true,
      emTransporte: true,
      entregue: true,
      frase: "vendido, pago, coletado, em transporte, entregue",
    });
  });

  it("dataCorte anterior ao evento entrega → ignora a entrega, demais estados refletem só o ocorrido até a data", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
      transporte({ codigoEvento: "evt-transporte", momentoFato: "2026-01-04T10:00:00Z" }),
      entrega({ codigoEvento: "evt-entrega", momentoFato: "2026-01-05T10:00:00Z" }),
    ];

    const resultado = derivarEstado(eventos, "2026-01-04T10:00:00Z");

    expect(resultado).toEqual({
      vendido: true,
      situacaoPagamento: "quitado",
      coletado: true,
      emTransporte: true,
      entregue: false,
      frase: "vendido, pago, coletado, em transporte, ainda não entregue",
    });
  });

  it("eventos passados fora de ordem na entrada → mesma saída que a lista já ordenada (determinismo)", () => {
    const ordenada = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 40 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
    ];
    const embaralhada = [obrigatorio(ordenada[2]), obrigatorio(ordenada[0]), obrigatorio(ordenada[1])];

    const resultadoOrdenado = derivarEstado(ordenada);
    const resultadoEmbaralhado = derivarEstado(embaralhada);

    expect(resultadoEmbaralhado).toEqual(resultadoOrdenado);
  });

  it("sem dataCorte (undefined) → considera todos os eventos", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 100 }),
      coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-03T10:00:00Z" }),
      transporte({ codigoEvento: "evt-transporte", momentoFato: "2026-01-04T10:00:00Z" }),
      entrega({ codigoEvento: "evt-entrega", momentoFato: "2026-01-05T10:00:00Z" }),
    ];

    const resultado = derivarEstado(eventos, undefined);

    expect(resultado.entregue).toBe(true);
    expect(resultado.frase).toBe("vendido, pago, coletado, em transporte, entregue");
  });

  it("situação excedente (pagamento maior que devido) refletida corretamente na frase", () => {
    const eventos = [
      venda({ codigoEvento: "evt-venda", momentoFato: "2026-01-01T10:00:00Z", valor_devido: 100 }),
      pagamento({ codigoEvento: "evt-pagamento", momentoFato: "2026-01-02T10:00:00Z", valor: 150 }),
    ];

    const resultado = derivarEstado(eventos);

    expect(resultado.situacaoPagamento).toBe("excedente");
    expect(resultado.frase).toBe("vendido, pagamento excedente, ainda não coletado");
  });

  it("sem evento de venda → não vendido, situação de pagamento nula", () => {
    const eventos = [coleta({ codigoEvento: "evt-coleta", momentoFato: "2026-01-01T10:00:00Z" })];

    const resultado = derivarEstado(eventos);

    expect(resultado).toEqual({
      vendido: false,
      situacaoPagamento: null,
      coletado: true,
      emTransporte: false,
      entregue: false,
      frase: "não vendido",
    });
  });
});
