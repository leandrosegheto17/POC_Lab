// TP-0058 — `CartoesResumo`/`FiltroTipo`: 4 cartões (percentual/moeda) com
// "—"/"indisponível agora" sem resumo; chips em `<fieldset>`/`<legend>`
// com contagem vinda de `porTipo` só em sucesso, seleção via `checked` +
// "✓", e `onChange` chamando `aoMudar` com o tipo certo. `vitest-axe` nos
// dois componentes, nos estados de sucesso e sem resumo.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ProvedorResumo } from "../src/dados/contexto-resumo.tsx";
import { CartoesResumo } from "../src/componentes/CartoesResumo.tsx";
import { FiltroTipo, VALOR_TODOS } from "../src/componentes/FiltroTipo.tsx";

// Mesmos formatadores usados dentro de `CartoesResumo` — formatamos os
// valores esperados aqui em vez de hardcodar string literal, para não
// depender de qual espaço (normal vs. não separável) o ICU da máquina que
// roda o teste escolhe para moeda pt-BR.
const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Objeto mínimo válido contra `EsquemaCartao` (processamento/contrato/resumo.ts). */
function cartao(numerador: number, denominador = 1): unknown {
  return {
    titulo: "Cartão de teste",
    formula: "numerador / denominador",
    numerador,
    denominador,
    resultado: denominador === 0 ? null : numerador / denominador,
  };
}

function resumoValido(): unknown {
  return {
    dataCorte: "2026-10-08T00:00:00.000Z",
    semente: 42,
    versaoContrato: "1.0.0",
    idPublicacao: "pub-teste",
    totais: {
      pedidos: cartao(100),
      // 7 de 100 => 7.0% (fração 0,07 no campo `resultado`).
      pedidosComDivergencia: cartao(7, 100),
      porTipo: [
        { tipo: "duplicado", cartao: cartao(2, 100) },
        { tipo: "parcial", cartao: cartao(0, 100) },
        { tipo: "pago_nao_enviado", cartao: cartao(1, 100) },
        { tipo: "enviado_nao_pago", cartao: cartao(3, 100) },
        { tipo: "entrega_atrasada", cartao: cartao(1, 100) },
      ],
      valorEmAberto: cartao(1234.5),
      pagoAMais: cartao(99.9),
      // 85 de 90 => 94.4%.
      entregasNoPrazo: cartao(85, 90),
    },
  };
}

function respostaFake(opcoes: {
  ok: boolean;
  status?: number;
  json?: () => Promise<unknown>;
}) {
  return {
    ok: opcoes.ok,
    status: opcoes.status ?? (opcoes.ok ? 200 : 500),
    json: opcoes.json ?? (async () => ({})),
  } as unknown as Response;
}

function mockarSucesso() {
  global.fetch = vi.fn(async () =>
    respostaFake({ ok: true, json: async () => resumoValido() }),
  );
}

function mockarPendente() {
  global.fetch = vi.fn(() => new Promise<Response>(() => {}));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CartoesResumo — estado de sucesso", () => {
  it("exibe os 4 cartões com valor formatado e base correspondente", async () => {
    mockarSucesso();

    render(
      <ProvedorResumo>
        <CartoesResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByText("Com divergência")).toBeInTheDocument();
    });

    expect(screen.getByText("7.0%")).toBeInTheDocument();
    expect(screen.getByText("7 de 100 pedidos")).toBeInTheDocument();

    expect(screen.getByText("Valor em aberto")).toBeInTheDocument();
    expect(
      screen.getByText(FORMATADOR_MOEDA.format(1234.5)),
    ).toBeInTheDocument();

    expect(screen.getByText("Pago a mais")).toBeInTheDocument();
    expect(screen.getByText(FORMATADOR_MOEDA.format(99.9))).toBeInTheDocument();

    expect(screen.getByText("Entregas no prazo")).toBeInTheDocument();
    expect(screen.getByText("94.4%")).toBeInTheDocument();
    expect(screen.getByText("85 de 90")).toBeInTheDocument();
  });
});

describe("CartoesResumo — sem resumo (carregando)", () => {
  it("todos os 4 cartões mostram '—' e 'indisponível agora'", () => {
    mockarPendente();

    render(
      <ProvedorResumo>
        <CartoesResumo />
      </ProvedorResumo>,
    );

    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getAllByText("indisponível agora")).toHaveLength(4);
  });
});

describe("CartoesResumo — sem resumo (erro)", () => {
  it("falha de rede → '—' e 'indisponível agora' nos 4 cartões", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    render(
      <ProvedorResumo>
        <CartoesResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("—")).toHaveLength(4);
    });
    expect(screen.getAllByText("indisponível agora")).toHaveLength(4);
  });
});

describe("CartoesResumo — acessibilidade (vitest-axe)", () => {
  it("estado de sucesso não tem violações", async () => {
    mockarSucesso();

    const { container } = render(
      <ProvedorResumo>
        <CartoesResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByText("7.0%")).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem resumo não tem violações", () => {
    mockarPendente();

    const { container } = render(
      <ProvedorResumo>
        <CartoesResumo />
      </ProvedorResumo>,
    );

    return axe(container).then((resultados) => {
      expect(resultados).toHaveNoViolations();
    });
  });
});

describe("FiltroTipo — estrutura", () => {
  it("renderiza fieldset/legend e as 6 opções (Todos + 5 tipos)", () => {
    mockarSucesso();

    render(
      <ProvedorResumo>
        <FiltroTipo valor={VALOR_TODOS} aoMudar={() => {}} />
      </ProvedorResumo>,
    );

    expect(screen.getByRole("group", { name: "Tipo" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("radio", { name: /Todos/ })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Pago duas vezes/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Pagamento parcial/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Pago e não enviado/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Enviado e não pago/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Entrega atrasada/ }),
    ).toBeInTheDocument();
  });
});

describe("FiltroTipo — contagem com resumo em sucesso", () => {
  it("mostra a contagem de porTipo ao lado de cada rótulo, inclusive 0", async () => {
    mockarSucesso();

    render(
      <ProvedorResumo>
        <FiltroTipo valor={VALOR_TODOS} aoMudar={() => {}} />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes · 2/ }),
      ).toBeInTheDocument();
    });

    // Parcial tem contagem 0 (diferente de "sem resumo", que omite o
    // número por completo) — ainda assim mostra "0".
    expect(
      screen.getByRole("radio", { name: /Pagamento parcial · 0/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Pago e não enviado · 1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Enviado e não pago · 3/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Entrega atrasada · 1/ }),
    ).toBeInTheDocument();

    // "Todos" nunca mostra contagem.
    expect(screen.getByRole("radio", { name: "Todos" })).toBeInTheDocument();
  });
});

describe("FiltroTipo — sem resumo (carregando/erro)", () => {
  it("nenhuma contagem aparece ao lado dos rótulos", () => {
    mockarPendente();

    render(
      <ProvedorResumo>
        <FiltroTipo valor={VALOR_TODOS} aoMudar={() => {}} />
      </ProvedorResumo>,
    );

    expect(
      screen.getByRole("radio", { name: "Pago duas vezes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Pagamento parcial" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });
});

describe("FiltroTipo — seleção e interação", () => {
  it("clicar numa opção chama aoMudar com o tipo certo", async () => {
    mockarSucesso();
    const aoMudar = vi.fn();

    render(
      <ProvedorResumo>
        <FiltroTipo valor={VALOR_TODOS} aoMudar={aoMudar} />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes/ }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("radio", { name: /Pago duas vezes/ }));

    expect(aoMudar).toHaveBeenCalledWith("duplicado");
  });

  it("a opção selecionada (via prop valor) tem checked e mostra '✓'", async () => {
    mockarSucesso();

    render(
      <ProvedorResumo>
        <FiltroTipo valor="parcial" aoMudar={() => {}} />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pagamento parcial/ }),
      ).toBeChecked();
    });

    expect(
      screen.getByRole("radio", { name: /Todos/ }),
    ).not.toBeChecked();

    const labelSelecionado = screen
      .getByRole("radio", { name: /Pagamento parcial/ })
      .closest("label");
    expect(labelSelecionado?.textContent).toContain("✓");
  });
});

describe("FiltroTipo — acessibilidade (vitest-axe)", () => {
  it("sem violações com resumo em sucesso", async () => {
    mockarSucesso();

    const { container } = render(
      <ProvedorResumo>
        <FiltroTipo valor={VALOR_TODOS} aoMudar={() => {}} />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("radio", { name: /Pago duas vezes · 2/ }),
      ).toBeInTheDocument();
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("sem violações sem resumo", () => {
    mockarPendente();

    const { container } = render(
      <ProvedorResumo>
        <FiltroTipo valor={VALOR_TODOS} aoMudar={() => {}} />
      </ProvedorResumo>,
    );

    return axe(container).then((resultados) => {
      expect(resultados).toHaveNoViolations();
    });
  });
});
