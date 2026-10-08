// TP-0059 — Tela T1 Divergências: lê `?tipo=` da URL, consulta
// `/api/v1/divergencias`, filtro + tabela + 4 estados; tipo inválido na URL
// e 400 real da API tratados pela MESMA mensagem/link; "Tentar de novo"
// refaz a mesma chamada (ver comentário de `construirUrlConsulta` em
// `Divergencias.tsx`).
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
import { ProvedorResumo } from "../src/dados/contexto-resumo.tsx";
import { Divergencias } from "../src/paginas/Divergencias.tsx";
import { obrigatorio } from "./apoio/obrigatorio.ts";

/** Objeto mínimo válido contra `EsquemaCartao` (processamento/contrato/resumo.ts). */
function cartao(numerador: number, denominador = 1): unknown {
  return {
    titulo: "Cartão de teste",
    formula: "numerador / denominador",
    numerador,
    denominador,
    resultado: denominador === 0 ? null : numerador / denominador,
  };
}

function resumoValido(): unknown {
  return {
    dataCorte: "2026-10-08T00:00:00.000Z",
    semente: 42,
    versaoContrato: "1.0.0",
    idPublicacao: "pub-teste",
    totais: {
      pedidos: cartao(100),
      pedidosComDivergencia: cartao(7, 100),
      porTipo: [
        { tipo: "duplicado", cartao: cartao(2, 100) },
        { tipo: "parcial", cartao: cartao(0, 100) },
        { tipo: "pago_nao_enviado", cartao: cartao(1, 100) },
        { tipo: "enviado_nao_pago", cartao: cartao(3, 100) },
        { tipo: "entrega_atrasada", cartao: cartao(1, 100) },
      ],
      valorEmAberto: cartao(1234.5),
      pagoAMais: cartao(99.9),
      entregasNoPrazo: cartao(85, 90),
    },
  };
}

function divergenciaValida(pedido: string, tipo: string): unknown {
  return {
    pedido,
    tipo,
    motivo: "Pagamento recebido em duplicidade",
    eventos: [
      {
        tipo: "pagamento",
        data: "2026-10-01",
        fonte: "pagamentos",
        codigo: "evt-1",
      },
      {
        tipo: "pagamento",
        data: "2026-10-02",
        fonte: "pagamentos",
        codigo: "evt-2",
      },
    ],
  };
}

function respostaDivergenciasValida(opcoes?: {
  dados?: unknown[];
  total?: number;
  totalPaginas?: number;
}): unknown {
  const dados = opcoes?.dados ?? [divergenciaValida("PED-001", "duplicado")];
  return {
    dados,
    paginacao: {
      pagina: 1,
      tamanho: 50,
      total: opcoes?.total ?? dados.length,
      totalPaginas: opcoes?.totalPaginas ?? 1,
    },
  };
}

function erroParametroInvalido(): unknown {
  return {
    type: "about:blank",
    title: "Parâmetro inválido",
    status: 400,
    detail: "O parâmetro 'tipo' é inválido.",
    codigo: "parametro_invalido",
    erros: [{ campo: "tipo", mensagem: "valor fora do conjunto aceito" }],
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

/**
 * Instala um `fetch` único que roteia por prefixo de URL: `/api/v1/resumo`
 * sempre devolve um resumo válido (TP-0056/TP-0058 não são o foco destes
 * testes); `/api/v1/divergencias` delega para `aoChamarDivergencias`, que
 * recebe a URL completa (com query string) — permite inspecionar o `tipo`
 * efetivamente enviado e contar quantas vezes a listagem foi chamada.
 */
function instalarFetchMock(
  aoChamarDivergencias: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.startsWith("/api/v1/resumo")) {
      return respostaFake({ ok: true, json: () => Promise.resolve(resumoValido()) });
    }
    if (url.startsWith("/api/v1/divergencias")) {
      return aoChamarDivergencias(url);
    }
    return Promise.reject(new Error(`fetch não mockado para ${url}`));
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

/** Só as chamadas de `fetch` para `/api/v1/divergencias` (ignora o resumo). */
function chamadasDeDivergencias(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls
    .map((chamada) => String(chamada[0]))
    .filter((url) => url.startsWith("/api/v1/divergencias"));
}

function renderizar(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProvedorResumo>
        <Divergencias />
      </ProvedorResumo>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Divergencias — sucesso", () => {
  it("mostra o total no h1, a tabela e o caption com filtro/página", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-001", "duplicado")],
            total: 1,
            totalPaginas: 1,
          })),
      })),
    );

    renderizar();

    // Ajuste Modelo B (2026-10-08): total dentro do h1, contando
    // divergências (singular/plural) — no PC fica só para leitor de tela.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Divergências (1 divergência)" }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Fila de conciliação")).toHaveClass(
      "rotulo-pagina",
    );

    // Tabela (PC) e lista de cartões (celular) ficam no DOM, alternadas só
    // por CSS — cada link aparece duas vezes, ambos para a T2.
    const links = screen.getAllByRole("link", { name: "PED-001" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/pedido/PED-001");
      expect(link).toHaveClass("mono");
    }
    // Ajuste Modelo B (2026-10-08): rótulo da etiqueta "Pago duas vezes".
    expect(
      screen.getAllByText("Pago duas vezes", { selector: ".etiqueta" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Pagamento recebido em duplicidade"),
    ).toHaveLength(2);
    expect(screen.getAllByText("2 eventos ▸")).toHaveLength(2);

    const caption = screen.getByText("Filtro: Todos · página 1 de 1");
    expect(caption.tagName).toBe("CAPTION");

    // Colunas sem Devido/Pago (fora deste ciclo, ADR-016).
    const tabela = screen.getByRole("table");
    const cabecalhos = within(tabela)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(cabecalhos).toEqual(["Pedido", "Tipo", "Motivo", "Eventos"]);
    expect(
      screen.getByRole("region", { name: "Tabela de divergências" }),
    ).toBeInTheDocument();

    // Lista do celular: um cartão por divergência.
    const lista = screen.getByRole("list", { name: "Lista de divergências" });
    expect(within(lista).getAllByRole("listitem")[0]).toHaveClass(
      "divergencias__cartao",
    );
  });

  it("total no h1 com milhar e resumo da paginação 'início–fim de total'", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-001", "duplicado")],
            total: 8856,
            totalPaginas: 178,
          })),
      })),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Divergências (8.856 divergências)",
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("1–50 de 8.856")).toBeInTheDocument();
    expect(
      screen.getByText("Filtro: Todos · página 1 de 178"),
    ).toBeInTheDocument();
  });

  it("singular '1 evento ▸' quando há um só evento", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [
              {
                pedido: "PED-003",
                tipo: "entrega_atrasada",
                motivo: "6 dias depois da data limite",
                eventos: [
                  {
                    tipo: "entrega",
                    data: "2016-07-21T20:00:15.260Z",
                    fonte: "rastreio",
                    codigo: "RS-5521",
                  },
                ],
              },
            ],
          })),
      })),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getAllByText("1 evento ▸")).toHaveLength(2);
    });
  });

  it("expande os eventos dentro do <details> com data, sistema e tipo em português", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [
              {
                pedido: "PED-002",
                tipo: "parcial",
                motivo: "Faltam R$ 663,40",
                eventos: [
                  {
                    tipo: "pagamento",
                    data: "2016-07-21T20:00:15.260Z",
                    fonte: "pagamentos",
                    codigo: "TX-88812",
                  },
                  {
                    tipo: "transporte",
                    data: "2016-07-22",
                    fonte: "rastreio",
                    codigo: "RS-5521",
                  },
                ],
              },
            ],
          })),
      })),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getAllByText("2 eventos ▸")).toHaveLength(2);
    });

    fireEvent.click(screen.getAllByText("2 eventos ▸")[0]);

    const tabela = screen.getByRole("table");
    const detalhes = tabela.querySelector("details");
    expect(detalhes).not.toBeNull();

    const itens = Array.from(obrigatorio(detalhes).querySelectorAll("li")).map(
      (li) => li.textContent,
    );
    expect(itens).toEqual([
      "2016-07-21 · Pagamentos · Pagamento · TX-88812",
      "2016-07-22 · Transportadora · Em trânsito · RS-5521",
    ]);
    expect(within(detalhes as HTMLElement).getByText("TX-88812")).toHaveClass(
      "mono",
    );
    // RTP-0015: o anúncio "N de T divergências, página X de Y" volta, só para
    // leitor de tela (`visualmente-oculto`) dentro da região aria-live.
    expect(
      container.querySelector("p.visualmente-oculto"),
    ).toHaveTextContent(/divergências, página 1 de 1/);
  });
});

describe("Divergencias — filtro via URL e troca de chip", () => {
  it("usa ?tipo= inicial na chamada e atualiza a URL/chamada ao trocar de chip", async () => {
    const mock = instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-010", "duplicado")],
          })),
      })),
    );

    renderizar(["/?tipo=duplicado"]);

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.length).toBeGreaterThan(0);
      expect(chamadas[0]).toContain("tipo=duplicado");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes/ }),
      ).toBeChecked();
    });

    fireEvent.click(screen.getByRole("radio", { name: /Pagamento parcial/ }));

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.some((url) => url.includes("tipo=parcial"))).toBe(
        true,
      );
    });

    expect(
      screen.getByRole("radio", { name: /Pagamento parcial/ }),
    ).toBeChecked();
  });

  it("selecionar 'Todos' remove o parâmetro ?tipo= da URL (não escreve tipo=todos)", async () => {
    const mock = instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaDivergenciasValida()),
      })),
    );

    renderizar(["/?tipo=duplicado"]);

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes/ }),
      ).toBeChecked();
    });

    fireEvent.click(screen.getByRole("radio", { name: /^Todos/ }));

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      const ultima = chamadas[chamadas.length - 1];
      expect(ultima).not.toContain("tipo=");
      expect(ultima).not.toContain("tipo=todos");
    });
  });
});

describe("Divergencias — vazio", () => {
  it("sem itens mostra mensagem com o rótulo do filtro ativo", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.resolve(respostaDivergenciasValida({ dados: [], total: 0, totalPaginas: 0 })),
      })),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum pedido com divergência do tipo Todos."),
      ).toBeInTheDocument();
    });
  });
});

describe("Divergencias — vazio corrigível (tipo inválido na URL)", () => {
  it("mostra a mensagem e o link, sem chamar a API de divergências", async () => {
    const mock = instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaDivergenciasValida()) })),
    );

    renderizar(["/?tipo=inexistente"]);

    await waitFor(() => {
      expect(
        screen.getByText("O filtro do endereço não é válido."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Ver todas as divergências" }),
    ).toHaveAttribute("href", "/");

    expect(chamadasDeDivergencias(mock)).toHaveLength(0);
  });
});

describe("Divergencias — 400 real da API (parametro_invalido)", () => {
  it("trata igual ao tipo inválido na URL: mesma mensagem e link", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () => Promise.resolve(erroParametroInvalido()),
      })),
    );

    renderizar(["/?tipo=duplicado"]);

    await waitFor(() => {
      expect(
        screen.getByText("O filtro do endereço não é válido."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Ver todas as divergências" }),
    ).toHaveAttribute("href", "/");
  });
});

describe("Divergencias — erro 5xx/rede", () => {
  it("mostra mensagem de erro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    const chamadasAntes = chamadasDeDivergencias(mock).length;
    expect(chamadasAntes).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).length).toBeGreaterThan(
        chamadasAntes,
      );
    });
  });
});

describe("Divergencias — carregando", () => {
  it("expõe aria-busy='true' enquanto a consulta não resolve", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(
      container.querySelector("[aria-busy='true']"),
    ).toBeInTheDocument();
  });
});

describe("Divergencias — acessibilidade (vitest-axe)", () => {
  it("sucesso não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-900", "duplicado")],
          })),
      })),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: "PED-900" }).length,
      ).toBeGreaterThan(0);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({ dados: [], total: 0, totalPaginas: 0 })),
      })),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum pedido com divergência do tipo Todos."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio corrigível (tipo inválido na URL) não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaDivergenciasValida()) })),
    );

    const { container } = renderizar(["/?tipo=inexistente"]);

    await waitFor(() => {
      expect(
        screen.getByText("O filtro do endereço não é válido."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
