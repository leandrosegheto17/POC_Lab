import { describe, expect, it } from "vitest";
import { totaisResumo, type DivergenciaComPedido, type PedidoParaTotais } from "../../src/dominio/totais.js";
import type { BlocoIndicador } from "../../src/dominio/indicadores.js";
import { obrigatorio } from "../apoio/obrigatorio.js";

const BLOCO_ENTREGAS_VAZIO: BlocoIndicador = {
  chave: "entregas_no_prazo",
  titulo: "Entregas no prazo por transportadora e mês",
  formula: "numero de entregas com momento_fato <= dataLimite / numero de pedidos com entrega conhecida",
  linhas: [],
};

describe("totaisResumo (TP-0034)", () => {
  it("soma valorEmAberto dos pedidos parcial e enviado_nao_pago juntos (saldo 10 + 20 + 50 = 80)", () => {
    const pedidos: PedidoParaTotais[] = [
      { idPedido: "P1", devido: 30, pago: 20, situacao: "parcial" }, // saldo 10
      { idPedido: "P2", devido: 50, pago: 30, situacao: "parcial" }, // saldo 20
      { idPedido: "P3", devido: 50, pago: 0, situacao: "sem_pagamento" }, // enviado_nao_pago
    ];
    const divergencias: DivergenciaComPedido[] = [
      { tipo: "enviado_nao_pago", motivo: "enviado sem pagamento", idsEventos: [], idPedido: "P3" },
    ];

    const totais = totaisResumo(pedidos, divergencias, BLOCO_ENTREGAS_VAZIO);

    expect(obrigatorio(totais.valorEmAberto.linhas[0]).numerador).toBe(80);
    expect(obrigatorio(totais.valorEmAberto.linhas[0]).denominador).toBe(1);
    expect(obrigatorio(totais.valorEmAberto.linhas[0]).resultado).toBe(80);
  });

  it("soma pagoAMais só dos pedidos com divergência duplicado (pago - devido = 15)", () => {
    const pedidos: PedidoParaTotais[] = [
      { idPedido: "P1", devido: 100, pago: 115, situacao: "excedente" },
      { idPedido: "P2", devido: 40, pago: 40, situacao: "quitado" },
    ];
    const divergencias: DivergenciaComPedido[] = [
      { tipo: "duplicado", motivo: "pagamento duplicado", idsEventos: [], idPedido: "P1" },
    ];

    const totais = totaisResumo(pedidos, divergencias, BLOCO_ENTREGAS_VAZIO);

    expect(obrigatorio(totais.pagoAMais.linhas[0]).numerador).toBe(15);
  });

  it("sem divergências: porTipo com todos os tipos em 0, valorEmAberto e pagoAMais em 0", () => {
    const pedidos: PedidoParaTotais[] = [
      { idPedido: "P1", devido: 40, pago: 40, situacao: "quitado" },
    ];

    const totais = totaisResumo(pedidos, [], BLOCO_ENTREGAS_VAZIO);

    expect(totais.porTipo.linhas).toHaveLength(5);
    for (const linha of totais.porTipo.linhas) {
      expect(linha.numerador).toBe(0);
    }
    expect(obrigatorio(totais.valorEmAberto.linhas[0]).numerador).toBe(0);
    expect(obrigatorio(totais.pagoAMais.linhas[0]).numerador).toBe(0);
  });

  it("entregasNoPrazoTotal soma numeradores/denominadores das linhas do bloco recebido (3/4 e 1/1 -> 4/5 = 0.8)", () => {
    const blocoEntregas: BlocoIndicador = {
      chave: "entregas_no_prazo",
      titulo: "Entregas no prazo por transportadora e mês",
      formula: "numero de entregas no prazo / numero de entregas conhecidas, por transportadora e mes",
      linhas: [
        { rotulos: ["Transportadora 1", "2026-01"], numerador: 3, denominador: 4, resultado: 0.75 },
        { rotulos: ["Transportadora 2", "2026-01"], numerador: 1, denominador: 1, resultado: 1 },
      ],
    };

    const totais = totaisResumo([], [], blocoEntregas);

    const linha = obrigatorio(totais.entregasNoPrazoTotal.linhas[0]);
    expect(linha.numerador).toBe(4);
    expect(linha.denominador).toBe(5);
    expect(linha.resultado).toBe(0.8);
  });

  it("entregasNoPrazoTotal com denominador 0 produz resultado null", () => {
    const totais = totaisResumo([], [], BLOCO_ENTREGAS_VAZIO);

    const linha = obrigatorio(totais.entregasNoPrazoTotal.linhas[0]);
    expect(linha.numerador).toBe(0);
    expect(linha.denominador).toBe(0);
    expect(linha.resultado).toBeNull();
  });

  it("pedidos e pedidosComDivergencia contam corretamente, sem duplicar pedido com mais de uma divergência", () => {
    const pedidos: PedidoParaTotais[] = [
      { idPedido: "P1", devido: 100, pago: 50, situacao: "parcial" },
      { idPedido: "P2", devido: 40, pago: 40, situacao: "quitado" },
      { idPedido: "P3", devido: 60, pago: 0, situacao: "sem_pagamento" },
    ];
    const divergencias: DivergenciaComPedido[] = [
      { tipo: "parcial", motivo: "saldo em aberto", idsEventos: [], idPedido: "P1" },
      { tipo: "entrega_atrasada", motivo: "entrega fora do prazo", idsEventos: [], idPedido: "P1" },
    ];

    const totais = totaisResumo(pedidos, divergencias, BLOCO_ENTREGAS_VAZIO);

    expect(obrigatorio(totais.pedidos.linhas[0]).numerador).toBe(3);
    expect(obrigatorio(totais.pedidosComDivergencia.linhas[0]).numerador).toBe(1);
    expect(obrigatorio(totais.pedidosComDivergencia.linhas[0]).denominador).toBe(3);
  });

  it("arredonda só no fim da soma: dois saldos de 0,005 somam 0,01 (não 0,00 + 0,00 arredondados antes)", () => {
    const pedidos: PedidoParaTotais[] = [
      { idPedido: "P1", devido: 10.005, pago: 10, situacao: "parcial" },
      { idPedido: "P2", devido: 20.005, pago: 20, situacao: "parcial" },
    ];

    const totais = totaisResumo(pedidos, [], BLOCO_ENTREGAS_VAZIO);

    // soma bruta = 0.005 + 0.005 = 0.01; se arredondasse item a item antes
    // (0.005 -> 0.00 ou 0.01 cada), o resultado poderia ser diferente de 0.01.
    expect(obrigatorio(totais.valorEmAberto.linhas[0]).numerador).toBe(0.01);
  });

  it("arredonda pagoAMais só no fim da soma, mesma lógica de ponto flutuante", () => {
    const pedidos: PedidoParaTotais[] = [
      { idPedido: "P1", devido: 10, pago: 10.005, situacao: "excedente" },
      { idPedido: "P2", devido: 20, pago: 20.005, situacao: "excedente" },
    ];
    const divergencias: DivergenciaComPedido[] = [
      { tipo: "duplicado", motivo: "pagamento duplicado", idsEventos: [], idPedido: "P1" },
      { tipo: "duplicado", motivo: "pagamento duplicado", idsEventos: [], idPedido: "P2" },
    ];

    const totais = totaisResumo(pedidos, divergencias, BLOCO_ENTREGAS_VAZIO);

    expect(obrigatorio(totais.pagoAMais.linhas[0]).numerador).toBe(0.01);
  });
});
