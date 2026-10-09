// Fábricas e `fetch` simulado compartilhados pelos testes das telas que
// consomem `/api/v1/resumo` e `/api/v1/divergencias`.
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";
import { ProvedorResumo } from "../../src/dados/contexto-resumo.tsx";
import { Divergencias } from "../../src/paginas/Divergencias.tsx";

/** Objeto mínimo válido contra `EsquemaCartao` (processamento/contrato/resumo.ts). */
export function cartao(numerador: number, denominador = 1): unknown {
  return {
    titulo: "Cartão de teste",
    formula: "numerador / denominador",
    numerador,
    denominador,
    resultado: denominador === 0 ? null : numerador / denominador,
  };
}

/** Resumo válido; os valores monetários dos cartões podem ser trocados. */
export function resumoValido(opcoes?: {
  valorEmAberto?: number;
  pagoAMais?: number;
}): unknown {
  return {
    dataCorte: "2026-10-08T00:00:00.000Z",
    semente: 42,
    versaoContrato: "1.0.0",
    idPublicacao: "pub-teste",
    totais: {
      pedidos: cartao(100),
      pedidosComDivergencia: cartao(7, 100),
      porTipo: [
        { tipo: "duplicado", cartao: cartao(2, 100) },
        { tipo: "parcial", cartao: cartao(0, 100) },
        { tipo: "pago_nao_enviado", cartao: cartao(1, 100) },
        { tipo: "enviado_nao_pago", cartao: cartao(3, 100) },
        { tipo: "entrega_atrasada", cartao: cartao(1, 100) },
      ],
      valorEmAberto: cartao(opcoes?.valorEmAberto ?? 1234.5),
      pagoAMais: cartao(opcoes?.pagoAMais ?? 99.9),
      entregasNoPrazo: cartao(85, 90),
    },
  };
}

/** Divergência com dois eventos de pagamento. */
export function divergenciaValida(pedido: string, tipo: string): unknown {
  return {
    pedido,
    tipo,
    motivo: "Pagamento recebido em duplicidade",
    eventos: [
      { tipo: "pagamento", data: "2026-10-01", fonte: "pagamentos", codigo: "evt-1" },
      { tipo: "pagamento", data: "2026-10-02", fonte: "pagamentos", codigo: "evt-2" },
    ],
  };
}

export function respostaDivergenciasValida(opcoes?: {
  dados?: unknown[];
  pagina?: number;
  total?: number;
  totalPaginas?: number;
}): unknown {
  const dados = opcoes?.dados ?? [divergenciaValida("PED-001", "duplicado")];
  return {
    dados,
    paginacao: {
      pagina: opcoes?.pagina ?? 1,
      tamanho: 50,
      total: opcoes?.total ?? dados.length,
      totalPaginas: opcoes?.totalPaginas ?? 1,
    },
  };
}

export function erroParametroInvalido(): unknown {
  return {
    type: "about:blank",
    title: "Parâmetro inválido",
    status: 400,
    detail: "O parâmetro 'tipo' é inválido.",
    codigo: "parametro_invalido",
    erros: [{ campo: "tipo", mensagem: "valor fora do conjunto aceito" }],
  };
}

export function respostaFake(opcoes: {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}) {
  return {
    ok: opcoes.ok,
    status: opcoes.status ?? (opcoes.ok ? 200 : 500),
    json: opcoes.json ?? (() => Promise.resolve({})),
  } as unknown as Response;
}

/** Resposta HTTP 200 com o corpo dado. */
export function respostaOk(corpo: unknown): Response {
  return respostaFake({ ok: true, json: () => Promise.resolve(corpo) });
}

/**
 * Instala um `fetch` único que roteia por prefixo de URL: `/api/v1/resumo`
 * sempre devolve um resumo válido; `/api/v1/divergencias` delega para
 * `aoChamarDivergencias`, que recebe a URL completa (com query string).
 */
export function instalarFetchMock(
  aoChamarDivergencias: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.startsWith("/api/v1/resumo")) {
      return respostaOk(resumoValido());
    }
    if (url.startsWith("/api/v1/divergencias")) {
      return aoChamarDivergencias(url);
    }
    return Promise.reject(new Error(`fetch não mockado para ${url}`));
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

/** `fetch` que responde sempre `corpo` para qualquer listagem de divergências. */
export function instalarDivergenciasFixas(corpo: unknown) {
  return instalarFetchMock(() => Promise.resolve(respostaOk(corpo)));
}

/**
 * `fetch` que responde cada página pedida em `?pagina=` com uma divergência
 * (`PED-<pagina>` por padrão). `antes` roda antes de responder e permite
 * segurar uma página específica.
 */
export function instalarDivergenciasPorPagina(opcoes: {
  total: number;
  totalPaginas: number;
  pedido?: (pagina: number) => string;
  antes?: (pagina: number) => Promise<void> | void;
}) {
  return instalarFetchMock(async (url) => {
    const pagina = paginaDaUrl(url);
    await opcoes.antes?.(pagina);
    const pedido = opcoes.pedido?.(pagina) ?? `PED-${String(pagina)}`;
    return respostaOk(
      respostaDivergenciasValida({
        dados: [divergenciaValida(pedido, "duplicado")],
        pagina,
        total: opcoes.total,
        totalPaginas: opcoes.totalPaginas,
      }),
    );
  });
}

/**
 * Como `instalarDivergenciasPorPagina`, mas a página 2 só responde depois de
 * `liberarSegundaPagina()` ser chamada.
 */
export function instalarSegundaPaginaPendente(opcoes: {
  total: number;
  totalPaginas: number;
}) {
  let liberar: (() => void) | null = null;
  const mock = instalarDivergenciasPorPagina({
    ...opcoes,
    antes: async (pagina) => {
      if (pagina === 2) {
        await new Promise<void>((resolve) => {
          liberar = resolve;
        });
      }
    },
  });
  return { mock, liberarSegundaPagina: () => liberar?.() };
}

/** `fetch` que devolve `/api/v1/resumo` válido para qualquer URL. */
export function simularResumoValido(
  opcoes?: Parameters<typeof resumoValido>[0],
) {
  global.fetch = vi.fn(() => Promise.resolve(respostaOk(resumoValido(opcoes))));
}

/** `fetch` que nunca resolve (estado "carregando"). */
export function simularResumoPendente() {
  global.fetch = vi.fn(() => new Promise<Response>(() => {}));
}

/** Só as chamadas de `fetch` para `/api/v1/divergencias` (ignora o resumo). */
export function chamadasDeDivergencias(mock: {
  mock: { calls: unknown[][] };
}): string[] {
  return mock.mock.calls
    .map((chamada) => String(chamada[0]))
    .filter((url) => url.startsWith("/api/v1/divergencias"));
}

export function paginaDaUrl(url: string): number {
  const correspondencia = /pagina=(\d+)/.exec(url);
  return correspondencia ? Number(correspondencia[1]) : 1;
}

export function renderizarDivergencias(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProvedorResumo>
        <Divergencias />
      </ProvedorResumo>
    </MemoryRouter>,
  );
}
