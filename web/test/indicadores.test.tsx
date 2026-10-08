// TP-0063 — Tela T3 Indicadores: lista de blocos do contrato
// (`EsquemaRespostaIndicadores`), um `Indicador` por bloco; 4 estados;
// "Tentar de novo" refaz a mesma chamada (mesmo truque de fragmento de
// `Divergencias.tsx`, TP-0059).
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { obrigatorio } from "./apoio/obrigatorio.ts";
import { Indicadores } from "../src/paginas/Indicadores.tsx";

type LinhaMock = {
  rotulo: string;
  numerador: number;
  denominador: number;
  resultado: number | null;
};

function linha(
  rotulo: string,
  numerador: number,
  denominador: number,
  resultado: number | null,
): LinhaMock {
  return { rotulo, numerador, denominador, resultado };
}

function blocoEntregasNoPrazo(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "entregas_no_prazo",
    titulo: "Entregas no prazo por transportadora e mês",
    formula:
      "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida, por transportadora e mes da entrega",
    linhas: opcoes?.linhas ?? [
      linha("Transportadora A / 2026-08", 5, 10, 0.5),
      linha("Transportadora A / 2026-09", 8, 10, 0.8),
      linha("Transportadora B / 2026-09", 3, 4, 0.75),
      linha("Pedidos sem entrega", 37, 1, 37),
    ],
    aParte: true,
  };
}

function blocoDivergenciasPorTipo(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "divergencias_por_tipo",
    titulo: "Divergências por tipo",
    formula: "numero de divergencias do tipo / total de divergencias",
    linhas: opcoes?.linhas ?? [
      linha("duplicado", 2, 10, 0.2),
      linha("parcial", 0, 10, 0),
      linha("pago_nao_enviado", 1, 10, 0.1),
      linha("enviado_nao_pago", 3, 10, 0.3),
      linha("entrega_atrasada", 4, 10, 0.4),
    ],
    aParte: false,
  };
}

function respostaIndicadoresValida(opcoes?: {
  entregas?: unknown;
  divergencias?: unknown;
}): unknown {
  return [
    opcoes?.entregas ?? blocoEntregasNoPrazo(),
    opcoes?.divergencias ?? blocoDivergenciasPorTipo(),
  ];
}

// TP-0071 — os 2 blocos complementares (`tempoMedioPedidoEnvioEntrega` e
// `valorPagoVsDevido`, publicados pela TP-0070). Nenhum dos dois tem
// `aParte` — todas as linhas entram na tabela de % normalmente.
function blocoTempoMedio(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "tempoMedioPedidoEnvioEntrega",
    titulo: "Tempo médio pedido→envio e envio→entrega",
    formula: "soma de dias entre as datas ÷ contagem de pedidos elegíveis, por etapa",
    // Números no formato real: numerador = soma de dias (fracionária),
    // denominador = pedidos elegíveis, resultado = média arredondada.
    linhas: opcoes?.linhas ?? [
      linha("pedido→envio", 136511.4, 16261, 8.39),
      linha("envio→entrega", 66605.2, 16245, 4.1),
    ],
    aParte: false,
  };
}

function blocoValorPagoVsDevido(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "valorPagoVsDevido",
    titulo: "Valor pago × valor devido",
    formula: "Σ pago ÷ Σ devido",
    // `resultado` do Total vem arredondado (0.99); a tela deve calcular
    // numerador ÷ denominador (21,0 mi ÷ 21,3 mi = 98,6%).
    linhas: opcoes?.linhas ?? [
      linha("Total", 21000000, 21300000, 0.99),
      linha("sem_pagamento", 0, 100, 0),
      linha("parcial", 200, 300, 0.6667),
      linha("quitado", 600, 600, 1),
      linha("excedente", 100, 0, null),
    ],
    aParte: false,
  };
}

// Resposta com os 4 blocos (os 2 Must + os 2 complementares), na mesma
// ordem publicada pela API (TP-0070): entregas, divergências, tempo médio,
// valor pago × devido.
function respostaComplementaresValida(opcoes?: {
  entregas?: unknown;
  divergencias?: unknown;
  tempoMedio?: unknown;
  valorPagoVsDevido?: unknown;
}): unknown {
  return [
    opcoes?.entregas ?? blocoEntregasNoPrazo(),
    opcoes?.divergencias ?? blocoDivergenciasPorTipo(),
    opcoes?.tempoMedio ?? blocoTempoMedio(),
    opcoes?.valorPagoVsDevido ?? blocoValorPagoVsDevido(),
  ];
}

function respostaFake(opcoes: {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}) {
  return {
    ok: opcoes.ok,
    status: opcoes.status ?? (opcoes.ok ? 200 : 500),
    json: opcoes.json ?? (() => Promise.resolve({})),
  } as unknown as Response;
}

function instalarFetchMock(
  aoChamar: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => aoChamar(String(entrada)));
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={["/indicadores"]}>
      <Indicadores />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Seção (`<section aria-labelledby>`) de um bloco, pelo nome do h2. */
async function secaoDoBloco(nome: string): Promise<HTMLElement> {
  const titulo = await screen.findByRole("heading", { level: 2, name: nome });
  const secao = titulo.closest("section");
  if (!secao) {
    throw new Error(`seção do bloco "${nome}" não encontrada`);
  }
  return secao;
}

/** Texto completo da caixa de fórmula de uma seção. */
function textoFormula(secao: HTMLElement): string {
  const caixa = secao.querySelector(".caixa-formula");
  return (caixa?.textContent ?? "").replace(/\s+/g, " ").trim();
}

const TITULO_ENTREGAS = "Entregas no prazo por transportadora e mês";
const FORMULA_ENTREGAS =
  "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida, por transportadora e mes da entrega";

describe("Indicadores — topo (Modelo B)", () => {
  it("mostra o rótulo da página e o h1", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();

    expect(
      screen.getByText("Cada número com fórmula, numerador e denominador"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Indicadores" }),
    ).toBeInTheDocument();
    await secaoDoBloco(TITULO_ENTREGAS);
  });
});

describe("Indicadores — Entregas no prazo", () => {
  it("mostra o geral (soma dos numeradores ÷ soma dos denominadores) com numerador e denominador", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    // (5 + 8 + 3) ÷ (10 + 10 + 4) = 16 ÷ 24 = 66,7%. A linha "à parte"
    // (Pedidos sem entrega) não entra na soma.
    expect(within(secao).getByText("66,7%")).toBeInTheDocument();
    expect(within(secao).getByText("geral · 16 de 24")).toBeInTheDocument();
  });

  it("fórmula da API na caixa, com o total de pedidos sem entrega (sem linha solta)", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    expect(textoFormula(secao)).toBe(
      `Fórmula: ${FORMULA_ENTREGAS}. Pedidos sem entrega ficam fora do denominador: 37.`,
    );
    expect(screen.queryByText("Pedidos sem entrega: 37")).not.toBeInTheDocument();
  });

  it("tabela em colunas (Transportadora, Mês, No prazo, Entregas, %) do mês mais recente por padrão", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);
    const tabela = within(secao).getByRole("table", { name: TITULO_ENTREGAS });

    const cabecalhos = within(tabela)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(cabecalhos).toEqual([
      "Transportadora",
      "Mês",
      "No prazo",
      "Entregas",
      "%",
      "Proporção",
    ]);

    const linhas = within(tabela).getAllByRole("row").slice(1);
    expect(linhas).toHaveLength(2);
    expect(
      within(obrigatorio(linhas[0], "linha 1")).getAllByRole("cell").map((td) => td.textContent),
    ).toEqual(["Transportadora A", "2026-09", "8", "10", "80,0%", ""]);
    expect(
      within(obrigatorio(linhas[1], "linha 2")).getAllByRole("cell").map((td) => td.textContent),
    ).toEqual(["Transportadora B", "2026-09", "3", "4", "75,0%", ""]);
  });

  it("filtro 'Mês' lista os meses em ordem crescente e filtra no navegador, sem nova chamada à API", async () => {
    const mock = instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);
    const chamadasAntes = mock.mock.calls.length;

    const seletor = within(secao).getByLabelText("Mês");
    if (!(seletor instanceof HTMLSelectElement)) {
      throw new Error("O filtro 'Mês' deveria ser um <select>");
    }
    expect(seletor.value).toBe("2026-09");
    expect(Array.from(seletor.options).map((opcao) => opcao.value)).toEqual([
      "2026-08",
      "2026-09",
    ]);

    fireEvent.change(seletor, { target: { value: "2026-08" } });

    const tabela = within(secao).getByRole("table", { name: TITULO_ENTREGAS });
    const linhas = within(tabela).getAllByRole("row").slice(1);
    expect(linhas).toHaveLength(1);
    expect(
      within(obrigatorio(linhas[0], "linha 1")).getAllByRole("cell").map((td) => td.textContent),
    ).toEqual(["Transportadora A", "2026-08", "5", "10", "50,0%", ""]);

    // Lista do celular acompanha o mesmo filtro.
    const listaCelular = secao.querySelector(".indicador__linhas");
    expect(listaCelular?.querySelectorAll("li")).toHaveLength(1);
    expect(listaCelular?.textContent).toContain("5/10");

    expect(mock.mock.calls.length).toBe(chamadasAntes);
  });

  it("lista do celular: uma linha por transportadora com fração e %", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);
    const itens = Array.from(
      secao.querySelectorAll(".indicador__linhas li"),
    ).map((li) => li.textContent.replace(/\s+/g, " ").trim());

    expect(itens).toEqual([
      "Transportadora A 8/1080,0%",
      "Transportadora B 3/475,0%",
    ]);
  });

  it("linha com denominador 0 mostra o texto específico, sem NaN", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaIndicadoresValida({
            entregas: blocoEntregasNoPrazo({
              linhas: [
                linha("Transportadora B / 2026-09", 0, 0, null),
                linha("Pedidos sem entrega", 0, 1, 0),
              ],
            }),
          })),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    expect(
      within(secao).getAllByText("sem entregas com data conhecida").length,
    ).toBeGreaterThan(0);
    expect(secao.textContent).not.toContain("NaN");
  });

  it("sem nenhuma linha de entrega: sem filtro e com aviso", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaIndicadoresValida({
            entregas: blocoEntregasNoPrazo({
              linhas: [linha("Pedidos sem entrega", 4, 1, 4)],
            }),
          })),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    expect(
      within(secao).getByText("Nenhuma entrega com data conhecida."),
    ).toBeInTheDocument();
    expect(within(secao).queryByLabelText("Mês")).not.toBeInTheDocument();
  });
});

describe("Indicadores — Divergências por tipo", () => {
  it("tabela Tipo | Divergências em ordem decrescente, com etiqueta-link para /?tipo=<literal>", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");
    const tabela = within(secao).getByRole("table", {
      name: "Divergências por tipo",
    });

    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Tipo", "Divergências"]);

    const linhas = within(tabela).getAllByRole("row").slice(1);
    expect(
      linhas.map((tr) =>
        within(tr)
          .getAllByRole("cell")
          .map((td) => td.textContent),
      ),
    ).toEqual([
      ["Entrega atrasada", "4"],
      ["Enviado e não pago", "3"],
      ["Pago duas vezes", "2"],
      ["Pago e não enviado", "1"],
      ["Pagamento parcial", "0"],
    ]);

    expect(
      within(tabela).getByRole("link", { name: "Pago duas vezes" }),
    ).toHaveAttribute("href", "/?tipo=duplicado");
    expect(
      within(tabela).getByRole("link", { name: "Pagamento parcial" }),
    ).toHaveAttribute("href", "/?tipo=parcial");
    expect(
      within(tabela).getByRole("link", { name: "Pago e não enviado" }),
    ).toHaveAttribute("href", "/?tipo=pago_nao_enviado");
    expect(
      within(tabela).getByRole("link", { name: "Enviado e não pago" }),
    ).toHaveAttribute("href", "/?tipo=enviado_nao_pago");
    expect(
      within(tabela).getByRole("link", { name: "Entrega atrasada" }),
    ).toHaveAttribute("href", "/?tipo=entrega_atrasada");
  });

  it("fórmula da API com o total de divergências", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");

    expect(textoFormula(secao)).toBe(
      "Fórmula: numero de divergencias do tipo / total de divergencias (total: 10).",
    );
  });

  it("lista do celular com os mesmos links e contagens", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");
    const itens = Array.from(
      secao.querySelectorAll(".indicador__lista-tipos li"),
    );

    expect(itens).toHaveLength(5);
    expect(obrigatorio(itens[0], "item 1").querySelector("a")).toHaveAttribute(
      "href",
      "/?tipo=entrega_atrasada",
    );
    expect(obrigatorio(itens[0], "item 1").textContent).toBe("Entrega atrasada4");
  });

  it("rótulo desconhecido vira texto sem link (tabela e lista do celular)", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaIndicadoresValida({
            divergencias: blocoDivergenciasPorTipo({
              linhas: [
                linha("duplicado", 2, 3, 0.67),
                linha("tipo_inexistente", 1, 3, 0.33),
              ],
            }),
          })),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");

    expect(secao.querySelectorAll("a")).toHaveLength(2); // só "duplicado" (tabela + lista)
    expect(
      secao.querySelector('a[href*="tipo_inexistente"]'),
    ).toBeNull();
    expect(within(secao).getAllByText("tipo_inexistente")).toHaveLength(2);
  });
});

describe("Indicadores — erro 5xx/rede/timeout", () => {
  it("mostra EstadoErro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    const chamadasAntes = mock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => {
      expect(mock.mock.calls.length).toBeGreaterThan(chamadasAntes);
    });
  });

  it("5xx mostra a mensagem de indisponibilidade", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          type: "about:blank",
          title: "Erro interno",
          status: 500,
          detail: "falha",
          codigo: "erro_interno",
        }),
      })),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Não foi possível consultar os dados agora. Tente de novo em alguns segundos.",
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("Indicadores — carregando", () => {
  it("mostra 'Carregando indicadores…' com aria-busy='true'", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Carregando indicadores…")).toBeInTheDocument();
    expect(
      container.querySelector("[aria-busy='true']"),
    ).toBeInTheDocument();
  });
});

describe("Indicadores — os 4 blocos (Modelo B)", () => {
  it("desenha as 4 seções na ordem da API, com os títulos do mockup e sem selos", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaComplementaresValida()),
      })),
    );

    renderizar();
    await secaoDoBloco("Pago × devido");

    const cabecalhos = screen.getAllByRole("heading", { level: 2 });
    expect(cabecalhos.map((cabecalho) => cabecalho.textContent)).toEqual([
      TITULO_ENTREGAS,
      "Divergências por tipo",
      "Tempo médio",
      "Pago × devido",
    ]);

    // Selos "DESEJÁVEL"/"OPCIONAL" não são usados (decisão de 2026-10-08).
    expect(screen.queryByText(/desejável|opcional/i)).not.toBeInTheDocument();
  });

  it("Tempo médio mostra dias (numerador ÷ denominador), não percentual", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaComplementaresValida()),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Tempo médio");

    // 136.511,4 ÷ 16.261 = 8,39… → "8,4 dias"; 66.605,2 ÷ 16.245 → "4,1 dias".
    expect(within(secao).getByText("8,4 dias")).toBeInTheDocument();
    expect(within(secao).getByText("4,1 dias")).toBeInTheDocument();
    expect(within(secao).getByText("pedido → envio")).toBeInTheDocument();
    expect(within(secao).getByText("envio → entrega")).toBeInTheDocument();
    // Defeito antigo: a média saía como "839,0%".
    expect(secao.textContent).not.toContain("%");
  });

  it("Tempo médio: fórmula da API com numerador e denominador de cada etapa", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaComplementaresValida()),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Tempo médio");

    expect(textoFormula(secao)).toBe(
      "Fórmula: soma de dias entre as datas ÷ contagem de pedidos elegíveis, por etapa. Pedido → envio: 136.511 ÷ 16.261. Envio → entrega: 66.605 ÷ 16.245.",
    );
  });

  it("Tempo médio com denominador 0 mostra '—', sem NaN", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaComplementaresValida({
            tempoMedio: blocoTempoMedio({
              linhas: [
                linha("pedido→envio", 0, 0, null),
                linha("envio→entrega", 0, 0, null),
              ],
            }),
          })),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Tempo médio");

    expect(within(secao).getAllByText("—")).toHaveLength(2);
    expect(secao.textContent).not.toContain("NaN");
  });

  it("Pago × devido: valores compacto e exato, e % calculado como numerador ÷ denominador", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaComplementaresValida()),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Pago × devido");

    const rotulosMedidas = Array.from(
      secao.querySelectorAll(".indicador__rotulo"),
    ).map((p) => p.textContent);
    expect(rotulosMedidas).toEqual(["Devido", "Pago"]);
    expect(within(secao).getByText("R$ 21,3 mi")).toBeInTheDocument();
    expect(within(secao).getByText("R$ 21.300.000,00")).toBeInTheDocument();
    expect(within(secao).getByText("R$ 21 mi")).toBeInTheDocument();
    expect(within(secao).getByText("R$ 21.000.000,00")).toBeInTheDocument();

    // 21.000.000 ÷ 21.300.000 = 98,6% (o `resultado` da API, 0.99, não é usado).
    expect(textoFormula(secao)).toBe("Fórmula: Σ pago ÷ Σ devido = 98,6%.");
    expect(secao.textContent).not.toContain("99,0%");
  });

  it("Pago × devido: quebra por situação com rótulos em português e '—' de dados quando devido é 0", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaComplementaresValida()),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Pago × devido");
    const tabela = within(secao).getByRole("table", {
      name: "Pago × devido por situação",
    });

    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Situação", "Pago", "Devido", "%"]);

    const rotulos = within(tabela)
      .getAllByRole("row")
      .slice(1)
      .map((tr) => obrigatorio(within(tr).getAllByRole("cell")[0], "primeira célula").textContent);
    expect(rotulos).toEqual([
      "Sem pagamento",
      "Parcial",
      "Quitado",
      "Pago a mais",
    ]);

    // "excedente" tem devido 0 → texto de "sem dados", sem NaN.
    expect(within(tabela).getByText("sem dados suficientes")).toBeInTheDocument();
    expect(secao.textContent).not.toContain("NaN");
  });

  it("bloco de chave desconhecida cai no componente genérico (título, fórmula e linhas)", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve([
          ...(respostaIndicadoresValida() as unknown[]),
          {
            chave: "indicador_novo",
            titulo: "Indicador novo",
            formula: "a ÷ b",
            linhas: [linha("Grupo X", 1, 4, 0.25)],
            aParte: false,
          },
        ]),
      })),
    );

    renderizar();
    const secao = await secaoDoBloco("Indicador novo");

    expect(textoFormula(secao)).toBe("Fórmula: a ÷ b.");
    expect(within(secao).getByText("Grupo X")).toBeInTheDocument();
    expect(within(secao).getByText("25,0%")).toBeInTheDocument();
  });

  it("sucesso com as 4 seções não tem violação de acessibilidade (axe)", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaComplementaresValida()),
      })),
    );

    const { container } = renderizar();
    await secaoDoBloco("Pago × devido");

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Indicadores — acessibilidade (vitest-axe)", () => {
  it("sucesso não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaIndicadoresValida()) })),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Divergências por tipo" }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("carregando não tem violações", async () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("erro não tem violações", async () => {
    instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
