import { describe, expect, it } from "vitest";
import {
  classificarFormatoData,
  normalizarDataParaIso,
} from "../../src/fontes/leitura-vendas.ts";

describe("classificarFormatoData", () => {
  it("classifica data sem hora como 'curto'", () => {
    expect(classificarFormatoData("1996-07-04")).toBe("curto");
  });

  it("classifica data com hora como 'longo'", () => {
    expect(classificarFormatoData("1996-07-04 00:00:00")).toBe("longo");
  });

  it("classifica data com hora e milissegundos como 'longo'", () => {
    expect(classificarFormatoData("1996-07-04 00:00:00.000")).toBe("longo");
  });
});

describe("normalizarDataParaIso", () => {
  it("normaliza formato curto para ISO-8601 com meia-noite UTC", () => {
    expect(normalizarDataParaIso("1996-07-04")).toBe("1996-07-04T00:00:00.000Z");
  });

  it("normaliza formato longo trocando o espaço por 'T' e garantindo o sufixo 'Z'", () => {
    expect(normalizarDataParaIso("1996-07-04 12:30:45")).toBe("1996-07-04T12:30:45Z");
  });

  it("não duplica o sufixo 'Z' quando já presente", () => {
    expect(normalizarDataParaIso("1996-07-04T12:30:45Z")).toBe("1996-07-04T12:30:45Z");
  });

  it("produz uma data ISO válida e interpretável por Date", () => {
    const iso = normalizarDataParaIso("1996-07-04");
    expect(() => new Date(iso).toISOString()).not.toThrow();
  });
});
