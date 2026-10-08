// TP-0072 — SeletorData: <input type="date"> controlado com <label>,
// botões "Ver estado" e "Limpar" (este com aria-disabled quando vazio, não
// disabled nativo), e ausência de violações de acessibilidade (axe).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { SeletorData } from "../src/componentes/SeletorData.tsx";

// `vitest.config`/`vite.config` não habilita `globals: true`, então o
// auto-cleanup do @testing-library/react (que depende de um `afterEach`
// global) não dispara sozinho entre os testes deste arquivo — sem isso, o
// DOM acumula uma instância de <SeletorData> por teste e `getByRole`
// encontra múltiplos elementos. Cleanup explícito por teste.
afterEach(cleanup);

function renderSeletor(valor: string) {
  const onMudar = vi.fn();
  const onVerEstado = vi.fn();
  const onLimpar = vi.fn();

  const utilitarios = render(
    <SeletorData
      valor={valor}
      onMudar={onMudar}
      onVerEstado={onVerEstado}
      onLimpar={onLimpar}
    />,
  );

  return { ...utilitarios, onMudar, onVerEstado, onLimpar };
}

describe("SeletorData — estrutura", () => {
  it('<label> associado ao <input type="date"> via "Ver estado em"', () => {
    const { getByLabelText } = renderSeletor("");

    const campo = getByLabelText("Ver estado em");
    expect(campo).toHaveAttribute("type", "date");
    expect(campo).toHaveAttribute("id", "seletor-data-input");
  });

  it("usa as classes da Base: rótulo, campo, botão primário e secundário", () => {
    const { getByLabelText, getByRole, getByText } = renderSeletor("");

    expect(getByText("Ver estado em")).toHaveClass("rotulo-campo");
    expect(getByLabelText("Ver estado em")).toHaveClass("campo");
    expect(getByRole("button", { name: "Ver estado" })).toHaveClass(
      "botao",
      "botao--primario",
    );
    expect(getByRole("button", { name: "Limpar" })).toHaveClass(
      "botao",
      "botao--secundario",
    );
  });
});

describe("SeletorData — resultado no mesmo cartão", () => {
  it("sem resultado, o parágrafo aria-live existe e está vazio", () => {
    const { container } = renderSeletor("");

    const paragrafo = container.querySelector(".seletor-data__resultado");
    expect(paragrafo).not.toBeNull();
    expect(paragrafo).toHaveAttribute("aria-live", "polite");
    expect(paragrafo).toBeEmptyDOMElement();
  });

  it("com resultado, mostra a frase dentro do cartão", () => {
    const { container } = render(
      <SeletorData
        valor="1996-07-10"
        onMudar={vi.fn()}
        onVerEstado={vi.fn()}
        onLimpar={vi.fn()}
        resultado={
          <>
            Em <span className="mono">1996-07-10</span>: vendido.
          </>
        }
      />,
    );

    const paragrafo = container.querySelector(
      ".seletor-data .seletor-data__resultado",
    );
    expect(paragrafo).toHaveTextContent("Em 1996-07-10: vendido.");
    expect(paragrafo?.querySelector(".mono")).toHaveTextContent("1996-07-10");
  });
});

describe("SeletorData — mudar valor", () => {
  it("fireEvent.change no input chama onMudar com o valor novo", () => {
    const { getByLabelText, onMudar } = renderSeletor("");

    const campo = getByLabelText("Ver estado em");
    fireEvent.change(campo, { target: { value: "2026-10-08" } });

    expect(onMudar).toHaveBeenCalledTimes(1);
    expect(onMudar).toHaveBeenCalledWith("2026-10-08");
  });
});

describe("SeletorData — Ver estado", () => {
  it('clicar em "Ver estado" chama onVerEstado exatamente 1 vez', () => {
    const { getByRole, onVerEstado } = renderSeletor("2026-10-08");

    fireEvent.click(getByRole("button", { name: "Ver estado" }));

    expect(onVerEstado).toHaveBeenCalledTimes(1);
  });
});

describe("SeletorData — Limpar", () => {
  it("com valor não vazio, clicar em Limpar chama onLimpar", () => {
    const { getByRole, onLimpar } = renderSeletor("2026-10-08");

    const botaoLimpar = getByRole("button", { name: "Limpar" });
    expect(botaoLimpar).not.toHaveAttribute("aria-disabled");

    fireEvent.click(botaoLimpar);

    expect(onLimpar).toHaveBeenCalledTimes(1);
  });

  it("com valor vazio, o botão fica aria-disabled e o clique não chama onLimpar", () => {
    const { getByRole, onLimpar } = renderSeletor("");

    const botaoLimpar = getByRole("button", { name: "Limpar" });
    expect(botaoLimpar).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(botaoLimpar);

    expect(onLimpar).not.toHaveBeenCalled();
  });
});

describe("SeletorData — acessibilidade (vitest-axe)", () => {
  it("com valor preenchido: nenhuma violação", async () => {
    const { container } = renderSeletor("2026-10-08");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("com valor vazio: nenhuma violação", async () => {
    const { container } = renderSeletor("");

    expect(await axe(container)).toHaveNoViolations();
  });
});
