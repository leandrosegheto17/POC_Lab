// TP-0063 — Tela T3 Indicadores: lista de blocos do contrato
// (`EsquemaRespostaIndicadores`), um `Indicador` por bloco; 4 estados;
// "Tentar de novo" refaz a mesma chamada (mesmo truque de fragmento de
// `Divergencias.tsx`, TP-0059).
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
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
      linha("Transportadora A / 2026-09", 8, 10, 0.8),
      linha("Pedidos sem entrega", 3, 1, 3),
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
    linhas: opcoes?.linhas ?? [
      linha("pedido→envio", 120, 40, 3),
      linha("envio→entrega", 80, 40, 2),
    ],
    aParte: false,
  };
}

function blocoValorPagoVsDevido(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "valorPagoVsDevido",
    titulo: "Valor pago × valor devido",
    formula: "Σ pago ÷ Σ devido",
    linhas: opcoes?.linhas ?? [
      linha("Total", 900, 1000, 0.9),
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
    json: opcoes.json ?? (async () => ({})),
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

describe("Indicadores — sucesso", () => {
  it("desenha título, fórmula e tabela de cada bloco, com a linha 'à parte' separada", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaIndicadoresValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Entregas no prazo por transportadora e mês",
        }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { level: 2, name: "Divergências por tipo" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida, por transportadora e mes da entrega",
      ),
    ).toBeInTheDocument();

    // Linha principal do bloco de entregas, na tabela de %.
    expect(screen.getByText("Transportadora A / 2026-09")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();

    // Linha "à parte" NÃO entra na tabela de %: vem como parágrafo próprio
    // com o valor bruto, fora das colunas Numerador/Denominador/%.
    expect(
      screen.getByText("Pedidos sem entrega: 3"),
    ).toBeInTheDocument();
  });

  it("mostra o texto específico quando o resultado de uma linha de entregas é nulo", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaIndicadoresValida({
            entregas: blocoEntregasNoPrazo({
              linhas: [
                linha("Transportadora B / 2026-09", 0, 0, null),
                linha("Pedidos sem entrega", 0, 1, 0),
              ],
            }),
          }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("sem entregas com data conhecida"),
      ).toBeInTheDocument();
    });
  });

  it("cada linha de divergências por tipo é um link para /?tipo=<literal>", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaIndicadoresValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "duplicado" })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "duplicado" })).toHaveAttribute(
      "href",
      "/?tipo=duplicado",
    );
    expect(screen.getByRole("link", { name: "parcial" })).toHaveAttribute(
      "href",
      "/?tipo=parcial",
    );
    expect(
      screen.getByRole("link", { name: "pago_nao_enviado" }),
    ).toHaveAttribute("href", "/?tipo=pago_nao_enviado");
    expect(
      screen.getByRole("link", { name: "enviado_nao_pago" }),
    ).toHaveAttribute("href", "/?tipo=enviado_nao_pago");
    expect(
      screen.getByRole("link", { name: "entrega_atrasada" }),
    ).toHaveAttribute("href", "/?tipo=entrega_atrasada");

    // Linha com resultado 0 (não nulo) mostra percentual, não o texto de
    // "sem dados" — distinção entre "zero" e "nulo".
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});

describe("Indicadores — casos de borda", () => {
  it("bloco sem aParte não renderiza parágrafo de valor à parte", async () => {
    // Só o bloco de divergências (sem aParte) na resposta — isola o caso de
    // um bloco onde NENHUMA linha representa um valor "à parte", sem o
    // bloco de entregas (que tem aParte) interferir na asserção.
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => [blocoDivergenciasPorTipo()],
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Divergências por tipo" }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/sem entrega/i)).not.toBeInTheDocument();
  });

  it("bloco com todas as linhas de resultado nulo mostra o texto genérico em cada uma", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaIndicadoresValida({
            divergencias: blocoDivergenciasPorTipo({
              linhas: [
                linha("duplicado", 0, 0, null),
                linha("parcial", 0, 0, null),
              ],
            }),
          }),
      }),
    );

    renderizar();

    await waitFor(() => {
      const ocorrencias = screen.getAllByText("sem dados suficientes");
      expect(ocorrencias).toHaveLength(2);
    });
  });
});

describe("Indicadores — erro 5xx/rede/timeout", () => {
  it("mostra EstadoErro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });

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
    instalarFetchMock(async () =>
      respostaFake({
        ok: false,
        status: 500,
        json: async () => ({
          type: "about:blank",
          title: "Erro interno",
          status: 500,
          detail: "falha",
          codigo: "erro_interno",
        }),
      }),
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

describe("Indicadores — complementares (TP-0071)", () => {
  it("desenha as 4 seções (2 Must + 2 complementares) pelo mesmo componente Indicador, na ordem recebida da API", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaComplementaresValida(),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Tempo médio pedido→envio e envio→entrega",
        }),
      ).toBeInTheDocument();
    });

    const titulos = [
      "Entregas no prazo por transportadora e mês",
      "Divergências por tipo",
      "Tempo médio pedido→envio e envio→entrega",
      "Valor pago × valor devido",
    ];

    const cabecalhos = screen.getAllByRole("heading", { level: 2 });
    expect(cabecalhos).toHaveLength(4);
    expect(cabecalhos.map((cabecalho) => cabecalho.textContent)).toEqual(
      titulos,
    );

    // Fórmula e uma linha de cada bloco novo, confirmando que título/fórmula/
    // linhas vêm do bloco correto (não de um bloco vizinho).
    expect(
      screen.getByText(
        "soma de dias entre as datas ÷ contagem de pedidos elegíveis, por etapa",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("pedido→envio")).toBeInTheDocument();
    expect(screen.getByText("envio→entrega")).toBeInTheDocument();

    expect(screen.getByText("Σ pago ÷ Σ devido")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("quitado")).toBeInTheDocument();
  });

  it("linha com resultado nulo (denominador 0) entre os blocos complementares mostra o texto genérico de 'sem dados', sem NaN/erro", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaComplementaresValida({
            valorPagoVsDevido: blocoValorPagoVsDevido({
              linhas: [
                linha("Total", 900, 1000, 0.9),
                linha("excedente", 100, 0, null),
              ],
            }),
          }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Valor pago × valor devido" }),
      ).toBeInTheDocument();
    });

    // "excedente" tem denominador 0 — mesmo texto alternativo default do
    // componente `Indicador` (nenhuma tela passa `textoSemDados` específico
    // para este bloco), sem criar lógica nova de formatação.
    expect(screen.getByText("sem dados suficientes")).toBeInTheDocument();
    expect(screen.queryByText("NaN%")).not.toBeInTheDocument();
  });

  it("sucesso com as 4 seções não tem violação de acessibilidade (axe)", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaComplementaresValida(),
      }),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Valor pago × valor devido" }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Indicadores — acessibilidade (vitest-axe)", () => {
  it("sucesso não tem violações", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaIndicadoresValida() }),
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
    instalarFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
