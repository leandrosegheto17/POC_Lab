// `consultarApi`: mapeamento completo para `ResultadoConsulta`,
// sem nunca expor `detail`/status/corpo bruto.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  consultarApi,
  MENSAGEM_CONSULTA_INVALIDA,
  MENSAGEM_FORMATO_INESPERADO,
  MENSAGEM_INDISPONIVEL,
  MENSAGEM_SEM_CONEXAO,
  MENSAGEM_TEMPO_ESGOTADO,
} from "../src/dados/cliente-api.ts";
import { respostaFake } from "./apoio/api-simulada.tsx";

const EsquemaTeste = z.object({ nome: z.string() });

/** Corpo RFC 9457 válido conforme `EsquemaErro`. */
function corpoErro(
  codigo: "parametro_invalido" | "pedido_nao_encontrado" | "erro_interno",
  status: number,
) {
  return {
    type: `https://poc-lab.dev/erros/${codigo}`,
    title: "Título de teste",
    status,
    detail: "detalhe interno que NUNCA deve chegar ao usuário",
    codigo,
    ...(status === 400
      ? { erros: [{ campo: "x", mensagem: "obrigatório" }] }
      : {}),
  };
}

describe("consultarApi", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("200 com corpo válido → sucesso com os dados certos", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve({ nome: "pedido-1" }) })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({ tipo: "sucesso", dados: { nome: "pedido-1" } });
  });

  it("200 com corpo que falha no esquema zod → erro de formato inesperado", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve({ outraCoisa: 1 }) })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_FORMATO_INESPERADO,
    });
  });

  it("200 com corpo não-JSON → mesmo erro de formato inesperado", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: true,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_FORMATO_INESPERADO,
    });
  });

  it("400 com corpo RFC 9457 → erro com código, mensagem genérica, sem 'detail'", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () => Promise.resolve(corpoErro("parametro_invalido", 400)),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_CONSULTA_INVALIDA,
      codigo: "parametro_invalido",
    });
    expect(JSON.stringify(resultado)).not.toContain(
      "detalhe interno que NUNCA deve chegar ao usuário",
    );
  });

  it("404 → erro com código pedido_nao_encontrado", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 404,
        json: () => Promise.resolve(corpoErro("pedido_nao_encontrado", 404)),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_CONSULTA_INVALIDA,
      codigo: "pedido_nao_encontrado",
    });
  });

  it("500 → mensagem de indisponibilidade com código erro_interno", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 500,
        json: () => Promise.resolve(corpoErro("erro_interno", 500)),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_INDISPONIVEL,
      codigo: "erro_interno",
    });
  });

  it("502 com corpo fora do esquema → mensagem de indisponível", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ mensagem: "algo quebrou" }),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_INDISPONIVEL,
    });
  });

  it("503 com corpo HTML (não-JSON) → mensagem de indisponível", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 503,
        json: () => Promise.reject(new SyntaxError("Unexpected token <")),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_INDISPONIVEL,
    });
  });

  it("4xx com corpo fora do esquema → formato inesperado", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ mensagem: "algo quebrou" }),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_FORMATO_INESPERADO,
    });
  });

  it("fetch rejeitando com erro de rede (não abort) → mensagem de sem conexão", async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    const resultado = await consultarApi("/api/x", EsquemaTeste);

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_SEM_CONEXAO,
    });
  });

  it("tempo esgotado (10s) → mensagem de tempo esgotado", async () => {
    global.fetch = vi.fn(
      (_caminho: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const promessa = consultarApi("/api/x", EsquemaTeste);
    await vi.advanceTimersByTimeAsync(10_000);

    const resultado = await promessa;

    expect(resultado).toEqual({
      tipo: "erro",
      mensagem: MENSAGEM_TEMPO_ESGOTADO,
    });
  });

  it("cancelada via signal externo abortado durante a chamada → cancelada, sem mensagem", async () => {
    global.fetch = vi.fn(
      (_caminho: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const controllerExterno = new AbortController();
    const promessa = consultarApi("/api/x", EsquemaTeste, {
      signal: controllerExterno.signal,
    });
    controllerExterno.abort();

    const resultado = await promessa;

    expect(resultado).toEqual({ tipo: "cancelada" });
  });

  it("cancelada via signal externo já abortado antes da chamada → cancelada", async () => {
    global.fetch = vi.fn(
      (_caminho: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const controllerExterno = new AbortController();
    controllerExterno.abort();

    const resultado = await consultarApi("/api/x", EsquemaTeste, {
      signal: controllerExterno.signal,
    });

    expect(resultado).toEqual({ tipo: "cancelada" });
  });

  it("nenhum caso de erro expõe 'detail', status numérico como texto ou corpo bruto", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 400,
        json: () => Promise.resolve(corpoErro("parametro_invalido", 400)),
      })),
    );

    const resultado = await consultarApi("/api/x", EsquemaTeste);
    const textoCompleto = JSON.stringify(resultado);

    expect(textoCompleto.toLowerCase()).not.toContain("detail");
    expect(textoCompleto).not.toContain("400");
    expect(textoCompleto).not.toContain(
      "detalhe interno que NUNCA deve chegar ao usuário",
    );
  });
});
