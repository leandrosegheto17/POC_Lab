// Tela Qualidade dos dados: 7 `BlocoAchado` em ORDEM FIXA (independente da
// ordem do array devolvido pela API), mini-cartões-âncora, exemplos e a forma
// do celular. Seção de IA em `qualidade-ia.test.tsx`; estados de erro,
// carregando e acessibilidade em `qualidade-estados.test.tsx`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Qualidade } from "../src/paginas/Qualidade.tsx";
import { obrigatorio } from "./apoio/obrigatorio.ts";
import {
  detalhesCelular,
  exemplo,
  formaCelular,
  formaPc,
  instalarQualidadeFixa,
  respostaQualidadeValida,
  renderizar,
  secaoPc,
  TITULOS_EM_ORDEM,
} from "./apoio/qualidade-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Qualidade — sucesso", () => {
  it("mostra os 7 BlocoAchado na ORDEM FIXA, não na ordem do array recebido", async () => {
    instalarQualidadeFixa(respostaQualidadeValida());

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
    instalarQualidadeFixa(respostaQualidadeValida());

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
    instalarQualidadeFixa(respostaQualidadeValida());

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
    const terceiro = obrigatorio(links[2], "terceiro mini-cartão");
    fireEvent.click(terceiro);
    expect(terceiro).toHaveAttribute("aria-current", "true");
    expect(links[0]).not.toHaveAttribute("aria-current");
  });

  it("PC: o fragmento da URL define o mini-cartão selecionado", async () => {
    instalarQualidadeFixa(respostaQualidadeValida());

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
    obrigatorio(resposta.achados.find((a) => a.tipo === "formato_data")).contagem = 15452;
    instalarQualidadeFixa(resposta);

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
    obrigatorio(resposta.achados.find((a) => a.tipo === "linha_invalida")).exemplos = [
      exemplo({
        fonte: "vendas",
        referencia: "11078",
        detalhe: "Campo 'valor' ausente",
      }),
    ];
    instalarQualidadeFixa(resposta);

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
    instalarQualidadeFixa(respostaQualidadeValida());

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
    instalarQualidadeFixa(respostaQualidadeValida());

    renderizar();

    await waitFor(() => {
      expect(formaCelular()).toBeInTheDocument();
    });

    const todos = formaCelular().querySelectorAll("details");
    // 7 achados + Sugestões da IA.
    expect(todos).toHaveLength(8);
    expect(obrigatorio(todos[0], "primeiro detalhe").open).toBe(true);
    Array.from(todos)
      .slice(1)
      .forEach((detalhes) => { expect(detalhes.open).toBe(false); });

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
});
