import { describe, expect, it } from "vitest";
import {
  FONTES,
  OPCOES_TIPO_DIVERGENCIA,
  TIPOS_DIVERGENCIA,
  TIPOS_EVENTO,
  ehTipoDivergencia,
  rotuloEvento,
  rotuloFonte,
  rotuloSituacaoPagamento,
  rotuloTipo,
} from "../src/dados/rotulos.ts";

describe("rotulos", () => {
  it("todo tipo de divergência do domínio tem rótulo e rótulo curto, na ordem do domínio", () => {
    expect(OPCOES_TIPO_DIVERGENCIA.map((o) => o.tipo)).toEqual([...TIPOS_DIVERGENCIA]);
    for (const opcao of OPCOES_TIPO_DIVERGENCIA) {
      expect(opcao.rotulo).not.toBe("");
      expect(opcao.curto).not.toBe("");
      expect(opcao.variante).not.toBe("");
    }
    expect(rotuloTipo("duplicado")).toBe("Pago duas vezes");
    expect(rotuloTipo("sem_divergencia")).toBe("Sem divergência");
  });

  it("toda fonte tem rótulo", () => {
    expect(FONTES.map((f) => rotuloFonte(f))).toEqual([
      "Vendas",
      "Pagamentos",
      "Transportadora",
    ]);
  });

  it("todo tipo de evento tem rótulo; desconhecido volta como veio", () => {
    expect(TIPOS_EVENTO.map((t) => rotuloEvento(t))).toEqual([
      "Venda",
      "Pagamento",
      "Coleta",
      "Em trânsito",
      "Entrega",
    ]);
    expect(rotuloEvento("outro")).toBe("outro");
  });

  it("situações de pagamento e validação de tipo", () => {
    expect(rotuloSituacaoPagamento("excedente")).toBe("Pago a mais");
    expect(rotuloSituacaoPagamento("x")).toBe("x");
    expect(ehTipoDivergencia("parcial")).toBe(true);
    expect(ehTipoDivergencia("sem_divergencia")).toBe(false);
  });
});
