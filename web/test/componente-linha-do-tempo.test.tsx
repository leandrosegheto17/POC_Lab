// TP-0061 / ajuste Modelo B (2026-10-08, mockup à risca) — `LinhaDoTempo`:
// região rolável com rótulo, `<ol>` com um `<li>` por data (ordem recebida),
// três células por data (Vendas | Pagamentos | Transportadora), cabeçalho
// `aria-hidden` com os códigos, cartão de evento com selo da fonte (celular)
// e fonte em texto oculto (PC), marcas "duplicado"/"fora de ordem"/"no
// prazo"/"atrasada", "depois da data escolhida" e `vitest-axe`.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { obrigatorio } from "./apoio/obrigatorio.js";
import { LinhaDoTempo } from "../src/componentes/LinhaDoTempo.tsx";
import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";

afterEach(cleanup);

function eventoVenda(overrides: Partial<EventoV1 & { tipo: "venda" }> = {}): EventoV1 {
  return {
    fonte: "vendas",
    codigoEvento: "10248",
    momentoFato: "2026-10-01T10:00:00.000Z",
    tipo: "venda",
    valor_devido: 150.5,
    data_limite: "2026-10-10T00:00:00.000Z",
    transportadora: "Transportadora X",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

function eventoPagamento(
  overrides: Partial<EventoV1 & { tipo: "pagamento" }> = {},
): EventoV1 {
  return {
    fonte: "pagamentos",
    codigoEvento: "TX-88812",
    momentoFato: "2026-10-02T10:00:00.000Z",
    tipo: "pagamento",
    valor: 150.5,
    referencia_original: "10248",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

function eventoColeta(overrides: Partial<EventoV1 & { tipo: "coleta" }> = {}): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-RS-000001",
    momentoFato: "2026-10-03T10:00:00.000Z",
    tipo: "coleta",
    transportadora: "Transportadora X",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

function eventoTransporte(
  overrides: Partial<EventoV1 & { tipo: "transporte" }> = {},
): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-RS-000002",
    momentoFato: "2026-10-04T10:00:00.000Z",
    tipo: "transporte",
    transportadora: "Transportadora X",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

function eventoEntrega(overrides: Partial<EventoV1 & { tipo: "entrega" }> = {}): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-RS-000003",
    momentoFato: "2026-10-05T10:00:00.000Z",
    tipo: "entrega",
    transportadora: "Transportadora X",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...overrides,
  };
}

function todosOsTipos(): EventoV1[] {
  return [
    eventoVenda(),
    eventoPagamento(),
    eventoColeta(),
    eventoTransporte(),
    eventoEntrega(),
  ];
}

function linhasDeData(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".linha-do-tempo__linha"),
  );
}

function cartoes(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".evento"));
}

describe("LinhaDoTempo — estrutura e ordem", () => {
  it("região rolável com rótulo e foco por teclado", () => {
    render(<LinhaDoTempo eventos={todosOsTipos()} />);

    const regiao = screen.getByRole("region", {
      name: "Linha do tempo por sistema",
    });
    expect(regiao).toHaveAttribute("tabindex", "0");
  });

  it("um <li> por data (AAAA-MM-DD), na ordem recebida, sem reordenar", () => {
    const eventos = [
      eventoVenda({ momentoFato: "2026-10-03T08:00:00.000Z" }),
      eventoPagamento({ momentoFato: "2026-10-01T08:00:00.000Z" }),
      eventoColeta({ momentoFato: "2026-10-03T12:00:00.000Z" }),
    ];
    const { container } = render(<LinhaDoTempo eventos={eventos} />);

    const lista = container.querySelector("ol.linha-do-tempo__datas");
    expect(lista).not.toBeNull();

    const datas = linhasDeData(container).map(
      (linha) => linha.querySelector(".linha-do-tempo__data")?.textContent,
    );
    // Ordem de primeira aparição; os dois eventos de 2026-10-03 ficam na
    // mesma linha.
    expect(datas).toEqual(["2026-10-03", "2026-10-01"]);
    expect(cartoes(obrigatorio(linhasDeData(container)[0], "primeira linha"))).toHaveLength(2);
  });

  it("cada evento vai para a célula do seu sistema", () => {
    const { container } = render(<LinhaDoTempo eventos={todosOsTipos()} />);

    for (const evento of cartoes(container)) {
      const celula = evento.closest(".linha-do-tempo__celula");
      expect(celula).toHaveAttribute(
        "data-coluna",
        evento.getAttribute("data-fonte"),
      );
    }
    // Três células por data, mesmo vazias (bordas da grade no PC).
    const primeiraLinha = obrigatorio(linhasDeData(container)[0], "primeira linha");
    expect(
      primeiraLinha.querySelectorAll(".linha-do-tempo__celula"),
    ).toHaveLength(3);
  });

  it("lista vazia renderiza <ol> sem datas, sem lançar", () => {
    const { container } = render(<LinhaDoTempo eventos={[]} />);

    expect(container.querySelector("ol.linha-do-tempo__datas")).not.toBeNull();
    expect(linhasDeData(container)).toHaveLength(0);
  });
});

describe("LinhaDoTempo — conteúdo dos cartões", () => {
  it("datas sempre em AAAA-MM-DD (nunca o ISO completo)", () => {
    const { container } = render(<LinhaDoTempo eventos={[eventoVenda()]} />);

    expect(container).not.toHaveTextContent("2026-10-01T10:00:00.000Z");
    // Célula de data (PC) + data do cartão (celular).
    expect(screen.getAllByText("2026-10-01")).toHaveLength(2);
  });

  it("venda: título 'Venda', valor no PC e '#código · valor' no celular", () => {
    const { container } = render(<LinhaDoTempo eventos={[eventoVenda()]} />);

    const cartao = obrigatorio(cartoes(container)[0], "cartão");
    expect(within(cartao).getByText("Venda")).toBeInTheDocument();
    expect(cartao.querySelector(".evento__linha--pc")).toHaveTextContent(
      /^R\$ 150,50$/,
    );
    expect(
      cartao.querySelector(".evento__linha--pc .mono"),
    ).toHaveTextContent(/^R\$ 150,50$/);
    expect(cartao.querySelector(".evento__linha--celular")).toHaveTextContent(
      "#10248 · R$ 150,50",
    );
    expect(cartao).not.toHaveTextContent("itens");
  });

  it("pagamento: código em mono + valor (PC e celular)", () => {
    const { container } = render(<LinhaDoTempo eventos={[eventoPagamento()]} />);

    const cartao = obrigatorio(cartoes(container)[0], "cartão");
    expect(within(cartao).getByText("Pagamento")).toBeInTheDocument();
    const linhaPc = cartao.querySelector(".evento__linha--pc");
    expect(linhaPc).toHaveTextContent("TX-88812 · R$ 150,50");
    expect(linhaPc?.querySelector(".mono")).toHaveTextContent("TX-88812");
    const monos = linhaPc?.querySelectorAll(".mono") ?? [];
    expect(monos).toHaveLength(2);
    expect(monos[1]).toHaveTextContent(/^R\$ 150,50$/);
    expect(cartao.querySelector(".evento__linha--celular")).toHaveTextContent(
      "TX-88812 · R$ 150,50",
    );
  });

  it("transportadora: 'Coleta', 'Em trânsito', 'Entrega'; sem linha no PC; codigo_rastreio no celular, nunca o EVT-RS", () => {
    const { container } = render(
      <LinhaDoTempo eventos={[eventoColeta(), eventoTransporte(), eventoEntrega()]} />,
    );

    expect(screen.getByText("Coleta")).toBeInTheDocument();
    expect(screen.getByText("Em trânsito")).toBeInTheDocument();
    expect(screen.getByText("Entrega")).toBeInTheDocument();

    for (const cartao of cartoes(container)) {
      expect(cartao.querySelector(".evento__linha--pc")).toBeNull();
      expect(
        cartao.querySelector(".evento__linha--celular"),
      ).toHaveTextContent(/^RS-5521$/);
    }
    expect(container).not.toHaveTextContent("EVT-RS");
  });

  it("selo da fonte (celular) e texto oculto 'fonte: …' (PC) em cada cartão", () => {
    const { container } = render(<LinhaDoTempo eventos={todosOsTipos()} />);

    const selos = container.querySelectorAll(".etiqueta-fonte--selo");
    expect(selos).toHaveLength(5);
    expect(
      container.querySelector('[data-fonte="pagamentos"] .etiqueta-fonte--selo'),
    ).toHaveClass("etiqueta-fonte--pagamentos");

    const ocultos = Array.from(
      container.querySelectorAll(".evento__fonte-oculta"),
    ).map((elemento) => elemento.textContent);
    expect(ocultos).toEqual([
      "fonte: Vendas, #10248",
      "fonte: Pagamentos",
      "fonte: Transportadora, RS-5521",
      "fonte: Transportadora, RS-5521",
      "fonte: Transportadora, RS-5521",
    ]);
    for (const elemento of container.querySelectorAll(".evento__fonte-oculta")) {
      expect(elemento).toHaveClass("visualmente-oculto");
    }
  });
});

describe("LinhaDoTempo — marcas no título", () => {
  it("'fora de ordem' (alerta) só quando chegouForaDeOrdem é true", () => {
    const { container } = render(
      <LinhaDoTempo
        eventos={[
          eventoVenda({ chegouForaDeOrdem: true }),
          eventoPagamento({ chegouForaDeOrdem: false }),
        ]}
      />,
    );

    const marcas = screen.getAllByText("chegou fora de ordem");
    expect(marcas).toHaveLength(1);
    expect(marcas[0]).toHaveAttribute("data-variante", "alerta");
    expect(obrigatorio(marcas[0], "marca").closest(".evento")).toBe(cartoes(container)[0]);
  });

  it("'duplicado' (ruim) e cartão vermelho só nos ids informados", () => {
    const { container } = render(
      <LinhaDoTempo
        eventos={[
          eventoPagamento({ codigoEvento: "TX-1" }),
          eventoPagamento({ codigoEvento: "TX-2" }),
        ]}
        idsDuplicados={["TX-2"]}
      />,
    );

    const lista = cartoes(container);
    const primeiro = obrigatorio(lista[0], "primeiro cartão");
    const segundo = obrigatorio(lista[1], "segundo cartão");
    expect(primeiro).not.toHaveClass("evento--ruim");
    expect(within(primeiro).queryByText("duplicado")).toBeNull();
    expect(segundo).toHaveClass("evento--ruim");
    expect(within(segundo).getByText("duplicado")).toHaveAttribute(
      "data-variante",
      "ruim",
    );
  });

  it("entrega até a data limite: 'no prazo' (ok)", () => {
    render(
      <LinhaDoTempo
        eventos={[eventoEntrega()]}
        dataLimite="2026-10-10T00:00:00.000Z"
      />,
    );

    expect(screen.getByText("no prazo")).toHaveAttribute("data-variante", "ok");
    expect(screen.queryByText("atrasada")).toBeNull();
  });

  it("entrega depois da data limite: 'atrasada' (neutra)", () => {
    render(
      <LinhaDoTempo
        eventos={[eventoEntrega()]}
        dataLimite="2026-10-01T00:00:00.000Z"
      />,
    );

    expect(screen.getByText("atrasada")).toHaveAttribute(
      "data-variante",
      "neutra",
    );
    expect(screen.queryByText("no prazo")).toBeNull();
  });

  it("sem data limite, a entrega não ganha marca de prazo", () => {
    render(<LinhaDoTempo eventos={[eventoEntrega()]} />);

    expect(screen.queryByText("no prazo")).toBeNull();
    expect(screen.queryByText("atrasada")).toBeNull();
  });
});

describe("LinhaDoTempo — depois da data escolhida", () => {
  it("evento posterior fica atenuado e troca a linha de código pelo texto", () => {
    const { container } = render(
      <LinhaDoTempo
        eventos={[eventoVenda(), eventoPagamento()]}
        dataEscolhida="2026-10-01T23:59:59.999Z"
      />,
    );

    const lista = cartoes(container);
    const venda = obrigatorio(lista[0], "cartão de venda");
    const pagamento = obrigatorio(lista[1], "cartão de pagamento");
    expect(venda).not.toHaveClass("evento--depois");
    expect(pagamento).toHaveClass("evento--depois");
    expect(pagamento).toHaveTextContent("depois da data escolhida");
    expect(pagamento.querySelector(".evento__linha--pc")).toBeNull();
    expect(pagamento.querySelector(".evento__linha--celular")).toBeNull();
    expect(screen.getAllByText("depois da data escolhida")).toHaveLength(1);
  });
});

describe("LinhaDoTempo — cabeçalho de colunas", () => {
  it("títulos e códigos de cada sistema, tudo aria-hidden", () => {
    const { container } = render(
      <LinhaDoTempo
        eventos={[
          ...todosOsTipos(),
          eventoPagamento({ codigoEvento: "TX-88813" }),
        ]}
        codigoVendas="10248"
      />,
    );

    const cabecalho = container.querySelector(".linha-do-tempo__cabecalho");
    expect(cabecalho).toHaveAttribute("aria-hidden", "true");

    const celulas = Array.from(
      cabecalho?.querySelectorAll(".linha-do-tempo__cabecalho-celula") ?? [],
    );
    expect(celulas.map((celula) => celula.firstChild?.textContent)).toEqual([
      "Data",
      "Vendas",
      "Pagamentos",
      "Transportadora",
    ]);

    const codigos = Array.from(
      cabecalho?.querySelectorAll(".linha-do-tempo__cabecalho-codigo") ?? [],
    ).map((elemento) => elemento.textContent);
    expect(codigos).toEqual(["#10248", "TX-88812 · TX-88813", "RS-5521"]);
  });
});

describe("LinhaDoTempo — acessibilidade (vitest-axe)", () => {
  it("cobrindo os 5 tipos, marcas e data escolhida: sem violações", async () => {
    const { container } = render(
      <LinhaDoTempo
        eventos={[
          ...todosOsTipos(),
          eventoPagamento({ codigoEvento: "TX-88813", chegouForaDeOrdem: true }),
        ]}
        codigoVendas="10248"
        dataLimite="2026-10-10T00:00:00.000Z"
        idsDuplicados={["TX-88813"]}
        dataEscolhida="2026-10-03"
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
