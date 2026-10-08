import { describe, expect, it } from "vitest";
import type { Evento } from "../../src/dominio/evento.js";
import { detectarForaDeOrdem } from "../../src/dominio/fora-de-ordem.js";

function venda(parcial: {
  codigoEvento: string;
  momentoFato: string;
  ordemChegada: number;
  fonte?: Evento["fonte"];
}): Evento {
  return {
    fonte: parcial.fonte ?? "vendas",
    codigoEvento: parcial.codigoEvento,
    momentoFato: parcial.momentoFato,
    ordemChegada: parcial.ordemChegada,
    tipo: "venda",
    versao_schema: 1,
    valor_devido: 100,
    data_limite: "2026-01-10T00:00:00Z",
    transportadora: "Transportadora 1",
  };
}

function pagamento(parcial: {
  codigoEvento: string;
  momentoFato: string;
  ordemChegada: number;
  fonte?: Evento["fonte"];
}): Evento {
  return {
    fonte: parcial.fonte ?? "pagamentos",
    codigoEvento: parcial.codigoEvento,
    momentoFato: parcial.momentoFato,
    ordemChegada: parcial.ordemChegada,
    tipo: "pagamento",
    versao_schema: 1,
    valor: 100,
    referencia_original: "ref-1",
  };
}

function coleta(parcial: {
  codigoEvento: string;
  momentoFato: string;
  ordemChegada: number;
  fonte?: Evento["fonte"];
}): Evento {
  return {
    fonte: parcial.fonte ?? "rastreio",
    codigoEvento: parcial.codigoEvento,
    momentoFato: parcial.momentoFato,
    ordemChegada: parcial.ordemChegada,
    tipo: "coleta",
    versao_schema: 1,
    transportadora: "Transportadora 1",
    codigo_rastreio: "BR123",
  };
}

describe("detectarForaDeOrdem (RN-08)", () => {
  it("grupo já na ordem canônica (chegada = fato): nenhum achado, todas as marcas false", () => {
    const eventos = [
      venda({
        codigoEvento: "evt-1",
        momentoFato: "2026-01-01T10:00:00Z",
        ordemChegada: 1,
        fonte: "rastreio",
      }),
      coleta({
        codigoEvento: "evt-2",
        momentoFato: "2026-01-02T10:00:00Z",
        ordemChegada: 2,
        fonte: "rastreio",
      }),
      coleta({
        codigoEvento: "evt-3",
        momentoFato: "2026-01-03T10:00:00Z",
        ordemChegada: 3,
        fonte: "rastreio",
      }),
    ];

    const { achados, marcados } = detectarForaDeOrdem(eventos);

    expect(achados).toEqual([]);
    for (const evento of eventos) {
      expect(marcados.get(`${evento.fonte}:${evento.codigoEvento}`)).toBe(false);
    }
  });

  it("dois eventos da mesma fonte trocados entre chegada e fato: achado para o(s) deslocado(s)", () => {
    // Ordem canônica (por momentoFato): evt-a (01), evt-b (02), evt-c (03).
    // Ordem de chegada: evt-b chega antes de evt-a (troca entre os dois).
    const eventoA = coleta({
      codigoEvento: "evt-a",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 2,
    });
    const eventoB = coleta({
      codigoEvento: "evt-b",
      momentoFato: "2026-01-02T10:00:00Z",
      ordemChegada: 1,
    });
    const eventoC = coleta({
      codigoEvento: "evt-c",
      momentoFato: "2026-01-03T10:00:00Z",
      ordemChegada: 3,
    });

    const { achados, marcados } = detectarForaDeOrdem([eventoA, eventoB, eventoC]);

    expect(marcados.get("rastreio:evt-a")).toBe(true);
    expect(marcados.get("rastreio:evt-b")).toBe(true);
    expect(marcados.get("rastreio:evt-c")).toBe(false);

    expect(achados).toHaveLength(2);
    const referencias = achados.map((a) => a.referencia).sort();
    expect(referencias).toEqual(["evt-a", "evt-b"]);

    for (const achado of achados) {
      expect(achado.tipo).toBe("fora_de_ordem");
      expect(achado.fonte).toBe("rastreio");
      expect(typeof achado.regra).toBe("string");
      expect(typeof achado.detalhe).toBe("string");
    }
  });

  it("eventos de fontes diferentes fora de ordem entre si, mas corretos dentro da própria fonte: nenhum achado", () => {
    // Pedido com evento de vendas e de pagamentos: a ordem de chegada entre
    // fontes diferentes não importa para RN-08 (comparação é por fonte).
    const eventoVenda = venda({
      codigoEvento: "evt-venda",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 2,
      fonte: "vendas",
    });
    const eventoPagamento = pagamento({
      codigoEvento: "evt-pagamento",
      momentoFato: "2026-01-02T10:00:00Z",
      ordemChegada: 1,
      fonte: "pagamentos",
    });

    const { achados, marcados } = detectarForaDeOrdem([eventoVenda, eventoPagamento]);

    expect(achados).toEqual([]);
    expect(marcados.get("vendas:evt-venda")).toBe(false);
    expect(marcados.get("pagamentos:evt-pagamento")).toBe(false);
  });

  it("grupo com 1 evento só: sem achado", () => {
    const eventoUnico = coleta({
      codigoEvento: "evt-unico",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 1,
    });

    const { achados, marcados } = detectarForaDeOrdem([eventoUnico]);

    expect(achados).toEqual([]);
    expect(marcados.get("rastreio:evt-unico")).toBe(false);
  });

  it("achado gerado tem tipo 'fora_de_ordem' (nunca aparece como Divergencia)", () => {
    const eventoA = coleta({
      codigoEvento: "evt-a",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 2,
    });
    const eventoB = coleta({
      codigoEvento: "evt-b",
      momentoFato: "2026-01-02T10:00:00Z",
      ordemChegada: 1,
    });

    const { achados } = detectarForaDeOrdem([eventoA, eventoB]);

    expect(achados).toHaveLength(2);
    for (const achado of achados) {
      // Shape de AchadoQualidade: tipo, fonte, referencia, regra, detalhe.
      // Shape de Divergencia (nunca deve aparecer aqui): tipo, motivo, idsEventos.
      expect(achado).toHaveProperty("tipo", "fora_de_ordem");
      expect(achado).toHaveProperty("fonte");
      expect(achado).toHaveProperty("referencia");
      expect(achado).toHaveProperty("regra");
      expect(achado).toHaveProperty("detalhe");
      expect(achado).not.toHaveProperty("motivo");
      expect(achado).not.toHaveProperty("idsEventos");
    }
  });
});
