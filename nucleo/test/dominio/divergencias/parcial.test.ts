import { describe, expect, it } from "vitest";
import { detectarParcial } from "../../../src/dominio/divergencias/parcial.js";
import { formatarMoeda } from "../../../src/dominio/formatacao.js";

describe("validação: parcial e duplicado", () => {
  it("0 < pago < devido (um só pagamento) gera achado parcial com motivo citando os valores", () => {
    const achado = detectarParcial(100, [{ codigoEvento: "EVT-1", valor: 40 }]);

    expect(achado).toEqual({
      tipo: "parcial",
      motivo: `pago ${formatarMoeda(40)} de ${formatarMoeda(100)} devido`,
      idsEventos: ["EVT-1"],
    });
  });

  it("parcelas que somam exatamente o devido (quitado) não geram achado", () => {
    const achado = detectarParcial(100, [
      { codigoEvento: "EVT-1", valor: 60 },
      { codigoEvento: "EVT-2", valor: 40 },
    ]);

    expect(achado).toBeUndefined();
  });

  it("nenhum pagamento (sem_pagamento) não gera achado", () => {
    const achado = detectarParcial(100, []);

    expect(achado).toBeUndefined();
  });

  it("pago > devido (excedente) não gera achado aqui", () => {
    const achado = detectarParcial(100, [
      { codigoEvento: "EVT-1", valor: 80 },
      { codigoEvento: "EVT-2", valor: 80 },
    ]);

    expect(achado).toBeUndefined();
  });

  it("pago dentro da tolerância de R$ 0,01 do devido é tratado como quitado, sem achado", () => {
    const achado = detectarParcial(100, [{ codigoEvento: "EVT-1", valor: 99.995 }]);

    expect(achado).toBeUndefined();
  });
});
