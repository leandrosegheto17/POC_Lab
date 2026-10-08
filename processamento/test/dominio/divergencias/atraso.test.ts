import { describe, expect, it } from "vitest";
import type { Evento } from "../../../src/dominio/evento.js";
import { detectarAtraso } from "../../../src/dominio/divergencias/atraso.js";

const dataLimite = "2026-01-10T00:00:00Z";

function construirEventoEntrega(momentoFato: string): Evento {
  return {
    fonte: "rastreio",
    codigoEvento: "evt-entrega-1",
    momentoFato,
    tipo: "entrega",
    versao_schema: 1,
    transportadora: "Transportadora 1",
    codigo_rastreio: "rastreio-1",
  };
}

describe("detectarAtraso (RN-06)", () => {
  it("gera achado entrega_atrasada quando momentoFato da entrega é posterior à data limite", () => {
    const eventoEntrega = construirEventoEntrega("2026-01-12T00:00:00Z");

    const resultado = detectarAtraso(dataLimite, eventoEntrega);

    expect(resultado?.tipo).toBe("entrega_atrasada");
    expect(resultado?.idsEventos).toEqual(["evt-entrega-1"]);
    expect(resultado?.motivo).toContain("2026-01-12T00:00:00Z");
    expect(resultado?.motivo).toContain(dataLimite);
  });

  it("não gera achado quando a entrega ocorre antes da data limite", () => {
    const eventoEntrega = construirEventoEntrega("2026-01-05T00:00:00Z");

    const resultado = detectarAtraso(dataLimite, eventoEntrega);

    expect(resultado).toBeUndefined();
  });

  it("não gera achado quando o momentoFato da entrega é exatamente igual à data limite (comparação estrita)", () => {
    const eventoEntrega = construirEventoEntrega(dataLimite);

    const resultado = detectarAtraso(dataLimite, eventoEntrega);

    expect(resultado).toBeUndefined();
  });

  it("não gera achado quando não há evento de entrega", () => {
    const resultado = detectarAtraso(dataLimite, undefined);

    expect(resultado).toBeUndefined();
  });
});
