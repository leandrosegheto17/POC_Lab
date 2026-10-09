// Componentes compartilhados: `TabelaDados`, `EtiquetaTipo`, `EtiquetaEstado` e
// `EtiquetaFonte` (inclui props de variante, rótulos e acessibilidade).
// `Paginacao` em `componentes-paginacao.test.tsx`.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
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
