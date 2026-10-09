// Tela Indicadores: erro 5xx/rede/timeout, carregando e acessibilidade
// (vitest-axe).
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import {
  instalarFetchMock,
  instalarIndicadoresFixos,
  renderizar,
  respostaIndicadoresValida,
} from "./apoio/indicadores-simulada.tsx";
import { esperarMensagemIndisponivel, respostaApi500 } from "./apoio/estados-erro.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Indicadores — erro 5xx/rede/timeout", () => {
  it("mostra EstadoErro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    renderizar();

    await waitFor(() => {
      expect(
        screen.getByText("Sem conexão com o servidor."),
      ).toBeInTheDocument();
    });

    const chamadasAntes = mock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    await waitFor(() => {
      expect(mock.mock.calls.length).toBeGreaterThan(chamadasAntes);
    });
  });

  it("5xx mostra a mensagem de indisponibilidade", async () => {
    instalarFetchMock(() =>
      respostaApi500({
        type: "about:blank",
        title: "Erro interno",
        status: 500,
        detail: "falha",
        codigo: "erro_interno",
      }),
    );

    renderizar();

    await esperarMensagemIndisponivel();
  });
});

describe("Indicadores — carregando", () => {
  it("mostra 'Carregando indicadores…' com aria-busy='true'", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Carregando indicadores…")).toBeInTheDocument();
    expect(
      container.querySelector("[aria-busy='true']"),
    ).toBeInTheDocument();
  });
});

describe("Indicadores — acessibilidade (vitest-axe)", () => {
  it("sucesso não tem violações", async () => {
    instalarIndicadoresFixos(respostaIndicadoresValida());

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Divergências por tipo" }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("carregando não tem violações", async () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

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
});
