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

/**
 * Ajuste Modelo B (2026-10-08): a página renderiza a forma PC e a forma do
 * celular e alterna só por CSS (jsdom não aplica o CSS, então as duas estão
 * no DOM). Os testes consultam cada forma pelo seu contêiner.
 */
function formaPc(): HTMLElement {
  const elemento = document.querySelector(".qualidade__pc");
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("forma PC (.qualidade__pc) não encontrada");
  }
  return elemento;
}

function formaCelular(): HTMLElement {
  const elemento = document.querySelector(".qualidade__celular");
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("forma do celular (.qualidade__celular) não encontrada");
  }
  return elemento;
}

/** Seção (cartão) da forma PC cujo h2 tem o nome dado. */
function secaoPc(nome: string): HTMLElement {
  return within(formaPc())
    .getByRole("heading", { level: 2, name: nome })
    .closest("section") as HTMLElement;
}

/** `<details>` da forma do celular cujo h2 (dentro do summary) tem o nome dado. */
function detalhesCelular(nome: string): HTMLDetailsElement {
  return within(formaCelular())
    .getByRole("heading", { level: 2, name: nome })
    .closest("details") as HTMLDetailsElement;
}

// Ordem fixa esperada de exibição (wireframe) — DIFERENTE da ordem do mock
// acima, que segue a ordem dos literais de `TipoAchado`.
const TITULOS_EM_ORDEM = [
  "Datas em dois formatos",
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
      expect(formaPc()).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Qualidade dos dados" }),
    ).toBeInTheDocument();

    const titulosPc = within(formaPc())
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(titulosPc).toEqual([...TITULOS_EM_ORDEM, "Sugestões da IA"]);

    // Celular: a mesma ordem, cada título num <h2> dentro do <summary>.
    const titulosCelular = within(formaCelular())
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(titulosCelular).toEqual([...TITULOS_EM_ORDEM, "Sugestões da IA"]);
  });

  it("topo: rótulo da página (PC) e subtítulo (celular)", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    expect(screen.getByText("Problemas do dado, não do pedido")).toHaveClass(
      "rotulo-pagina",
    );
    expect(screen.getByText("Problemas do dado, não do pedido.")).toHaveClass(
      "qualidade__subtitulo",
    );
  });

  it("PC: 7 mini-cartões-âncora em 'Tipos de achado', com contagem e o primeiro selecionado", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("navigation", { name: "Tipos de achado" }),
      ).toBeInTheDocument();
    });

    const nav = screen.getByRole("navigation", { name: "Tipos de achado" });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(7);
    expect(links[0]).toHaveAttribute("href", "#achado-formato_data");
    expect(links[0]).toHaveTextContent("Datas em dois formatos3");
    expect(links[3]).toHaveAttribute("href", "#achado-linha_invalida");
    expect(links[3]).toHaveTextContent("Linhas rejeitadas5");

    // Sem fragmento na URL, o primeiro é o atual.
    expect(links[0]).toHaveAttribute("aria-current", "true");
    expect(links[0]).toHaveClass("qualidade__tipo--atual");
    links.slice(1).forEach((link) =>
      expect(link).not.toHaveAttribute("aria-current"),
    );

    // Cada âncora aponta para o cartão do achado.
    expect(
      document.getElementById("achado-formato_data"),
    ).toContainElement(
      within(formaPc()).getByRole("heading", {
        level: 2,
        name: "Datas em dois formatos",
      }),
    );

    // Clicar noutro mini-cartão move a seleção.
    fireEvent.click(links[2]);
    expect(links[2]).toHaveAttribute("aria-current", "true");
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("PC: o fragmento da URL define o mini-cartão selecionado", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    render(
      <MemoryRouter initialEntries={["/qualidade#achado-fora_de_ordem"]}>
        <Qualidade />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("navigation", { name: "Tipos de achado" }),
      ).toBeInTheDocument();
    });

    const atuais = within(
      screen.getByRole("navigation", { name: "Tipos de achado" }),
    )
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "true");
    expect(atuais).toHaveLength(1);
    expect(atuais[0]).toHaveAttribute("href", "#achado-fora_de_ordem");
  });

  it("PC: contagem com milhar ao lado do título e regra na caixa de fórmula", async () => {
    const resposta = respostaQualidadeValida() as {
      achados: Array<{ tipo: string; contagem: number }>;
    };
    resposta.achados.find((a) => a.tipo === "formato_data")!.contagem = 15452;
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => resposta }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    const secao = secaoPc("Datas em dois formatos");
    expect(secao).toHaveClass("cartao");
    expect(secao).toHaveAttribute("id", "achado-formato_data");
    expect(within(secao).getByText("15.452")).toHaveClass("mono");
    expect(
      within(secao).getByText(
        "Regra: Datas devem estar no formato ISO 8601 (AAAA-MM-DD).",
      ),
    ).toHaveClass("caixa-formula");
  });

  it("PC: exemplos com Fonte em texto, Referência em mono (link quando há pedido, '#' em vendas numéricas) e Detalhe", async () => {
    const resposta = respostaQualidadeValida() as {
      achados: Array<{ tipo: string; exemplos: unknown[] }>;
    };
    resposta.achados.find((a) => a.tipo === "linha_invalida")!.exemplos = [
      exemplo({
        fonte: "vendas",
        referencia: "11078",
        detalhe: "Campo 'valor' ausente",
      }),
    ];
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => resposta }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    // "Datas em dois formatos" — exemplo tem `pedido`, logo é um link mono.
    const secaoDatas = secaoPc("Datas em dois formatos");
    const linkData = within(secaoDatas).getByRole("link", { name: "PED-010" });
    expect(linkData).toHaveAttribute("href", "/pedido/PED-010");
    expect(linkData).toHaveClass("mono");
    // Fonte em texto simples (sem pílula).
    const celulaFonte = within(secaoDatas).getByText("Vendas");
    expect(celulaFonte.tagName).toBe("TD");
    expect(
      within(secaoDatas).getByText("Data '10/01/2026' fora do formato"),
    ).toBeInTheDocument();
    // Colunas: Fonte | Referência | Detalhe.
    expect(
      within(secaoDatas)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Fonte", "Referência", "Detalhe"]);

    // "Pagamentos sem identificação" — exemplo SEM `pedido`, referência é
    // texto simples, não link.
    const secaoSemIdentificacao = secaoPc("Pagamentos sem identificação");
    expect(within(secaoSemIdentificacao).getByText("PAG-100")).toHaveClass(
      "mono",
    );
    expect(
      within(secaoSemIdentificacao).queryByRole("link", { name: "PAG-100" }),
    ).not.toBeInTheDocument();
    expect(
      within(secaoSemIdentificacao).getByText("Pagamentos"),
    ).toBeInTheDocument();

    // Vendas com referência numérica ganha o prefixo "#".
    expect(
      within(secaoPc("Linhas rejeitadas")).getByText("#11078"),
    ).toBeInTheDocument();
  });

  it("achado com contagem 0 mostra a regra e 'Nenhum caso encontrado.', sem tabela", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    const secao = secaoPc("Registros repetidos");

    expect(
      within(secao).getByText(
        "Regra: Registros não devem se repetir para o mesmo pedido e evento.",
      ),
    ).toBeInTheDocument();
    expect(within(secao).getByText("Nenhum caso encontrado.")).toBeInTheDocument();
    expect(within(secao).queryByRole("table")).not.toBeInTheDocument();

    const detalhes = detalhesCelular("Registros repetidos");
    expect(within(detalhes).getByText("Nenhum caso encontrado.")).toBeInTheDocument();
    expect(within(detalhes).queryByRole("list")).not.toBeInTheDocument();
  });

  it("celular: um <details> por achado (o primeiro aberto), h2 no summary, contagem, regra e exemplos em linhas", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaCelular()).toBeInTheDocument();
    });

    const todos = formaCelular().querySelectorAll("details");
    // 7 achados + Sugestões da IA.
    expect(todos).toHaveLength(8);
    expect(todos[0].open).toBe(true);
    Array.from(todos)
      .slice(1)
      .forEach((detalhes) => expect(detalhes.open).toBe(false));

    const datas = detalhesCelular("Datas em dois formatos");
    const resumo = datas.querySelector("summary") as HTMLElement;
    expect(resumo.querySelector("h2")?.textContent).toBe(
      "Datas em dois formatos",
    );
    expect(resumo).toHaveTextContent("3");
    expect(
      within(datas).getByText(
        "Regra: Datas devem estar no formato ISO 8601 (AAAA-MM-DD).",
      ),
    ).toHaveClass("caixa-formula");
    const link = within(datas).getByText("PED-010");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/pedido/PED-010");
    expect(
      within(datas).getByText("Data '10/01/2026' fora do formato"),
    ).toHaveClass("achado-celular__detalhe");
    // Sem tabela no celular.
    expect(datas.querySelector("table")).toBeNull();
  });

  it("ia.utilizada === false mostra a mensagem fixa de IA não utilizada (PC e celular, na caixa de regra)", async () => {
    instalarFetchMock(async () =>
      respostaFake({
        ok: true,
        json: async () => respostaQualidadeValida({ iaUtilizada: false }),
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    const mensagem =
      'IA não utilizada nesta publicação: pagamentos ficaram "sem sugestão".';
    expect(within(secaoPc("Sugestões da IA")).getByText(mensagem)).toHaveClass(
      "caixa-formula",
    );
    expect(
      within(detalhesCelular("Sugestões da IA")).getByText(mensagem),
    ).toHaveClass("caixa-formula");
  });

  it("Sugestões da IA (PC): cartão tracejado, aviso 'À parte' e sem selo 'opcional'", async () => {
    instalarFetchMock(async () =>
      respostaFake({ ok: true, json: async () => respostaQualidadeValida() }),
    );

    renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    const secaoIa = secaoPc("Sugestões da IA");
    expect(secaoIa).toHaveClass("cartao", "qualidade-ia");
    expect(
      within(secaoIa).getByText("À parte: não entram nos indicadores"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/opcional/i)).not.toBeInTheDocument();
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
      expect(formaPc()).toBeInTheDocument();
    });

    const secaoIa = secaoPc("Sugestões da IA");

    // "PAG-100" também aparece no exemplo da seção "Pagamentos sem
    // identificação" da mesma fixture — escopar a esta seção evita
    // ambiguidade (`within`, não `screen`).
    expect(within(secaoIa).getByText("PAG-100")).toHaveClass("mono");
    expect(
      within(secaoIa).getByRole("region", { name: "Sugestões da IA" }),
    ).toBeInTheDocument();
    expect(
      within(secaoIa).getByText(
        "A IA sugere o pedido de um pagamento com referência vaga. Uma regra confere valor e data; se não bater, a sugestão é rejeitada.",
      ),
    ).toHaveClass("caixa-formula");

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

    // Texto da referência entre aspas.
    expect(within(secaoIa).getByText('"ref pedido 100"')).toBeInTheDocument();
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

    // "Conferida?" como EtiquetaEstado: Aceita (ok) / Rejeitada (ruim).
    const aceita = within(secaoIa).getByText("Aceita");
    expect(aceita).toHaveClass("etiqueta", "etiqueta--ok");
    const rejeitada = within(secaoIa).getByText("Rejeitada");
    expect(rejeitada).toHaveClass("etiqueta", "etiqueta--ruim");

    // Celular: linhas "pagamento → pedido" + etiqueta, sem tabela.
    const detalhesIa = detalhesCelular("Sugestões da IA");
    expect(detalhesIa).toHaveClass("achado-celular--tracejado");
    expect(detalhesIa.querySelector("table")).toBeNull();
    expect(
      within(detalhesIa).getByText(
        "Não entram nos indicadores. Uma regra confere valor e data de cada sugestão.",
      ),
    ).toHaveClass("caixa-formula");
    // `querySelectorAll` (não `getAllByRole`): o <details> começa fechado.
    const linhas = Array.from(
      detalhesIa.querySelectorAll<HTMLElement>("li"),
    );
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent("PAG-100 → PED-100");
    expect(within(linhas[0]).getByText("PED-100")).toHaveAttribute(
      "href",
      "/pedido/PED-100",
    );
    expect(within(linhas[0]).getByText("Aceita")).toHaveClass("etiqueta--ok");
    expect(within(linhas[1]).getByText("Rejeitada")).toHaveClass(
      "etiqueta--ruim",
    );
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
      expect(formaPc()).toBeInTheDocument();
    });

    const secaoIa = secaoPc("Sugestões da IA");
    expect(
      within(secaoIa).getByText(
        'IA não utilizada nesta publicação: pagamentos ficaram "sem sugestão".',
      ),
    ).toBeInTheDocument();
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
      expect(formaPc()).toBeInTheDocument();
    });

    expect(
      screen.getAllByText(
        'IA não utilizada nesta publicação: pagamentos ficaram "sem sugestão".',
      ),
    ).toHaveLength(2);
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
      expect(formaPc()).toBeInTheDocument();
    });

    // Válido aparece nas duas formas (tabela no PC, linha no celular).
    expect(
      within(secaoPc("Sugestões da IA")).getByText("PAG-300"),
    ).toBeInTheDocument();
    expect(
      within(detalhesCelular("Sugestões da IA")).getByText("PAG-300"),
    ).toBeInTheDocument();

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
      expect(formaPc()).toBeInTheDocument();
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
      expect(formaPc()).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
