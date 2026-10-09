// `FaixaResumo`/`ProvedorResumo`: uma única chamada de rede por
// carga do app, texto estático "Dados sintéticos" enquanto carrega ou em
// erro (sem aria-live/role="alert"), e "Dados sintéticos · corte
// AAAA-MM-DD · N pedidos" em sucesso.
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import {
  ProvedorResumo,
  useResumo,
} from "../src/dados/contexto-resumo.tsx";
import { FaixaResumo } from "../src/componentes/FaixaResumo.tsx";
import { respostaFake } from "./apoio/api-simulada.tsx";

/** Objeto mínimo válido contra `EsquemaResumo` (nucleo/contrato/resumo.ts). */
function cartao(numerador: number, denominador = 1): unknown {
  return {
    titulo: "Cartão de teste",
    formula: "numerador / denominador",
    numerador,
    denominador,
    resultado: denominador === 0 ? null : numerador / denominador,
  };
}

function resumoValido(numeroPedidos: number) {
  return {
    dataCorte: "2026-10-08T00:00:00.000Z",
    semente: 42,
    versaoContrato: "1.0.0",
    idPublicacao: "pub-teste",
    totais: {
      pedidos: cartao(numeroPedidos),
      pedidosComDivergencia: cartao(3),
      porTipo: [],
      valorEmAberto: cartao(100),
      pagoAMais: cartao(0),
      entregasNoPrazo: cartao(10),
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FaixaResumo — estado de sucesso", () => {
  it("exibe data de corte (AAAA-MM-DD) e total de pedidos formatado", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(resumoValido(12345)) })),
    );

    render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    // O texto fica dividido em <span> (data em
    // mono, separadores aria-hidden), então conferimos o texto do <p>.
    await waitFor(() => {
      expect(document.querySelector(".faixa-resumo")?.textContent).toBe(
        "Dados sintéticos · corte 2026-10-08 · 12.345 pedidos",
      );
    });
    expect(screen.getByText("2026-10-08")).toHaveClass("mono");
  });
});

describe("FaixaResumo — estado de carregamento", () => {
  it("enquanto a resposta não chega, mostra só 'Dados sintéticos'", () => {
    // Promise que nunca resolve durante o teste: estado fica "carregando".
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));

    render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    expect(screen.getByText("Dados sintéticos")).toBeInTheDocument();
    expect(screen.queryByText(/corte/)).not.toBeInTheDocument();
  });
});

describe("FaixaResumo — estado de erro", () => {
  it("resposta 500 → só 'Dados sintéticos', sem role=alert nem aria-live", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          type: "https://poc-lab.dev/erros/erro_interno",
          title: "Erro interno",
          status: 500,
          detail: "detalhe que não deve aparecer",
          codigo: "erro_interno",
        }),
      })),
    );

    const { container } = render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dados sintéticos")).toBeInTheDocument();
    });

    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
    expect(container.textContent).not.toContain("detalhe que não deve aparecer");
  });

  it("falha de rede → só 'Dados sintéticos', sem role=alert nem aria-live", async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    const { container } = render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dados sintéticos")).toBeInTheDocument();
    });

    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.querySelector("[aria-live]")).toBeNull();
  });
});

describe("ProvedorResumo — uma única chamada por carga do app", () => {
  it("renderizando 2 FaixaResumo dentro do mesmo provedor, fetch é chamado 1 vez", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(resumoValido(5)) })),
    );
    global.fetch = fetchMock;

    render(
      <ProvedorResumo>
        <FaixaResumo />
        <FaixaResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("2026-10-08")).toHaveLength(2);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("1 FaixaResumo + outro consumidor de useResumo no mesmo provedor: fetch 1 vez", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(resumoValido(7)) })),
    );
    global.fetch = fetchMock;

    function OutroConsumidor() {
      const { estado } = useResumo();
      return <span data-testid="outro-estado">{estado}</span>;
    }

    render(
      <ProvedorResumo>
        <FaixaResumo />
        <OutroConsumidor />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("outro-estado").textContent).toBe("sucesso");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("useResumo — fora do provedor", () => {
  it("lança erro claro quando usado sem <ProvedorResumo>", () => {
    function ComponenteSemProvedor() {
      useResumo();
      return null;
    }

    expect(() => render(<ComponenteSemProvedor />)).toThrow(
      /useResumo deve ser usado dentro de <ProvedorResumo>/,
    );
  });
});

describe("FaixaResumo — acessibilidade (vitest-axe) nos 3 estados", () => {
  it("estado de carregamento não tem violações", async () => {
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));

    const { container } = render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    const resultados = await axe(container);
    expect(resultados).toHaveNoViolations();
  });

  it("estado de erro não tem violações", async () => {
    global.fetch = vi.fn(() => Promise.reject(new TypeError("Failed to fetch")));

    const { container } = render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dados sintéticos")).toBeInTheDocument();
    });

    const resultados = await axe(container);
    expect(resultados).toHaveNoViolations();
  });

  it("estado de sucesso não tem violações", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve(respostaFake({ ok: true, json: () => Promise.resolve(resumoValido(1)) })),
    );

    const { container } = render(
      <ProvedorResumo>
        <FaixaResumo />
      </ProvedorResumo>,
    );

    await waitFor(() => {
      expect(screen.getByText("2026-10-08")).toBeInTheDocument();
    });

    const resultados = await axe(container);
    expect(resultados).toHaveNoViolations();
  });
});
