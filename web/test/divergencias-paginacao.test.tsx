// Tela Divergências: paginação na URL (`?pagina=`), reset de página ao trocar
// filtro, foco no `<caption>` ao trocar de página (sem afetar o foco no `<h1>`
// da troca de rota) e botões de `Paginacao` com `aria-disabled` (nunca
// `disabled` nativo) durante a carga. Casos de borda (erro, corrida de
// respostas, página inexistente, `pagina` inválida) ficam em
// `divergencias-paginacao-bordas.test.tsx`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import {
  chamadasDeDivergencias,
  instalarDivergenciasPorPagina,
  instalarSegundaPaginaPendente,
  renderizarDivergencias as renderizar,
} from "./apoio/api-simulada.tsx";
import { formaCompleta } from "./apoio/paginacao.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Divergencias — paginação via URL (?pagina=)", () => {
  it("usa ?pagina= inicial na chamada, no caption e no <title>", async () => {
    const mock = instalarDivergenciasPorPagina({
      total: 120,
      totalPaginas: 3,
      pedido: () => "PED-100",
    });

    renderizar(["/?pagina=2"]);

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.length).toBeGreaterThan(0);
      expect(chamadas[0]).toContain("pagina=2");
    });

    await waitFor(() => {
      const caption = screen.getByText(
        "Filtro: Todos · página 2 de 3",
      );
      expect(caption.tagName).toBe("CAPTION");
    });

    expect(document.title).toBe("Divergências, página 2 — POC_Lab");
  });

  it("clicar em 'Próxima' atualiza a URL e chama a página 2", async () => {
    const mock = instalarDivergenciasPorPagina({ total: 100, totalPaginas: 2 });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.some((url) => url.includes("pagina=2"))).toBe(true);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 2 de 2"),
      ).toBeInTheDocument();
    });

    // Resumo "início–fim de total" dentro da paginação.
    expect(screen.getByText("51–100 de 100")).toBeInTheDocument();
  });

  it("trocar o filtro enquanto em ?pagina=3 reseta a página para 1 numa única navegação", async () => {
    const mock = instalarDivergenciasPorPagina({
      total: 150,
      totalPaginas: 3,
      pedido: () => "PED-X",
    });

    renderizar(["/?pagina=3"]);

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).some((url) => url.includes("pagina=3"))).toBe(
        true,
      );
    });

    fireEvent.click(screen.getByRole("radio", { name: /Pagamento parcial/ }));

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      const ultima = chamadas[chamadas.length - 1];
      expect(ultima).toContain("tipo=parcial");
      expect(ultima).not.toContain("pagina=3");
    });

    // Uma única navegação: nenhuma chamada intermediária com tipo=parcial e
    // pagina=3 (o que indicaria duas atualizações de searchParams em
    // sequência em vez de uma).
    const chamadas = chamadasDeDivergencias(mock);
    expect(
      chamadas.some((url) => url.includes("tipo=parcial") && url.includes("pagina=3")),
    ).toBe(false);
  });

  it("durante a troca de página os botões de Paginacao ficam aria-disabled mas continuam no DOM e focáveis", async () => {
    const { mock, liberarSegundaPagina } = instalarSegundaPaginaPendente({
      total: 100,
      totalPaginas: 2,
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    const botaoProxima = formaCompleta(container).getByRole("button", {
      name: "Próxima",
    });
    fireEvent.click(botaoProxima);

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).some((url) => url.includes("pagina=2"))).toBe(
        true,
      );
    });

    await waitFor(() => {
      expect(botaoProxima).toHaveAttribute("aria-disabled", "true");
    });
    expect(botaoProxima).not.toHaveAttribute("disabled");
    expect(botaoProxima).toBeInTheDocument();
    // continua focável (sem `disabled` nativo) mesmo desabilitado visualmente.
    botaoProxima.focus();
    expect(document.activeElement).toBe(botaoProxima);

    expect(chamadasDeDivergencias(mock)).toHaveLength(2);
    liberarSegundaPagina();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 2 de 2"),
      ).toBeInTheDocument();
    });
  });

  it("ao trocar de página o foco vai ao caption e a região aria-live anuncia 'página X de Y'", async () => {
    instalarDivergenciasPorPagina({ total: 100, totalPaginas: 2 });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      const caption = screen.getByText("Filtro: Todos · página 2 de 2");
      expect(document.activeElement).toBe(caption);
    });

    const regiaoViva = container.querySelector("[aria-live='polite']");
    expect(regiaoViva).toHaveTextContent("1 de 100 divergências, página 2 de 2");
  });
});

describe("Divergencias — paginação e acessibilidade (vitest-axe)", () => {
  it("sucesso na página 2 não tem violações", async () => {
    instalarDivergenciasPorPagina({
      total: 100,
      totalPaginas: 2,
      pedido: () => "PED-200",
    });

    const { container } = renderizar(["/?pagina=2"]);

    await waitFor(() => {
      // Tabela (PC) e lista (celular) ficam no DOM, alternadas por CSS.
      expect(screen.getAllByText("PED-200").length).toBeGreaterThan(0);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("carregando a próxima página com botões aria-disabled não tem violações", async () => {
    const { liberarSegundaPagina } = instalarSegundaPaginaPendente({
      total: 100,
      totalPaginas: 2,
    });

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 1 de 2"),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      formaCompleta(container).getByRole("button", { name: "Próxima" }),
    );

    await waitFor(() => {
      const botaoProxima = formaCompleta(container).getByRole("button", {
        name: "Próxima",
      });
      expect(botaoProxima).toHaveAttribute("aria-disabled", "true");
    });

    expect(await axe(container)).toHaveNoViolations();

    liberarSegundaPagina();
    await waitFor(() => {
      expect(
        screen.getByText("Filtro: Todos · página 2 de 2"),
      ).toBeInTheDocument();
    });
  });
});
