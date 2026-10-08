// TP-0057 — CampoBusca: form role="search" com label visível, submit
// navega para /pedido/:codigo (removendo espaços nas pontas), submit vazio
// não navega e mostra "Informe um código" ligado por aria-describedby.
//
// Decisão sobre useNavigate: mockamos o módulo "react-router" com
// `vi.mock`, preservando o restante do módulo real via `importActual`
// (MemoryRouter, etc. continuam funcionando normalmente) e substituindo
// apenas `useNavigate` por um spy (`navegarMock`). Isso evita depender de
// uma rota de destino real só para capturar a navegação e deixa a
// asserção direta: `expect(navegarMock).toHaveBeenCalledWith(...)`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { CampoBusca } from "../src/componentes/CampoBusca.tsx";

const navegarMock = vi.fn();

vi.mock("react-router", async () => {
  const modulo = await vi.importActual<typeof import("react-router")>(
    "react-router",
  );
  return {
    ...modulo,
    useNavigate: () => navegarMock,
  };
});

function renderCampo() {
  return render(
    <MemoryRouter>
      <CampoBusca />
    </MemoryRouter>,
  );
}

afterEach(() => {
  navegarMock.mockClear();
});

describe("CampoBusca — estrutura", () => {
  it('é um <form role="search"> com <label> visível associado ao input', () => {
    const { getByRole } = renderCampo();

    const forma = getByRole("search");
    expect(forma.tagName).toBe("FORM");

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    expect(campo).toHaveAttribute("id", "busca-pedido");

    const rotulo = forma.querySelector("label");
    expect(rotulo).not.toBeNull();
    expect(rotulo).toHaveAttribute("for", "busca-pedido");
    expect(rotulo?.textContent).toBe("Buscar pedido");
  });
});

describe("CampoBusca — variantes (ajuste Modelo B, 2026-10-08)", () => {
  it('variante "barra" (padrão): input type="search" e botão só com a lupa, nome "Buscar"', () => {
    const { getByRole, container } = renderCampo();

    expect(getByRole("searchbox", { name: "Buscar pedido" })).toHaveAttribute(
      "type",
      "search",
    );
    const botao = getByRole("button", { name: "Buscar" });
    expect(botao).toHaveAttribute("aria-label", "Buscar");
    expect(botao.textContent).toBe("");
    expect(botao.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".campo-busca--barra")).not.toBeNull();
  });

  it('variante "pagina" com id próprio: botão com texto "Buscar" e ids derivados', () => {
    const { getByRole, getByText, container } = render(
      <MemoryRouter>
        <CampoBusca variante="pagina" id="busca-pedido-404" />
      </MemoryRouter>,
    );

    expect(container.querySelector(".campo-busca--pagina")).not.toBeNull();
    const botao = getByRole("button", { name: "Buscar" });
    expect(botao.textContent).toBe("Buscar");

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    expect(campo).toHaveAttribute("id", "busca-pedido-404");

    fireEvent.click(botao);
    expect(getByText("Informe um código")).toHaveAttribute(
      "id",
      "busca-pedido-404-erro",
    );
    expect(campo).toHaveAttribute("aria-describedby", "busca-pedido-404-erro");
  });
});

describe("CampoBusca — submit com valor", () => {
  it('remove espaços nas pontas e navega para "/pedido/:codigo"', () => {
    const { getByRole } = renderCampo();

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    fireEvent.change(campo, { target: { value: " PED-000123 " } });
    fireEvent.click(getByRole("button", { name: "Buscar" }));

    expect(navegarMock).toHaveBeenCalledTimes(1);
    expect(navegarMock).toHaveBeenCalledWith("/pedido/PED-000123");
  });

  it("codifica caracteres especiais do código via encodeURIComponent", () => {
    const { getByRole } = renderCampo();

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    fireEvent.change(campo, { target: { value: "PED/123" } });
    fireEvent.click(getByRole("button", { name: "Buscar" }));

    expect(navegarMock).toHaveBeenCalledWith("/pedido/PED%2F123");
  });
});

describe("CampoBusca — submit vazio", () => {
  it("valor vazio não navega e mostra 'Informe um código'", () => {
    const { getByRole, getByText } = renderCampo();

    fireEvent.click(getByRole("button", { name: "Buscar" }));

    expect(navegarMock).not.toHaveBeenCalled();
    expect(getByText("Informe um código")).toBeInTheDocument();
  });

  it("valor só com espaços não navega e mostra 'Informe um código'", () => {
    const { getByRole, getByText } = renderCampo();

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    fireEvent.change(campo, { target: { value: "   " } });
    fireEvent.click(getByRole("button", { name: "Buscar" }));

    expect(navegarMock).not.toHaveBeenCalled();
    expect(getByText("Informe um código")).toBeInTheDocument();
  });

  it("corrigir o valor e submeter de novo remove a mensagem de erro e navega", () => {
    const { getByRole, getByText, queryByText } = renderCampo();

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    fireEvent.click(getByRole("button", { name: "Buscar" }));
    expect(getByText("Informe um código")).toBeInTheDocument();

    fireEvent.change(campo, { target: { value: "PED-1" } });
    fireEvent.click(getByRole("button", { name: "Buscar" }));

    expect(queryByText("Informe um código")).not.toBeInTheDocument();
    expect(navegarMock).toHaveBeenCalledWith("/pedido/PED-1");
  });
});

describe("CampoBusca — aria-describedby", () => {
  it("ausente/undefined quando não há erro visível", () => {
    const { getByRole } = renderCampo();

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    expect(campo).not.toHaveAttribute("aria-describedby");
  });

  it("aponta para o id do parágrafo de erro quando ele está visível", () => {
    const { getByRole, getByText } = renderCampo();

    fireEvent.click(getByRole("button", { name: "Buscar" }));

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    const erro = getByText("Informe um código");

    expect(erro).toHaveAttribute("id", "busca-pedido-erro");
    expect(campo).toHaveAttribute("aria-describedby", "busca-pedido-erro");
  });
});

describe("CampoBusca — acessibilidade (vitest-axe)", () => {
  it("sem mensagem de erro visível: nenhuma violação", async () => {
    const { container } = renderCampo();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("com mensagem de erro visível: nenhuma violação", async () => {
    const { container, getByRole } = renderCampo();

    fireEvent.click(getByRole("button", { name: "Buscar" }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
