import { describe, expect, it } from "vitest";
import {
  indicadorDivergenciasPorTipo,
  indicadorEntregasNoPrazo,
  type PedidoParaIndicadorEntrega,
} from "../../src/dominio/indicadores.js";
import type { TipoDivergencia } from "../../src/dominio/modelo.js";

describe("indicadorEntregasNoPrazo (TP-0033)", () => {
  it("gera resultado 1 por grupo quando todas as entregas estão no prazo, para 2 transportadoras x 2 meses", () => {
    const pedidos: PedidoParaIndicadorEntrega[] = [
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-05" } },
      { transportadora: "Transportadora 1", dataLimite: "2026-02-10", eventoEntrega: { momento_fato: "2026-02-05" } },
      { transportadora: "Transportadora 2", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-09" } },
      { transportadora: "Transportadora 2", dataLimite: "2026-02-10", eventoEntrega: { momento_fato: "2026-02-10" } },
    ];

    const bloco = indicadorEntregasNoPrazo(pedidos);

    expect(bloco.linhas).toHaveLength(4);
    for (const linha of bloco.linhas) {
      expect(linha.numerador).toBe(linha.denominador);
      expect(linha.resultado).toBe(1);
    }
  });

  it("entrega atrasada entra no denominador do grupo, não no numerador", () => {
    const pedidos: PedidoParaIndicadorEntrega[] = [
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-05" } },
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-12" } },
    ];

    const bloco = indicadorEntregasNoPrazo(pedidos);

    expect(bloco.linhas).toHaveLength(1);
    const linha = bloco.linhas[0];
    expect(linha.rotulos).toEqual(["Transportadora 1", "2026-01"]);
    expect(linha.denominador).toBe(2);
    expect(linha.numerador).toBe(1);
    expect(linha.resultado).toBe(0.5);
  });

  it("pedido sem eventoEntrega não gera linha em nenhum grupo e soma em aParte", () => {
    const pedidos: PedidoParaIndicadorEntrega[] = [
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-05" } },
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10" },
      { transportadora: "Transportadora 2", dataLimite: "2026-01-10" },
    ];

    const bloco = indicadorEntregasNoPrazo(pedidos);

    expect(bloco.linhas).toHaveLength(1);
    expect(bloco.aParte).toEqual({ rotulo: "Pedidos sem entrega", valor: 2 });
  });

  it("grupo (transportadora, mês) sem nenhuma entrega conhecida não gera linha", () => {
    const pedidos: PedidoParaIndicadorEntrega[] = [
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10" },
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10" },
    ];

    const bloco = indicadorEntregasNoPrazo(pedidos);

    expect(bloco.linhas).toHaveLength(0);
    expect(bloco.aParte).toEqual({ rotulo: "Pedidos sem entrega", valor: 2 });
  });

  it("lista vazia produz bloco sem linhas e sem pedidos à parte", () => {
    const bloco = indicadorEntregasNoPrazo([]);

    expect(bloco.linhas).toEqual([]);
    expect(bloco.aParte).toEqual({ rotulo: "Pedidos sem entrega", valor: 0 });
  });

  it("é determinístico: mesma entrada embaralhada produz a mesma saída ordenada por transportadora e mês", () => {
    const pedidos: PedidoParaIndicadorEntrega[] = [
      { transportadora: "Transportadora 2", dataLimite: "2026-02-10", eventoEntrega: { momento_fato: "2026-02-05" } },
      { transportadora: "Transportadora 1", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-05" } },
      { transportadora: "Transportadora 1", dataLimite: "2026-02-10", eventoEntrega: { momento_fato: "2026-02-20" } },
      { transportadora: "Transportadora 2", dataLimite: "2026-01-10", eventoEntrega: { momento_fato: "2026-01-09" } },
    ];
    const embaralhado = [pedidos[2], pedidos[0], pedidos[3], pedidos[1]];

    const blocoOriginal = indicadorEntregasNoPrazo(pedidos);
    const blocoEmbaralhado = indicadorEntregasNoPrazo(embaralhado);

    expect(blocoEmbaralhado.linhas.map((l) => l.rotulos)).toEqual([
      ["Transportadora 1", "2026-01"],
      ["Transportadora 1", "2026-02"],
      ["Transportadora 2", "2026-01"],
      ["Transportadora 2", "2026-02"],
    ]);
    expect(blocoEmbaralhado).toEqual(blocoOriginal);
  });
});

describe("indicadorDivergenciasPorTipo (TP-0033)", () => {
  const ORDEM_ESPERADA: TipoDivergencia[] = [
    "duplicado",
    "parcial",
    "pago_nao_enviado",
    "enviado_nao_pago",
    "entrega_atrasada",
  ];

  it("lista vazia produz 5 linhas com numerador 0, denominador 0 e resultado null, na ordem do tipo", () => {
    const bloco = indicadorDivergenciasPorTipo([]);

    expect(bloco.linhas).toHaveLength(5);
    expect(bloco.linhas.map((l) => l.rotulos[0])).toEqual(ORDEM_ESPERADA);
    for (const linha of bloco.linhas) {
      expect(linha.numerador).toBe(0);
      expect(linha.denominador).toBe(0);
      expect(linha.resultado).toBeNull();
    }
  });

  it("3 duplicado + 1 parcial produzem linhas corretas com denominador 4, tipos sem ocorrência com numerador 0", () => {
    const divergencias: { tipo: TipoDivergencia }[] = [
      { tipo: "duplicado" },
      { tipo: "duplicado" },
      { tipo: "duplicado" },
      { tipo: "parcial" },
    ];

    const bloco = indicadorDivergenciasPorTipo(divergencias);

    expect(bloco.linhas).toEqual([
      { rotulos: ["duplicado"], numerador: 3, denominador: 4, resultado: 0.75 },
      { rotulos: ["parcial"], numerador: 1, denominador: 4, resultado: 0.25 },
      { rotulos: ["pago_nao_enviado"], numerador: 0, denominador: 4, resultado: 0 },
      { rotulos: ["enviado_nao_pago"], numerador: 0, denominador: 4, resultado: 0 },
      { rotulos: ["entrega_atrasada"], numerador: 0, denominador: 4, resultado: 0 },
    ]);
  });

  it("é determinístico: mesma entrada embaralhada produz a mesma saída, sempre na ordem do tipo", () => {
    const divergencias: { tipo: TipoDivergencia }[] = [
      { tipo: "entrega_atrasada" },
      { tipo: "duplicado" },
      { tipo: "enviado_nao_pago" },
      { tipo: "duplicado" },
    ];
    const embaralhado = [divergencias[2], divergencias[0], divergencias[3], divergencias[1]];

    const blocoOriginal = indicadorDivergenciasPorTipo(divergencias);
    const blocoEmbaralhado = indicadorDivergenciasPorTipo(embaralhado);

    expect(blocoEmbaralhado.linhas.map((l) => l.rotulos[0])).toEqual(ORDEM_ESPERADA);
    expect(blocoEmbaralhado).toEqual(blocoOriginal);
  });
});
