// Limite de tamanho dos textos de cada sugestão da IA: item no limite é aceito
// e item acima dele é descartado sem afetar os demais.
import { describe, expect, it } from "vitest";
import {
  LIMITE_TEXTO_CURTO_SUGESTAO,
  LIMITE_TEXTO_LONGO_SUGESTAO,
} from "nucleo/contrato/sugestao-ia.js";
import { filtrarSugestoesValidas } from "../src/dados/sugestoes-ia.ts";

function sugestao(sobrescritas: Record<string, unknown> = {}) {
  return {
    pagamento: "pg-1",
    textoReferencia: "PIX JOAO",
    pedidoSugerido: "ped-1",
    conferida: true,
    motivo: "Sugestão conferida.",
    ...sobrescritas,
  };
}

describe("filtrarSugestoesValidas — limites de tamanho", () => {
  it("aceita item com todos os textos exatamente no limite", () => {
    const item = sugestao({
      pagamento: "a".repeat(LIMITE_TEXTO_CURTO_SUGESTAO),
      textoReferencia: "b".repeat(LIMITE_TEXTO_LONGO_SUGESTAO),
      pedidoSugerido: "c".repeat(LIMITE_TEXTO_CURTO_SUGESTAO),
      motivo: "d".repeat(LIMITE_TEXTO_LONGO_SUGESTAO),
    });

    expect(filtrarSugestoesValidas([item])).toEqual([item]);
  });

  it.each([
    ["pagamento", LIMITE_TEXTO_CURTO_SUGESTAO],
    ["textoReferencia", LIMITE_TEXTO_LONGO_SUGESTAO],
    ["pedidoSugerido", LIMITE_TEXTO_CURTO_SUGESTAO],
    ["motivo", LIMITE_TEXTO_LONGO_SUGESTAO],
  ])("descarta item com %s um caractere acima do limite e mantém os demais", (campo, limite) => {
    const grande = sugestao({ [campo]: "x".repeat(limite + 1) });
    const normal = sugestao();

    expect(filtrarSugestoesValidas([grande, normal])).toEqual([normal]);
  });
});
