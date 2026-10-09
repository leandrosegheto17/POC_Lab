import { describe, expect, it } from "vitest";
import { EsquemaErro } from "../../src/contrato/erro.js";

describe("EsquemaErro", () => {
  it("400 com 'erros' não vazio passa", () => {
    const resultado = EsquemaErro.parse({
      type: "https://exemplo.org/erros/parametro-invalido",
      title: "Parâmetro inválido",
      status: 400,
      detail: "Um ou mais parâmetros são inválidos.",
      codigo: "parametro_invalido",
      erros: [{ campo: "tamanho", mensagem: "deve ser no máximo 100" }],
    });

    expect(resultado.erros).toHaveLength(1);
  });

  it("400 sem 'erros' falha", () => {
    expect(() =>
      EsquemaErro.parse({
        type: "https://exemplo.org/erros/parametro-invalido",
        title: "Parâmetro inválido",
        status: 400,
        detail: "Um ou mais parâmetros são inválidos.",
        codigo: "parametro_invalido",
      }),
    ).toThrow();
  });

  it("500 sem 'erros' passa", () => {
    const resultado = EsquemaErro.parse({
      type: "https://exemplo.org/erros/erro-interno",
      title: "Erro interno",
      status: 500,
      detail: "Falha inesperada.",
      codigo: "erro_interno",
    });

    expect(resultado.erros).toBeUndefined();
  });

  it("500 com 'erros' falha", () => {
    expect(() =>
      EsquemaErro.parse({
        type: "https://exemplo.org/erros/erro-interno",
        title: "Erro interno",
        status: 500,
        detail: "Falha inesperada.",
        codigo: "erro_interno",
        erros: [{ campo: "x", mensagem: "y" }],
      }),
    ).toThrow();
  });

  it("'codigo' fora da lista rejeita", () => {
    expect(() =>
      EsquemaErro.parse({
        type: "https://exemplo.org/erros/desconhecido",
        title: "Desconhecido",
        status: 500,
        detail: "Falha inesperada.",
        codigo: "codigo_inexistente",
      }),
    ).toThrow();
  });
});
