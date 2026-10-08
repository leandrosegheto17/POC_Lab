// TP-0054 — testes de TabelaDados, EtiquetaTipo, EtiquetaFonte e Paginacao.
// Ajuste Modelo B (2026-10-08): EtiquetaEstado, props novas de TabelaDados
// (legendaOculta/semMoldura/compacta/cabeçalho em objeto), selo de fonte e
// resumo da Paginacao.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TabelaDados } from "../src/componentes/TabelaDados.tsx";
import {
  EtiquetaTipo,
  type TipoDivergencia,
} from "../src/componentes/EtiquetaTipo.tsx";
import {
  EtiquetaFonte,
  rotuloFonte,
  type Fonte,
} from "../src/componentes/EtiquetaFonte.tsx";
import {
  EtiquetaEstado,
  type VarianteEstado,
} from "../src/componentes/EtiquetaEstado.tsx";
import { Paginacao } from "../src/componentes/Paginacao.tsx";

describe("TabelaDados", () => {
  it("renderiza caption, th com scope e contêiner rolável com role/aria-label/tabIndex", () => {
    const { getByText, getByRole } = render(
      <TabelaDados caption="Pedidos conciliados" cabecalhos={["ID", "Status"]}>
        <tr>
          <td>1</td>
          <td>Ok</td>
        </tr>
      </TabelaDados>,
    );

    expect(getByText("Pedidos conciliados").tagName).toBe("CAPTION");

    const cabecalhoId = getByRole("columnheader", { name: "ID" });
    const cabecalhoStatus = getByRole("columnheader", { name: "Status" });
    expect(cabecalhoId).toHaveAttribute("scope", "col");
    expect(cabecalhoStatus).toHaveAttribute("scope", "col");

    const regiao = getByRole("region", {
      name: "Tabela com rolagem horizontal",
    });
    expect(regiao).toHaveAttribute("tabIndex", "0");
  });

  it("permite rotuloRegiao customizado", () => {
    const { getByRole } = render(
      <TabelaDados
        caption="Pagamentos"
        cabecalhos={["Valor"]}
        rotuloRegiao="Tabela de pagamentos com rolagem horizontal"
      >
        <tr>
          <td>10</td>
        </tr>
      </TabelaDados>,
    );

    expect(
      getByRole("region", {
        name: "Tabela de pagamentos com rolagem horizontal",
      }),
    ).toBeInTheDocument();
  });

  it("não quebra sem children (corpo vazio) e mantém caption/cabeçalho", () => {
    const { getByText, getByRole } = render(
      <TabelaDados caption="Sem itens" cabecalhos={["ID"]} />,
    );

    expect(getByText("Sem itens")).toBeInTheDocument();
    expect(getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
  });

  it("legendaOculta põe o caption em .visualmente-oculto (continua no DOM)", () => {
    const { getByText } = render(
      <TabelaDados caption="Exemplos" cabecalhos={["ID"]} legendaOculta />,
    );

    const legenda = getByText("Exemplos");
    expect(legenda.tagName).toBe("CAPTION");
    expect(legenda).toHaveClass("visualmente-oculto");
  });

  it("semMoldura e compacta acrescentam as classes de variante", () => {
    const { container } = render(
      <TabelaDados caption="T" cabecalhos={["ID"]} semMoldura compacta />,
    );

    expect(
      container.querySelector(".tabela-dados-regiao--sem-moldura"),
    ).not.toBeNull();
    expect(container.querySelector(".tabela-dados--compacta")).not.toBeNull();
  });

  it("sem as props novas, não aplica classes de variante nem oculta a legenda", () => {
    const { container, getByText } = render(
      <TabelaDados caption="T" cabecalhos={["ID"]} />,
    );

    expect(
      container.querySelector(".tabela-dados-regiao--sem-moldura"),
    ).toBeNull();
    expect(container.querySelector(".tabela-dados--compacta")).toBeNull();
    expect(getByText("T")).not.toHaveClass("visualmente-oculto");
  });

  it("cabeçalho em objeto: numerico → .num; oculto → texto em .visualmente-oculto", () => {
    const { getByRole } = render(
      <TabelaDados
        caption="Entregas"
        cabecalhos={[
          "Transportadora",
          { texto: "Entregas", numerico: true },
          { texto: "Proporção", oculto: true },
        ]}
      />,
    );

    const numerico = getByRole("columnheader", { name: "Entregas" });
    expect(numerico).toHaveClass("num");
    expect(numerico).toHaveAttribute("scope", "col");

    const oculto = getByRole("columnheader", { name: "Proporção" });
    expect(oculto.querySelector(".visualmente-oculto")?.textContent).toBe(
      "Proporção",
    );
    expect(
      getByRole("columnheader", { name: "Transportadora" }),
    ).not.toHaveClass("num");
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(
      <TabelaDados caption="Pedidos conciliados" cabecalhos={["ID", "Status"]}>
        <tr>
          <td>1</td>
          <td>Ok</td>
        </tr>
      </TabelaDados>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EtiquetaTipo", () => {
  const casos: Array<[TipoDivergencia, string]> = [
    ["duplicado", "Pago duas vezes"],
    ["parcial", "Pagamento parcial"],
    ["pago_nao_enviado", "Pago e não enviado"],
    ["enviado_nao_pago", "Enviado e não pago"],
    ["entrega_atrasada", "Entrega atrasada"],
    ["sem_divergencia", "Sem divergência"],
  ];

  it.each(casos)("tipo '%s' renderiza o rótulo '%s'", (tipo, rotulo) => {
    const { getByText } = render(<EtiquetaTipo tipo={tipo} />);

    expect(getByText(rotulo)).toBeInTheDocument();
  });

  it("cada uma das 6 variantes usa uma classe/token diferente", () => {
    const variantesEncontradas = new Set<string>();

    for (const [tipo] of casos) {
      const { container } = render(<EtiquetaTipo tipo={tipo} />);
      const span = container.querySelector("span");
      const variante = span?.getAttribute("data-variante");

      expect(variante).toBeTruthy();
      variantesEncontradas.add(variante as string);
    }

    expect(variantesEncontradas.size).toBe(6);
  });

  it("cada tipo usa a sua própria paleta (classe etiqueta--<tipo>)", () => {
    const esperado: Array<[TipoDivergencia, string]> = [
      ["duplicado", "etiqueta--duplicado"],
      ["parcial", "etiqueta--parcial"],
      ["pago_nao_enviado", "etiqueta--pago-nao-enviado"],
      ["enviado_nao_pago", "etiqueta--enviado-nao-pago"],
      ["entrega_atrasada", "etiqueta--entrega-atrasada"],
      ["sem_divergencia", "etiqueta--sem-divergencia"],
    ];

    for (const [tipo, classe] of esperado) {
      const { container } = render(<EtiquetaTipo tipo={tipo} />);
      expect(container.querySelector("span")).toHaveClass("etiqueta", classe);
    }
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(<EtiquetaTipo tipo="duplicado" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EtiquetaEstado", () => {
  const casos: Array<[VarianteEstado, string, string]> = [
    ["ok", "no prazo", "etiqueta--ok"],
    ["alerta", "fora de ordem", "etiqueta--alerta"],
    ["ruim", "duplicado", "etiqueta--ruim"],
    ["neutra", "atrasada", "etiqueta--neutra"],
  ];

  it.each(casos)(
    "variante '%s' mostra o texto '%s' com a classe '%s'",
    (variante, texto, classe) => {
      const { getByText } = render(
        <EtiquetaEstado variante={variante}>{texto}</EtiquetaEstado>,
      );

      const etiqueta = getByText(texto);
      expect(etiqueta).toHaveClass("etiqueta", classe);
      expect(etiqueta).toHaveAttribute("data-variante", variante);
    },
  );

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(
      <EtiquetaEstado variante="ok">Aceita</EtiquetaEstado>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EtiquetaFonte", () => {
  const casos: Array<[Fonte, string]> = [
    ["vendas", "Vendas"],
    ["pagamentos", "Pagamentos"],
    ["rastreio", "Transportadora"],
  ];

  it.each(casos)("fonte '%s' renderiza o rótulo '%s'", (fonte, rotulo) => {
    const { getByText, queryByText } = render(<EtiquetaFonte fonte={fonte} />);

    expect(getByText(rotulo)).toBeInTheDocument();
    expect(queryByText("rastreio")).not.toBeInTheDocument();
  });

  it.each(casos)("rotuloFonte('%s') devolve '%s'", (fonte, rotulo) => {
    expect(rotuloFonte(fonte)).toBe(rotulo);
  });

  it("variante 'selo' acrescenta as classes de selo e da fonte", () => {
    const { getByText } = render(
      <EtiquetaFonte fonte="rastreio" variante="selo" />,
    );

    expect(getByText("Transportadora")).toHaveClass(
      "etiqueta-fonte",
      "etiqueta-fonte--selo",
      "etiqueta-fonte--rastreio",
    );
  });

  it("sem variante, mantém só a classe neutra", () => {
    const { getByText } = render(<EtiquetaFonte fonte="vendas" />);

    expect(getByText("Vendas").className).toBe("etiqueta-fonte");
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(<EtiquetaFonte fonte="pagamentos" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Paginacao", () => {
  function formaCompleta(container: HTMLElement) {
    const bloco = container.querySelector(".paginacao-completa");
    if (!bloco) {
      throw new Error("Bloco .paginacao-completa não encontrado");
    }
    return within(bloco as HTMLElement);
  }

  it("nav tem aria-label='Paginação'", () => {
    const { getByRole } = render(
      <Paginacao pagina={1} totalPaginas={5} aoMudarPagina={vi.fn()} />,
    );

    expect(getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
  });

  it("página atual recebe aria-current='page'", () => {
    const { container } = render(
      <Paginacao pagina={3} totalPaginas={5} aoMudarPagina={vi.fn()} />,
    );

    const botaoAtual = formaCompleta(container).getByRole("button", {
      name: "3",
    });
    expect(botaoAtual).toHaveAttribute("aria-current", "page");
  });

  it("'Anterior' tem aria-disabled='true' e permanece focável quando pagina===1", () => {
    const { container } = render(
      <Paginacao pagina={1} totalPaginas={5} aoMudarPagina={vi.fn()} />,
    );

    const botaoAnterior = formaCompleta(container).getByRole("button", {
      name: "Anterior",
    });
    expect(botaoAnterior).toHaveAttribute("aria-disabled", "true");
    expect(botaoAnterior).not.toBeDisabled();
  });

  it("'Próxima' tem aria-disabled='true' quando pagina===totalPaginas", () => {
    const { container } = render(
      <Paginacao pagina={5} totalPaginas={5} aoMudarPagina={vi.fn()} />,
    );

    const botaoProxima = formaCompleta(container).getByRole("button", {
      name: "Próxima",
    });
    expect(botaoProxima).toHaveAttribute("aria-disabled", "true");
    expect(botaoProxima).not.toBeDisabled();
  });

  it("clique em 'Próxima' com aria-disabled não chama aoMudarPagina", () => {
    const aoMudarPagina = vi.fn();
    const { container } = render(
      <Paginacao pagina={5} totalPaginas={5} aoMudarPagina={aoMudarPagina} />,
    );

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    expect(aoMudarPagina).not.toHaveBeenCalled();
  });

  it("clique em 'Próxima' habilitado chama aoMudarPagina com a próxima página", () => {
    const aoMudarPagina = vi.fn();
    const { container } = render(
      <Paginacao pagina={2} totalPaginas={5} aoMudarPagina={aoMudarPagina} />,
    );

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    expect(aoMudarPagina).toHaveBeenCalledWith(3);
  });

  it("caso de borda: totalPaginas===1 desabilita Anterior e Próxima", () => {
    const { container } = render(
      <Paginacao pagina={1} totalPaginas={1} aoMudarPagina={vi.fn()} />,
    );

    const forma = formaCompleta(container);
    expect(forma.getByRole("button", { name: "Anterior" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(forma.getByRole("button", { name: "Próxima" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("lista todas as páginas quando totalPaginas <= 7", () => {
    const { container } = render(
      <Paginacao pagina={1} totalPaginas={7} aoMudarPagina={vi.fn()} />,
    );

    const forma = formaCompleta(container);
    for (let numero = 1; numero <= 7; numero += 1) {
      expect(
        forma.getByRole("button", { name: String(numero) }),
      ).toBeInTheDocument();
    }
  });

  it("trunca com reticências quando totalPaginas > 7", () => {
    const { container } = render(
      <Paginacao pagina={10} totalPaginas={20} aoMudarPagina={vi.fn()} />,
    );

    const forma = formaCompleta(container);
    expect(forma.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(forma.getByRole("button", { name: "20" })).toBeInTheDocument();
    expect(forma.getByRole("button", { name: "9" })).toBeInTheDocument();
    expect(forma.getByRole("button", { name: "10" })).toBeInTheDocument();
    expect(forma.getByRole("button", { name: "11" })).toBeInTheDocument();
    expect(forma.queryByRole("button", { name: "5" })).not.toBeInTheDocument();
  });

  it("na página 1 mostra 1, 2, 3 e a última (como o mockup)", () => {
    const { container } = render(
      <Paginacao pagina={1} totalPaginas={40} aoMudarPagina={vi.fn()} />,
    );

    const forma = formaCompleta(container);
    for (const numero of ["1", "2", "3", "40"]) {
      expect(forma.getByRole("button", { name: numero })).toBeInTheDocument();
    }
    expect(forma.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
    expect(container.querySelector(".paginacao__reticencias")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("prop resumo aparece dentro da nav; sem a prop, nada é renderizado", () => {
    const { getByRole, rerender, container } = render(
      <Paginacao
        pagina={1}
        totalPaginas={178}
        aoMudarPagina={vi.fn()}
        resumo="1–50 de 8.856"
      />,
    );

    const nav = getByRole("navigation", { name: "Paginação" });
    expect(within(nav).getByText("1–50 de 8.856")).toHaveClass(
      "paginacao__resumo",
    );

    rerender(
      <Paginacao pagina={1} totalPaginas={178} aoMudarPagina={vi.fn()} />,
    );
    expect(container.querySelector(".paginacao__resumo")).toBeNull();
  });

  it("não tem violações de acessibilidade na primeira página (vitest-axe)", async () => {
    const { container } = render(
      <Paginacao pagina={1} totalPaginas={10} aoMudarPagina={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("não tem violações de acessibilidade no meio (vitest-axe)", async () => {
    const { container } = render(
      <Paginacao pagina={5} totalPaginas={10} aoMudarPagina={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("não tem violações de acessibilidade na última página (vitest-axe)", async () => {
    const { container } = render(
      <Paginacao pagina={10} totalPaginas={10} aoMudarPagina={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
