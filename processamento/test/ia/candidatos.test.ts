import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { montarCandidatos, type ResumoPedido } from "../../src/ia/candidatos.js";
import { calcularChaveCache } from "../../src/ia/chave-cache.js";

const MOMENTO = "2026-03-01T00:00:00.000Z";

function pedido(id: string, devido: number, pago = 0, dataLimite = "2026-01-01T00:00:00.000Z"): ResumoPedido {
  return {
    id_pedido: id,
    valor_devido: devido,
    valor_pago: pago,
    data_limite: dataLimite,
    situacao_pagamento: pago >= devido ? "quitado" : "parcial",
  };
}

describe("montarCandidatos", () => {
  it("aceita saldo até R$ 0,01 abaixo do valor do pagamento e rejeita abaixo disso", () => {
    const candidatos = montarCandidatos([pedido("PED-A", 99.99), pedido("PED-B", 99.98)], {
      valor: 100,
      momentoFato: MOMENTO,
    });

    expect(candidatos.map((c) => c.idPedido)).toEqual(["PED-A"]);
  });

  it("ordena pela menor diferença entre saldo em aberto e valor", () => {
    const candidatos = montarCandidatos(
      [pedido("PED-LONGE", 200), pedido("PED-PERTO", 105), pedido("PED-EXATO", 100)],
      { valor: 100, momentoFato: MOMENTO },
    );

    expect(candidatos.map((c) => c.idPedido)).toEqual(["PED-EXATO", "PED-PERTO", "PED-LONGE"]);
  });

  it("descarta quitado, sem data, sem valor devido e data posterior ao pagamento", () => {
    const resumos: ResumoPedido[] = [
      pedido("PED-QUITADO", 100, 100),
      { ...pedido("PED-SEM-DATA", 100), data_limite: null },
      { ...pedido("PED-SEM-VALOR", 100), valor_devido: null },
      pedido("PED-FUTURO", 100, 0, "2026-04-01T00:00:00.000Z"),
      pedido("PED-OK", 100),
    ];

    const candidatos = montarCandidatos(resumos, { valor: 100, momentoFato: MOMENTO });

    expect(candidatos.map((c) => c.idPedido)).toEqual(["PED-OK"]);
  });

  it("limita a 20 candidatos", () => {
    const resumos = Array.from({ length: 25 }, (_, i) => pedido(`PED-${String(i).padStart(2, "0")}`, 100 + i));

    const candidatos = montarCandidatos(resumos, { valor: 100, momentoFato: MOMENTO });

    expect(candidatos).toHaveLength(20);
    expect(candidatos[19]?.idPedido).toBe("PED-19");
  });
});

describe("calcularChaveCache", () => {
  it("é o SHA-256 de texto + candidatos em JSON + modelo", () => {
    const esperado = createHash("sha256")
      .update('REF-1["PED-A","PED-B"]falso')
      .digest("hex");

    expect(calcularChaveCache("REF-1", ["PED-A", "PED-B"], "falso")).toBe(esperado);
  });

  it("muda quando o modelo ou a ordem dos candidatos muda", () => {
    const base = calcularChaveCache("REF-1", ["PED-A", "PED-B"], "falso");

    expect(calcularChaveCache("REF-1", ["PED-A", "PED-B"], "outro")).not.toBe(base);
    expect(calcularChaveCache("REF-1", ["PED-B", "PED-A"], "falso")).not.toBe(base);
  });
});
