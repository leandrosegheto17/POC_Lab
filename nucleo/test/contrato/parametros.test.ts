import { describe, expect, it } from "vitest";
import { EsquemaConsultaDivergencias } from "../../src/contrato/parametros.js";

describe("EsquemaConsultaDivergencias", () => {
  it("aceita só 'tipo', aplicando os padrões de paginação", () => {
    const resultado = EsquemaConsultaDivergencias.parse({ tipo: "duplicado" });

    expect(resultado).toEqual({ tipo: "duplicado", pagina: 1, tamanho: 50 });
  });

  it("aceita só paginação, sem 'tipo'", () => {
    const resultado = EsquemaConsultaDivergencias.parse({
      pagina: 3,
      tamanho: 20,
    });

    expect(resultado).toEqual({ pagina: 3, tamanho: 20 });
  });

  it("aplica os padrões pagina=1 e tamanho=50 quando nenhum parâmetro é informado", () => {
    const resultado = EsquemaConsultaDivergencias.parse({});

    expect(resultado).toEqual({ pagina: 1, tamanho: 50 });
  });

  it("rejeita 'tipo' fora do enum", () => {
    expect(() =>
      EsquemaConsultaDivergencias.parse({ tipo: "inexistente" }),
    ).toThrow();
  });

  it("rejeita pagina=0", () => {
    expect(() =>
      EsquemaConsultaDivergencias.parse({ pagina: 0 }),
    ).toThrow();
  });

  it("rejeita pagina=10001", () => {
    expect(() =>
      EsquemaConsultaDivergencias.parse({ pagina: 10001 }),
    ).toThrow();
  });

  it("rejeita tamanho=0", () => {
    expect(() =>
      EsquemaConsultaDivergencias.parse({ tamanho: 0 }),
    ).toThrow();
  });

  it("rejeita tamanho=101", () => {
    expect(() =>
      EsquemaConsultaDivergencias.parse({ tamanho: 101 }),
    ).toThrow();
  });

  it("rejeita parâmetro desconhecido", () => {
    expect(() =>
      EsquemaConsultaDivergencias.parse({ foo: "1" }),
    ).toThrow();
  });
});
