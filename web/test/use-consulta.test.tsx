// `useConsulta`: só a chamada mais recente atualiza o estado,
// mesmo quando a resposta da chamada anterior chega depois (fora de ordem).
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { z } from "zod";
import * as clienteApi from "../src/dados/cliente-api.ts";
import type { ResultadoConsulta } from "../src/dados/cliente-api.ts";
import { useConsulta } from "../src/dados/use-consulta.ts";

const EsquemaTeste = z.object({ nome: z.string() });

interface DadosTeste {
  nome: string;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useConsulta", () => {
  it("troca de URL antes da primeira resposta: só o resultado da chamada mais recente conta", async () => {
    type Resolvedor = (valor: ResultadoConsulta<DadosTeste>) => void;

    const resolvedores: Resolvedor[] = [];

    vi.spyOn(clienteApi, "consultarApi").mockImplementation(
      () =>
        new Promise<ResultadoConsulta<DadosTeste>>((resolve) => {
          resolvedores.push(resolve);
        }),
    );

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useConsulta(url, EsquemaTeste),
      { initialProps: { url: "/api/pedido-a" } },
    );

    expect(result.current).toEqual({ status: "carregando" });

    // Troca a URL antes de a primeira chamada responder — dispara a
    // segunda chamada e aborta a primeira.
    rerender({ url: "/api/pedido-b" });

    expect(resolvedores).toHaveLength(2);

    // Resolve fora de ordem: a chamada MAIS RECENTE (segunda) primeiro,
    // com dados válidos; a chamada antiga (primeira) depois, também com
    // dados "válidos" — se não houvesse proteção contra chamada obsoleta,
    // o resultado antigo sobrescreveria o novo.
    resolvedores[1]?.({ tipo: "sucesso", dados: { nome: "pedido-b" } });

    await waitFor(() => {
      expect(result.current).toEqual({
        status: "sucesso",
        dados: { nome: "pedido-b" },
      });
    });

    resolvedores[0]?.({ tipo: "sucesso", dados: { nome: "pedido-a" } });

    // Dá chance ao microtask da `Promise` antiga de rodar; o estado deve
    // permanecer o da chamada mais recente.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toEqual({
      status: "sucesso",
      dados: { nome: "pedido-b" },
    });
  });

  it("não dispara nenhuma chamada quando a url é null", () => {
    const espiao = vi.spyOn(clienteApi, "consultarApi");

    const { result } = renderHook(() => useConsulta(null, EsquemaTeste));

    expect(espiao).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: "carregando" });
  });

  it("resultado 'cancelada' nunca atualiza o estado", async () => {
    let resolvedor: ((valor: ResultadoConsulta<DadosTeste>) => void) | undefined;

    vi.spyOn(clienteApi, "consultarApi").mockImplementation(
      () =>
        new Promise<ResultadoConsulta<DadosTeste>>((resolve) => {
          resolvedor = resolve;
        }),
    );

    const { result } = renderHook(() => useConsulta("/api/x", EsquemaTeste));

    resolvedor?.({ tipo: "cancelada" });

    // Dá chance ao microtask rodar.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toEqual({ status: "carregando" });
  });
});
