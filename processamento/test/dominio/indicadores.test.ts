import { describe, expect, it } from "vitest";
import {
  calcularTempoMedioPedidoEnvioEntrega,
  calcularValorPagoVsDevido,
  indicadorDivergenciasPorTipo,
  indicadorEntregasNoPrazo,
  type PedidoParaIndicadorEntrega,
  type PedidoParaIndicadorTempoMedio,
  type PedidoParaIndicadorValorPagoVsDevido,
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
    const linha = bloco.linhas[0]!;
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
    const embaralhado = [pedidos[2]!, pedidos[0]!, pedidos[3]!, pedidos[1]!];

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
    const embaralhado = [divergencias[2]!, divergencias[0]!, divergencias[3]!, divergencias[1]!];

    const blocoOriginal = indicadorDivergenciasPorTipo(divergencias);
    const blocoEmbaralhado = indicadorDivergenciasPorTipo(embaralhado);

    expect(blocoEmbaralhado.linhas.map((l) => l.rotulos[0])).toEqual(ORDEM_ESPERADA);
    expect(blocoEmbaralhado).toEqual(blocoOriginal);
  });
});

describe("calcularTempoMedioPedidoEnvioEntrega (TP-0068)", () => {
  it("pedido com envio e entrega entra nas duas linhas", () => {
    const pedidos: PedidoParaIndicadorTempoMedio[] = [
      { dataPedido: "2026-01-01", dataEnvio: "2026-01-04", dataEntrega: "2026-01-09" },
    ];

    const bloco = calcularTempoMedioPedidoEnvioEntrega(pedidos);

    const pedidoEnvio = bloco.linhas[0]!;
    const envioEntrega = bloco.linhas[1]!;
    expect(pedidoEnvio.numerador).toBe(3);
    expect(pedidoEnvio.denominador).toBe(1);
    expect(pedidoEnvio.resultado).toBe(3);
    expect(envioEntrega.numerador).toBe(5);
    expect(envioEntrega.denominador).toBe(1);
    expect(envioEntrega.resultado).toBe(5);
  });

  it("pedido sem dataEnvio fica fora das duas linhas (envio→entrega exige a data de envio)", () => {
    const pedidos: PedidoParaIndicadorTempoMedio[] = [
      { dataPedido: "2026-01-01", dataEntrega: "2026-01-09" },
    ];

    const bloco = calcularTempoMedioPedidoEnvioEntrega(pedidos);

    const pedidoEnvio = bloco.linhas[0]!;
    const envioEntrega = bloco.linhas[1]!;
    expect(pedidoEnvio.denominador).toBe(0);
    expect(pedidoEnvio.resultado).toBeNull();
    expect(envioEntrega.denominador).toBe(0);
    expect(envioEntrega.resultado).toBeNull();
  });

  it("pedido com envio mas sem entrega entra em pedido→envio, mas fica fora de envio→entrega (linhas independentes)", () => {
    const pedidos: PedidoParaIndicadorTempoMedio[] = [
      { dataPedido: "2026-01-01", dataEnvio: "2026-01-04" },
    ];

    const bloco = calcularTempoMedioPedidoEnvioEntrega(pedidos);

    const pedidoEnvio = bloco.linhas[0]!;
    const envioEntrega = bloco.linhas[1]!;
    expect(pedidoEnvio.denominador).toBe(1);
    expect(pedidoEnvio.resultado).toBe(3);
    expect(envioEntrega.denominador).toBe(0);
    expect(envioEntrega.resultado).toBeNull();
  });

  it("lista vazia produz resultado null nas duas linhas, sem lançar erro", () => {
    const bloco = calcularTempoMedioPedidoEnvioEntrega([]);

    expect(bloco.linhas).toHaveLength(2);
    for (const linha of bloco.linhas) {
      expect(linha.numerador).toBe(0);
      expect(linha.denominador).toBe(0);
      expect(linha.resultado).toBeNull();
    }
  });

  it("soma, contagem e média (com arredondamento a 2 casas) corretas para 3 pedidos com dias 3, 5 e 2", () => {
    const pedidos: PedidoParaIndicadorTempoMedio[] = [
      { dataPedido: "2026-01-01", dataEnvio: "2026-01-04" },
      { dataPedido: "2026-01-01", dataEnvio: "2026-01-06" },
      { dataPedido: "2026-01-01", dataEnvio: "2026-01-03" },
    ];

    const bloco = calcularTempoMedioPedidoEnvioEntrega(pedidos);

    const pedidoEnvio = bloco.linhas[0]!;
    expect(pedidoEnvio.numerador).toBe(10);
    expect(pedidoEnvio.denominador).toBe(3);
    expect(pedidoEnvio.resultado).toBe(3.33);
  });

  it("formula, chave e titulo do bloco", () => {
    const bloco = calcularTempoMedioPedidoEnvioEntrega([]);

    expect(bloco.chave).toBe("tempoMedioPedidoEnvioEntrega");
    expect(bloco.titulo).toBe("Tempo médio pedido→envio e envio→entrega");
    expect(bloco.formula).toContain("÷");
    expect(bloco.linhas.map((l) => l.rotulos[0])).toEqual(["pedido→envio", "envio→entrega"]);
  });
});

describe("calcularValorPagoVsDevido (TP-0069)", () => {
  const pedidosBase: PedidoParaIndicadorValorPagoVsDevido[] = [
    { devido: 100, pago: 0, situacao: "sem_pagamento" },
    { devido: 100, pago: 40, situacao: "parcial" },
    { devido: 100, pago: 100, situacao: "quitado" },
    { devido: 100, pago: 120, situacao: "excedente" },
  ];

  it("soma corretamente em Total e em cada linha por situação, para pedidos nas 4 situações", () => {
    const bloco = calcularValorPagoVsDevido(pedidosBase);

    expect(bloco.chave).toBe("valorPagoVsDevido");
    expect(bloco.titulo).toBe("Valor pago × valor devido");
    expect(bloco.formula).toBe("Σ pago ÷ Σ devido");
    expect(bloco.linhas).toHaveLength(5);

    const [total, semPagamento, parcial, quitado, excedente] = bloco.linhas;

    expect(total).toEqual({
      rotulos: ["Total"],
      numerador: 260,
      denominador: 400,
      resultado: 0.65,
    });
    expect(semPagamento).toEqual({
      rotulos: ["sem_pagamento"],
      numerador: 0,
      denominador: 100,
      resultado: 0,
    });
    expect(parcial).toEqual({
      rotulos: ["parcial"],
      numerador: 40,
      denominador: 100,
      resultado: 0.4,
    });
    expect(quitado).toEqual({
      rotulos: ["quitado"],
      numerador: 100,
      denominador: 100,
      resultado: 1,
    });
    expect(excedente).toEqual({
      rotulos: ["excedente"],
      numerador: 120,
      denominador: 100,
      resultado: 1.2,
    });
  });

  it("situação sem nenhum pedido produz denominador 0 e resultado null", () => {
    const pedidos: PedidoParaIndicadorValorPagoVsDevido[] = [
      { devido: 100, pago: 100, situacao: "quitado" },
    ];

    const bloco = calcularValorPagoVsDevido(pedidos);

    const semPagamento = bloco.linhas.find((l) => l.rotulos[0] === "sem_pagamento")!;
    const parcial = bloco.linhas.find((l) => l.rotulos[0] === "parcial")!;
    const excedente = bloco.linhas.find((l) => l.rotulos[0] === "excedente")!;

    for (const linha of [semPagamento, parcial, excedente]) {
      expect(linha.denominador).toBe(0);
      expect(linha.resultado).toBeNull();
    }
  });

  it("lista vazia produz Total com denominador 0 e resultado null", () => {
    const bloco = calcularValorPagoVsDevido([]);

    const total = bloco.linhas[0]!;
    expect(total.numerador).toBe(0);
    expect(total.denominador).toBe(0);
    expect(total.resultado).toBeNull();
  });

  it("arredonda o resultado a 2 casas só depois de somar (dízima periódica)", () => {
    const pedidos: PedidoParaIndicadorValorPagoVsDevido[] = [
      { devido: 3, pago: 1, situacao: "parcial" },
      { devido: 3, pago: 1, situacao: "parcial" },
      { devido: 3, pago: 1, situacao: "parcial" },
    ];

    const bloco = calcularValorPagoVsDevido(pedidos);

    const parcial = bloco.linhas.find((l) => l.rotulos[0] === "parcial")!;
    expect(parcial.numerador).toBe(3);
    expect(parcial.denominador).toBe(9);
    expect(parcial.resultado).toBe(0.33);

    const total = bloco.linhas[0]!;
    expect(total.resultado).toBe(0.33);
  });

  it("ignora qualquer campo extra simulando sugestão de IA: resultado idêntico com ou sem o campo", () => {
    const pedidosSemIA: PedidoParaIndicadorValorPagoVsDevido[] = [
      { devido: 100, pago: 40, situacao: "parcial" },
    ];
    const pedidosComIA = [
      { devido: 100, pago: 40, situacao: "parcial" as const, sugestaoIA: "algo" },
    ];

    const blocoSemIA = calcularValorPagoVsDevido(pedidosSemIA);
    const blocoComIA = calcularValorPagoVsDevido(pedidosComIA);

    expect(blocoComIA).toEqual(blocoSemIA);
  });
});
