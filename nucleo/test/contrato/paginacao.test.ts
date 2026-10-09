import { describe, expect, it } from "vitest";
import { EsquemaPaginacao } from "../../src/contrato/paginacao.js";

describe("EsquemaPaginacao", () => {
  it("objeto válido passa", () => {
    const resultado = EsquemaPaginacao.parse({
      pagina: 1,
      tamanho: 50,
      total: 120,
      totalPaginas: 3,
    });

    expect(resultado.total).toBe(120);
  });

  it("'total' negativo rejeita", () => {
    expect(() =>
      EsquemaPaginacao.parse({
        pagina: 1,
        tamanho: 50,
        total: -1,
        totalPaginas: 0,
      }),
    ).toThrow();
  });
});
