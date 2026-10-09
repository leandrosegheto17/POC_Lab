// Tela Divergências: estados vazio, vazio corrigível (tipo inválido na URL),
// 400 real da API, erro 5xx/rede, carregando e acessibilidade. Tipo inválido
// na URL e 400 real da API são tratados pela MESMA mensagem/link; "Tentar de
// novo" refaz a mesma chamada.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import {
  chamadasDeDivergencias,
  divergenciaValida,
  erroParametroInvalido,
  instalarDivergenciasFixas,
  instalarFetchMock,
  renderizarDivergencias as renderizar,
  respostaDivergenciasValida,
  respostaFake,
} from "./apoio/api-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

const SEM_ITENS = respostaDivergenciasValida({
  dados: [],
  total: 0,
  totalPaginas: 0,
});

describe("Divergencias — vazio", () => {
  it("sem itens mostra mensagem com o rótulo do filtro ativo", async () => {
    instalarDivergenciasFixas(SEM_ITENS);

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum pedido com divergência do tipo Todos."),
      ).toBeInTheDocument();
    });
  });
});

describe("Divergencias — vazio corrigível (tipo inválido na URL)", () => {
  it("mostra a mensagem e o link, sem chamar a API de divergências", async () => {
    const mock = instalarDivergenciasFixas(respostaDivergenciasValida());

    renderizar(["/?tipo=inexistente"]);

    await waitFor(() => {
      expect(
        screen.getByText("O filtro do endereço não é válido."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Ver todas as divergências" }),
    ).toHaveAttribute("href", "/");

    expect(chamadasDeDivergencias(mock)).toHaveLength(0);
  });
});

describe("Divergencias — 400 real da API (parametro_invalido)", () => {
  it("trata igual ao tipo inválido na URL: mesma mensagem e link", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () => Promise.resolve(erroParametroInvalido()),
      })),
    );

    renderizar(["/?tipo=duplicado"]);

    await waitFor(() => {
      expect(
        screen.getByText("O filtro do endereço não é válido."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: "Ver todas as divergências" }),
    ).toHaveAttribute("href", "/");
  });
});

describe("Divergencias — erro 5xx/rede", () => {
  it("mostra mensagem de erro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    const chamadasAntes = chamadasDeDivergencias(mock).length;
    expect(chamadasAntes).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => {
      expect(chamadasDeDivergencias(mock).length).toBeGreaterThan(
        chamadasAntes,
      );
    });
  });
});

describe("Divergencias — carregando", () => {
  it("expõe aria-busy='true' enquanto a consulta não resolve", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(
      container.querySelector("[aria-busy='true']"),
    ).toBeInTheDocument();
  });
});

describe("Divergencias — acessibilidade (vitest-axe)", () => {
  it("sucesso não tem violações", async () => {
    instalarDivergenciasFixas(
      respostaDivergenciasValida({
        dados: [divergenciaValida("PED-900", "duplicado")],
      }),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: "PED-900" }).length,
      ).toBeGreaterThan(0);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio não tem violações", async () => {
    instalarDivergenciasFixas(SEM_ITENS);

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Nenhum pedido com divergência do tipo Todos."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio corrigível (tipo inválido na URL) não tem violações", async () => {
    instalarDivergenciasFixas(respostaDivergenciasValida());

    const { container } = renderizar(["/?tipo=inexistente"]);

    await waitFor(() => {
      expect(
        screen.getByText("O filtro do endereço não é válido."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
