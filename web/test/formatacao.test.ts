// Formatação pt-BR do web (dados/formatacao.ts).
import { describe, expect, it } from "vitest";
import {
  formatarData,
  formatarDias,
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarPercentual,
  formatarValor,
} from "../src/dados/formatacao.ts";

describe("formatacao", () => {
  it("formatarData corta para AAAA-MM-DD sem converter fuso", () => {
    expect(formatarData("2016-07-21T20:00:15.260Z")).toBe("2016-07-21");
    expect(formatarData("1998-05-06T23:59:59.999-03:00")).toBe("1998-05-06");
    expect(formatarData("1998-05-06")).toBe("1998-05-06");
  });

  it("formatarNumero usa ponto de milhar", () => {
    expect(formatarNumero(8856)).toBe("8.856");
    expect(formatarNumero(16282)).toBe("16.282");
    expect(formatarNumero(0)).toBe("0");
  });

  it("formatarMoeda usa R$, milhar e duas casas", () => {
    expect(formatarMoeda(1234.56)).toBe("R$ 1.234,56");
    expect(formatarMoeda(65379257.82)).toBe("R$ 65.379.257,82");
  });

  it("formatarMoedaCompacta usa mi/mil com até uma casa", () => {
    expect(formatarMoedaCompacta(65379257.82)).toBe("R$ 65,4 mi");
    expect(formatarMoedaCompacta(412000)).toBe("R$ 412 mil");
    expect(formatarMoedaCompacta(21312430.55)).toBe("R$ 21,3 mi");
  });

  it("formatarValor usa duas casas e nenhum símbolo", () => {
    expect(formatarValor(440)).toBe("440,00");
    expect(formatarValor(1863.4)).toBe("1.863,40");
  });

  it("formatarPercentual usa uma casa e devolve null com denominador 0", () => {
    expect(formatarPercentual(7775, 16282)).toBe("47,8%");
    expect(formatarPercentual(11246, 15448)).toBe("72,8%");
    expect(formatarPercentual(1, 0)).toBeNull();
  });

  it("formatarDias usa uma casa e a palavra 'dias'", () => {
    expect(formatarDias(8.4)).toBe("8,4 dias");
    expect(formatarDias(136511 / 16261)).toBe("8,4 dias");
  });
});
