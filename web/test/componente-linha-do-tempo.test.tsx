// `LinhaDoTempo`: região rolável com rótulo, `<ol>` com um `<li>` por data
// (ordem recebida), três células por data (Vendas | Pagamentos |
// Transportadora) e conteúdo dos cartões de evento. Marcas, data escolhida,
// cabeçalho e acessibilidade em `componente-linha-do-tempo-marcas.test.tsx`.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { obrigatorio } from "./apoio/obrigatorio.js";
import { LinhaDoTempo } from "../src/componentes/LinhaDoTempo.tsx";
import {
  cartoes,
  eventoColeta,
  eventoEntrega,
  eventoPagamento,
  eventoTransporte,
  eventoVenda,
  linhasDeData,
  todosOsTipos,
} from "./apoio/eventos-linha-do-tempo.ts";

afterEach(cleanup);

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
