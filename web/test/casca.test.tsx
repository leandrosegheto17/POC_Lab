import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { Rotas } from "../src/Rotas.tsx";
import { NaoEncontrada } from "../src/paginas/NaoEncontrada.tsx";

// TP-0055 — casca do app: nav única, rotas T1-T5, <title> por rota, foco no
// <h1> ao navegar, aria-current no item ativo e página "não encontrada".
//
// Nota sobre o layout responsivo (menu lateral em >=1024px vs. barra de
// abas inferior em <1024px, e a regra de altura <=480px): essa troca é
// resolvida inteiramente por CSS (@media), nunca por JS — ver
// src/estilos/casca.css. jsdom não calcula CSS real (não tem layout
// engine), então os testes abaixo confirmam apenas a ESTRUTURA/classes
// esperadas (ex. único <nav>, classes de item ativo), não o resultado
// visual do layout em cada largura/altura.

function renderEm(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Rotas />
    </MemoryRouter>,
  );
}

const rotasEsperadas: Array<{ rota: string; titulo: string; tituloPagina: string }> = [
  { rota: "/", titulo: "Divergências", tituloPagina: "Divergências — POC_Lab" },
  { rota: "/pedido/ABC", titulo: "Pedido", tituloPagina: "Pedido — POC_Lab" },
  {
    rota: "/indicadores",
    titulo: "Indicadores",
    tituloPagina: "Indicadores — POC_Lab",
  },
  { rota: "/qualidade", titulo: "Qualidade", tituloPagina: "Qualidade — POC_Lab" },
  {
    rota: "/rota-inexistente",
    titulo: "Página não encontrada",
    tituloPagina: "Página não encontrada — POC_Lab",
  },
];

describe("Casca/Rotas — <h1> e <title> por rota", () => {
  for (const { rota, titulo, tituloPagina } of rotasEsperadas) {
    it(`rota ${rota} exibe <h1>"${titulo}"</h1> e document.title correto`, () => {
      const { getByRole } = renderEm(rota);

      expect(getByRole("heading", { name: titulo })).toBeInTheDocument();
      expect(document.title).toBe(tituloPagina);
    });
  }
});

describe("Casca/Rotas — único <nav> no DOM", () => {
  for (const { rota } of rotasEsperadas) {
    it(`rota ${rota} tem exatamente 1 elemento de navegação`, () => {
      const { getAllByRole } = renderEm(rota);

      expect(getAllByRole("navigation")).toHaveLength(1);
    });
  }
});

describe("Casca/Rotas — aria-current no item ativo", () => {
  it('rota "/" marca aria-current="page" só em Divergências', () => {
    const { getByRole } = renderEm("/");

    expect(getByRole("link", { name: /divergências/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      getByRole("link", { name: /indicadores/i }),
    ).not.toHaveAttribute("aria-current");
    expect(getByRole("link", { name: /qualidade/i })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it('rota "/qualidade" marca aria-current="page" só em Qualidade', () => {
    const { getByRole } = renderEm("/qualidade");

    expect(getByRole("link", { name: /qualidade/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      getByRole("link", { name: /divergências/i }),
    ).not.toHaveAttribute("aria-current");
    expect(
      getByRole("link", { name: /indicadores/i }),
    ).not.toHaveAttribute("aria-current");
  });
});

describe("Casca/Rotas — navegação move o foco para o novo <h1>", () => {
  it("clique em 'Indicadores' no nav foca o <h1> da nova rota", () => {
    const { getByRole } = renderEm("/");

    fireEvent.click(getByRole("link", { name: /indicadores/i }));

    const novoTitulo = getByRole("heading", { name: "Indicadores" });
    expect(document.activeElement).toBe(novoTitulo);
  });

  it("clique em 'Qualidade' no nav foca o <h1> da nova rota", () => {
    const { getByRole } = renderEm("/");

    fireEvent.click(getByRole("link", { name: /qualidade/i }));

    const novoTitulo = getByRole("heading", { name: "Qualidade" });
    expect(document.activeElement).toBe(novoTitulo);
  });
});

describe('Link "Pular para o conteúdo"', () => {
  it('existe e aponta para "#conteudo-principal" em qualquer rota', () => {
    const { getByRole } = renderEm("/");

    const link = getByRole("link", { name: "Pular para o conteúdo" });
    expect(link).toHaveAttribute("href", "#conteudo-principal");
  });
});

describe("T5 — Página não encontrada", () => {
  it('tem link "Voltar para Divergências" apontando para "/"', () => {
    const { getByRole } = renderEm("/rota-inexistente");

    const link = getByRole("link", { name: /voltar para divergências/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("não faz nenhuma chamada de rede ao montar (fetch mockado nunca é chamado)", () => {
    // T5 não importa `cliente-api` nem qualquer módulo de dados — é
    // puramente apresentacional. Substituímos `fetch` global por um mock
    // (mesmo padrão de cliente-api.test.ts) só para confirmar isso em
    // runtime, sem precisar simular nenhuma resposta real.
    const fetchOriginal = global.fetch;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <MemoryRouter initialEntries={["/rota-inexistente"]}>
        <NaoEncontrada />
      </MemoryRouter>,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    global.fetch = fetchOriginal;
  });
});

describe("Casca/Rotas — acessibilidade (vitest-axe)", () => {
  for (const { rota } of rotasEsperadas) {
    it(`rota ${rota} não tem violações de acessibilidade`, async () => {
      const { container } = renderEm(rota);

      const resultados = await axe(container);

      expect(resultados).toHaveNoViolations();
    });
  }

  it("NaoEncontrada isolada não tem violações de acessibilidade", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/rota-inexistente"]}>
        <NaoEncontrada />
      </MemoryRouter>,
    );

    const resultados = await axe(container);

    expect(resultados).toHaveNoViolations();
  });
});
