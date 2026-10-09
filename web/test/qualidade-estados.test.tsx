// Tela Qualidade dos dados: erro 5xx/rede, carregando e acessibilidade
// (vitest-axe).
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { respostaFake } from "./apoio/api-simulada.tsx";
import {
  chamadas,
  DUAS_SUGESTOES,
  formaPc,
  instalarFetchMock,
  instalarQualidadeFixa,
  renderizar,
  respostaComSugestoes,
  respostaQualidadeValida,
} from "./apoio/qualidade-simulada.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Qualidade — erro 5xx/rede", () => {
  it("mostra mensagem de erro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    const chamadasAntes = chamadas(mock).length;
    expect(chamadasAntes).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => {
      expect(chamadas(mock).length).toBeGreaterThan(chamadasAntes);
    });
  });

  it("erro 5xx vindo da API também mostra 'Tentar de novo'", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          type: "about:blank",
          title: "Erro interno",
          status: 500,
          detail: "Falha ao gerar relatório.",
          codigo: "erro_interno",
        }),
      })),
    );

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Não foi possível consultar os dados agora. Tente de novo em alguns segundos.",
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Tentar de novo" }),
    ).toBeInTheDocument();
  });
});

describe("Qualidade — carregando", () => {
  it("mostra 'Carregando relatório…' com aria-busy='true'", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Carregando relatório…")).toBeInTheDocument();
    expect(
      container.querySelector("[aria-busy='true']"),
    ).toBeInTheDocument();
  });
});

describe("Qualidade — acessibilidade (vitest-axe)", () => {
  it("carregando não tem violações", async () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Carregando relatório…")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("erro não tem violações", async () => {
    instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sucesso (achado com contagem 0 e achado com exemplos) não tem violações", async () => {
    instalarQualidadeFixa(respostaQualidadeValida());

    const { container } = renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sucesso com tabela de Sugestões da IA preenchida não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () =>
          Promise.resolve(respostaComSugestoes(DUAS_SUGESTOES)),
      })),
    );

    const { container } = renderizar();

    await waitFor(() => {
      expect(formaPc()).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
