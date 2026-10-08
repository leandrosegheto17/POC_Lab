// TP-0064 — Tela T4 Qualidade dos dados: GET /api/v1/qualidade, 7
// `BlocoAchado` em ORDEM FIXA (independente da ordem do array devolvido
// pela API), seção de IA e os 4 estados.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { Qualidade } from "../src/paginas/Qualidade.tsx";

/** Exemplo concreto de achado, contra `EsquemaExemploAchado`. */
function exemplo(opcoes: {
  fonte: "vendas" | "pagamentos" | "rastreio";
  referencia: string;
  detalhe: string;
  pedido?: string;
}): unknown {
  return opcoes;
}

/** Achado de qualidade, contra `EsquemaAchado`. */
function achado(opcoes: {
  tipo: string;
  contagem: number;
  regra: string;
  exemplos?: unknown[];
}): unknown {
  return {
    tipo: opcoes.tipo,
    contagem: opcoes.contagem,
    regra: opcoes.regra,
    exemplos: opcoes.exemplos ?? [],
  };
}

/**
 * Resposta válida com os 7 tipos em ordem EMBARALHADA (a mesma ordem dos
 * literais de `TipoAchado` em `processamento/src/dominio/modelo.ts`, que é
 * DIFERENTE da ordem fixa de exibição do wireframe) — prova de que a página
 * reordena por `tipo`, nunca confia na posição do array recebido.
 */
function respostaQualidadeValida(opcoes?: {
  iaUtilizada?: boolean;
}): unknown {
  return {
    achados: [
      achado({
        tipo: "fora_de_ordem",
        contagem: 1,
        regra: "Eventos devem respeitar a ordem cronológica esperada.",
        exemplos: [
          exemplo({
            fonte: "rastreio",
            referencia: "EVT-900",
            detalhe: "Entrega registrada antes da postagem",
            pedido: "PED-900",
          }),
        ],
      }),
      achado({
        tipo: "sem_identificacao",
        contagem: 4,
        regra: "Pagamentos devem conter identificação do pedido de origem.",
        exemplos: [
          exemplo({
            fonte: "pagamentos",
            referencia: "PAG-100",
            detalhe: "Sem campo de referência ao pedido",
          }),
        ],
      }),
      achado({
        tipo: "registro_repetido",
        contagem: 0,
        regra: "Registros não devem se repetir para o mesmo pedido e evento.",
        exemplos: [],
      }),
      achado({
        tipo: "linha_invalida",
        contagem: 5,
        regra: "Linhas devem conter todos os campos obrigatórios.",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "LINHA-7",
            detalhe: "Campo 'valor' ausente",
          }),
        ],
      }),
      achado({
        tipo: "valor_fora_do_padrao",
        contagem: 2,
        regra: "Valores devem estar dentro da faixa esperada.",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "PED-050",
            detalhe: "Valor negativo",
            pedido: "PED-050",
          }),
        ],
      }),
      achado({
        tipo: "formato_data",
        contagem: 3,
        regra: "Datas devem estar no formato ISO 8601 (AAAA-MM-DD).",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "PED-010",
            detalhe: "Data '10/01/2026' fora do formato",
            pedido: "PED-010",
          }),
        ],
      }),
      achado({
        tipo: "pedido_sem_envio",
        contagem: 1,
        regra: "Pedidos pagos devem ter evento de envio correspondente.",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "PED-020",
            detalhe: "Pago há mais de 10 dias, sem envio",
            pedido: "PED-020",
          }),
        ],
      }),
    ],
    ia: { utilizada: opcoes?.iaUtilizada ?? false, sugestoes: [] },
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
  aoChamarQualidade: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.startsWith("/api/v1/qualidade")) {
      return aoChamarQualidade(url);
    }
    throw new Error(`fetch não mockado para ${url}`);
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function chamadas(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls.map((chamada) => String(chamada[0]));
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={["/qualidade"]}>
      <Qualidade />
    </MemoryRouter>,
  );
}

// Ordem fixa esperada de exibição (wireframe) — DIFERENTE da ordem do mock
// acima, que segue a ordem dos literais de `TipoAchado`.
const TITULOS_EM_ORDEM = [
  "Datas por formato",
  "Pedidos sem envio",
  "Valores fora do padrão",
  "Linhas rejeitadas",
  "Registros repetidos",
  "Pagamentos sem identificação",
  "Eventos fora de ordem",
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Qualidade — sucesso", () => {
  it("mostra os 7 BlocoAchado na ORDEM FIXA, não na ordem do array recebido", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Qualidade dos dados" }),
      ).toBeInTheDocument();
    });

    const titulosHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(titulosHeadings).toEqual([...TITULOS_EM_ORDEM, "Sugestões da IA"]);
  });

  it("cada exemplo mostra a EtiquetaFonte certa e link para /pedido/{pedido} quando houver", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("PED-010")).toBeInTheDocument();
    });

    // "Datas por formato" — exemplo tem `pedido`, logo é um link.
    const linkData = screen.getByRole("link", { name: "PED-010" });
    expect(linkData).toHaveAttribute("href", "/pedido/PED-010");

    const secaoDatas = screen
      .getByRole("heading", { level: 2, name: "Datas por formato" })
      .closest("section") as HTMLElement;
    expect(within(secaoDatas).getByText("Vendas")).toBeInTheDocument();

    // "Pagamentos sem identificação" — exemplo SEM `pedido`, referência é
    // texto simples, não link.
    const secaoSemIdentificacao = screen
      .getByRole("heading", {
        level: 2,
        name: "Pagamentos sem identificação",
      })
      .closest("section") as HTMLElement;
    expect(
      within(secaoSemIdentificacao).getByText("PAG-100"),
    ).toBeInTheDocument();
    expect(
      within(secaoSemIdentificacao).queryByRole("link", { name: "PAG-100" }),
    ).not.toBeInTheDocument();
  });

  it("achado com contagem 0 mostra a regra e 'Nenhum caso encontrado.', sem tabela", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Registros repetidos" }),
      ).toBeInTheDocument();
    });

    const secao = screen
      .getByRole("heading", { level: 2, name: "Registros repetidos" })
      .closest("section") as HTMLElement;

    expect(
      within(secao).getByText(
        "Regra: Registros não devem se repetir para o mesmo pedido e evento.",
      ),
    ).toBeInTheDocument();
    expect(within(secao).getByText("Nenhum caso encontrado.")).toBeInTheDocument();
    expect(within(secao).queryByRole("table")).not.toBeInTheDocument();
  });

  it("ia.utilizada === false mostra a mensagem fixa de IA não utilizada", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaQualidadeValida({ iaUtilizada: false }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText(
          'IA não utilizada nesta publicação: pagamentos ficaram "sem sugestão".',
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("Qualidade — erro 5xx/rede", () => {
  it("mostra mensagem de erro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    const chamadasAntes = chamadas(mock).length;
    expect(chamadasAntes).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => {
      expect(chamadas(mock).length).toBeGreaterThan(chamadasAntes);
    });
  });

  it("erro 5xx vindo da API também mostra 'Tentar de novo'", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: false,
        status: 500,
        json: async () => ({
          type: "about:blank",
          title: "Erro interno",
          status: 500,
          detail: "Falha ao gerar relatório.",
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

    expect(
      screen.getByRole("button", { name: "Tentar de novo" }),
    ).toBeInTheDocument();
  });
});

describe("Qualidade — carregando", () => {
  it("mostra 'Carregando relatório…' com aria-busy='true'", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Carregando relatório…")).toBeInTheDocument();
    expect(
      container.querySelector("[aria-busy='true']"),
    ).toBeInTheDocument();
  });
});

// TP-0085 — "Sugestões da IA": tabela com as 5 colunas quando há sugestões
// válidas, mensagem fixa quando não há (IA não utilizada OU sem itens
// válidos) e descarte silencioso de item malformado.
function sugestaoIa(opcoes: {
  pagamento: string;
  textoReferencia: string;
  pedidoSugerido: string;
  conferida: boolean;
  motivo: string;
}): unknown {
  return opcoes;
}

function respostaComSugestoes(sugestoes: unknown[]): unknown {
  const base = respostaQualidadeValida({ iaUtilizada: true }) as {
    achados: unknown[];
    ia: { utilizada: boolean; sugestoes: unknown[] };
  };
  return { ...base, ia: { utilizada: true, sugestoes } };
}

describe("Qualidade — Sugestões da IA (TP-0085)", () => {
  it("ia.utilizada === true com 2 sugestões válidas mostra a tabela com as 5 colunas", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaComSugestoes([
            sugestaoIa({
              pagamento: "PAG-100",
              textoReferencia: "ref pedido 100",
              pedidoSugerido: "PED-100",
              conferida: true,
              motivo: "Valor e data batem com o saldo em aberto.",
            }),
            sugestaoIa({
              pagamento: "PAG-200",
              textoReferencia: "ref pedido 200",
              pedidoSugerido: "PED-200",
              conferida: false,
              motivo: "Diferença de valor acima da tolerância.",
            }),
          ]),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("PAG-100")).toBeInTheDocument();
    });

    const secaoIa = screen
      .getByRole("heading", { level: 2, name: "Sugestões da IA" })
      .closest("section") as HTMLElement;

    expect(
      within(secaoIa).getByRole("columnheader", { name: "Pagamento" }),
    ).toBeInTheDocument();
    expect(
      within(secaoIa).getByRole("columnheader", {
        name: "Texto da referência",
      }),
    ).toBeInTheDocument();
    expect(
      within(secaoIa).getByRole("columnheader", { name: "Pedido sugerido" }),
    ).toBeInTheDocument();
    expect(
      within(secaoIa).getByRole("columnheader", { name: "Conferida?" }),
    ).toBeInTheDocument();
    expect(
      within(secaoIa).getByRole("columnheader", { name: "Motivo da regra" }),
    ).toBeInTheDocument();

    expect(within(secaoIa).getByText("ref pedido 100")).toBeInTheDocument();
    expect(
      within(secaoIa).getByText(
        "Valor e data batem com o saldo em aberto.",
      ),
    ).toBeInTheDocument();

    const linkPedido100 = within(secaoIa).getByRole("link", {
      name: "PED-100",
    });
    expect(linkPedido100).toHaveAttribute("href", "/pedido/PED-100");
    const linkPedido200 = within(secaoIa).getByRole("link", {
      name: "PED-200",
    });
    expect(linkPedido200).toHaveAttribute("href", "/pedido/PED-200");

    expect(within(secaoIa).getByText("Conferida")).toBeInTheDocument();
    expect(within(secaoIa).getByText("Não conferida")).toBeInTheDocument();
  });

  it("ia.utilizada === true com sugestoes: [] mostra a mensagem de 'sem sugestões'", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaComSugestoes([]),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText(
          'IA não utilizada nesta publicação: pagamentos ficaram "sem sugestão".',
        ),
      ).toBeInTheDocument();
    });

    const secaoIa = screen
      .getByRole("heading", { level: 2, name: "Sugestões da IA" })
      .closest("section") as HTMLElement;
    expect(within(secaoIa).queryByRole("table")).not.toBeInTheDocument();
  });

  it("ia.utilizada === false continua mostrando a mesma mensagem (regressão)", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaQualidadeValida({ iaUtilizada: false }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText(
          'IA não utilizada nesta publicação: pagamentos ficaram "sem sugestão".',
        ),
      ).toBeInTheDocument();
    });
  });

  it("item malformado (sem 'motivo') é descartado; o item válido continua aparecendo", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaComSugestoes([
            {
              pagamento: "PAG-900",
              textoReferencia: "ref malformada",
              pedidoSugerido: "PED-900",
              conferida: true,
              // motivo ausente de propósito
            },
            sugestaoIa({
              pagamento: "PAG-300",
              textoReferencia: "ref pedido 300",
              pedidoSugerido: "PED-300",
              conferida: true,
              motivo: "Candidato único com saldo compatível.",
            }),
          ]),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("PAG-300")).toBeInTheDocument();
    });

    expect(screen.queryByText("PAG-900")).not.toBeInTheDocument();
    expect(screen.queryByText("ref malformada")).not.toBeInTheDocument();
  });
});

describe("Qualidade — acessibilidade (vitest-axe)", () => {
  it("carregando não tem violações", async () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Carregando relatório…")).toBeInTheDocument();
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

  it("sucesso (achado com contagem 0 e achado com exemplos) não tem violações", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Registros repetidos" }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sucesso com tabela de Sugestões da IA preenchida não tem violações (TP-0085)", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () =>
          respostaComSugestoes([
            sugestaoIa({
              pagamento: "PAG-100",
              textoReferencia: "ref pedido 100",
              pedidoSugerido: "PED-100",
              conferida: true,
              motivo: "Valor e data batem com o saldo em aberto.",
            }),
            sugestaoIa({
              pagamento: "PAG-200",
              textoReferencia: "ref pedido 200",
              pedidoSugerido: "PED-200",
              conferida: false,
              motivo: "Diferença de valor acima da tolerância.",
            }),
          ]),
      }),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getByText("PAG-100")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
