import { describe, expect, it } from "vitest";
import { EsquemaConsultaDivergencias } from "../../src/contrato/parametros.js";
import { EsquemaEventoDivergencia } from "../../src/contrato/divergencias.js";
import { EsquemaAchado, EsquemaExemploAchado } from "../../src/contrato/qualidade.js";
import { FONTES, TIPOS_ACHADO, TIPOS_DIVERGENCIA } from "../../src/dominio/modelo.js";

describe("listas do domínio", () => {
  it("TIPOS_DIVERGENCIA tem os 5 valores aceitos pelo contrato", () => {
    expect([...TIPOS_DIVERGENCIA]).toEqual([
      "duplicado",
      "parcial",
      "pago_nao_enviado",
      "enviado_nao_pago",
      "entrega_atrasada",
    ]);
    for (const tipo of TIPOS_DIVERGENCIA) {
      expect(EsquemaConsultaDivergencias.safeParse({ tipo }).success).toBe(true);
    }
    expect(EsquemaConsultaDivergencias.safeParse({ tipo: "outro" }).success).toBe(false);
  });

  it("FONTES tem os 3 valores aceitos pelo contrato", () => {
    expect([...FONTES]).toEqual(["vendas", "pagamentos", "rastreio"]);
    for (const fonte of FONTES) {
      expect(
        EsquemaEventoDivergencia.safeParse({ tipo: "x", data: "d", fonte, codigo: "c" }).success,
      ).toBe(true);
    }
  });

  it("TIPOS_ACHADO tem os 7 valores e o contrato aceita cada fonte", () => {
    expect(TIPOS_ACHADO).toHaveLength(7);
    const achado = (tipo: string) => ({ tipo, contagem: 0, regra: "r", exemplos: [] });
    for (const tipo of TIPOS_ACHADO) {
      expect(EsquemaAchado.safeParse(achado(tipo)).success).toBe(true);
    }
    expect(EsquemaAchado.safeParse(achado("outro")).success).toBe(false);
    for (const fonte of FONTES) {
      expect(
        EsquemaExemploAchado.safeParse({ fonte, referencia: "r", detalhe: "d" }).success,
      ).toBe(true);
    }
  });
});
