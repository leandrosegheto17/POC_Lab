import { describe, expect, it } from "vitest";
import {
  arredondarMoeda,
  calcularValorDevido,
  type ItemPedido,
} from "../../src/dominio/valores.js";

describe("calcularValorDevido (RN-01)", () => {
  it("1 item sem desconto retorna preço × quantidade", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 50, quantidade: 2, desconto: 0 },
    ];

    expect(calcularValorDevido(itens)).toBe(100);
  });

  it("1 item com desconto de 10% reduz o valor corretamente", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 100, quantidade: 1, desconto: 0.1 },
    ];

    // 100 × 1 × (1 − 0.1) = 90
    expect(calcularValorDevido(itens)).toBe(90);
  });

  it("múltiplos itens, alguns com desconto e outros sem, somam corretamente", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 50, quantidade: 2, desconto: 0 }, // 100
      { precoUnitario: 20, quantidade: 3, desconto: 0.5 }, // 30
      { precoUnitario: 10, quantidade: 5, desconto: 0.2 }, // 40
    ];

    // 100 + 30 + 40 = 170
    expect(calcularValorDevido(itens)).toBe(170);
  });

  it("caso de dízima: preço 10,10, quantidade 3, desconto 0,15 bate com o valor arredondado, sem ruído de ponto flutuante", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 10.1, quantidade: 3, desconto: 0.15 },
    ];

    // 10.10 × 3 × (1 − 0.15) = 30.3 × 0.85 = 25.755 → arredonda para 25.76.
    // Em ponto flutuante puro, 10.1 × 3 já não é exatamente 30.3 (ex.:
    // 30.299999999999997), e a multiplicação subsequente por 0.85 carrega
    // esse ruído adiante — o resultado final precisa bater com o valor
    // matemático correto, não com o artefato de ponto flutuante.
    const resultado = calcularValorDevido(itens);

    expect(resultado).toBe(25.76);
    expect(resultado).not.toBeCloseTo(25.754999999999999, 10);
  });

  it("lista de itens vazia retorna 0", () => {
    expect(calcularValorDevido([])).toBe(0);
  });

  it("desconto 0 (limite inferior) computa o valor cheio", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 30, quantidade: 4, desconto: 0 },
    ];

    expect(calcularValorDevido(itens)).toBe(120);
  });

  it("desconto 1 (limite superior, desconta tudo) computa 0", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 30, quantidade: 4, desconto: 1 },
    ];

    expect(calcularValorDevido(itens)).toBe(0);
  });

  it("resultado nunca tem mais de 2 casas decimais", () => {
    const itens: ItemPedido[] = [
      { precoUnitario: 10.1, quantidade: 3, desconto: 0.15 },
      { precoUnitario: 7.33, quantidade: 5, desconto: 0.33 },
    ];

    const resultado = calcularValorDevido(itens);

    expect(Number.isInteger(resultado * 100)).toBe(true);
  });
});

describe("arredondarMoeda", () => {
  it("arredonda para 2 casas decimais sem deixar ruído de ponto flutuante", () => {
    // 1.005 em ponto flutuante não é exatamente 1.005 — este é o caso
    // clássico em que `toFixed`/`Math.round` ingênuos falham.
    expect(arredondarMoeda(10.1 * 3 * 0.85)).toBe(25.76);
  });

  it("não altera um valor que já tem 2 casas decimais", () => {
    expect(arredondarMoeda(42.5)).toBe(42.5);
    expect(arredondarMoeda(0)).toBe(0);
  });
});
