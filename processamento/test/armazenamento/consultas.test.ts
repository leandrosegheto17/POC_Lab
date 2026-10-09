import { describe, expect, it } from "vitest";

import {
  criarRepositorio,
  type EventoParaInserir,
} from "../../src/armazenamento/repositorio.js";

function evento(parcial: Partial<EventoParaInserir>): EventoParaInserir {
  return {
    fonte: "vendas",
    codigoEvento: "VENDA-001",
    idPedido: "PED-000001",
    tipo: "venda",
    momentoFato: "2026-01-01T10:00:00Z",
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({ tipo: "venda", valor_devido: 100 }),
    ...parcial,
  };
}

describe("listarEventos", () => {
  it("reconstrói o Evento com envelope e payload, incluindo ordemChegada", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirEvento(evento({}));

    const [lido] = repositorio.listarEventos();

    expect(lido?.idPedido).toBe("PED-000001");
    expect(lido?.versaoSchema).toBe(1);
    expect(lido?.evento).toMatchObject({
      fonte: "vendas",
      codigoEvento: "VENDA-001",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 1,
      tipo: "venda",
      valor_devido: 100,
    });
  });

  it("omite ordemChegada quando nula e mantém idPedido nulo", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirEvento(
      evento({
        fonte: "pagamentos",
        codigoEvento: "PAG-1",
        idPedido: null,
        ordemChegada: null,
        dados: JSON.stringify({ tipo: "pagamento", valor: 5 }),
      }),
    );

    const [lido] = repositorio.listarEventos();

    expect(lido?.idPedido).toBeNull();
    expect(lido?.evento).not.toHaveProperty("ordemChegada");
  });

  it("devolve lista vazia com o banco vazio", () => {
    expect(criarRepositorio(":memory:").listarEventos()).toEqual([]);
  });
});

describe("listarAchadosPorTipo", () => {
  it("devolve só os achados do tipo pedido", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirAchadoQualidade({
      tipo: "sem_identificacao",
      fonte: "pagamentos",
      referencia: "PAG-1",
      regra: "R",
      detalhe: "d1",
    });
    repositorio.inserirAchadoQualidade({
      tipo: "fora_de_ordem",
      fonte: "rastreio",
      referencia: "RAS-1",
      regra: "R",
      detalhe: "d2",
    });

    expect(repositorio.listarAchadosPorTipo("fora_de_ordem")).toEqual([
      { tipo: "fora_de_ordem", fonte: "rastreio", referencia: "RAS-1", regra: "R", detalhe: "d2" },
    ]);
  });
});

describe("pedidos e vínculos", () => {
  it("lista vínculos, ids de pedido e resolve o id por (fonte, código)", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000002");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirVinculoFonte("vendas", "V-1", "PED-000001");

    expect(repositorio.listarIdsPedido()).toEqual(["PED-000001", "PED-000002"]);
    expect(repositorio.listarVinculos()).toEqual([
      { fonte: "vendas", codigoExterno: "V-1", idPedido: "PED-000001" },
    ]);
    expect(repositorio.obterIdPedidoPorVinculo("vendas", "V-1")).toBe("PED-000001");
    expect(repositorio.obterIdPedidoPorVinculo("vendas", "V-9")).toBeUndefined();
  });

  it("obterMaiorNumeroPedido devolve 0 com o banco vazio e o maior número depois", () => {
    const repositorio = criarRepositorio(":memory:");
    expect(repositorio.obterMaiorNumeroPedido()).toBe(0);

    repositorio.inserirPedido("PED-000003");
    repositorio.inserirPedido("PED-000012");

    expect(repositorio.obterMaiorNumeroPedido()).toBe(12);
  });
});

describe("obterMaiorMomentoFato", () => {
  it("devolve undefined com o banco vazio e o maior momento depois", () => {
    const repositorio = criarRepositorio(":memory:");
    expect(repositorio.obterMaiorMomentoFato()).toBeUndefined();

    repositorio.inserirEvento(evento({ momentoFato: "2026-01-01T10:00:00Z" }));
    repositorio.inserirEvento(
      evento({ codigoEvento: "VENDA-002", momentoFato: "2026-03-01T10:00:00Z" }),
    );

    expect(repositorio.obterMaiorMomentoFato()).toBe("2026-03-01T10:00:00Z");
  });
});

describe("listarPagamentosSemIdentificacao", () => {
  it("junta achado e evento, e devolve à parte os achados sem evento", () => {
    const repositorio = criarRepositorio(":memory:");
    for (const referencia of ["PAG-1", "PAG-2"]) {
      repositorio.inserirAchadoQualidade({
        tipo: "sem_identificacao",
        fonte: "pagamentos",
        referencia,
        regra: "R",
        detalhe: "d",
      });
    }
    repositorio.inserirEvento(
      evento({
        fonte: "pagamentos",
        codigoEvento: "PAG-1",
        idPedido: null,
        dados: JSON.stringify({ valor: 50, referencia_original: "texto" }),
        momentoFato: "2026-02-01T00:00:00Z",
      }),
    );

    expect(repositorio.listarPagamentosSemIdentificacao()).toEqual({
      completos: [
        {
          codigoTransacao: "PAG-1",
          textoReferencia: "texto",
          valor: 50,
          momentoFato: "2026-02-01T00:00:00Z",
        },
      ],
      semEvento: ["PAG-2"],
    });
  });

  it("ignora evento de pagamento já vinculado a pedido", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirAchadoQualidade({
      tipo: "sem_identificacao",
      fonte: "pagamentos",
      referencia: "PAG-1",
      regra: "R",
      detalhe: "d",
    });
    repositorio.inserirEvento(
      evento({
        fonte: "pagamentos",
        codigoEvento: "PAG-1",
        idPedido: "PED-000001",
        dados: JSON.stringify({ valor: 50, referencia_original: "x" }),
      }),
    );

    expect(repositorio.listarPagamentosSemIdentificacao()).toEqual({
      completos: [],
      semEvento: ["PAG-1"],
    });
  });
});

describe("listarCacheIa", () => {
  it("devolve chave, resposta, criadoEm e modelo", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.gravarCache("h1", "r1", "2026-01-01T00:00:00Z", "m");

    expect(repositorio.listarCacheIa()).toEqual([
      { chave: "h1", resposta: "r1", criadoEm: "2026-01-01T00:00:00Z", modelo: "m" },
    ]);
  });
});

describe("emTransacao", () => {
  it("confirma as gravações e devolve o resultado de fn", () => {
    const repositorio = criarRepositorio(":memory:");

    const resultado = repositorio.emTransacao(() => {
      repositorio.inserirPedido("PED-000001");
      return 42;
    });

    expect(resultado).toBe(42);
    expect(repositorio.listarIdsPedido()).toEqual(["PED-000001"]);
  });

  it("desfaz as gravações e relança o erro quando fn lança", () => {
    const repositorio = criarRepositorio(":memory:");

    expect(() =>
      repositorio.emTransacao(() => {
        repositorio.inserirPedido("PED-000001");
        throw new Error("falha");
      }),
    ).toThrow("falha");

    expect(repositorio.listarIdsPedido()).toEqual([]);
  });
});
