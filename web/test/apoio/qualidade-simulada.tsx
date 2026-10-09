// Fábricas, `fetch` simulado e consultas de DOM compartilhados pelos testes da
// tela Qualidade dos dados (`GET /api/v1/qualidade`).
import { render, within } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";
import { Qualidade } from "../../src/paginas/Qualidade.tsx";
import { respostaOk } from "./api-simulada.tsx";

/** Exemplo concreto de achado, contra `EsquemaExemploAchado`. */
export function exemplo(opcoes: {
  fonte: "vendas" | "pagamentos" | "rastreio";
  referencia: string;
  detalhe: string;
  pedido?: string;
}): unknown {
  return opcoes;
}

/** Achado de qualidade, contra `EsquemaAchado`. */
export function achado(opcoes: {
  tipo: string;
  contagem: number;
  regra: string;
  exemplos?: unknown[];
}): unknown {
  return {
    tipo: opcoes.tipo,
    contagem: opcoes.contagem,
    regra: opcoes.regra,
    exemplos: opcoes.exemplos ?? [],
  };
}

/**
 * Resposta válida com os 7 tipos em ordem EMBARALHADA (a mesma ordem dos
 * literais de `TipoAchado` em `processamento/src/dominio/modelo.ts`, que é
 * DIFERENTE da ordem fixa de exibição do wireframe) — prova de que a página
 * reordena por `tipo`, nunca confia na posição do array recebido.
 */
export function respostaQualidadeValida(opcoes?: {
  iaUtilizada?: boolean;
}): unknown {
  return {
    achados: [
      achado({
        tipo: "fora_de_ordem",
        contagem: 1,
        regra: "Eventos devem respeitar a ordem cronológica esperada.",
        exemplos: [
          exemplo({
            fonte: "rastreio",
            referencia: "EVT-900",
            detalhe: "Entrega registrada antes da postagem",
            pedido: "PED-900",
          }),
        ],
      }),
      achado({
        tipo: "sem_identificacao",
        contagem: 4,
        regra: "Pagamentos devem conter identificação do pedido de origem.",
        exemplos: [
          exemplo({
            fonte: "pagamentos",
            referencia: "PAG-100",
            detalhe: "Sem campo de referência ao pedido",
          }),
        ],
      }),
      achado({
        tipo: "registro_repetido",
        contagem: 0,
        regra: "Registros não devem se repetir para o mesmo pedido e evento.",
        exemplos: [],
      }),
      achado({
        tipo: "linha_invalida",
        contagem: 5,
        regra: "Linhas devem conter todos os campos obrigatórios.",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "LINHA-7",
            detalhe: "Campo 'valor' ausente",
          }),
        ],
      }),
      achado({
        tipo: "valor_fora_do_padrao",
        contagem: 2,
        regra: "Valores devem estar dentro da faixa esperada.",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "PED-050",
            detalhe: "Valor negativo",
            pedido: "PED-050",
          }),
        ],
      }),
      achado({
        tipo: "formato_data",
        contagem: 3,
        regra: "Datas devem estar no formato ISO 8601 (AAAA-MM-DD).",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "PED-010",
            detalhe: "Data '10/01/2026' fora do formato",
            pedido: "PED-010",
          }),
        ],
      }),
      achado({
        tipo: "pedido_sem_envio",
        contagem: 1,
        regra: "Pedidos pagos devem ter evento de envio correspondente.",
        exemplos: [
          exemplo({
            fonte: "vendas",
            referencia: "PED-020",
            detalhe: "Pago há mais de 10 dias, sem envio",
            pedido: "PED-020",
          }),
        ],
      }),
    ],
    ia: { utilizada: opcoes?.iaUtilizada ?? false, sugestoes: [] },
  };
}

export function instalarFetchMock(
  aoChamarQualidade: (url: string) => Promise<Response> | Response,
) {
  const mock = vi.fn(async (entrada: string | URL) => {
    const url = String(entrada);
    if (url.startsWith("/api/v1/qualidade")) {
      return aoChamarQualidade(url);
    }
    return Promise.reject(new Error(`fetch não mockado para ${url}`));
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

export function chamadas(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls.map((chamada) => String(chamada[0]));
}

export function renderizar() {
  return render(
    <MemoryRouter initialEntries={["/qualidade"]}>
      <Qualidade />
    </MemoryRouter>,
  );
}

/** `fetch` que responde `corpo` (HTTP 200) para `/api/v1/qualidade`. */
export function instalarQualidadeFixa(corpo: unknown) {
  return instalarFetchMock(() => Promise.resolve(respostaOk(corpo)));
}

/**
 * A página renderiza a forma PC e a forma do
 * celular e alterna só por CSS (jsdom não aplica o CSS, então as duas estão
 * no DOM). Os testes consultam cada forma pelo seu contêiner.
 */
export function formaPc(): HTMLElement {
  const elemento = document.querySelector(".qualidade__pc");
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("forma PC (.qualidade__pc) não encontrada");
  }
  return elemento;
}

export function formaCelular(): HTMLElement {
  const elemento = document.querySelector(".qualidade__celular");
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("forma do celular (.qualidade__celular) não encontrada");
  }
  return elemento;
}

/** Seção (cartão) da forma PC cujo h2 tem o nome dado. */
export function secaoPc(nome: string): HTMLElement {
  return within(formaPc())
    .getByRole("heading", { level: 2, name: nome })
    .closest("section") as HTMLElement;
}

/** `<details>` da forma do celular cujo h2 (dentro do summary) tem o nome dado. */
export function detalhesCelular(nome: string): HTMLDetailsElement {
  return within(formaCelular())
    .getByRole("heading", { level: 2, name: nome })
    .closest("details") as HTMLDetailsElement;
}

// Ordem fixa esperada de exibição (wireframe) — DIFERENTE da ordem do mock
// acima, que segue a ordem dos literais de `TipoAchado`.
export const TITULOS_EM_ORDEM = [
  "Datas em dois formatos",
  "Pedidos sem envio",
  "Valores fora do padrão",
  "Linhas rejeitadas",
  "Registros repetidos",
  "Pagamentos sem identificação",
  "Eventos fora de ordem",
];

export function sugestaoIa(opcoes: {
  pagamento: string;
  textoReferencia: string;
  pedidoSugerido: string;
  conferida: boolean;
  motivo: string;
}): unknown {
  return opcoes;
}

export function respostaComSugestoes(sugestoes: unknown[]): unknown {
  const base = respostaQualidadeValida({ iaUtilizada: true }) as {
    achados: unknown[];
    ia: { utilizada: boolean; sugestoes: unknown[] };
  };
  return { ...base, ia: { utilizada: true, sugestoes } };
}

/** Duas sugestões da IA: uma aceita (PED-100) e uma rejeitada (PED-200). */
export const DUAS_SUGESTOES: unknown[] = [
  sugestaoIa({
    pagamento: "PAG-100",
    textoReferencia: "ref pedido 100",
    pedidoSugerido: "PED-100",
    conferida: true,
    motivo: "Valor e data batem com o saldo em aberto.",
  }),
  sugestaoIa({
    pagamento: "PAG-200",
    textoReferencia: "ref pedido 200",
    pedidoSugerido: "PED-200",
    conferida: false,
    motivo: "Diferença de valor acima da tolerância.",
  }),
];
