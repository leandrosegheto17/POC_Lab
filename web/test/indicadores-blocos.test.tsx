// Tela Indicadores: os 4 blocos (2 principais + "Tempo médio" e "Pago ×
// devido") e o componente genérico para chave desconhecida.
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import {
  blocoTempoMedio,
  instalarIndicadoresFixos,
  linha,
  renderizar,
  respostaComplementaresValida,
  respostaIndicadoresValida,
  secaoDoBloco,
  textoFormula,
  TITULO_ENTREGAS,
} from "./apoio/indicadores-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Indicadores — os 4 blocos (Modelo B)", () => {
  it("desenha as 4 seções na ordem da API, com os títulos do mockup e sem selos", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida());

    renderizar();
    await secaoDoBloco("Pago × devido");

    const cabecalhos = screen.getAllByRole("heading", { level: 2 });
    expect(cabecalhos.map((cabecalho) => cabecalho.textContent)).toEqual([
      TITULO_ENTREGAS,
      "Divergências por tipo",
      "Tempo médio",
      "Pago × devido",
    ]);

    // Selos "DESEJÁVEL"/"OPCIONAL" não são usados (decisão de 2026-10-08).
    expect(screen.queryByText(/desejável|opcional/i)).not.toBeInTheDocument();
  });

  it("Tempo médio mostra dias (numerador ÷ denominador), não percentual", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida());

    renderizar();
    const secao = await secaoDoBloco("Tempo médio");

    // 136.511,4 ÷ 16.261 = 8,39… → "8,4 dias"; 66.605,2 ÷ 16.245 → "4,1 dias".
    expect(within(secao).getByText("8,4 dias")).toBeInTheDocument();
    expect(within(secao).getByText("4,1 dias")).toBeInTheDocument();
    expect(within(secao).getByText("pedido → envio")).toBeInTheDocument();
    expect(within(secao).getByText("envio → entrega")).toBeInTheDocument();
    // Defeito antigo: a média saía como "839,0%".
    expect(secao.textContent).not.toContain("%");
  });

  it("Tempo médio: fórmula da API com numerador e denominador de cada etapa", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida());

    renderizar();
    const secao = await secaoDoBloco("Tempo médio");

    expect(textoFormula(secao)).toBe(
      "Fórmula: soma de dias entre as datas ÷ contagem de pedidos elegíveis, por etapa. Pedido → envio: 136.511 ÷ 16.261. Envio → entrega: 66.605 ÷ 16.245.",
    );
  });

  it("Tempo médio com denominador 0 mostra '—', sem NaN", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida({
            tempoMedio: blocoTempoMedio({
              linhas: [
                linha("pedido→envio", 0, 0, null),
                linha("envio→entrega", 0, 0, null),
              ],
            }),
          }));

    renderizar();
    const secao = await secaoDoBloco("Tempo médio");

    expect(within(secao).getAllByText("—")).toHaveLength(2);
    expect(secao.textContent).not.toContain("NaN");
  });

  it("Pago × devido: valores compacto e exato, e % calculado como numerador ÷ denominador", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida());

    renderizar();
    const secao = await secaoDoBloco("Pago × devido");

    const rotulosMedidas = Array.from(
      secao.querySelectorAll(".indicador__rotulo"),
    ).map((p) => p.textContent);
    expect(rotulosMedidas).toEqual(["Devido", "Pago"]);
    expect(within(secao).getByText("R$ 21,3 mi")).toBeInTheDocument();
    expect(within(secao).getByText("R$ 21.300.000,00")).toBeInTheDocument();
    expect(within(secao).getByText("R$ 21 mi")).toBeInTheDocument();
    expect(within(secao).getByText("R$ 21.000.000,00")).toBeInTheDocument();

    // 21.000.000 ÷ 21.300.000 = 98,6% (o `resultado` da API, 0.99, não é usado).
    expect(textoFormula(secao)).toBe("Fórmula: Σ pago ÷ Σ devido = 98,6%.");
    expect(secao.textContent).not.toContain("99,0%");
  });

  it("Pago × devido: quebra por situação com rótulos em português e '—' de dados quando devido é 0", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida());

    renderizar();
    const secao = await secaoDoBloco("Pago × devido");
    const tabela = within(secao).getByRole("table", {
      name: "Pago × devido por situação",
    });

    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Situação", "Pago", "Devido", "%"]);

    const rotulos = within(tabela)
      .getAllByRole("row")
      .slice(1)
      .map((tr) => obrigatorio(within(tr).getAllByRole("cell")[0], "primeira célula").textContent);
    expect(rotulos).toEqual([
      "Sem pagamento",
      "Parcial",
      "Quitado",
      "Pago a mais",
    ]);

    // "excedente" tem devido 0 → texto de "sem dados", sem NaN.
    expect(within(tabela).getByText("sem dados suficientes")).toBeInTheDocument();
    expect(secao.textContent).not.toContain("NaN");
  });

  it("bloco de chave desconhecida cai no componente genérico (título, fórmula e linhas)", async () => {
    instalarIndicadoresFixos([
          ...(respostaIndicadoresValida() as unknown[]),
          {
            chave: "indicador_novo",
            titulo: "Indicador novo",
            formula: "a ÷ b",
            linhas: [linha("Grupo X", 1, 4, 0.25)],
            aParte: false,
          },
        ]);

    renderizar();
    const secao = await secaoDoBloco("Indicador novo");

    expect(textoFormula(secao)).toBe("Fórmula: a ÷ b.");
    expect(within(secao).getByText("Grupo X")).toBeInTheDocument();
    expect(within(secao).getByText("25,0%")).toBeInTheDocument();
  });

  it("sucesso com as 4 seções não tem violação de acessibilidade (axe)", async () => {
    instalarIndicadoresFixos(respostaComplementaresValida());

    const { container } = renderizar();
    await secaoDoBloco("Pago × devido");

    expect(await axe(container)).toHaveNoViolations();
  });
});
