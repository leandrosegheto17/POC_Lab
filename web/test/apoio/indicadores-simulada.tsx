// Fábricas, `fetch` simulado e consultas de DOM compartilhados pelos testes da
// tela Indicadores (`GET /api/v1/indicadores`: lista de blocos do contrato).
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Indicadores } from "../../src/paginas/Indicadores.tsx";
import { respostaOk } from "./api-simulada.tsx";

export type LinhaMock = {
  rotulo: string;
  numerador: number;
  denominador: number;
  resultado: number | null;
};

export function linha(
  rotulo: string,
  numerador: number,
  denominador: number,
  resultado: number | null,
): LinhaMock {
  return { rotulo, numerador, denominador, resultado };
}

export function blocoEntregasNoPrazo(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "entregas_no_prazo",
    titulo: "Entregas no prazo por transportadora e mês",
    formula:
      "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida, por transportadora e mes da entrega",
    linhas: opcoes?.linhas ?? [
      linha("Transportadora A / 2026-08", 5, 10, 0.5),
      linha("Transportadora A / 2026-09", 8, 10, 0.8),
      linha("Transportadora B / 2026-09", 3, 4, 0.75),
      linha("Pedidos sem entrega", 37, 1, 37),
    ],
    aParte: true,
  };
}

export function blocoDivergenciasPorTipo(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "divergencias_por_tipo",
    titulo: "Divergências por tipo",
    formula: "numero de divergencias do tipo / total de divergencias",
    linhas: opcoes?.linhas ?? [
      linha("duplicado", 2, 10, 0.2),
      linha("parcial", 0, 10, 0),
      linha("pago_nao_enviado", 1, 10, 0.1),
      linha("enviado_nao_pago", 3, 10, 0.3),
      linha("entrega_atrasada", 4, 10, 0.4),
    ],
    aParte: false,
  };
}

export function respostaIndicadoresValida(opcoes?: {
  entregas?: unknown;
  divergencias?: unknown;
}): unknown {
  return [
    opcoes?.entregas ?? blocoEntregasNoPrazo(),
    opcoes?.divergencias ?? blocoDivergenciasPorTipo(),
  ];
}

// Os 2 blocos complementares (`tempoMedioPedidoEnvioEntrega` e
// `valorPagoVsDevido`). Nenhum dos dois tem
// `aParte` — todas as linhas entram na tabela de % normalmente.
export function blocoTempoMedio(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "tempoMedioPedidoEnvioEntrega",
    titulo: "Tempo médio pedido→envio e envio→entrega",
    formula: "soma de dias entre as datas ÷ contagem de pedidos elegíveis, por etapa",
    // Números no formato real: numerador = soma de dias (fracionária),
    // denominador = pedidos elegíveis, resultado = média arredondada.
    linhas: opcoes?.linhas ?? [
      linha("pedido→envio", 136511.4, 16261, 8.39),
      linha("envio→entrega", 66605.2, 16245, 4.1),
    ],
    aParte: false,
  };
}

export function blocoValorPagoVsDevido(opcoes?: { linhas?: LinhaMock[] }): unknown {
  return {
    chave: "valorPagoVsDevido",
    titulo: "Valor pago × valor devido",
    formula: "Σ pago ÷ Σ devido",
    // `resultado` do Total vem arredondado (0.99); a tela deve calcular
    // numerador ÷ denominador (21,0 mi ÷ 21,3 mi = 98,6%).
    linhas: opcoes?.linhas ?? [
      linha("Total", 21000000, 21300000, 0.99),
      linha("sem_pagamento", 0, 100, 0),
      linha("parcial", 200, 300, 0.6667),
      linha("quitado", 600, 600, 1),
      linha("excedente", 100, 0, null),
    ],
    aParte: false,
  };
}

// Resposta com os 4 blocos (os 2 Must + os 2 complementares), na mesma
// ordem publicada pela API: entregas, divergências, tempo médio,
// valor pago × devido.
export function respostaComplementaresValida(opcoes?: {
  entregas?: unknown;
  divergencias?: unknown;
  tempoMedio?: unknown;
  valorPagoVsDevido?: unknown;
}): unknown {
  return [
    opcoes?.entregas ?? blocoEntregasNoPrazo(),
    opcoes?.divergencias ?? blocoDivergenciasPorTipo(),
    opcoes?.tempoMedio ?? blocoTempoMedio(),
    opcoes?.valorPagoVsDevido ?? blocoValorPagoVsDevido(),
  ];
}

export function instalarFetchMock(
  aoChamar: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => aoChamar(String(entrada)));
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

export function renderizar() {
  return render(
    <MemoryRouter initialEntries={["/indicadores"]}>
      <Indicadores />
    </MemoryRouter>,
  );
}

/** `fetch` que responde `corpo` (HTTP 200) a qualquer chamada. */
export function instalarIndicadoresFixos(corpo: unknown) {
  return instalarFetchMock(() => Promise.resolve(respostaOk(corpo)));
}

/** Seção (`<section aria-labelledby>`) de um bloco, pelo nome do h2. */
export async function secaoDoBloco(nome: string): Promise<HTMLElement> {
  const titulo = await screen.findByRole("heading", { level: 2, name: nome });
  const secao = titulo.closest("section");
  if (!secao) {
    throw new Error(`seção do bloco "${nome}" não encontrada`);
  }
  return secao;
}

/** Texto completo da caixa de fórmula de uma seção. */
export function textoFormula(secao: HTMLElement): string {
  const caixa = secao.querySelector(".caixa-formula");
  return (caixa?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export const TITULO_ENTREGAS = "Entregas no prazo por transportadora e mês";
export const FORMULA_ENTREGAS =
  "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida, por transportadora e mes da entrega";
