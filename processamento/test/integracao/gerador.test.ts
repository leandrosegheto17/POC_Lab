import { describe, expect, it } from "vitest";
import type { PedidoVendas } from "../../src/fontes/leitura-vendas.ts";
import { escreverGabarito } from "../../src/gerador/gabarito.ts";
import { pedidosLimpos } from "../../src/gerador/gerar.ts";
import { gerarPagamentos } from "../../src/gerador/pagamentos.ts";
import { plantarCasosPagamento } from "../../src/gerador/plantar-pagamentos.ts";
import { plantarCasosRastreio } from "../../src/gerador/plantar-rastreio.ts";
import { mulberry32 } from "../../src/gerador/prng.ts";
import { gerarRastreio } from "../../src/gerador/rastreio.ts";

function construirPedidoFixture(
  idPedido: string,
  precoUnitario: number,
  quantidade: number,
  desconto = 0,
): PedidoVendas {
  return {
    idPedido,
    itens: [{ precoUnitario, quantidade, desconto }],
    dataPedido: { iso: "1997-07-04T00:00:00.000Z", formato: "curto" },
    dataEnvio: null,
    dataLimite: "1997-08-01T00:00:00.000Z",
    transportadora: "1",
  };
}

const PEDIDOS_FIXTURE: PedidoVendas[] = [
  construirPedidoFixture("10248", 14, 12),
  construirPedidoFixture("10249", 9.8, 10, 0),
  construirPedidoFixture("10250", 34.8, 5, 0.15),
  construirPedidoFixture("10251", 7.7, 3, 0),
  construirPedidoFixture("10252", 64.8, 40, 0.2),
  construirPedidoFixture("10253", 16.56, 15, 0.05),
  construirPedidoFixture("10254", 2.5, 8, 0),
  construirPedidoFixture("10255", 100, 1, 0),
  construirPedidoFixture("10256", 13.9, 7, 0.1),
  construirPedidoFixture("10257", 55.25, 2, 0),
];

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

  it("pedidosLimpos devolve todos os pedidos recebidos (nenhum problema ainda plantado nesta tarefa)", () => {
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

function construirPedidoComEnvioFixture(
  idPedido: string,
  dataEnvio: string,
  dataLimite: string,
  transportadora = "1",
): PedidoVendas {
  return {
    idPedido,
    itens: [{ precoUnitario: 10, quantidade: 1, desconto: 0 }],
    dataPedido: { iso: "1997-07-01T00:00:00.000Z", formato: "curto" },
    dataEnvio,
    dataLimite,
    transportadora,
  };
}

describe("gerarRastreio", () => {
  it("gera 3 linhas (coleta, transporte, entrega) em ordem crescente de momento_fato para pedido com envio", () => {
    const pedido = construirPedidoComEnvioFixture(
      "20001",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
    );
    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedido], prng);

    expect(linhasCsv).toHaveLength(3);

    const partesLinhas = linhasCsv.map((linha) => linha.split(","));
    const tipos = partesLinhas.map((partes) => partes[3]);
    expect(tipos).toEqual(["coleta", "transporte", "entrega"]);

    const momentos = partesLinhas.map((partes) => Date.parse(partes[4] ?? ""));
    expect(momentos[0]).toBeLessThan(momentos[1] as number);
    expect(momentos[1]).toBeLessThan(momentos[2] as number);

    const dataLimite = Date.parse(pedido.dataLimite);
    expect(momentos[2]).toBeLessThanOrEqual(dataLimite);

    expect(partesLinhas[0]?.[4]).toBe(pedido.dataEnvio);
  });

  it("não gera nenhuma linha para pedido sem data de envio", () => {
    const pedidoSemEnvio = construirPedidoFixture("20002", 10, 1);
    expect(pedidoSemEnvio.dataEnvio).toBeNull();

    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedidoSemEnvio], prng);

    expect(linhasCsv).toHaveLength(0);
  });

  it("usa o mesmo codigo_rastreio (formato RS-dddddd) nas 3 linhas do mesmo pedido", () => {
    const pedido = construirPedidoComEnvioFixture(
      "20003",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
    );
    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedido], prng);

    const codigosRastreio = linhasCsv.map((linha) => linha.split(",")[1]);
    expect(new Set(codigosRastreio).size).toBe(1);
    expect(codigosRastreio[0]).toMatch(/^RS-\d{6}$/);
  });

  it("escreve as linhas na ordem canônica: coleta/transporte/entrega por pedido, pedidos na ordem de geração", () => {
    const pedidoComEnvioA = construirPedidoComEnvioFixture(
      "20004",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
    );
    const pedidoSemEnvio = construirPedidoFixture("20005", 10, 1);
    const pedidoComEnvioB = construirPedidoComEnvioFixture(
      "20006",
      "1997-07-10T00:00:00.000Z",
      "1997-08-05T00:00:00.000Z",
    );

    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio(
      [pedidoComEnvioA, pedidoSemEnvio, pedidoComEnvioB],
      prng,
    );

    expect(linhasCsv).toHaveLength(6);

    const pedidosETipos = linhasCsv.map((linha) => {
      const partes = linha.split(",");
      return [partes[2], partes[3]];
    });

    expect(pedidosETipos).toEqual([
      ["20004", "coleta"],
      ["20004", "transporte"],
      ["20004", "entrega"],
      ["20006", "coleta"],
      ["20006", "transporte"],
      ["20006", "entrega"],
    ]);
  });

  it("não usa nenhum nome real de transportadora: repassa o código cru do pedido", () => {
    const pedido = construirPedidoComEnvioFixture(
      "20007",
      "1997-07-04T00:00:00.000Z",
      "1997-08-01T00:00:00.000Z",
      "3",
    );
    const prng = mulberry32(20261007);
    const { linhasCsv } = gerarRastreio([pedido], prng);

    for (const linha of linhasCsv) {
      const partes = linha.split(",");
      expect(partes[5]).toBe("3");
    }
  });

  it("produz o mesmo resultado byte a byte para a mesma semente, em execuções separadas (determinismo)", () => {
    const pedidos = [
      construirPedidoComEnvioFixture(
        "20008",
        "1997-07-04T00:00:00.000Z",
        "1997-08-01T00:00:00.000Z",
      ),
      construirPedidoComEnvioFixture(
        "20009",
        "1997-07-12T00:00:00.000Z",
        "1997-08-10T00:00:00.000Z",
        "2",
      ),
    ];

    const prng1 = mulberry32(20261007);
    const resultado1 = gerarRastreio(pedidos, prng1);

    const prng2 = mulberry32(20261007);
    const resultado2 = gerarRastreio(pedidos, prng2);

    expect(resultado1).toEqual(resultado2);
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

/**
 * Fixture grande (100 pedidos "limpos") usada pelos testes de
 * `plantarCasosPagamento` (TP-0025): precisa ser grande o suficiente para
 * que, mesmo com `Math.floor` nas proporções (mínimo 0.03), cada um dos 8
 * tipos de caso tenha pelo menos 1 pedido sorteado.
 */
function construirPedidosFixtureGrande(quantidade: number): PedidoVendas[] {
  const pedidos: PedidoVendas[] = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    const idPedido = String(30000 + indice);
    pedidos.push(
      construirPedidoFixture(idPedido, 10 + indice, 1 + (indice % 5), (indice % 3) / 10),
    );
  }
  return pedidos;
}

/** Monta, para os testes, o fluxo completo até `plantarCasosPagamento` com uma única instância de PRNG (mesma ordem de consumo da CLI). */
function executarFluxoComPlantio(pedidosOrigem: PedidoVendas[], semente: number) {
  const prng = mulberry32(semente);
  const limpos = pedidosLimpos(pedidosOrigem, prng);
  const { linhasCsv: linhasCsvBase } = gerarPagamentos(limpos, prng);
  const plantio = plantarCasosPagamento(limpos, linhasCsvBase, prng);
  return { limpos, linhasCsvBase, plantio };
}

function linhasDoPedido(linhasCsv: string[], idPedido: string): string[][] {
  const referencia = `PV-${idPedido.padStart(6, "0")}`;
  return linhasCsv
    .filter((linha) => linha.split(",")[1] === referencia)
    .map((linha) => linha.split(","));
}

function valorDevidoDoPedido(pedido: PedidoVendas): number {
  return pedido.itens.reduce(
    (acumulado, item) =>
      acumulado + item.precoUnitario * item.quantidade * (1 - item.desconto),
    0,
  );
}

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

describe("meio_pagamento (TP-0075)", () => {
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

/**
 * Fixture grande (100 pedidos "limpos", todos COM envio) usada pelos testes
 * de `plantarCasosRastreio` (TP-0026): precisa ser grande o suficiente para
 * que, mesmo com `Math.floor` nas proporções (mínimo 0.03), cada um dos 5
 * tipos de caso de rastreio tenha pelo menos 1 pedido sorteado.
 */
function construirPedidosComEnvioFixtureGrande(quantidade: number): PedidoVendas[] {
  const pedidos: PedidoVendas[] = [];
  for (let indice = 0; indice < quantidade; indice += 1) {
    const idPedido = String(40000 + indice);
    const diaEnvio = 4 + (indice % 20);
    const diaLimite = diaEnvio + 15 + (indice % 10);
    const dataEnvio = `1997-07-${String(diaEnvio).padStart(2, "0")}T00:00:00.000Z`;
    const dataLimite =
      diaLimite <= 31
        ? `1997-07-${String(diaLimite).padStart(2, "0")}T00:00:00.000Z`
        : `1997-08-${String(diaLimite - 31).padStart(2, "0")}T00:00:00.000Z`;
    pedidos.push(
      construirPedidoComEnvioFixture(idPedido, dataEnvio, dataLimite, String(1 + (indice % 3))),
    );
  }
  return pedidos;
}

/** Monta, para os testes, o fluxo completo até `plantarCasosRastreio` com uma única instância de PRNG (mesma ordem de consumo da CLI). */
function executarFluxoComPlantioRastreio(pedidosOrigem: PedidoVendas[], semente: number) {
  const prng = mulberry32(semente);
  const limpos = pedidosLimpos(pedidosOrigem, prng);
  const { linhasCsv: linhasCsvBase } = gerarPagamentos(limpos, prng);
  const plantioPagamento = plantarCasosPagamento(limpos, linhasCsvBase, prng);
  const rastreioGerado = gerarRastreio(limpos, prng);
  const plantio = plantarCasosRastreio(limpos, rastreioGerado.linhasCsv, prng);
  return { limpos, rastreioGerado, plantio, plantioPagamento };
}

function linhasDeRastreioDoPedido(linhasCsv: string[], idPedido: string): string[][] {
  return linhasCsv
    .filter((linha) => linha.split(",")[2] === idPedido)
    .map((linha) => linha.split(","));
}

describe("plantarCasosRastreio", () => {
  const PEDIDOS_GRANDE_COM_ENVIO = construirPedidosComEnvioFixtureGrande(100);

  it("planta cada um dos 5 casos, com formato esperado em linhasCsv e entrada correspondente no gabarito", () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const tiposEsperados = [
      "pago_nao_enviado",
      "entrega_atrasada",
      "fora_de_ordem",
      "linha_invalida",
      "registro_repetido",
    ];
    const tiposPresentes = new Set(plantio.gabarito.map((entrada) => entrada.tipo));
    for (const tipo of tiposEsperados) {
      expect(tiposPresentes.has(tipo)).toBe(true);
    }
  });

  it('caso "pago e não enviado": pedido sorteado não tem nenhuma linha coleta/transporte/entrega em linhasCsv', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "pago_nao_enviado");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      expect(linhas).toHaveLength(0);
    }
  });

  it('caso "fora de ordem": momento_fato de cada linha respeita a ordem cronológica correta, mas a posição física de entrega e transporte está trocada', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "fora_de_ordem");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const indiceEntrega = plantio.linhasCsv.findIndex((linha) => {
        const partes = linha.split(",");
        return partes[2] === entrada.pedido_venda && partes[3] === "entrega";
      });
      const indiceTransporte = plantio.linhasCsv.findIndex((linha) => {
        const partes = linha.split(",");
        return partes[2] === entrada.pedido_venda && partes[3] === "transporte";
      });

      expect(indiceEntrega).toBeGreaterThanOrEqual(0);
      expect(indiceTransporte).toBeGreaterThanOrEqual(0);
      // Posição física trocada: entrega aparece ANTES de transporte no arquivo.
      expect(indiceEntrega).toBeLessThan(indiceTransporte);

      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const momentoColeta = Date.parse(
        linhas.find((partes) => partes[3] === "coleta")?.[4] ?? "",
      );
      const momentoTransporte = Date.parse(
        linhas.find((partes) => partes[3] === "transporte")?.[4] ?? "",
      );
      const momentoEntrega = Date.parse(
        linhas.find((partes) => partes[3] === "entrega")?.[4] ?? "",
      );
      // Valores de momento_fato permanecem na ordem cronológica correta,
      // mesmo com a posição física das linhas trocada.
      expect(momentoColeta).toBeLessThan(momentoTransporte);
      expect(momentoTransporte).toBeLessThan(momentoEntrega);
    }
  });

  it('caso "entrega atrasada": momento_fato do evento entrega é estritamente posterior à dataLimite do pedido', () => {
    const { limpos, plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);
    const pedidosPorId = new Map(limpos.map((pedido) => [pedido.idPedido, pedido]));

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "entrega_atrasada");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const pedido = pedidosPorId.get(entrada.pedido_venda) as PedidoVendas;
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const linhaEntrega = linhas.find((partes) => partes[3] === "entrega");

      expect(linhaEntrega).toBeDefined();
      const momentoEntrega = Date.parse(linhaEntrega?.[4] ?? "");
      const dataLimite = Date.parse(pedido.dataLimite);
      expect(momentoEntrega).toBeGreaterThan(dataLimite);
    }
  });

  it('caso "linha inválida": a linha corrompida tem tipo fora do enum coleta/transporte/entrega', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "linha_invalida");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const tipos = linhas.map((partes) => partes[3]);
      expect(tipos.some((tipo) => !["coleta", "transporte", "entrega"].includes(tipo ?? ""))).toBe(
        true,
      );
    }
  });

  it('caso "registro repetido": a linha duplicada tem o mesmo codigo_evento, em 2 ocorrências', () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    const entradas = plantio.gabarito.filter((entrada) => entrada.tipo === "registro_repetido");
    expect(entradas.length).toBeGreaterThan(0);

    for (const entrada of entradas) {
      const linhas = linhasDeRastreioDoPedido(plantio.linhasCsv, entrada.pedido_venda);
      const codigosEvento = linhas.map((partes) => partes[0]);
      const contagem = new Map<string, number>();
      for (const codigo of codigosEvento) {
        contagem.set(codigo ?? "", (contagem.get(codigo ?? "") ?? 0) + 1);
      }
      expect(Math.max(...contagem.values())).toBe(2);
    }
  });

  it("os subconjuntos sorteados para cada tipo de caso de rastreio são disjuntos entre si (nenhum pedido recebe 2 casos)", () => {
    const { plantio } = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

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

  it("é determinístico: mesma semente produz mesmos pedidos sorteados e mesmo resultado, byte a byte", () => {
    const resultado1 = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);
    const resultado2 = executarFluxoComPlantioRastreio(PEDIDOS_GRANDE_COM_ENVIO, 20261007);

    expect(resultado1.plantio).toEqual(resultado2.plantio);

    const pedidosSorteados1 = resultado1.plantio.gabarito.map((entrada) => entrada.pedido_venda).sort();
    const pedidosSorteados2 = resultado2.plantio.gabarito.map((entrada) => entrada.pedido_venda).sort();
    expect(pedidosSorteados1).toEqual(pedidosSorteados2);
  });
});
