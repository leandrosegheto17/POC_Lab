import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { Rotas } from "../src/Rotas.tsx";
import { NaoEncontrada } from "../src/paginas/NaoEncontrada.tsx";
import { obrigatorio } from "./apoio/obrigatorio.ts";

// casca do app: nav única, rotas T1-T5, <title> por rota, foco no
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
  {
    rota: "/qualidade",
    titulo: "Qualidade dos dados",
    tituloPagina: "Qualidade dos dados — POC_Lab",
  },
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

describe("Casca/Rotas — sem <header> de largura cheia; barra única com logo, busca, nav e faixa", () => {
  it('rota "/" não tem nenhum elemento com role "banner" (header)', () => {
    const { queryByRole } = renderEm("/");

    expect(queryByRole("banner")).not.toBeInTheDocument();
  });

  it('a barra lateral (".casca__barra") contém logo, busca, nav e faixa, nessa ordem no DOM', () => {
    const { container } = renderEm("/");

    const barra = container.querySelector(".casca__barra");
    expect(barra).not.toBeNull();

    const filhos = Array.from(obrigatorio(barra).children).map((el) => el.className);
    const indiceLogo = filhos.findIndex((c) => c.includes("logo-marca"));
    const indiceBusca = filhos.findIndex((c) => c.includes("campo-busca"));
    const indiceNav = filhos.findIndex((c) => c.includes("navegacao-principal"));
    const indiceFaixa = filhos.findIndex((c) => c.includes("faixa-resumo"));

    expect(indiceLogo).toBeGreaterThanOrEqual(0);
    expect(indiceBusca).toBeGreaterThan(indiceLogo);
    expect(indiceNav).toBeGreaterThan(indiceBusca);
    expect(indiceFaixa).toBeGreaterThan(indiceNav);
  });

  it('exibe a marca "POC_Lab" e o subtítulo "conciliação de pedidos"', () => {
    const { getByText } = renderEm("/");

    expect(getByText("POC_Lab")).toBeInTheDocument();
    expect(getByText("conciliação de pedidos")).toBeInTheDocument();
  });
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

describe("Casca/Rotas — ajuste Modelo B (2026-10-08)", () => {
  it('em "/pedido/X", Divergências tem a classe de ativo mas não aria-current', () => {
    const { getByRole } = renderEm("/pedido/ABC");

    // Dentro da nav: a página T2 tem o próprio link "← Divergências".
    const nav = getByRole("navigation", { name: "Navegação principal" });
    const link = within(nav).getByRole("link", { name: /^divergências$/i });
    expect(link).toHaveClass("navegacao-principal__item--ativo");
    expect(link).not.toHaveAttribute("aria-current");
  });

  it("rótulos da navegação: 'Qualidade dos dados'/'Qualidade' e 'Como foi feito' sem seta", () => {
    const { container, getByRole } = renderEm("/");

    const nav = container.querySelector(".navegacao-principal");
    expect(nav?.querySelector(".so-pc")?.textContent).toBe(
      "Qualidade dos dados",
    );
    expect(nav?.querySelector(".so-celular")?.textContent).toBe(
      "Qualidade",
    );
    const externo = getByRole("link", {
      name: "Como foi feito (abre o repositório)",
    });
    expect(externo.textContent).toBe("Como foi feito");
  });

  it("casca completa: navegação com 4 ícones decorativos", () => {
    const { container } = renderEm("/");

    const icones = container.querySelectorAll(".navegacao-principal svg");
    expect(icones).toHaveLength(4);
    icones.forEach((icone) =>
      expect(icone).toHaveAttribute("aria-hidden", "true"),
    );
  });

  it("rota inexistente usa a casca simples: sem faixa, sem busca na barra e sem ícones", () => {
    const { container } = renderEm("/rota-inexistente");

    expect(container.querySelector(".casca--simples")).not.toBeNull();
    const barra = container.querySelector(".casca__barra");
    expect(barra?.querySelector(".faixa-resumo")).toBeNull();
    expect(barra?.querySelector(".campo-busca")).toBeNull();
    expect(container.querySelectorAll(".navegacao-principal svg")).toHaveLength(0);
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
  it('tem link "Ir para Divergências →" apontando para "/" (seta decorativa)', () => {
    const { getByRole, queryByRole } = renderEm("/rota-inexistente");

    const link = getByRole("link", { name: "Ir para Divergências" });
    expect(link).toHaveAttribute("href", "/");
    expect(link.textContent).toBe("Ir para Divergências →");
    expect(
      queryByRole("link", { name: /voltar para divergências/i }),
    ).not.toBeInTheDocument();
  });

  it("mostra o código 404 e o texto com o exemplo de código, sem a antiga 'Dica'", () => {
    const { getByText, queryByText } = renderEm("/rota-inexistente");

    expect(getByText("404")).toHaveClass("mono");
    expect(getByText("PED-000123")).toHaveClass("mono");
    expect(queryByText(/dica:/i)).not.toBeInTheDocument();
  });

  it("tem busca própria (variante 'pagina', id 'busca-pedido-404') e é a única busca da página", () => {
    const { container, getAllByRole, getByRole } = renderEm("/rota-inexistente");

    expect(getAllByRole("search")).toHaveLength(1);
    const busca = getByRole("search");
    expect(busca).toHaveClass("campo-busca--pagina");
    expect(container.querySelector(".casca__conteudo")).toContainElement(busca);

    const campo = getByRole("searchbox", { name: "Buscar pedido" });
    expect(campo).toHaveAttribute("id", "busca-pedido-404");
    expect(
      within(busca).getByRole("button", { name: "Buscar" }).textContent,
    ).toBe("Buscar");
  });

  it("a busca da T5 navega para /pedido/{código}", () => {
    const { getByRole, queryByRole } = renderEm("/rota-inexistente");

    fireEvent.change(getByRole("searchbox", { name: "Buscar pedido" }), {
      target: { value: "PED-000123" },
    });
    fireEvent.click(getByRole("button", { name: "Buscar" }));

    // Saiu da T5: a rota agora é /pedido/PED-000123 (tela T2).
    expect(
      queryByRole("heading", { name: "Página não encontrada" }),
    ).not.toBeInTheDocument();
  });

  it("não faz nenhuma chamada de rede ao montar (fetch mockado nunca é chamado)", () => {
    // T5 não importa `cliente-api` nem qualquer módulo de dados — é
    // puramente apresentacional. Substituímos `fetch` global por um mock
    // (mesmo padrão de cliente-api.test.ts) só para confirmar isso em
    // runtime, sem precisar simular nenhuma resposta real.
    const fetchOriginal = global.fetch;
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

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
