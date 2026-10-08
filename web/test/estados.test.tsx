import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { EstadoCarregando } from "../src/componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../src/componentes/EstadoVazio.tsx";
import { EstadoErro } from "../src/componentes/EstadoErro.tsx";

describe("EstadoCarregando", () => {
  it("renderiza a mensagem e tem aria-busy/aria-live por padrão", () => {
    const { getByText, container } = render(
      <EstadoCarregando mensagem="Carregando…" />,
    );

    expect(getByText("Carregando…")).toBeInTheDocument();
    const regiao = container.firstElementChild as HTMLElement;
    expect(regiao).toHaveAttribute("aria-busy", "true");
    expect(regiao).toHaveAttribute("aria-live", "polite");
  });

  it("não tem aria-live quando semAriaLiveProprio é true", () => {
    const { container } = render(
      <EstadoCarregando mensagem="Carregando…" semAriaLiveProprio />,
    );

    const regiao = container.firstElementChild as HTMLElement;
    expect(regiao).not.toHaveAttribute("aria-live");
  });

  it("não quebra com mensagem vazia", () => {
    expect(() => render(<EstadoCarregando mensagem="" />)).not.toThrow();
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(<EstadoCarregando mensagem="Carregando…" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EstadoVazio", () => {
  it("renderiza a mensagem", () => {
    const { getByText } = render(<EstadoVazio mensagem="Nenhum item encontrado" />);

    expect(getByText("Nenhum item encontrado")).toBeInTheDocument();
  });

  it("renderiza o link quando acao é fornecida", () => {
    const { getByRole } = render(
      <EstadoVazio
        mensagem="Nenhum item encontrado"
        acao={{ texto: "Criar novo", href: "/novo" }}
      />,
    );

    const link = getByRole("link", { name: "Criar novo" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/novo");
  });

  it("não renderiza link quando acao é omitida", () => {
    const { queryByRole } = render(<EstadoVazio mensagem="Nenhum item encontrado" />);

    expect(queryByRole("link")).not.toBeInTheDocument();
  });

  it("não quebra com mensagem vazia", () => {
    expect(() => render(<EstadoVazio mensagem="" />)).not.toThrow();
  });

  it("não tem violações de acessibilidade (vitest-axe)", async () => {
    const { container } = render(<EstadoVazio mensagem="Nenhum item encontrado" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("EstadoErro", () => {
  it("tem role=alert quando interrompe (padrão, sem passar a prop)", () => {
    const { getByRole } = render(
      <EstadoErro mensagem="Falha ao carregar" onTentarDeNovo={vi.fn()} />,
    );

    expect(getByRole("alert")).toBeInTheDocument();
  });

  it("não tem role=alert quando interrompe é false", () => {
    const { queryByRole } = render(
      <EstadoErro
        mensagem="Falha ao carregar"
        onTentarDeNovo={vi.fn()}
        interrompe={false}
      />,
    );

    expect(queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clique em Tentar de novo chama onTentarDeNovo exatamente 1 vez", () => {
    const onTentarDeNovo = vi.fn();
    const { getByRole } = render(
      <EstadoErro mensagem="Falha ao carregar" onTentarDeNovo={onTentarDeNovo} />,
    );

    fireEvent.click(getByRole("button", { name: "Tentar de novo" }));

    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it("não quebra com mensagem vazia", () => {
    expect(() =>
      render(<EstadoErro mensagem="" onTentarDeNovo={vi.fn()} />),
    ).not.toThrow();
  });

  it("não tem violações de acessibilidade com interrompe=true (vitest-axe)", async () => {
    const { container } = render(
      <EstadoErro mensagem="Falha ao carregar" onTentarDeNovo={vi.fn()} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it("não tem violações de acessibilidade com interrompe=false (vitest-axe)", async () => {
    const { container } = render(
      <EstadoErro
        mensagem="Falha ao carregar"
        onTentarDeNovo={vi.fn()}
        interrompe={false}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
