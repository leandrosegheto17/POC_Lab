// TP-0073 — T2: "Ver estado numa data", integrado em Pedido.tsx
// (DetalheLinhaDoTempo) + LinhaDoTempo.tsx. `derivarEstado` (TP-0012) roda
// no navegador sobre os eventos JÁ carregados por uma única chamada —
// nenhuma chamada extra a `fetch` ao usar o `SeletorData` (TP-0072).
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { axe } from "vitest-axe";
import { Pedido } from "../src/paginas/Pedido.tsx";

// Datas espaçadas por dígito de dezena do dia (01, 02, 03, 10) para que a
// comparação de string simples usada tanto por `derivarEstado` quanto pela
// atenuação visual de `LinhaDoTempo` coincida com a ordem temporal real,
// mesmo comparando um `momentoFato` ISO completo com uma data "AAAA-MM-DD"
// (ver nota em LinhaDoTempo.tsx/Pedido.tsx).
function eventoVenda(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "vendas",
    codigoEvento: "EVT-V-1",
    momentoFato: "2026-01-01T10:00:00Z",
    tipo: "venda",
    valor_devido: 150,
    data_limite: "2026-01-20",
    transportadora: "Transp. Rápida",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

function eventoPagamento(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "pagamentos",
    codigoEvento: "EVT-P-1",
    momentoFato: "2026-01-02T10:00:00Z",
    tipo: "pagamento",
    valor: 80,
    referencia_original: "10248",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

function eventoColeta(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-C-1",
    momentoFato: "2026-01-03T10:00:00Z",
    tipo: "coleta",
    transportadora: "Transp. Rápida",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

function eventoEntrega(opcoes?: Partial<Record<string, unknown>>): unknown {
  return {
    fonte: "rastreio",
    codigoEvento: "EVT-E-1",
    momentoFato: "2026-01-10T10:00:00Z",
    tipo: "entrega",
    transportadora: "Transp. Rápida",
    codigo_rastreio: "RS-5521",
    chegouForaDeOrdem: false,
    ...opcoes,
  };
}

function respostaLinhaDoTempoValida(): unknown {
  return {
    pedido: {
      identidade: "PED-000001",
      codigoBuscado: "PED-000001",
      fontes: [
        { fonte: "vendas", codigo: "10248" },
        { fonte: "pagamentos", codigo: "TX-88812" },
        { fonte: "rastreio", codigo: "RS-5521" },
      ],
      devido: 150,
      pago: 80,
      dataLimite: "2026-01-20T00:00:00Z",
      divergencias: [],
    },
    // Fora de ordem de propósito — `derivarEstado` ordena canonicamente
    // antes de processar (TP-0012); `LinhaDoTempo` renderiza na ordem
    // recebida (TP-0061), mas isso não afeta estes testes (checam por
    // texto, não por posição).
    eventos: [eventoVenda(), eventoPagamento(), eventoColeta(), eventoEntrega()],
  };
}

function respostaFake(json: () => Promise<unknown>) {
  return {
    ok: true,
    status: 200,
    json,
  } as unknown as Response;
}

function instalarFetchMock() {
  const mock = vi.fn(() =>
    Promise.resolve(respostaFake(() => Promise.resolve(respostaLinhaDoTempoValida()))),
  );
  global.fetch = mock;
  return mock;
}

function renderizarPedido() {
  return render(
    <MemoryRouter initialEntries={["/pedido/PED-000001"]}>
      <Routes>
        <Route path="/pedido/:codigo" element={<Pedido />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function aguardarCarregado() {
  await waitFor(() => {
    expect(
      screen.getByRole("heading", { level: 1, name: "Pedido PED-000001" }),
    ).toBeInTheDocument();
  });
}

function escolherData(valor: string) {
  const campo = screen.getByLabelText("Ver estado em");
  fireEvent.change(campo, { target: { value: valor } });
}

// Ajuste Modelo B (2026-10-08): a frase fica dentro do cartão do
// `SeletorData`, com a data em `<span class="mono">` — por isso o texto é
// conferido no parágrafo inteiro, não com `getByText` (que só olha o texto
// próprio de cada elemento).
function fraseResultado(container: HTMLElement): HTMLElement {
  const paragrafo = container.querySelector<HTMLElement>(
    ".seletor-data__resultado",
  );
  if (!paragrafo) {
    throw new Error("parágrafo de resultado do SeletorData não encontrado");
  }
  return paragrafo;
}

describe("Estado do pedido em uma data — frase", () => {
  it("data entre coleta e entrega: frase bate com o estado esperado (venda + pagamento parcial + coletado, ainda não em transporte)", async () => {
    instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    escolherData("2026-01-05");

    const frase = fraseResultado(container);
    expect(frase).toHaveTextContent(
      /^Em 2026-01-05: vendido, pagamento parcial, coletado, ainda não em transporte\.$/,
    );
    expect(frase.querySelector(".mono")).toHaveTextContent("2026-01-05");
  });
});

describe("Estado do pedido em uma data — evento do próprio dia", () => {
  it("venda em 2026-01-05T10:00Z com data 2026-01-05 entra no estado e não é atenuada", async () => {
    const resposta = respostaLinhaDoTempoValida() as { eventos: unknown[] };
    resposta.eventos = [
      eventoVenda({ momentoFato: "2026-01-05T10:00:00Z" }),
    ];
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake(() => Promise.resolve(resposta))),
    );
    const { container } = renderizarPedido();
    await aguardarCarregado();

    escolherData("2026-01-05");

    expect(fraseResultado(container)).toHaveTextContent(/^Em 2026-01-05: vendido/);
    expect(
      screen.queryByText("Nenhum evento até esta data."),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".evento--depois")).toHaveLength(0);
  });
});

describe("Estado do pedido em uma data — eventos posteriores atenuados", () => {
  it("evento de entrega (posterior à data escolhida) some com texto 'depois da data escolhida'", async () => {
    instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    escolherData("2026-01-05");

    expect(screen.getByText("depois da data escolhida")).toBeInTheDocument();

    const itemEntrega = container.querySelector(
      '[data-fonte="rastreio"].evento--depois',
    );
    expect(itemEntrega).not.toBeNull();
    expect(itemEntrega).toHaveTextContent("depois da data escolhida");

    // Eventos até a data escolhida não ficam atenuados.
    expect(container.querySelectorAll(".evento--depois")).toHaveLength(1);
  });
});

describe("Estado do pedido em uma data — anterior à venda", () => {
  it("data anterior ao evento de venda: 'Nenhum evento até esta data.', sem frase de estado", async () => {
    instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    escolherData("2025-12-01");

    expect(
      screen.getByText("Nenhum evento até esta data."),
    ).toBeInTheDocument();
    expect(fraseResultado(container)).not.toHaveTextContent(/^Em 2025-12-01:/);
  });
});

describe("Estado do pedido em uma data — Limpar", () => {
  it("clicar em Limpar remove a frase e a atenuação, eventos voltam ao normal", async () => {
    instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    escolherData("2026-01-05");
    expect(screen.getByText("depois da data escolhida")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));

    expect(
      screen.queryByText("depois da data escolhida"),
    ).not.toBeInTheDocument();
    expect(fraseResultado(container)).toBeEmptyDOMElement();
    expect(
      screen.queryByText("Nenhum evento até esta data."),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll(".evento--depois")).toHaveLength(0);
  });
});

describe("Estado do pedido em uma data — nenhuma chamada extra à API", () => {
  it("usar o seletor de data não dispara nova chamada a fetch (permanece em 1)", async () => {
    const mock = instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    expect(mock).toHaveBeenCalledTimes(1);

    escolherData("2026-01-05");
    expect(fraseResultado(container)).toHaveTextContent(/^Em 2026-01-05:/);

    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
    escolherData("2025-12-01");
    expect(screen.getByText("Nenhum evento até esta data.")).toBeInTheDocument();

    expect(mock).toHaveBeenCalledTimes(1);
  });
});

describe("Estado do pedido em uma data — acessibilidade (vitest-axe)", () => {
  it("sem data escolhida: nenhuma violação", async () => {
    instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("com data escolhida (frase + atenuação): nenhuma violação", async () => {
    instalarFetchMock();
    const { container } = renderizarPedido();
    await aguardarCarregado();

    escolherData("2026-01-05");

    expect(await axe(container)).toHaveNoViolations();
  });
});
