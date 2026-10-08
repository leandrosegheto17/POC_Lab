import { describe, expect, it } from "vitest";
import {
  EsquemaParametroCodigo,
  normalizarCodigo,
} from "../../src/contrato/codigo.js";

describe("normalizarCodigo", () => {
  it("espaços nas extremidades, espaços internos repetidos e caixa produzem o mesmo resultado", () => {
    const esperado = "PED-000001";

    expect(normalizarCodigo(" ped-000001 ")).toBe(esperado);
    expect(normalizarCodigo("PED-000001")).toBe(esperado);
    expect(normalizarCodigo("PED-   000001")).toBe(esperado);
  });
});

describe("EsquemaParametroCodigo", () => {
  it("string de 40 caracteres válidos passa", () => {
    const codigo = "A".repeat(40);

    expect(EsquemaParametroCodigo.parse(codigo)).toBe(codigo);
  });

  it("string de 41 caracteres rejeita", () => {
    const codigo = "A".repeat(41);

    expect(() => EsquemaParametroCodigo.parse(codigo)).toThrow();
  });

  it("caractere fora do alfabeto permitido rejeita", () => {
    expect(() => EsquemaParametroCodigo.parse("PED-000001;")).toThrow();
  });
});
