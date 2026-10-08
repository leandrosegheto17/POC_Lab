// TP-0061 — `LinhaDoTempo`: `<ol>` na ordem recebida, item com data/tipo/
// `EtiquetaFonte`/código/valor em mono, "chegou fora de ordem" em texto,
// cabeçalho de colunas `aria-hidden`, lista vazia sem lançar e `vitest-axe`
// sem violação cobrindo os 5 tipos.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { LinhaDoTempo } from "../src/componentes/LinhaDoTempo.tsx";
import type { EventoV1 } from "processamento/contrato/linha-do-tempo-v1.js";

const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// `Intl.NumberFormat('pt-BR', { style: 'currency' })` separa "R$" do valor
// com um espaço não separável (U+00A0), não um espaço comum. O normalizador
// padrão do Testing Library colapsa esse caractere para um espaço comum ao
// ler o texto do DOM, mas NÃO normaliza a string do matcher — por isso
// comparar direto contra `FORMATADOR_MOEDA.format(...)` nunca bate. Esta
// função aplica a mesma normalização ao texto esperado antes da asserção.
function textoMoedaNormalizado(valor: number): string {
  return FORMATADOR_MOEDA.format(valor).replace(/\s+/g, " ");
}

function eventoVenda(overrides: Partial<EventoV1 & { tipo: "venda" }> = {}): EventoV1 {
  return {
    fonte: "vendas",
    codigoEvento: "venda-001",
    momentoFato: "2026-10-01T10:00:00.000Z",
    tipo: "venda",
    valor_devido: 150.5,
    data_limite: "2026-10-10T00:00:00.000Z",
    transportadora: "Transportadora X",
    chegouForaDeOrdem: false,
    ...overrides,
  } as EventoV1;
}

function eventoPagamento(
  overrides: Partial<EventoV1 & { tipo: "pagamento" }> = {},
): EventoV1 {
  return {
    fonte: "pagamentos",
    codigoEvento: "pagamento-001",
    momentoFato: "2026-10-02T10:00:00.000Z",
    tipo: "pagamento",
    valor: 150.5,
    referencia_original: "venda-001",
    chegouForaDeOrdem: false,
    ...overrides,
  } as EventoV1;
}

function eventoColeta(overrides: Partial<EventoV1 & { tipo: "coleta" }> = {}): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "coleta-001",
    momentoFato: "2026-10-03T10:00:00.000Z",
    tipo: "coleta",
    transportadora: "Transportadora X",
    codigo_rastreio: "BR123456789",
    chegouForaDeOrdem: false,
    ...overrides,
  } as EventoV1;
}

function eventoTransporte(
  overrides: Partial<EventoV1 & { tipo: "transporte" }> = {},
): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "transporte-001",
    momentoFato: "2026-10-04T10:00:00.000Z",
    tipo: "transporte",
    transportadora: "Transportadora X",
    codigo_rastreio: "BR123456789",
    chegouForaDeOrdem: false,
    ...overrides,
  } as EventoV1;
}

function eventoEntrega(overrides: Partial<EventoV1 & { tipo: "entrega" }> = {}): EventoV1 {
  return {
    fonte: "rastreio",
    codigoEvento: "entrega-001",
    momentoFato: "2026-10-05T10:00:00.000Z",
    tipo: "entrega",
    transportadora: "Transportadora X",
    codigo_rastreio: "BR123456789",
    chegouForaDeOrdem: false,
    ...overrides,
  } as EventoV1;
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

describe("LinhaDoTempo — estrutura e ordem", () => {
  it("renderiza uma <ol> com um <li> por evento, na ordem recebida", () => {
    const eventos = todosOsTipos();
    render(<LinhaDoTempo eventos={eventos} />);

    const lista = screen.getByRole("list");
    expect(lista.tagName).toBe("OL");

    // O primeiro <li> é o cabeçalho de colunas (aria-hidden); os eventos
    // vêm depois, na mesma ordem do array passado — nunca reordenados.
    const itens = within(lista).getAllByRole("listitem", { hidden: true });
    const codigosNaOrdem = eventos.map((evento) => evento.codigoEvento);
    const codigosRenderizados = itens
      .slice(1)
      .map((item) => item.querySelector(".linha-do-tempo-codigo")?.textContent);

    expect(codigosRenderizados).toEqual(codigosNaOrdem);
  });

  it("lista vazia renderiza <ol> sem itens de evento, sem lançar", () => {
    expect(() => render(<LinhaDoTempo eventos={[]} />)).not.toThrow();

    const lista = screen.getByRole("list");
    const itens = within(lista).getAllByRole("listitem", { hidden: true });
    // Só o cabeçalho de colunas permanece.
    expect(itens).toHaveLength(1);
  });
});

describe("LinhaDoTempo — conteúdo de cada item", () => {
  it("evento de venda: data em mono, 'Venda', EtiquetaFonte 'Vendas', código e valor em mono", () => {
    render(<LinhaDoTempo eventos={[eventoVenda()]} />);

    expect(screen.getByText("2026-10-01T10:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("Venda")).toBeInTheDocument();
    // "Vendas" aparece 2x: título de coluna do cabeçalho + EtiquetaFonte do item.
    expect(screen.getAllByText("Vendas")).toHaveLength(2);
    expect(document.querySelector(".etiqueta-fonte")).toHaveTextContent("Vendas");
    expect(screen.getByText("venda-001")).toBeInTheDocument();
    expect(screen.getByText(textoMoedaNormalizado(150.5))).toBeInTheDocument();
  });

  it("evento de pagamento: 'Pagamento', EtiquetaFonte 'Pagamentos', código e valor em mono", () => {
    render(<LinhaDoTempo eventos={[eventoPagamento()]} />);

    expect(screen.getByText("Pagamento")).toBeInTheDocument();
    // "Pagamentos" aparece 2x: título de coluna do cabeçalho + EtiquetaFonte do item.
    expect(screen.getAllByText("Pagamentos")).toHaveLength(2);
    expect(document.querySelector(".etiqueta-fonte")).toHaveTextContent("Pagamentos");
    expect(screen.getByText("pagamento-001")).toBeInTheDocument();
    expect(screen.getByText(textoMoedaNormalizado(150.5))).toBeInTheDocument();
  });

  it("evento de coleta/transporte/entrega: EtiquetaFonte 'Transportadora', sem célula de valor", () => {
    render(
      <LinhaDoTempo eventos={[eventoColeta(), eventoTransporte(), eventoEntrega()]} />,
    );

    expect(screen.getByText("Coleta")).toBeInTheDocument();
    expect(screen.getByText("Em transporte")).toBeInTheDocument();
    expect(screen.getByText("Entregue")).toBeInTheDocument();
    // 3 EtiquetaFonte (uma por item) + 1 título de coluna do cabeçalho
    // (sempre no DOM, mesmo texto "Transportadora").
    expect(screen.getAllByText("Transportadora")).toHaveLength(4);
    expect(document.querySelectorAll(".etiqueta-fonte")).toHaveLength(3);

    // Nenhum valor monetário é exibido para esses três tipos.
    expect(screen.queryByText(textoMoedaNormalizado(150.5))).not.toBeInTheDocument();
  });

  it("'chegou fora de ordem' aparece só quando chegouForaDeOrdem é true", () => {
    render(
      <LinhaDoTempo
        eventos={[
          eventoVenda({ codigoEvento: "venda-fora", chegouForaDeOrdem: true }),
          eventoPagamento({ codigoEvento: "pagamento-em-ordem", chegouForaDeOrdem: false }),
        ]}
      />,
    );

    expect(screen.getAllByText("chegou fora de ordem")).toHaveLength(1);
  });
});

describe("LinhaDoTempo — cabeçalho de colunas", () => {
  it("os 4 títulos de coluna estão no DOM e marcados aria-hidden", () => {
    render(<LinhaDoTempo eventos={todosOsTipos()} />);

    for (const titulo of ["Data", "Vendas", "Pagamentos", "Transportadora"]) {
      const elemento = screen.getByText(titulo, { selector: ".linha-do-tempo-cabecalho-coluna" });
      expect(elemento).toBeInTheDocument();
      expect(elemento.closest("li")).toHaveAttribute("aria-hidden", "true");
    }
  });
});

describe("LinhaDoTempo — acessibilidade (vitest-axe)", () => {
  it("lista cobrindo os 5 tipos não tem violações", async () => {
    const { container } = render(<LinhaDoTempo eventos={todosOsTipos()} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
