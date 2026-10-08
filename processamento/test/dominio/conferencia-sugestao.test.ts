import { describe, expect, it } from "vitest";
import { conferirSugestao } from "../../src/dominio/conferencia-sugestao.js";

describe("conferirSugestao (RN-11)", () => {
  it("confere quando valor compatível, data posterior à do pedido e pedido não quitado", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 60, dataPagamento: "2026-01-15" },
    );

    expect(resultado.conferida).toBe(true);
    expect(resultado.motivo).toContain("60.00");
    expect(resultado.motivo).toContain("2026-01-15");
    expect(resultado.motivo).toContain("2026-01-10");
  });

  it("rejeita por valor incompatível, apontando a diferença de valor no motivo", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 10, dataPagamento: "2026-01-15" },
    );

    expect(resultado.conferida).toBe(false);
    expect(resultado.motivo).toContain("valor incompatível");
    expect(resultado.motivo).toContain("60.00");
    expect(resultado.motivo).toContain("10.00");
    expect(resultado.motivo).not.toContain("data do pagamento inválida");
    expect(resultado.motivo).not.toContain("pedido já quitado");
  });

  it("rejeita por data do pagamento anterior à data do pedido, apontando a data no motivo", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 60, dataPagamento: "2026-01-05" },
    );

    expect(resultado.conferida).toBe(false);
    expect(resultado.motivo).toContain("data do pagamento inválida");
    expect(resultado.motivo).toContain("2026-01-05");
    expect(resultado.motivo).toContain("2026-01-10");
    expect(resultado.motivo).not.toContain("valor incompatível");
  });

  it("rejeita por pedido já quitado, apontando a quitação no motivo", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 100, dataPedido: "2026-01-10" },
      { valor: 0, dataPagamento: "2026-01-15" },
    );

    expect(resultado.conferida).toBe(false);
    expect(resultado.motivo).toContain("pedido já quitado");
    expect(resultado.motivo).toContain("situação: quitado");
  });

  it("borda: diferença de exatamente R$ 0,01 ainda é compatível", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 60.01, dataPagamento: "2026-01-15" },
    );

    expect(resultado.conferida).toBe(true);
  });

  it("borda: diferença de R$ 0,011 é incompatível", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 60.011, dataPagamento: "2026-01-15" },
    );

    expect(resultado.conferida).toBe(false);
    expect(resultado.motivo).toContain("valor incompatível");
  });

  it("borda: data do pagamento exatamente igual à data do pedido é compatível (>=, não >)", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 60, dataPagamento: "2026-01-10" },
    );

    expect(resultado.conferida).toBe(true);
    expect(resultado.motivo).not.toContain("data do pagamento inválida");
  });

  it("rejeita por múltiplas condições simultâneas, apontando todas no motivo", () => {
    const resultado = conferirSugestao(
      { devido: 100, pago: 40, dataPedido: "2026-01-10" },
      { valor: 10, dataPagamento: "2026-01-05" },
    );

    expect(resultado.conferida).toBe(false);
    expect(resultado.motivo).toContain("valor incompatível");
    expect(resultado.motivo).toContain("data do pagamento inválida");
  });
});
