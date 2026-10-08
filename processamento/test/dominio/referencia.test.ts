import { describe, expect, it } from "vitest";
import {
  casarReferencia,
  normalizarReferencia,
} from "../../src/dominio/referencia.js";

describe("normalizarReferencia (RN-09)", () => {
  it("remove prefixo PV- e espaços nas pontas", () => {
    expect(normalizarReferencia(" PV-000123 ")).toEqual(["123"]);
  });

  it("remove espaços internos entre prefixo e número", () => {
    expect(normalizarReferencia("PV- 000123")).toEqual(["123"]);
  });

  it("remove zeros à esquerda", () => {
    expect(normalizarReferencia("PV-0000045")).toEqual(["45"]);
  });

  it("extrai todos os candidatos quando há dois números na mesma referência", () => {
    expect(normalizarReferencia("PV-000123 PV-000456")).toEqual([
      "123",
      "456",
    ]);
  });

  it("texto livre sem nenhum número reconhecível não gera candidato", () => {
    expect(normalizarReferencia("pagamento do pedido via boleto")).toEqual(
      [],
    );
  });

  it("referência vazia ou só espaços não gera candidato", () => {
    expect(normalizarReferencia("")).toEqual([]);
    expect(normalizarReferencia("   ")).toEqual([]);
  });
});

describe("casarReferencia (RN-09)", () => {
  const codigosConhecidos = new Set(["123", "456"]);

  it("casamento único: referência normalizada bate com exatamente 1 código conhecido", () => {
    expect(casarReferencia("PV-000123", codigosConhecidos)).toEqual({
      idPedido: "123",
    });
  });

  it("texto livre sem nenhum número reconhecível dá sem identificação", () => {
    expect(
      casarReferencia("pagamento do pedido via boleto", codigosConhecidos),
    ).toEqual({ semIdentificacao: true });
  });

  it("referência com dois códigos conhecidos dá sem identificação, mesmo ambos existindo", () => {
    expect(
      casarReferencia("PV-000123 PV-000456", codigosConhecidos),
    ).toEqual({ semIdentificacao: true });
  });

  it("candidato que não bate com nenhum código conhecido dá sem identificação", () => {
    expect(casarReferencia("PV-000999", codigosConhecidos)).toEqual({
      semIdentificacao: true,
    });
  });

  it("referência vazia ou só espaços dá sem identificação", () => {
    expect(casarReferencia("", codigosConhecidos)).toEqual({
      semIdentificacao: true,
    });
    expect(casarReferencia("   ", codigosConhecidos)).toEqual({
      semIdentificacao: true,
    });
  });
});
