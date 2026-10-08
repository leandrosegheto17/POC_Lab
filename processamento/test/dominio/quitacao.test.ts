import { describe, expect, it } from "vitest";
import { calcularQuitacao } from "../../src/dominio/quitacao.js";

describe("calcularQuitacao (RN-02)", () => {
  it("sem pagamentos retorna pago 0, saldo igual ao devido e situação sem_pagamento", () => {
    const resultado = calcularQuitacao(100, []);

    expect(resultado).toEqual({
      pago: 0,
      saldo: 100,
      situacao: "sem_pagamento",
    });
  });

  it("pagamento parcial retorna saldo positivo e situação parcial", () => {
    const resultado = calcularQuitacao(100, [40]);

    expect(resultado).toEqual({
      pago: 40,
      saldo: 60,
      situacao: "parcial",
    });
  });

  it("pagamento exato quita o pedido", () => {
    const resultado = calcularQuitacao(100, [100]);

    expect(resultado).toEqual({
      pago: 100,
      saldo: 0,
      situacao: "quitado",
    });
  });

  it("pagamento dentro da tolerância de R$ 0,01 (abaixo do devido) é quitado", () => {
    const resultado = calcularQuitacao(100, [99.995]);

    expect(resultado.situacao).toBe("quitado");
  });

  it("pagamento dentro da tolerância de R$ 0,01 (acima do devido) é quitado", () => {
    const resultado = calcularQuitacao(100, [100.005]);

    expect(resultado.situacao).toBe("quitado");
  });

  it("borda exata da tolerância: saldo de R$ 0,02 é parcial, não quitado", () => {
    // devido 100, pago 99.98 → saldo bruto = 0.02, que é > 0.01, então não
    // deve cair em "quitado" — exercita a fronteira exata da regra.
    const resultado = calcularQuitacao(100, [99.98]);

    expect(resultado.saldo).toBe(0.02);
    expect(resultado.situacao).toBe("parcial");
  });

  it("tolerância de R$ 0,01 é robusta a ponto flutuante (RTP-0019)", () => {
    expect(calcularQuitacao(100, [99.99]).situacao).toBe("quitado");
    expect(calcularQuitacao(100, [100.01]).situacao).toBe("quitado");
    expect(calcularQuitacao(100, [99.98]).situacao).toBe("parcial");
    expect(calcularQuitacao(100, [100.02]).situacao).toBe("excedente");
  });

  it("saldo sub-centavo de R$ 0,011 não é absorvido pela tolerância (RTP-0040)", () => {
    expect(calcularQuitacao(100, [99.989]).situacao).toBe("parcial");
    expect(calcularQuitacao(100, [100.011]).situacao).toBe("excedente");
  });

  it("pagamento acima do devido retorna saldo negativo e situação excedente", () => {
    const resultado = calcularQuitacao(100, [80, 80]);

    expect(resultado.pago).toBe(160);
    expect(resultado.saldo).toBe(-60);
    expect(resultado.situacao).toBe("excedente");
  });

  it("múltiplas parcelas que somam exatamente o devido quitam o pedido", () => {
    const resultado = calcularQuitacao(100, [60, 40]);

    expect(resultado).toEqual({
      pago: 100,
      saldo: 0,
      situacao: "quitado",
    });
  });
});
