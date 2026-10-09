// Tela Pedido: vazio (404/400), erro 5xx/rede/timeout, carregando e
// acessibilidade (vitest-axe).
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { respostaFake } from "./apoio/api-simulada.tsx";
import {
  chamadas,
  instalarFetchMock,
  instalarPedidoFixo,
  renderizar,
  respostaErro,
  respostaLinhaDoTempoValida,
} from "./apoio/pedido-simulado.tsx";
import { esperarMensagemIndisponivel, respostaApi500 } from "./apoio/estados-erro.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Pedido — vazio (404/400)", () => {
  it("404 pedido_nao_encontrado: 'Pedido não encontrado' + dica de formatos, sem 'Tentar de novo', sem role=alert", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve(respostaErro({ status: 404, codigo: "pedido_nao_encontrado" })),
      })),
    );

    renderizar("PED-999999");

    // Aparece tanto no <h1> quanto no corpo do `EstadoVazio` — dois
    // elementos distintos, mesmo texto.
    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });
    expect(
      screen.getByRole("heading", { level: 1, name: "Pedido não encontrado" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Use o código do pedido \(PED-nnnnnn\)/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tentar de novo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/detalhe tecnico/)).not.toBeInTheDocument();
  });

  it("400 parametro_invalido: mesma mensagem de 'vazio', sem 'Tentar de novo'", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve(respostaErro({ status: 400, codigo: "parametro_invalido" })),
      })),
    );

    renderizar("codigo-invalido");

    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });

    expect(
      screen.queryByRole("button", { name: "Tentar de novo" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Pedido — erro 5xx/rede/timeout", () => {
  it("erro de rede mostra EstadoErro e 'Tentar de novo' refaz a chamada", async () => {
    const mock = instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem conexão com o servidor.")).toBeInTheDocument();
    });

    const botao = screen.getByRole("button", { name: "Tentar de novo" });
    const chamadasAntes = chamadas(mock).length;

    fireEvent.click(botao);

    await waitFor(() => {
      expect(chamadas(mock).length).toBeGreaterThan(chamadasAntes);
    });
  });

  it("erro 5xx da API mostra EstadoErro com 'Tentar de novo'", async () => {
    instalarFetchMock(() =>
      respostaApi500(respostaErro({ status: 500, codigo: "erro_interno" })),
    );

    renderizar();

    await esperarMensagemIndisponivel();

    expect(
      screen.getByRole("button", { name: "Tentar de novo" }),
    ).toBeInTheDocument();
  });
});

describe("Pedido — carregando", () => {
  it("mostra 'Buscando pedido…' com aria-busy='true'", () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Buscando pedido…")).toBeInTheDocument();
    expect(container.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });
});

describe("Pedido — acessibilidade (vitest-axe)", () => {
  it("carregando não tem violações", async () => {
    instalarFetchMock(() => new Promise<Response>(() => {}));

    const { container } = renderizar();

    expect(screen.getByText("Buscando pedido…")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("erro (5xx/rede) não tem violações", async () => {
    instalarFetchMock(() => Promise.reject(new TypeError("Failed to fetch")));

    const { container } = renderizar();

    await waitFor(() => {
      expect(screen.getByText("Sem conexão com o servidor.")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("vazio (404) não tem violações", async () => {
    instalarFetchMock(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve(respostaErro({ status: 404, codigo: "pedido_nao_encontrado" })),
      })),
    );

    const { container } = renderizar("PED-999999");

    await waitFor(() => {
      expect(screen.getAllByText("Pedido não encontrado")).toHaveLength(2);
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sucesso não tem violações", async () => {
    instalarPedidoFixo(respostaLinhaDoTempoValida());

    const { container } = renderizar();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Pedido PED-000001" }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
