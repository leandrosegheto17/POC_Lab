// Componente `Paginacao`: `aria-label`, página atual, botões com
// `aria-disabled` (sem `disabled` nativo), truncamento com reticências, resumo
// e acessibilidade (vitest-axe).
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Paginacao } from "../src/componentes/Paginacao.tsx";
import { formaCompleta } from "./apoio/paginacao.ts";

describe("Paginacao", () => {
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
