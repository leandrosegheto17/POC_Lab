import { describe, expect, it } from "vitest";
import type { Evento } from "../../src/dominio/evento.js";
import { ordenarEventos } from "../../src/dominio/ordenacao.js";

function evento(parcial: {
  tipo: "venda" | "pagamento" | "coleta" | "transporte" | "entrega";
  codigoEvento: string;
  momentoFato: string;
}): Evento {
  const base = {
    fonte: "vendas" as const,
    codigoEvento: parcial.codigoEvento,
    momentoFato: parcial.momentoFato,
  };

  switch (parcial.tipo) {
    case "venda":
      return {
        ...base,
        tipo: "venda",
        versao_schema: 1,
        valor_devido: 100,
        data_limite: "2026-01-10T00:00:00Z",
        transportadora: "Transportadora 1",
      };
    case "pagamento":
      return {
        ...base,
        tipo: "pagamento",
        versao_schema: 1,
        valor: 100,
        referencia_original: "ref-1",
      };
    case "coleta":
      return {
        ...base,
        tipo: "coleta",
        versao_schema: 1,
        transportadora: "Transportadora 1",
        codigo_rastreio: "BR123",
      };
    case "transporte":
      return {
        ...base,
        tipo: "transporte",
        versao_schema: 1,
        transportadora: "Transportadora 1",
        codigo_rastreio: "BR123",
      };
    case "entrega":
      return {
        ...base,
        tipo: "entrega",
        versao_schema: 1,
        transportadora: "Transportadora 1",
        codigo_rastreio: "BR123",
      };
  }
}

describe("ordenarEventos (RN-07)", () => {
  it("ordena por momentoFato quando a entrada está fora de ordem cronológica", () => {
    const venda = evento({
      tipo: "venda",
      codigoEvento: "evt-venda",
      momentoFato: "2026-01-01T10:00:00Z",
    });
    const pagamento = evento({
      tipo: "pagamento",
      codigoEvento: "evt-pagamento",
      momentoFato: "2026-01-02T10:00:00Z",
    });
    const coleta = evento({
      tipo: "coleta",
      codigoEvento: "evt-coleta",
      momentoFato: "2026-01-03T10:00:00Z",
    });
    const transporte = evento({
      tipo: "transporte",
      codigoEvento: "evt-transporte",
      momentoFato: "2026-01-04T10:00:00Z",
    });
    const entrega = evento({
      tipo: "entrega",
      codigoEvento: "evt-entrega",
      momentoFato: "2026-01-05T10:00:00Z",
    });

    const entrada = [entrega, coleta, venda, transporte, pagamento];
    const resultado = ordenarEventos(entrada);

    expect(resultado.map((e) => e.codigoEvento)).toEqual([
      "evt-venda",
      "evt-pagamento",
      "evt-coleta",
      "evt-transporte",
      "evt-entrega",
    ]);
  });

  it("empate em momentoFato: desempata na ordem fixa venda < pagamento < coleta < transporte < entrega", () => {
    const momentoFato = "2026-01-01T10:00:00Z";
    const venda = evento({ tipo: "venda", codigoEvento: "a-venda", momentoFato });
    const pagamento = evento({
      tipo: "pagamento",
      codigoEvento: "b-pagamento",
      momentoFato,
    });
    const coleta = evento({ tipo: "coleta", codigoEvento: "c-coleta", momentoFato });
    const transporte = evento({
      tipo: "transporte",
      codigoEvento: "d-transporte",
      momentoFato,
    });
    const entrega = evento({ tipo: "entrega", codigoEvento: "e-entrega", momentoFato });

    const entrada = [coleta, entrega, venda, transporte, pagamento];
    const resultado = ordenarEventos(entrada);

    expect(resultado.map((e) => e.tipo)).toEqual([
      "venda",
      "pagamento",
      "coleta",
      "transporte",
      "entrega",
    ]);
  });

  it("empate em tipo e momentoFato: desempata por codigoEvento crescente", () => {
    const momentoFato = "2026-01-01T10:00:00Z";
    const coletaB = evento({ tipo: "coleta", codigoEvento: "evt-coleta-b", momentoFato });
    const coletaA = evento({ tipo: "coleta", codigoEvento: "evt-coleta-a", momentoFato });

    const resultado = ordenarEventos([coletaB, coletaA]);

    expect(resultado.map((e) => e.codigoEvento)).toEqual([
      "evt-coleta-a",
      "evt-coleta-b",
    ]);
  });

  it("qualquer permutação da entrada produz a mesma saída", () => {
    const momentoFato1 = "2026-01-01T10:00:00Z";
    const momentoFato2 = "2026-01-02T10:00:00Z";

    const venda = evento({ tipo: "venda", codigoEvento: "evt-venda", momentoFato: momentoFato1 });
    const pagamento = evento({
      tipo: "pagamento",
      codigoEvento: "evt-pagamento",
      momentoFato: momentoFato1,
    });
    const coleta = evento({ tipo: "coleta", codigoEvento: "evt-coleta", momentoFato: momentoFato1 });
    const transporte = evento({
      tipo: "transporte",
      codigoEvento: "evt-transporte",
      momentoFato: momentoFato2,
    });
    const entrega = evento({ tipo: "entrega", codigoEvento: "evt-entrega", momentoFato: momentoFato2 });

    const lista = [venda, pagamento, coleta, transporte, entrega];

    // Permutações fixas e determinísticas (índices escolhidos manualmente,
    // sem Math.random()).
    const permutacoes: number[][] = [
      [0, 1, 2, 3, 4],
      [4, 3, 2, 1, 0],
      [2, 0, 4, 1, 3],
      [1, 3, 0, 4, 2],
      [3, 4, 1, 2, 0],
      [0, 2, 1, 4, 3],
      [4, 0, 3, 2, 1],
    ];

    const saidaEsperada = ordenarEventos(lista).map((e) => e.codigoEvento);

    for (const permutacao of permutacoes) {
      const entradaPermutada = permutacao.map((indice) => lista[indice] as Evento);
      const resultado = ordenarEventos(entradaPermutada);
      expect(resultado.map((e) => e.codigoEvento)).toEqual(saidaEsperada);
    }
  });

  it("lista vazia devolve lista vazia", () => {
    expect(ordenarEventos([])).toEqual([]);
  });

  it("lista com um único elemento devolve o mesmo elemento", () => {
    const venda = evento({
      tipo: "venda",
      codigoEvento: "evt-venda",
      momentoFato: "2026-01-01T10:00:00Z",
    });

    expect(ordenarEventos([venda])).toEqual([venda]);
  });

  it("não muta o array original recebido", () => {
    const venda = evento({
      tipo: "venda",
      codigoEvento: "evt-venda",
      momentoFato: "2026-01-02T10:00:00Z",
    });
    const pagamento = evento({
      tipo: "pagamento",
      codigoEvento: "evt-pagamento",
      momentoFato: "2026-01-01T10:00:00Z",
    });

    const entrada = [venda, pagamento];
    const copiaAntes = [...entrada];

    ordenarEventos(entrada);

    expect(entrada).toEqual(copiaAntes);
    expect(entrada[0]).toBe(venda);
    expect(entrada[1]).toBe(pagamento);
  });
});
