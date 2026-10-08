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
  devido?: number;
  pago?: number;
  eventos?: unknown[];
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
      // Valores do cabeçalho deliberadamente diferentes de 150 (o valor dos
      // eventos de venda/pagamento abaixo) — mesma lógica do comentário em
      // `eventoVenda`: evita que o cabeçalho e um evento da linha do tempo
      // produzam o mesmo texto "R$ 150,00" e tornem a asserção ambígua
      // (`getByText` falha com "found multiple elements" quando dois
      // elementos distintos têm o mesmo texto).
      devido: opcoes?.devido ?? 300,
      pago: opcoes?.pago ?? 300,
      dataLimite: "2026-01-20T00:00:00Z",
      divergencias: opcoes?.divergencias ?? [],
    },
    eventos: opcoes?.eventos ?? [eventoVenda(), eventoPagamento()],
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
    json: opcoes.json ?? (() => Promise.resolve({})),
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
    return Promise.reject(new Error(`fetch não mockado para ${url}`));
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

async function aguardarTitulo() {
  await waitFor(() => {
    expect(
      screen.getByRole("heading", { level: 1, name: "Pedido PED-000001" }),
    ).toBeInTheDocument();
  });
}

function eventoPagamentoCom(codigoEvento: string, valor: number): unknown {
  return eventoPagamento({ codigoEvento, valor });
}

describe("Pedido — sucesso", () => {
  it("buscando pela identidade: link de volta, h1 em mono com 'Pedido ' oculto, 'Presente em 3 de 3 sistemas'", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaLinhaDoTempoValida()) })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    const voltar = screen.getByRole("link", { name: "Divergências" });
    expect(voltar).toHaveAttribute("href", "/");
    expect(voltar).toHaveTextContent("← Divergências");

    const titulo = screen.getByRole("heading", { level: 1 });
    expect(titulo).toHaveClass("pedido-titulo");
    expect(titulo.querySelector(".visualmente-oculto")).toHaveTextContent(
      "Pedido",
    );

    expect(screen.queryByText(/Encontrado pelo código/)).not.toBeInTheDocument();
    expect(screen.getByText("Presente em 3 de 3 sistemas")).toHaveClass(
      "pedido-subtitulo",
    );
    expect(screen.getByText("3 de 3 sistemas")).toHaveClass("pedido-sistemas");

    // Removidos no Modelo B: "Aparece em … fontes" e "Situação:".
    expect(container).not.toHaveTextContent("Aparece em");
    expect(container).not.toHaveTextContent("Situação:");
  });

  it("cartões de valor: PC com R$, Saldo e Data limite; celular sem R$ e sem Saldo", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaLinhaDoTempoValida()) })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    const pc = container.querySelector(".pedido-kpis--pc");
    expect(pc).toHaveClass("kpis");
    expect(
      Array.from(pc?.querySelectorAll("dt") ?? []).map((dt) => dt.textContent),
    ).toEqual(["Devido", "Pago", "Saldo", "Data limite"]);
    expect(
      Array.from(pc?.querySelectorAll("dd") ?? []).map((dd) => dd.textContent),
    ).toEqual(["R$ 300,00", "R$ 300,00", "R$ 0,00", "2026-01-20"]);
    expect(pc?.querySelector(".pedido-valor--ruim")).toBeNull();

    const celular = container.querySelector(".pedido-kpis--celular");
    expect(celular).toHaveClass("kpis", "kpis--celular");
    expect(
      Array.from(celular?.querySelectorAll("dt") ?? []).map(
        (dt) => dt.textContent,
      ),
    ).toEqual(["Devido", "Pago", "Limite"]);
    expect(
      Array.from(celular?.querySelectorAll("dd") ?? []).map(
        (dd) => dd.textContent,
      ),
    ).toEqual(["300,00", "300,00", "2026-01-20"]);
  });

  it("pago menor que o devido: saldo negativo com sinal e Pago/Saldo em vermelho", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaLinhaDoTempoValida({ devido: 440, pago: 264 })),
      })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    const valoresPc = container.querySelectorAll(".pedido-kpis--pc dd");
    expect(valoresPc[1]).toHaveTextContent("R$ 264,00");
    expect(valoresPc[1]).toHaveClass("pedido-valor--ruim");
    expect(valoresPc[2]).toHaveTextContent("−R$ 176,00");
    expect(valoresPc[2]).toHaveClass("pedido-valor--ruim");
    expect(valoresPc[0]).not.toHaveClass("pedido-valor--ruim");

    const valoresCelular = container.querySelectorAll(
      ".pedido-kpis--celular dd",
    );
    expect(valoresCelular[1]).toHaveTextContent("264,00");
    expect(valoresCelular[1]).toHaveClass("pedido-valor--ruim");
  });

  it("pago maior que o devido: saldo positivo com '+'", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaLinhaDoTempoValida({ devido: 440, pago: 880 })),
      })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    const valoresPc = container.querySelectorAll(".pedido-kpis--pc dd");
    expect(valoresPc[2]).toHaveTextContent("+R$ 440,00");
  });

  it("linha do tempo: h2 com nota no PC e versão curta no celular, eventos e código de vendas no cabeçalho", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaLinhaDoTempoValida()) })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.querySelector(".so-pc")).toHaveTextContent(
      "Linha do tempo por sistema · ordem do momento do fato",
    );
    expect(h2.querySelector(".so-celular")).toHaveTextContent(/^Linha do tempo$/);
    expect(h2.closest("section")).toHaveAttribute(
      "aria-labelledby",
      h2.getAttribute("id"),
    );

    expect(
      screen.getByRole("region", { name: "Linha do tempo por sistema" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".evento")).toHaveLength(2);
    expect(
      container.querySelector(".linha-do-tempo__cabecalho-codigo"),
    ).toHaveTextContent("#10248");
  });

  it("buscando por código de fonte: 'Encontrado pelo código' (PC) e 'encontrado por' (celular)", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaLinhaDoTempoValida({ codigoBuscado: "TX-88812" })),
      })),
    );

    const { container } = renderizar("TX-88812");
    await aguardarTitulo();

    const subtitulo = container.querySelector(".pedido-subtitulo");
    expect(subtitulo).toHaveTextContent(
      "Encontrado pelo código TX-88812 · presente em 3 de 3 sistemas",
    );
    expect(subtitulo?.querySelector(".mono")).toHaveTextContent("TX-88812");

    expect(container.querySelector(".pedido-sistemas")).toHaveTextContent(
      "3 de 3 sistemas · encontrado por TX-88812",
    );
  });

  it("sem divergência mostra 'Sem divergência' (EtiquetaEstado ok)", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaLinhaDoTempoValida({ divergencias: [] })),
      })),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem divergência")).toHaveAttribute(
        "data-variante",
        "ok",
      );
    });
  });

  it("divergência 'duplicado': marca o segundo pagamento integral, não o primeiro", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaLinhaDoTempoValida({
            devido: 150,
            pago: 300,
            divergencias: [{ tipo: "duplicado", motivo: "Pago duas vezes." }],
            eventos: [
              eventoVenda(),
              eventoPagamentoCom("TX-1", 150),
              eventoPagamentoCom("TX-2", 150),
            ],
          })),
      })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    const pagamentos = container.querySelectorAll(
      '.evento[data-fonte="pagamentos"]',
    );
    expect(pagamentos).toHaveLength(2);
    expect(pagamentos[0]).not.toHaveClass("evento--ruim");
    expect(pagamentos[0]).not.toHaveTextContent("duplicado");
    expect(pagamentos[1]).toHaveClass("evento--ruim");
    expect(pagamentos[1]).toHaveTextContent("duplicado");
    // Etiqueta do topo usa o rótulo novo.
    expect(screen.getByText("Pago duas vezes")).toBeInTheDocument();
  });

  it("sem a divergência 'duplicado' na API, nenhum pagamento é marcado", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaLinhaDoTempoValida({
            devido: 150,
            pago: 300,
            divergencias: [],
            eventos: [
              eventoVenda(),
              eventoPagamentoCom("TX-1", 150),
              eventoPagamentoCom("TX-2", 150),
            ],
          })),
      })),
    );

    const { container } = renderizar();
    await aguardarTitulo();

    expect(container.querySelectorAll(".evento--ruim")).toHaveLength(0);
    expect(screen.queryByText("duplicado")).not.toBeInTheDocument();
  });

  it("com divergência mostra uma EtiquetaTipo por item", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaLinhaDoTempoValida({
            divergencias: [
              { tipo: "parcial", motivo: "Pago parcialmente." },
              { tipo: "entrega_atrasada", motivo: "Atraso de 5 dias." },
            ],
          })),
      })),
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
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve(respostaErro({ status: 404, codigo: "pedido_nao_encontrado" })),
      })),
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
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve(respostaErro({ status: 400, codigo: "parametro_invalido" })),
      })),
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
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

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
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve(respostaErro({ status: 500, codigo: "erro_interno" })),
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
    instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem conexão com o servidor.")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio (404) não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve(respostaErro({ status: 404, codigo: "pedido_nao_encontrado" })),
      })),
    );

    const { container } = renderizar("PED-999999");

    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sucesso não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaLinhaDoTempoValida()) })),
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
