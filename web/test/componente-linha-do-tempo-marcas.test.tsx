// `LinhaDoTempo`: marcas "duplicado"/"fora de ordem"/"no prazo"/"atrasada",
// "depois da data escolhida", cabeçalho de colunas e `vitest-axe`.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { obrigatorio } from "./apoio/obrigatorio.js";
import { LinhaDoTempo } from "../src/componentes/LinhaDoTempo.tsx";
import {
  cartoes,
  eventoEntrega,
  eventoPagamento,
  eventoVenda,
  todosOsTipos,
} from "./apoio/eventos-linha-do-tempo.ts";

afterEach(cleanup);

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
        dataEscolhida="2026-10-01"
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

  it("evento no próprio dia escolhido (AAAA-MM-DD) não é atenuado", () => {
    const { container } = render(
      <LinhaDoTempo eventos={[eventoVenda()]} dataEscolhida="2026-10-01" />,
    );

    const venda = obrigatorio(cartoes(container)[0], "cartão de venda");
    expect(venda).not.toHaveClass("evento--depois");
    expect(screen.queryByText("depois da data escolhida")).toBeNull();
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
