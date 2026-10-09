// Fábricas, `fetch` simulado e consultas compartilhados pelos testes da tela
// Pedido (`GET /api/v1/pedidos/{codigo}/linha-do-tempo`).
import { render, screen, waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { Pedido } from "../../src/paginas/Pedido.tsx";
import { respostaOk } from "./api-simulada.tsx";

export function eventoVenda(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "vendas",
    // Código diferente dos "fontes" do cabeçalho de propósito — evita
    // ambiguidade de texto duplicado nos testes (cabeçalho e linha do
    // tempo são elementos distintos, mesmo quando o valor de negócio
    // coincidiria em dados reais).
    codigoEvento: "EVT-V-1",
    momentoFato: "2026-01-05T10:00:00Z",
    tipo: "venda",
    valor_devido: 150,
    data_limite: "2026-01-20",
    transportadora: "Transp. Rápida",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

export function eventoPagamento(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "pagamentos",
    codigoEvento: "EVT-P-1",
    momentoFato: "2026-01-06T10:00:00Z",
    tipo: "pagamento",
    valor: 150,
    referencia_original: "10248",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

export function respostaLinhaDoTempoValida(opcoes?: {
  codigoBuscado?: string;
  divergencias?: unknown[];
  devido?: number;
  pago?: number;
  eventos?: unknown[];
}): unknown {
  return {
    pedido: {
      identidade: "PED-000001",
      codigoBuscado: opcoes?.codigoBuscado ?? "PED-000001",
      fontes: [
        { fonte: "vendas", codigo: "10248" },
        { fonte: "pagamentos", codigo: "TX-88812" },
        { fonte: "rastreio", codigo: "RS-5521" },
      ],
      // Valores do cabeçalho deliberadamente diferentes de 150 (o valor dos
      // eventos de venda/pagamento abaixo) — mesma lógica do comentário em
      // `eventoVenda`: evita que o cabeçalho e um evento da linha do tempo
      // produzam o mesmo texto "R$ 150,00" e tornem a asserção ambígua
      // (`getByText` falha com "found multiple elements" quando dois
      // elementos distintos têm o mesmo texto).
      devido: opcoes?.devido ?? 300,
      pago: opcoes?.pago ?? 300,
      dataLimite: "2026-01-20T00:00:00Z",
      divergencias: opcoes?.divergencias ?? [],
    },
    eventos: opcoes?.eventos ?? [eventoVenda(), eventoPagamento()],
  };
}

export function respostaErro(opcoes: {
  status: number;
  codigo: string;
  detail?: string;
}): unknown {
  return {
    type: "about:blank",
    title: "Erro",
    status: opcoes.status,
    detail: opcoes.detail ?? "detalhe tecnico que nao deve aparecer na tela",
    codigo: opcoes.codigo,
    ...(opcoes.status === 400
      ? { erros: [{ campo: "codigo", mensagem: "formato inválido" }] }
      : {}),
  };
}

export function instalarFetchMock(
  aoChamarPedido: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.startsWith("/api/v1/pedidos/")) {
      return aoChamarPedido(url);
    }
    return Promise.reject(new Error(`fetch não mockado para ${url}`));
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

export function chamadas(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls.map((chamada) => String(chamada[0]));
}

export function renderizar(codigo = "PED-000001") {
  return render(
    <MemoryRouter initialEntries={[`/pedido/${codigo}`]}>
      <Routes>
        <Route path="/pedido/:codigo" element={<Pedido />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** `fetch` que responde `corpo` (HTTP 200) a qualquer chamada de pedido. */
export function instalarPedidoFixo(corpo: unknown) {
  return instalarFetchMock(() => Promise.resolve(respostaOk(corpo)));
}

export async function aguardarTitulo() {
  await waitFor(() => {
    expect(
      screen.getByRole("heading", { level: 1, name: "Pedido PED-000001" }),
    ).toBeInTheDocument();
  });
}

export function eventoPagamentoCom(codigoEvento: string, valor: number): unknown {
  return eventoPagamento({ codigoEvento, valor });
}
