// Tela Divergências: lê `?tipo=` da URL, consulta `/api/v1/divergencias`,
// filtro + tabela em sucesso e troca de chip. Os estados vazio/erro/carregando
// e a acessibilidade ficam em `divergencias-estados.test.tsx`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import {
  chamadasDeDivergencias,
  divergenciaValida,
  instalarDivergenciasFixas,
  renderizarDivergencias as renderizar,
  respostaDivergenciasValida,
} from "./apoio/api-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Divergencias — sucesso", () => {
  it("mostra o total no h1, a tabela e o caption com filtro/página", async () => {
    instalarDivergenciasFixas(
      respostaDivergenciasValida({
        dados: [divergenciaValida("PED-001", "duplicado")],
        total: 1,
        totalPaginas: 1,
      }),
    );

    renderizar();

    // Total dentro do h1, contando divergências (singular/plural) — no PC
    // fica só para leitor de tela.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Divergências (1 divergência)" }),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Fila de conciliação")).toHaveClass(
      "rotulo-pagina",
    );

    // Tabela (PC) e lista de cartões (celular) ficam no DOM, alternadas só
    // por CSS — cada link aparece duas vezes, ambos para a página do pedido.
    const links = screen.getAllByRole("link", { name: "PED-001" });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/pedido/PED-001");
      expect(link).toHaveClass("mono");
    }
    expect(
      screen.getAllByText("Pago duas vezes", { selector: ".etiqueta" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Pagamento recebido em duplicidade"),
    ).toHaveLength(2);
    expect(screen.getAllByText("2 eventos ▸")).toHaveLength(2);

    const caption = screen.getByText("Filtro: Todos · página 1 de 1");
    expect(caption.tagName).toBe("CAPTION");

    // Colunas sem Devido/Pago (fora deste ciclo, ADR-016).
    const tabela = screen.getByRole("table");
    const cabecalhos = within(tabela)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(cabecalhos).toEqual(["Pedido", "Tipo", "Motivo", "Eventos"]);
    expect(
      screen.getByRole("region", { name: "Tabela de divergências" }),
    ).toBeInTheDocument();

    // Lista do celular: um cartão por divergência.
    const lista = screen.getByRole("list", { name: "Lista de divergências" });
    expect(within(lista).getAllByRole("listitem")[0]).toHaveClass(
      "divergencias__cartao",
    );
  });

  it("total no h1 com milhar e resumo da paginação 'início–fim de total'", async () => {
    instalarDivergenciasFixas(
      respostaDivergenciasValida({
        dados: [divergenciaValida("PED-001", "duplicado")],
        total: 8856,
        totalPaginas: 178,
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "Divergências (8.856 divergências)",
        }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("1–50 de 8.856")).toBeInTheDocument();
    expect(
      screen.getByText("Filtro: Todos · página 1 de 178"),
    ).toBeInTheDocument();
  });

  it("singular '1 evento ▸' quando há um só evento", async () => {
    instalarDivergenciasFixas(
      respostaDivergenciasValida({
        dados: [
          {
            pedido: "PED-003",
            tipo: "entrega_atrasada",
            motivo: "6 dias depois da data limite",
            eventos: [
              {
                tipo: "entrega",
                data: "2016-07-21T20:00:15.260Z",
                fonte: "rastreio",
                codigo: "RS-5521",
              },
            ],
          },
        ],
      }),
    );

    renderizar();

    await waitFor(() => {
      expect(screen.getAllByText("1 evento ▸")).toHaveLength(2);
    });
  });

  it("expande os eventos dentro do <details> com data, sistema e tipo em português", async () => {
    instalarDivergenciasFixas(
      respostaDivergenciasValida({
        dados: [
          {
            pedido: "PED-002",
            tipo: "parcial",
            motivo: "Faltam R$ 663,40",
            eventos: [
              {
                tipo: "pagamento",
                data: "2016-07-21T20:00:15.260Z",
                fonte: "pagamentos",
                codigo: "TX-88812",
              },
              {
                tipo: "transporte",
                data: "2016-07-22",
                fonte: "rastreio",
                codigo: "RS-5521",
              },
            ],
          },
        ],
      }),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getAllByText("2 eventos ▸")).toHaveLength(2);
    });

    fireEvent.click(obrigatorio(screen.getAllByText("2 eventos ▸")[0], "botão de eventos"));

    const tabela = screen.getByRole("table");
    const detalhes = tabela.querySelector("details");
    expect(detalhes).not.toBeNull();

    const itens = Array.from(obrigatorio(detalhes).querySelectorAll("li")).map(
      (li) => li.textContent,
    );
    expect(itens).toEqual([
      "2016-07-21 · Pagamentos · Pagamento · TX-88812",
      "2016-07-22 · Transportadora · Em trânsito · RS-5521",
    ]);
    expect(within(detalhes as HTMLElement).getByText("TX-88812")).toHaveClass(
      "mono",
    );
    // O anúncio "N de T divergências, página X de Y" existe só para leitor de
    // tela (`visualmente-oculto`) dentro da região aria-live.
    expect(
      container.querySelector("p.visualmente-oculto"),
    ).toHaveTextContent(/divergências, página 1 de 1/);
  });
});

describe("Divergencias — filtro via URL e troca de chip", () => {
  it("usa ?tipo= inicial na chamada e atualiza a URL/chamada ao trocar de chip", async () => {
    const mock = instalarDivergenciasFixas(
      respostaDivergenciasValida({
        dados: [divergenciaValida("PED-010", "duplicado")],
      }),
    );

    renderizar(["/?tipo=duplicado"]);

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.length).toBeGreaterThan(0);
      expect(chamadas[0]).toContain("tipo=duplicado");
    });

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes/ }),
      ).toBeChecked();
    });

    fireEvent.click(screen.getByRole("radio", { name: /Pagamento parcial/ }));

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      expect(chamadas.some((url) => url.includes("tipo=parcial"))).toBe(
        true,
      );
    });

    expect(
      screen.getByRole("radio", { name: /Pagamento parcial/ }),
    ).toBeChecked();
  });

  it("selecionar 'Todos' remove o parâmetro ?tipo= da URL (não escreve tipo=todos)", async () => {
    const mock = instalarDivergenciasFixas(respostaDivergenciasValida());

    renderizar(["/?tipo=duplicado"]);

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes/ }),
      ).toBeChecked();
    });

    fireEvent.click(screen.getByRole("radio", { name: /^Todos/ }));

    await waitFor(() => {
      const chamadas = chamadasDeDivergencias(mock);
      const ultima = chamadas[chamadas.length - 1];
      expect(ultima).not.toContain("tipo=");
      expect(ultima).not.toContain("tipo=todos");
    });
  });
});
