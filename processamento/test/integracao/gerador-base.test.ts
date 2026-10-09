import { describe, expect, it } from "vitest";
import { escreverGabarito } from "../../src/gerador/problemas-plantados.ts";
import { pedidosLimpos } from "../../src/gerador/gerar.ts";
import { gerarPagamentos } from "../../src/gerador/pagamentos.ts";
import { mulberry32 } from "../../src/gerador/prng.ts";
import { PEDIDOS_FIXTURE } from "../apoio/gerador.ts";

describe("mulberry32", () => {
  it("produz a mesma sequência para a mesma semente", () => {
    const gerador1 = mulberry32(20261007);
    const gerador2 = mulberry32(20261007);

    const sequencia1 = Array.from({ length: 5 }, () => gerador1());
    const sequencia2 = Array.from({ length: 5 }, () => gerador2());

    expect(sequencia1).toEqual(sequencia2);
  });

  it("produz sequências diferentes para sementes diferentes", () => {
    const gerador1 = mulberry32(1);
    const gerador2 = mulberry32(2);

    const sequencia1 = Array.from({ length: 5 }, () => gerador1());
    const sequencia2 = Array.from({ length: 5 }, () => gerador2());

    expect(sequencia1).not.toEqual(sequencia2);
  });

  it("devolve números em [0, 1)", () => {
    const gerador = mulberry32(42);
    for (let i = 0; i < 20; i += 1) {
      const valor = gerador();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });
});

describe("pedidosLimpos + gerarPagamentos (determinismo)", () => {
  it("produzem o mesmo resultado byte a byte para a mesma semente, em execuções separadas", () => {
    const prng1 = mulberry32(20261007);
    const limpos1 = pedidosLimpos(PEDIDOS_FIXTURE, prng1);
    const resultado1 = gerarPagamentos(limpos1, prng1);

    const prng2 = mulberry32(20261007);
    const limpos2 = pedidosLimpos(PEDIDOS_FIXTURE, prng2);
    const resultado2 = gerarPagamentos(limpos2, prng2);

    expect(limpos1).toEqual(limpos2);
    expect(resultado1).toEqual(resultado2);
  });

  it("pedidosLimpos devolve todos os pedidos recebidos (nenhum pedido é excluído)", () => {
    const prng = mulberry32(20261007);
    const limpos = pedidosLimpos(PEDIDOS_FIXTURE, prng);

    expect(limpos).toEqual(PEDIDOS_FIXTURE);
  });

  it("a soma dos pagamentos de cada pedido bate com o valor devido (tolerância de R$ 0,01)", () => {
    const prng = mulberry32(20261007);
    const limpos = pedidosLimpos(PEDIDOS_FIXTURE, prng);
    const { linhasCsv } = gerarPagamentos(limpos, prng);

    const somaPorReferencia = new Map<string, number>();
    for (const linha of linhasCsv) {
      const partes = linha.split(",");
      const referencia = partes[1] ?? "";
      const valor = Number(partes[2] ?? "0");
      somaPorReferencia.set(
        referencia,
        (somaPorReferencia.get(referencia) ?? 0) + valor,
      );
    }

    for (const pedido of limpos) {
      const referencia = `PV-${pedido.idPedido.padStart(6, "0")}`;
      const valorDevido = pedido.itens.reduce(
        (acumulado, item) =>
          acumulado + item.precoUnitario * item.quantidade * (1 - item.desconto),
        0,
      );
      const somaPaga = somaPorReferencia.get(referencia) ?? 0;
      expect(Math.abs(somaPaga - valorDevido)).toBeLessThanOrEqual(0.01);
    }
  });

  it("gera codigo_transacao e referencia no formato esperado", () => {
    const prng = mulberry32(20261007);
    const limpos = pedidosLimpos(PEDIDOS_FIXTURE, prng);
    const { linhasCsv } = gerarPagamentos(limpos, prng);

    expect(linhasCsv.length).toBeGreaterThan(0);
    for (const linha of linhasCsv) {
      const partes = linha.split(",");
      expect(partes[0] ?? "").toMatch(/^TX-\d{6}$/);
      expect(partes[1] ?? "").toMatch(/^PV-\d{6}$/);
    }
  });

  it("transacaoSeq corresponde ao número de transações geradas (parcelas contam 2x)", () => {
    const prng = mulberry32(20261007);
    const limpos = pedidosLimpos(PEDIDOS_FIXTURE, prng);
    const { linhasCsv, transacaoSeq } = gerarPagamentos(limpos, prng);

    expect(transacaoSeq).toBe(linhasCsv.length);
  });
});

describe("escreverGabarito", () => {
  it("produz um JSON válido representando array vazio", () => {
    const conteudo = escreverGabarito([]);

    expect(conteudo.endsWith("\n")).toBe(true);
    expect(JSON.parse(conteudo)).toEqual([]);
  });

  it("ordena as entradas por pedido_venda e depois por tipo", () => {
    const conteudo = escreverGabarito([
      { pedido_venda: "10249", tipo: "atraso" },
      { pedido_venda: "10248", tipo: "duplicado" },
      { pedido_venda: "10248", tipo: "atraso" },
    ]);

    const lista = JSON.parse(conteudo) as Array<{
      pedido_venda: string;
      tipo: string;
    }>;

    expect(lista).toEqual([
      { pedido_venda: "10248", tipo: "atraso" },
      { pedido_venda: "10248", tipo: "duplicado" },
      { pedido_venda: "10249", tipo: "atraso" },
    ]);
  });
});

