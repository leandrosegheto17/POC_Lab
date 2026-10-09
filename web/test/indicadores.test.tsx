// Tela Indicadores: topo, bloco "Entregas no prazo" e bloco "Divergências por
// tipo". Blocos complementares em `indicadores-blocos.test.tsx`; erro,
// carregando e acessibilidade em `indicadores-estados.test.tsx`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import {
  blocoDivergenciasPorTipo,
  blocoEntregasNoPrazo,
  FORMULA_ENTREGAS,
  instalarIndicadoresFixos,
  linha,
  renderizar,
  respostaIndicadoresValida,
  secaoDoBloco,
  textoFormula,
  TITULO_ENTREGAS,
} from "./apoio/indicadores-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Indicadores — topo (Modelo B)", () => {
  it("mostra o rótulo da página e o h1", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();

    expect(
      screen.getByText("Cada número com fórmula, numerador e denominador"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Indicadores" }),
    ).toBeInTheDocument();
    await secaoDoBloco(TITULO_ENTREGAS);
  });
});

describe("Indicadores — Entregas no prazo", () => {
  it("mostra o geral (soma dos numeradores ÷ soma dos denominadores) com numerador e denominador", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    // (5 + 8 + 3) ÷ (10 + 10 + 4) = 16 ÷ 24 = 66,7%. A linha "à parte"
    // (Pedidos sem entrega) não entra na soma.
    expect(within(secao).getByText("66,7%")).toBeInTheDocument();
    expect(within(secao).getByText("geral · 16 de 24")).toBeInTheDocument();
  });

  it("fórmula da API na caixa, com o total de pedidos sem entrega (sem linha solta)", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    expect(textoFormula(secao)).toBe(
      `Fórmula: ${FORMULA_ENTREGAS}. Pedidos sem entrega ficam fora do denominador: 37.`,
    );
    expect(screen.queryByText("Pedidos sem entrega: 37")).not.toBeInTheDocument();
  });

  it("tabela em colunas (Transportadora, Mês, No prazo, Entregas, %) do mês mais recente por padrão", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);
    const tabela = within(secao).getByRole("table", { name: TITULO_ENTREGAS });

    const cabecalhos = within(tabela)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(cabecalhos).toEqual([
      "Transportadora",
      "Mês",
      "No prazo",
      "Entregas",
      "%",
      "Proporção",
    ]);

    const linhas = within(tabela).getAllByRole("row").slice(1);
    expect(linhas).toHaveLength(2);
    expect(
      within(obrigatorio(linhas[0], "linha 1")).getAllByRole("cell").map((td) => td.textContent),
    ).toEqual(["Transportadora A", "2026-09", "8", "10", "80,0%", ""]);
    expect(
      within(obrigatorio(linhas[1], "linha 2")).getAllByRole("cell").map((td) => td.textContent),
    ).toEqual(["Transportadora B", "2026-09", "3", "4", "75,0%", ""]);
  });

  it("filtro 'Mês' lista os meses em ordem crescente e filtra no navegador, sem nova chamada à API", async () => {
    const mock = instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);
    const chamadasAntes = mock.mock.calls.length;

    const seletor = within(secao).getByLabelText("Mês");
    if (!(seletor instanceof HTMLSelectElement)) {
      throw new Error("O filtro 'Mês' deveria ser um <select>");
    }
    expect(seletor.value).toBe("2026-09");
    expect(Array.from(seletor.options).map((opcao) => opcao.value)).toEqual([
      "2026-08",
      "2026-09",
    ]);

    fireEvent.change(seletor, { target: { value: "2026-08" } });

    const tabela = within(secao).getByRole("table", { name: TITULO_ENTREGAS });
    const linhas = within(tabela).getAllByRole("row").slice(1);
    expect(linhas).toHaveLength(1);
    expect(
      within(obrigatorio(linhas[0], "linha 1")).getAllByRole("cell").map((td) => td.textContent),
    ).toEqual(["Transportadora A", "2026-08", "5", "10", "50,0%", ""]);

    // Lista do celular acompanha o mesmo filtro.
    const listaCelular = secao.querySelector(".indicador__linhas");
    expect(listaCelular?.querySelectorAll("li")).toHaveLength(1);
    expect(listaCelular?.textContent).toContain("5/10");

    expect(mock.mock.calls.length).toBe(chamadasAntes);
  });

  it("lista do celular: uma linha por transportadora com fração e %", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);
    const itens = Array.from(
      secao.querySelectorAll(".indicador__linhas li"),
    ).map((li) => li.textContent.replace(/\s+/g, " ").trim());

    expect(itens).toEqual([
      "Transportadora A 8/1080,0%",
      "Transportadora B 3/475,0%",
    ]);
  });

  it("linha com denominador 0 mostra o texto específico, sem NaN", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida({
            entregas: blocoEntregasNoPrazo({
              linhas: [
                linha("Transportadora B / 2026-09", 0, 0, null),
                linha("Pedidos sem entrega", 0, 1, 0),
              ],
            }),
          }));

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    expect(
      within(secao).getAllByText("sem entregas com data conhecida").length,
    ).toBeGreaterThan(0);
    expect(secao.textContent).not.toContain("NaN");
  });

  it("sem nenhuma linha de entrega: sem filtro e com aviso", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida({
            entregas: blocoEntregasNoPrazo({
              linhas: [linha("Pedidos sem entrega", 4, 1, 4)],
            }),
          }));

    renderizar();
    const secao = await secaoDoBloco(TITULO_ENTREGAS);

    expect(
      within(secao).getByText("Nenhuma entrega com data conhecida."),
    ).toBeInTheDocument();
    expect(within(secao).queryByLabelText("Mês")).not.toBeInTheDocument();
  });
});

describe("Indicadores — Divergências por tipo", () => {
  it("tabela Tipo | Divergências em ordem decrescente, com etiqueta-link para /?tipo=<literal>", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");
    const tabela = within(secao).getByRole("table", {
      name: "Divergências por tipo",
    });

    expect(
      within(tabela)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual(["Tipo", "Divergências"]);

    const linhas = within(tabela).getAllByRole("row").slice(1);
    expect(
      linhas.map((tr) =>
        within(tr)
          .getAllByRole("cell")
          .map((td) => td.textContent),
      ),
    ).toEqual([
      ["Entrega atrasada", "4"],
      ["Enviado e não pago", "3"],
      ["Pago duas vezes", "2"],
      ["Pago e não enviado", "1"],
      ["Pagamento parcial", "0"],
    ]);

    expect(
      within(tabela).getByRole("link", { name: "Pago duas vezes" }),
    ).toHaveAttribute("href", "/?tipo=duplicado");
    expect(
      within(tabela).getByRole("link", { name: "Pagamento parcial" }),
    ).toHaveAttribute("href", "/?tipo=parcial");
    expect(
      within(tabela).getByRole("link", { name: "Pago e não enviado" }),
    ).toHaveAttribute("href", "/?tipo=pago_nao_enviado");
    expect(
      within(tabela).getByRole("link", { name: "Enviado e não pago" }),
    ).toHaveAttribute("href", "/?tipo=enviado_nao_pago");
    expect(
      within(tabela).getByRole("link", { name: "Entrega atrasada" }),
    ).toHaveAttribute("href", "/?tipo=entrega_atrasada");
  });

  it("fórmula da API com o total de divergências", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");

    expect(textoFormula(secao)).toBe(
      "Fórmula: numero de divergencias do tipo / total de divergencias (total: 10).",
    );
  });

  it("lista do celular com os mesmos links e contagens", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");
    const itens = Array.from(
      secao.querySelectorAll(".indicador__lista-tipos li"),
    );

    expect(itens).toHaveLength(5);
    expect(obrigatorio(itens[0], "item 1").querySelector("a")).toHaveAttribute(
      "href",
      "/?tipo=entrega_atrasada",
    );
    expect(obrigatorio(itens[0], "item 1").textContent).toBe("Entrega atrasada4");
  });

  it("rótulo desconhecido vira texto sem link (tabela e lista do celular)", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida({
            divergencias: blocoDivergenciasPorTipo({
              linhas: [
                linha("duplicado", 2, 3, 0.67),
                linha("tipo_inexistente", 1, 3, 0.33),
              ],
            }),
          }));

    renderizar();
    const secao = await secaoDoBloco("Divergências por tipo");

    expect(secao.querySelectorAll("a")).toHaveLength(2); // só "duplicado" (tabela + lista)
    expect(
      secao.querySelector('a[href*="tipo_inexistente"]'),
    ).toBeNull();
    expect(within(secao).getAllByText("tipo_inexistente")).toHaveLength(2);
  });
});
