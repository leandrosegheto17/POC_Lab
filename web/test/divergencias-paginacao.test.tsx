// TP-0060 — Tela T1 Divergências: paginação na URL (`?pagina=`), reset de
// página ao trocar filtro, foco no `<caption>` ao trocar de página (sem
// afetar o foco no `<h1>` da troca de rota), botões de `Paginacao` com
// `aria-disabled` (nunca `disabled` nativo) durante a carga, cancelamento de
// chamada superada e os casos de borda "página além da última"/"pagina"
// inválida na URL. Arquivo NOVO e separado de `divergencias.test.tsx`
// (TP-0059) — não edita nem duplica a suíte existente.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { axe } from "vitest-axe";
import { ProvedorResumo } from "../src/dados/contexto-resumo.tsx";
import { Divergencias } from "../src/paginas/Divergencias.tsx";

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
    ],
  };
}

function respostaDivergenciasValida(opcoes?: {
  dados?: unknown[];
  pagina?: number;
  total?: number;
  totalPaginas?: number;
}): unknown {
  const dados = opcoes?.dados ?? [divergenciaValida("PED-001", "duplicado")];
  return {
    dados,
    paginacao: {
      pagina: opcoes?.pagina ?? 1,
      tamanho: 50,
      total: opcoes?.total ?? dados.length,
      totalPaginas: opcoes?.totalPaginas ?? 1,
    },
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
 * sempre devolve um resumo válido; `/api/v1/divergencias` delega para
 * `aoChamarDivergencias`, que recebe a URL completa (com query string).
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

function paginaDaUrl(url: string): number {
  const correspondencia = /pagina=(\d+)/.exec(url);
  return correspondencia ? Number(correspondencia[1]) : 1;
}

/** Escopa consultas de role ao bloco `.paginacao-completa` de `Paginacao`
 * (mesmo padrão de `componentes.test.tsx`), evitando ambiguidade com os
 * botões duplicados em `.paginacao-compacta` (alternados só por CSS). */
function formaCompleta(container: HTMLElement) {
  const bloco = container.querySelector(".paginacao-completa");
  if (!bloco) {
    throw new Error("Bloco .paginacao-completa não encontrado");
  }
  return within(bloco as HTMLElement);
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

/**
 * Botões ocultos que disparam `navigate(destino)` via `useNavigate()` do
 * router "clássico" (`MemoryRouter`), usados só para forçar duas trocas de
 * URL em sequência rápida (antes da 1ª resposta chegar) sem passar pelo
 * roteador de dados (`createMemoryRouter`/`RouterProvider`). Evitamos o
 * roteador de dados aqui porque `router.navigate()` programático aciona,
 * neste ambiente (jsdom + `Request`/`fetch` nativo do Node via undici), um
 * bug de incompatibilidade conhecido — `new Request(url, { signal })`
 * rejeita o `AbortSignal` do `AbortController` do jsdom
 * ("Expected signal to be an instance of AbortSignal") — totalmente
 * independente do código da aplicação (reproduzível com `new
 * AbortController()` + `new Request()` "puros", fora de qualquer tela).
 */
function BotoesDeNavegacaoParaTeste({ destinos }: { destinos: string[] }) {
  const navigate = useNavigate();
  return (
    <>
      {destinos.map((destino) => (
        <button key={destino} type="button" onClick={() => {
            void navigate(destino);
          }}>
          {`ir para ${destino}`}
        </button>
      ))}
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Divergencias — paginação via URL (?pagina=)", () => {
  it("usa ?pagina= inicial na chamada, no caption e no <title>", async () => {
    const mock = instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-100", "duplicado")],
            pagina,
            total: 120,
            totalPaginas: 3,
          })),
      }));
    });

    renderizar(["/?pagina=2"]);

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.length).toBeGreaterThan(0);
      expect(chamadas[0]).toContain("pagina=2");
    });

    await waitFor(() => {
      const caption = screen.getByText(
        "Filtro: Todos · página 2 de 3",
      );
      expect(caption.tagName).toBe("CAPTION");
    });

    expect(document.title).toBe("Divergências, página 2 — POC_Lab");
  });

  it("clicar em 'Próxima' atualiza a URL e chama a página 2", async () => {
    const mock = instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida(`PED-${String(pagina)}`, "duplicado")],
            pagina,
            total: 100,
            totalPaginas: 2,
          })),
      }));
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.some((url) => url.includes("pagina=2"))).toBe(true);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 2 de 2"),
      ).toBeInTheDocument();
    });

    // Ajuste Modelo B (2026-10-08): resumo "início–fim de total" dentro da
    // paginação (substitui o antigo <p> "50 de 100 divergências…").
    expect(screen.getByText("51–100 de 100")).toBeInTheDocument();
  });

  it("trocar o filtro enquanto em ?pagina=3 reseta a página para 1 numa única navegação", async () => {
    const mock = instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-X", "duplicado")],
            pagina,
            total: 150,
            totalPaginas: 3,
          })),
      }));
    });

    renderizar(["/?pagina=3"]);

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).some((url) => url.includes("pagina=3"))).toBe(
        true,
      );
    });

    fireEvent.click(screen.getByRole("radio", { name: /Pagamento parcial/ }));

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      const ultima = chamadas[chamadas.length - 1];
      expect(ultima).toContain("tipo=parcial");
      expect(ultima).not.toContain("pagina=3");
    });

    // Uma única navegação: nenhuma chamada intermediária com tipo=parcial e
    // pagina=3 (o que indicaria duas atualizações de searchParams em
    // sequência em vez de uma).
    const chamadas = chamadasDeDivergencias(mock);
    expect(
      chamadas.some((url) => url.includes("tipo=parcial") && url.includes("pagina=3")),
    ).toBe(false);
  });

  it("durante a troca de página os botões de Paginacao ficam aria-disabled mas continuam no DOM e focáveis", async () => {
    let liberarSegundaChamada = null as (() => void) | null;

    const mock = instalarFetchMock(async (url) => {
      const pagina = paginaDaUrl(url);
      if (pagina === 2) {
        await new Promise<void>((resolve) => {
          liberarSegundaChamada = resolve;
        });
      }
      return respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida(`PED-${String(pagina)}`, "duplicado")],
            pagina,
            total: 100,
            totalPaginas: 2,
          })),
      });
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    const botaoProxima = formaCompleta(container).getByRole("button", {
      name: "Próxima",
    });
    fireEvent.click(botaoProxima);

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).some((url) => url.includes("pagina=2"))).toBe(
        true,
      );
    });

    await waitFor(() => {
      expect(botaoProxima).toHaveAttribute("aria-disabled", "true");
    });
    expect(botaoProxima).not.toHaveAttribute("disabled");
    expect(botaoProxima).toBeInTheDocument();
    // continua focável (sem `disabled` nativo) mesmo desabilitado visualmente.
    botaoProxima.focus();
    expect(document.activeElement).toBe(botaoProxima);

    expect(chamadasDeDivergencias(mock)).toHaveLength(2);
    liberarSegundaChamada?.();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 2 de 2"),
      ).toBeInTheDocument();
    });
  });

  it("ao trocar de página o foco vai ao caption e a região aria-live anuncia 'página X de Y' (RTP-0015)", async () => {
    instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida(`PED-${String(pagina)}`, "duplicado")],
            pagina,
            total: 100,
            totalPaginas: 2,
          })),
      }));
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      const caption = screen.getByText("Filtro: Todos · página 2 de 2");
      expect(document.activeElement).toBe(caption);
    });

    const regiaoViva = container.querySelector("[aria-live='polite']");
    expect(regiaoViva).toHaveTextContent("1 de 100 divergências, página 2 de 2");
  });

  it("troca rápida de página (2 navegações antes da 1ª resposta): só a resposta mais recente é aplicada", async () => {
    // Dispara as duas navegações via botões ocultos com `useNavigate()` do
    // router clássico (em vez de clicar duas vezes no botão "Próxima" de
    // `Paginacao`): o próprio `Paginacao` já bloqueia um segundo clique com
    // `aria-disabled`/guarda no `onClick` enquanto `carregando` for `true`
    // — então o duplo clique normal pelo usuário NUNCA alcança esta race
    // (comportamento correto, testado no teste anterior). A race genuína
    // (ex.: navegação programática rápida, ou duas abas/eventos de
    // histórico) é no `useConsulta`/efeito de paginação, exercitada aqui
    // via `useNavigate()` (ver `BotoesDeNavegacaoParaTeste` para o motivo
    // de não usar o roteador de dados/`router.navigate()` aqui).
    const resolvers = new Map<number, (resposta: Response) => void>();

    const mock = instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return new Promise<Response>((resolve) => {
        resolvers.set(pagina, resolve);
      });
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <ProvedorResumo>
          <Divergencias />
        </ProvedorResumo>
        <BotoesDeNavegacaoParaTeste destinos={["/?pagina=2", "/?pagina=3"]} />
      </MemoryRouter>,
    );

    // Resolve a página 1 (chamada inicial) imediatamente.
    await waitFor(() => {
      expect(resolvers.has(1)).toBe(true);
    });
    resolvers.get(1)?.(
      respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-1", "duplicado")],
            pagina: 1,
            total: 150,
            totalPaginas: 3,
          })),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 3"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "ir para /?pagina=2" }));
    fireEvent.click(screen.getByRole("button", { name: "ir para /?pagina=3" }));

    await waitFor(() => {
      expect(resolvers.has(2)).toBe(true);
      expect(resolvers.has(3)).toBe(true);
    });

    expect(chamadasDeDivergencias(mock)).toHaveLength(3);

    // Resolve fora de ordem: página 3 primeiro, depois página 2 (tardia).
    resolvers.get(3)?.(
      respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-3", "duplicado")],
            pagina: 3,
            total: 150,
            totalPaginas: 3,
          })),
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 3 de 3"),
      ).toBeInTheDocument();
    });

    resolvers.get(2)?.(
      respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-2", "duplicado")],
            pagina: 2,
            total: 150,
            totalPaginas: 3,
          })),
      }),
    );

    // A resposta tardia da página 2 nunca deve sobrescrever a página 3.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      screen.getByText("Filtro: Todos · página 3 de 3"),
    ).toBeInTheDocument();
  });

  it("página além da última mostra 'Esta página não existe.' com link para a página 1", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [],
            pagina: 999,
            total: 42,
            totalPaginas: 3,
          })),
      })),
    );

    renderizar(["/?pagina=999&tipo=duplicado"]);

    await waitFor(() => {
      expect(screen.getByText("Esta página não existe.")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Ir para a página 1" }),
    ).toHaveAttribute("href", "/?tipo=duplicado");
  });

  it.each(["abc", "0", "-5"])(
    "?pagina=%s é tratada como filtro de endereço inválido, sem chamar a API",
    async (valorInvalido) => {
      const mock = instalarFetchMock(() =>
        Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(respostaDivergenciasValida()) })),
      );

      renderizar([`/?pagina=${valorInvalido}`]);

      await waitFor(() => {
        expect(
          screen.getByText("O filtro do endereço não é válido."),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("link", { name: "Ver todas as divergências" }),
      ).toHaveAttribute("href", "/");

      expect(chamadasDeDivergencias(mock)).toHaveLength(0);
    },
  );
});

describe("Divergencias — paginação e acessibilidade (vitest-axe)", () => {
  it("sucesso na página 2 não tem violações", async () => {
    instalarFetchMock((url) => {
      const pagina = paginaDaUrl(url);
      return Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida("PED-200", "duplicado")],
            pagina,
            total: 100,
            totalPaginas: 2,
          })),
      }));
    });

    const { container } = renderizar(["/?pagina=2"]);

    await waitFor(() => {
      // Tabela (PC) e lista (celular) ficam no DOM, alternadas por CSS.
      expect(screen.getAllByText("PED-200").length).toBeGreaterThan(0);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("'página não existe' não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [],
            pagina: 999,
            total: 10,
            totalPaginas: 1,
          })),
      })),
    );

    const { container } = renderizar(["/?pagina=999"]);

    await waitFor(() => {
      expect(screen.getByText("Esta página não existe.")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("carregando a próxima página com botões aria-disabled não tem violações", async () => {
    let liberarSegundaChamada = null as (() => void) | null;

    instalarFetchMock(async (url) => {
      const pagina = paginaDaUrl(url);
      if (pagina === 2) {
        await new Promise<void>((resolve) => {
          liberarSegundaChamada = resolve;
        });
      }
      return respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaDivergenciasValida({
            dados: [divergenciaValida(`PED-${String(pagina)}`, "duplicado")],
            pagina,
            total: 100,
            totalPaginas: 2,
          })),
      });
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      const botaoProxima = formaCompleta(container).getByRole("button", {
        name: "Próxima",
      });
      expect(botaoProxima).toHaveAttribute("aria-disabled", "true");
    });

    expect(await axe(container)).toHaveNoViolations();

    liberarSegundaChamada?.();
    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 2 de 2"),
      ).toBeInTheDocument();
    });
  });
});
