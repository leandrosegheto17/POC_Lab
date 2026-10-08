// TP-0062 — Tela T2 Linha do tempo do pedido: GET
// /api/v1/pedidos/{codigo}/linha-do-tempo, cabeçalho (identidade/fontes/
// valores/divergências) + `LinhaDoTempo` (eventos), 4 estados.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { axe } from "vitest-axe";
import { Pedido } from "../src/paginas/Pedido.tsx";

function eventoVenda(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "vendas",
    // Código diferente dos "fontes" do cabeçalho de propósito — evita
    // ambiguidade de texto duplicado nos testes (cabeçalho e linha do
    // tempo são elementos distintos, mesmo quando o valor de negócio
    // coincidiria em dados reais).
    codigoEvento: "EVT-V-1",
    momentoFato: "2026-01-05T10:00:00Z",
    tipo: "venda",
    valor_devido: 150,
    data_limite: "2026-01-20",
    transportadora: "Transp. Rápida",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

function eventoPagamento(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "pagamentos",
    codigoEvento: "EVT-P-1",
    momentoFato: "2026-01-06T10:00:00Z",
    tipo: "pagamento",
    valor: 150,
    referencia_original: "10248",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

function respostaLinhaDoTempoValida(opcoes?: {
  codigoBuscado?: string;
  divergencias?: unknown[];
}): unknown {
  return {
    pedido: {
      identidade: "PED-000001",
      codigoBuscado: opcoes?.codigoBuscado ?? "PED-000001",
      fontes: [
        { fonte: "vendas", codigo: "10248" },
        { fonte: "pagamentos", codigo: "TX-88812" },
        { fonte: "rastreio", codigo: "RS-5521" },
      ],
      devido: 150,
      pago: 150,
      dataLimite: "2026-01-20T00:00:00Z",
      divergencias: opcoes?.divergencias ?? [],
    },
    eventos: [eventoVenda(), eventoPagamento()],
  };
}

function respostaErro(opcoes: {
  status: number;
  codigo: string;
  detail?: string;
}): unknown {
  return {
    type: "about:blank",
    title: "Erro",
    status: opcoes.status,
    detail: opcoes.detail ?? "detalhe tecnico que nao deve aparecer na tela",
    codigo: opcoes.codigo,
    ...(opcoes.status === 400
      ? { erros: [{ campo: "codigo", mensagem: "formato inválido" }] }
      : {}),
  };
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
  aoChamarPedido: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.startsWith("/api/v1/pedidos/")) {
      return aoChamarPedido(url);
    }
    throw new Error(`fetch não mockado para ${url}`);
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function chamadas(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls.map((chamada) => String(chamada[0]));
}

function renderizar(codigo = "PED-000001") {
  return render(
    <MemoryRouter initialEntries={[`/pedido/${codigo}`]}>
      <Routes>
        <Route path="/pedido/:codigo" element={<Pedido />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Pedido — sucesso", () => {
  it("buscando pela identidade: <h1> sem 'Encontrado pelo código', mostra fontes, valores e eventos", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaLinhaDoTempoValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Pedido PED-000001" }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/Encontrado pelo código/)).not.toBeInTheDocument();
    expect(screen.getByText(/Aparece em 3 de 3 fontes/)).toBeInTheDocument();
    expect(screen.getByText("10248")).toBeInTheDocument();
    expect(screen.getByText("TX-88812")).toBeInTheDocument();
    expect(screen.getByText("RS-5521")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*150,00/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-20/)).toBeInTheDocument();

    // `LinhaDoTempo` recebeu os eventos do mock (códigos de evento,
    // distintos dos códigos de fonte do cabeçalho).
    expect(screen.getByText("EVT-V-1")).toBeInTheDocument();
    expect(screen.getByText("EVT-P-1")).toBeInTheDocument();
  });

  it("buscando por código de fonte: mostra 'Encontrado pelo código {codigoBuscado}'", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaLinhaDoTempoValida({ codigoBuscado: "TX-88812" }),
      }),
    );

    renderizar("TX-88812");

    await waitFor(() => {
      expect(screen.getByText("Encontrado pelo código TX-88812")).toBeInTheDocument();
    });
  });

  it("sem divergência mostra 'Sem divergência'", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaLinhaDoTempoValida({ divergencias: [] }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem divergência")).toBeInTheDocument();
    });
  });

  it("com divergência mostra uma EtiquetaTipo por item", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaLinhaDoTempoValida({
            divergencias: [
              { tipo: "parcial", motivo: "Pago parcialmente." },
              { tipo: "entrega_atrasada", motivo: "Atraso de 5 dias." },
            ],
          }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Pagamento parcial")).toBeInTheDocument();
    });
    expect(screen.getByText("Entrega atrasada")).toBeInTheDocument();
    expect(screen.queryByText("Sem divergência")).not.toBeInTheDocument();
  });
});

describe("Pedido — vazio (404/400)", () => {
  it("404 pedido_nao_encontrado: 'Pedido não encontrado' + dica de formatos, sem 'Tentar de novo', sem role=alert", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: false,
        status: 404,
        json: async () =>
          respostaErro({ status: 404, codigo: "pedido_nao_encontrado" }),
      }),
    );

    renderizar("PED-999999");

    // Aparece tanto no <h1> quanto no corpo do `EstadoVazio` — dois
    // elementos distintos, mesmo texto.
    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Pedido não encontrado" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Use o código do pedido \(PED-nnnnnn\)/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tentar de novo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/detalhe tecnico/)).not.toBeInTheDocument();
  });

  it("400 parametro_invalido: mesma mensagem de 'vazio', sem 'Tentar de novo'", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: false,
        status: 400,
        json: async () =>
          respostaErro({ status: 400, codigo: "parametro_invalido" }),
      }),
    );

    renderizar("codigo-invalido");

    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });

    expect(
      screen.queryByRole("button", { name: "Tentar de novo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Pedido — erro 5xx/rede/timeout", () => {
  it("erro de rede mostra EstadoErro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem conexão com o servidor.")).toBeInTheDocument();
    });

    const botao = screen.getByRole("button", { name: "Tentar de novo" });
    const chamadasAntes = chamadas(mock).length;

    fireEvent.click(botao);

    await waitFor(() => {
      expect(chamadas(mock).length).toBeGreaterThan(chamadasAntes);
    });
  });

  it("erro 5xx da API mostra EstadoErro com 'Tentar de novo'", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: false,
        status: 500,
        json: async () =>
          respostaErro({ status: 500, codigo: "erro_interno" }),
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

    expect(
      screen.getByRole("button", { name: "Tentar de novo" }),
    ).toBeInTheDocument();
  });
});

describe("Pedido — carregando", () => {
  it("mostra 'Buscando pedido…' com aria-busy='true'", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Buscando pedido…")).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });
});

describe("Pedido — acessibilidade (vitest-axe)", () => {
  it("carregando não tem violações", async () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Buscando pedido…")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("erro (5xx/rede) não tem violações", async () => {
    instalarFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem conexão com o servidor.")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio (404) não tem violações", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: false,
        status: 404,
        json: async () =>
          respostaErro({ status: 404, codigo: "pedido_nao_encontrado" }),
      }),
    );

    const { container } = renderizar("PED-999999");

    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sucesso não tem violações", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaLinhaDoTempoValida() }),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Pedido PED-000001" }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
