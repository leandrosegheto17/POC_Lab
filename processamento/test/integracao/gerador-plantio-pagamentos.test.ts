import { describe, expect, it } from "vitest";
import type { PedidoVendas } from "../../src/fontes/leitura-vendas.ts";
import {
  construirPedidosFixtureGrande,
  executarFluxoComPlantio,
  linhasDoPedido,
  valorDevidoDoPedido,
} from "../apoio/gerador.ts";

describe("plantarCasosPagamento", () => {
  const PEDIDOS_GRANDE = construirPedidosFixtureGrande(100);

  it("planta cada um dos 8 casos, com formato esperado em linhasCsv e entrada correspondente no gabarito", () => {
    const { limpos, plantio } = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);
    const pedidosPorId = new Map(limpos.map((pedido) => [pedido.idPedido, pedido]));

    const tiposEsperados = [
      "duplicado",
      "parcial",
      "enviado_nao_pago",
      "sem_identificacao",
      "registro_repetido",
      "linha_invalida",
      "valor_fora_do_padrao",
    ];
    const tiposPresentes = new Set(plantio.gabarito.map((entrada) => entrada.tipo));
    for (const tipo of tiposEsperados) {
      expect(tiposPresentes.has(tipo)).toBe(true);
    }

    for (const entrada of plantio.gabarito.filter((item) => item.tipo === "duplicado")) {
      const pedido = pedidosPorId.get(entrada.pedido_venda) as PedidoVendas;
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const valorDevido = valorDevidoDoPedido(pedido);

      expect(linhas.length).toBeGreaterThanOrEqual(2);
      const codigos = linhas.map((partes) => partes[0]);
      expect(new Set(codigos).size).toBe(codigos.length);
      for (const partes of linhas) {
        expect(Number(partes[2])).toBeCloseTo(valorDevido, 2);
      }
    }

    for (const entrada of plantio.gabarito.filter((item) => item.tipo === "parcial")) {
      const pedido = pedidosPorId.get(entrada.pedido_venda) as PedidoVendas;
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const valorDevido = valorDevidoDoPedido(pedido);

      expect(linhas).toHaveLength(1);
      const valorPago = Number(linhas[0]?.[2]);
      expect(valorPago).toBeGreaterThan(0);
      expect(valorPago).toBeLessThan(valorDevido);
    }

    for (const entrada of plantio.gabarito.filter((item) => item.tipo === "registro_repetido")) {
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      expect(linhas.length).toBeGreaterThanOrEqual(2);
      expect(linhas[0]).toEqual(linhas[1]);
    }

    for (const entrada of plantio.gabarito.filter((item) => item.tipo === "linha_invalida")) {
      // A transação original (válida, que quita o pedido) é preservada —
      // só é ACRESCENTADA uma transação extra corrompida (verificação de
      // 2026-10-08: ver `plantar-pagamentos.ts`), por isso aqui espera-se
      // pelo menos 2 linhas, sendo 1 inválida e 1 válida.
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      expect(linhas.length).toBeGreaterThanOrEqual(2);
      expect(linhas.some((partes) => !Number.isFinite(Number(partes[2])))).toBe(true);
      expect(linhas.some((partes) => Number.isFinite(Number(partes[2])))).toBe(true);
    }

    for (const entrada of plantio.gabarito.filter((item) => item.tipo === "valor_fora_do_padrao")) {
      const pedido = pedidosPorId.get(entrada.pedido_venda) as PedidoVendas;
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const valorDevido = valorDevidoDoPedido(pedido);

      expect(linhas).toHaveLength(1);
      expect(Number(linhas[0]?.[2])).toBeGreaterThan(valorDevido * 2);
    }
  });

  it("os subconjuntos sorteados para cada tipo são disjuntos entre si (nenhum pedido recebe 2 casos)", () => {
    const { plantio } = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    const contagemPorPedido = new Map<string, number>();
    for (const entrada of plantio.gabarito) {
      contagemPorPedido.set(
        entrada.pedido_venda,
        (contagemPorPedido.get(entrada.pedido_venda) ?? 0) + 1,
      );
    }

    for (const contagem of contagemPorPedido.values()) {
      expect(contagem).toBeLessThanOrEqual(1);
    }
    expect(contagemPorPedido.size).toBeGreaterThan(0);
  });

  it('caso "enviado e não pago": pedido sorteado não aparece em nenhuma linha de linhasCsv', () => {
    const { plantio } = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    const entradasEnviadoNaoPago = plantio.gabarito.filter(
      (entrada) => entrada.tipo === "enviado_nao_pago",
    );
    expect(entradasEnviadoNaoPago.length).toBeGreaterThan(0);

    for (const entrada of entradasEnviadoNaoPago) {
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      expect(linhas).toHaveLength(0);
    }
  });

  it('casos "dois códigos" e "texto livre" geram, ambos, entrada no gabarito com tipo "sem_identificacao"', () => {
    const { plantio } = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    const entradasSemIdentificacao = plantio.gabarito.filter(
      (entrada) => entrada.tipo === "sem_identificacao",
    );
    expect(entradasSemIdentificacao.length).toBeGreaterThan(0);

    // Verificação de 2026-10-08: os 2 casos agora ACRESCENTAM uma transação
    // extra sem identificação (em vez de substituir a original, que quita o
    // pedido — ver `plantar-pagamentos.ts`), por isso aqui a busca é pelo
    // conteúdo da própria referência, não mais pelo pedido específico:
    // "texto livre" usa sempre o mesmo texto genérico (sem nenhum código
    // `PV-`); "dois códigos" sempre começa com o `PV-` do próprio pedido
    // seguido de outro `PV-`.
    const linhasTextoLivre = plantio.linhasCsv.filter(
      (linha) => (linha.split(",")[1]?.match(/PV-\d{6}/g) ?? []).length === 0,
    );
    const linhasDoisCodigos = plantio.linhasCsv.filter(
      (linha) => (linha.split(",")[1]?.match(/PV-\d{6}/g) ?? []).length === 2,
    );

    expect(linhasTextoLivre.length).toBeGreaterThan(0);
    expect(linhasDoisCodigos.length).toBeGreaterThan(0);

    // Cada linha de "dois códigos" começa com o PV- do pedido dono dela, e
    // esse pedido está mesmo marcado como "sem_identificacao" no gabarito.
    const pedidosSemIdentificacao = new Set(
      entradasSemIdentificacao.map((entrada) => entrada.pedido_venda),
    );
    for (const linha of linhasDoisCodigos) {
      const referencia = linha.split(",")[1] ?? "";
      const primeiroCodigo = referencia.match(/PV-(\d{6})/);
      const idPedido = primeiroCodigo ? String(Number(primeiroCodigo[1])) : "";
      expect(pedidosSemIdentificacao.has(idPedido)).toBe(true);
    }
  });

  it("é determinístico: mesma semente produz mesmos pedidos sorteados e mesmo gabarito, byte a byte", () => {
    const resultado1 = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);
    const resultado2 = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    expect(resultado1.plantio).toEqual(resultado2.plantio);

    const pedidosSorteados1 = resultado1.plantio.gabarito.map((entrada) => entrada.pedido_venda).sort();
    const pedidosSorteados2 = resultado2.plantio.gabarito.map((entrada) => entrada.pedido_venda).sort();
    expect(pedidosSorteados1).toEqual(pedidosSorteados2);
  });
});

describe("meio_pagamento", () => {
  const PEDIDOS_GRANDE = construirPedidosFixtureGrande(100);

  it("com a semente padrão, uma fração determinística das linhas finais recebe meio_pagamento e a fração complementar fica vazia", () => {
    const { plantio } = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    const comMeioPagamento = plantio.linhasCsv.filter(
      (linha) => (linha.split(",")[4] ?? "") !== "",
    );
    const semMeioPagamento = plantio.linhasCsv.filter(
      (linha) => (linha.split(",")[4] ?? "") === "",
    );

    expect(comMeioPagamento.length).toBeGreaterThan(0);
    expect(semMeioPagamento.length).toBeGreaterThan(0);
    for (const linha of comMeioPagamento) {
      expect(["pix", "boleto", "cartao"]).toContain(linha.split(",")[4]);
    }
  });

  it("2 execuções com a mesma semente produzem o mesmo CSV byte a byte, incluindo a coluna meio_pagamento", () => {
    const resultado1 = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);
    const resultado2 = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    expect(resultado1.plantio.linhasCsv).toEqual(resultado2.plantio.linhasCsv);
  });

  it('caso "registro repetido": as 2 linhas duplicadas têm o mesmo valor de meio_pagamento, pois compartilham o mesmo codigo_transacao', () => {
    const { plantio } = executarFluxoComPlantio(PEDIDOS_GRANDE, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "registro_repetido");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      expect(linhas.length).toBeGreaterThanOrEqual(2);
      expect(linhas[0]?.[4]).toBe(linhas[1]?.[4]);
    }
  });
});

