// `DetalheLinhaDoTempo`: a marca "duplicado" nos pagamentos só aparece quando a
// API declarou a divergência `duplicado` para o pedido (RN-03, ADR-019).
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { LinhaDoTempoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import { DetalheLinhaDoTempo } from "../src/componentes/pedido/DetalheLinhaDoTempo.tsx";
import {
  cartoes,
  eventoPagamento,
  eventoVenda,
} from "./apoio/eventos-linha-do-tempo.ts";

afterEach(cleanup);

type Divergencias = LinhaDoTempoV1["pedido"]["divergencias"];

function pedidoComPagamentos(
  divergencias: Divergencias,
  codigosPagamentos: string[],
): LinhaDoTempoV1 {
  return {
    pedido: {
      identidade: "PED-000001",
      codigoBuscado: "PED-000001",
      fontes: [{ fonte: "vendas", codigo: "10248" }],
      devido: 150.5,
      pago: 150.5 * codigosPagamentos.length,
      dataLimite: "2026-10-10T00:00:00.000Z",
      divergencias,
    },
    eventos: [
      eventoVenda(),
      ...codigosPagamentos.map((codigo, indice) =>
        eventoPagamento({
          codigoEvento: codigo,
          momentoFato: `2026-10-0${String(indice + 2)}T10:00:00.000Z`,
        }),
      ),
    ],
  };
}

const DUPLICADO: Divergencias = [
  { tipo: "duplicado", motivo: "Pago duas vezes o valor integral." },
];

describe("DetalheLinhaDoTempo — marca 'duplicado' só com a divergência declarada", () => {
  it("sem divergência, pagamentos repetidos não ganham marca", () => {
    const { container } = render(
      <DetalheLinhaDoTempo dados={pedidoComPagamentos([], ["TX-1", "TX-2"])} />,
    );

    expect(screen.queryByText("duplicado")).toBeNull();
    expect(container.querySelector(".evento--ruim")).toBeNull();
  });

  it("com a divergência, só o pagamento repetido é marcado; o primeiro fica sem marca", () => {
    const { container } = render(
      <DetalheLinhaDoTempo
        dados={pedidoComPagamentos(DUPLICADO, ["TX-1", "TX-2"])}
      />,
    );

    const lista = cartoes(container);
    const primeiro = obrigatorio(
      lista.find((cartao) => cartao.textContent.includes("TX-1")),
      "cartão do primeiro pagamento",
    );
    const segundo = obrigatorio(
      lista.find((cartao) => cartao.textContent.includes("TX-2")),
      "cartão do segundo pagamento",
    );
    expect(within(primeiro).queryByText("duplicado")).toBeNull();
    expect(primeiro).not.toHaveClass("evento--ruim");
    expect(within(segundo).getByText("duplicado")).toBeInTheDocument();
    expect(segundo).toHaveClass("evento--ruim");
    expect(screen.getAllByText("duplicado")).toHaveLength(1);
  });

  it("divergência declarada com um único pagamento: nenhuma marca", () => {
    const { container } = render(
      <DetalheLinhaDoTempo dados={pedidoComPagamentos(DUPLICADO, ["TX-1"])} />,
    );

    expect(screen.queryByText("duplicado")).toBeNull();
    expect(container.querySelector(".evento--ruim")).toBeNull();
  });

  it("outra divergência com pagamentos repetidos: nenhuma marca", () => {
    const { container } = render(
      <DetalheLinhaDoTempo
        dados={pedidoComPagamentos(
          [{ tipo: "entrega_atrasada", motivo: "Entrega após o prazo." }],
          ["TX-1", "TX-2"],
        )}
      />,
    );

    expect(screen.queryByText("duplicado")).toBeNull();
    expect(container.querySelector(".evento--ruim")).toBeNull();
  });
});
