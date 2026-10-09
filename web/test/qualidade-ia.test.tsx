// Tela Qualidade dos dados: seção "Sugestões da IA" — mensagem fixa quando a
// IA não foi utilizada ou não há itens válidos, tabela com as 5 colunas quando
// há sugestões, descarte silencioso de item malformado e acessibilidade.
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { obrigatorio } from "./apoio/obrigatorio.ts";
import {
  DUAS_SUGESTOES,
  detalhesCelular,
  formaPc,
  instalarQualidadeFixa,
  renderizar,
  respostaComSugestoes,
  respostaQualidadeValida,
  secaoPc,
  sugestaoIa,
} from "./apoio/qualidade-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Qualidade — Sugestões da IA", () => {
  it("ia.utilizada === false mostra a mensagem fixa de IA não utilizada (PC e celular, na caixa de regra)", async () => {
    instalarQualidadeFixa(respostaQualidadeValida({ iaUtilizada: false }));

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
    instalarQualidadeFixa(respostaQualidadeValida());

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

  it("ia.utilizada === true com 2 sugestões válidas mostra a tabela com as 5 colunas", async () => {
    instalarQualidadeFixa(respostaComSugestoes(DUAS_SUGESTOES));

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
    expect(obrigatorio(linhas[0], "linha 1")).toHaveTextContent("PAG-100 → PED-100");
    expect(within(obrigatorio(linhas[0], "linha 1")).getByText("PED-100")).toHaveAttribute(
      "href",
      "/pedido/PED-100",
    );
    expect(within(obrigatorio(linhas[0], "linha 1")).getByText("Aceita")).toHaveClass("etiqueta--ok");
    expect(within(obrigatorio(linhas[1], "linha 2")).getByText("Rejeitada")).toHaveClass(
      "etiqueta--ruim",
    );
  });

  it("ia.utilizada === true com sugestoes: [] mostra a mensagem de 'sem sugestões'", async () => {
    instalarQualidadeFixa(respostaComSugestoes([]));

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
    instalarQualidadeFixa(respostaQualidadeValida({ iaUtilizada: false }));

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
    instalarQualidadeFixa(respostaComSugestoes([
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
          ]));

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
