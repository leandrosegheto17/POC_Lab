import { describe, expect, it } from "vitest";

import {
  montarDocumentoResumo,
  montarDocumentoIndicadores,
} from "../../src/publicacao/documentos.js";
import { totaisResumo, type DivergenciaComPedido } from "../../src/dominio/totais.js";
import {
  indicadorEntregasNoPrazo,
  indicadorDivergenciasPorTipo,
  calcularTempoMedioPedidoEnvioEntrega,
  calcularValorPagoVsDevido,
  type PedidoParaIndicadorEntrega,
  type PedidoParaIndicadorTempoMedio,
  type PedidoParaIndicadorValorPagoVsDevido,
} from "../../src/dominio/indicadores.js";
import { EsquemaResumo } from "../../src/contrato/resumo.js";
import {
  EsquemaRespostaIndicadores,
  EsquemaBlocoIndicador,
} from "../../src/contrato/indicadores.js";
import { obrigatorio } from "../apoio/obrigatorio.js";

/**
 * TP-0039 — Testes de `montarDocumentoResumo`/`montarDocumentoIndicadores`
 * e das funções de mapeamento domínio → contrato.
 */

function construirTotaisFixture() {
  const pedidos = [
    { idPedido: "PED-000001", devido: 100, pago: 40, situacao: "parcial" as const },
    { idPedido: "PED-000002", devido: 200, pago: 200, situacao: "quitado" as const },
    { idPedido: "PED-000003", devido: 50, pago: 70, situacao: "excedente" as const },
  ];

  const divergencias: DivergenciaComPedido[] = [
    { tipo: "parcial", motivo: "pago menor que devido", idsEventos: ["EV-1"], idPedido: "PED-000001" },
    { tipo: "duplicado", motivo: "pago maior que devido", idsEventos: ["EV-2"], idPedido: "PED-000003" },
  ];

  const pedidosEntrega: PedidoParaIndicadorEntrega[] = [
    {
      transportadora: "Transportadora 1",
      dataLimite: "2026-01-10",
      eventoEntrega: { momento_fato: "2026-01-05T10:00:00Z" },
    },
    {
      transportadora: "Transportadora 1",
      dataLimite: "2026-01-02",
      eventoEntrega: { momento_fato: "2026-01-05T10:00:00Z" },
    },
    { transportadora: "Transportadora 2", dataLimite: "2026-01-10" },
  ];

  const blocoEntregasNoPrazo = indicadorEntregasNoPrazo(pedidosEntrega);
  const totais = totaisResumo(pedidos, divergencias, blocoEntregasNoPrazo);

  return { totais, blocoEntregasNoPrazo, divergencias };
}

describe("montarDocumentoResumo", () => {
  it("passa no esquema EsquemaResumo sem lançar", () => {
    const { totais } = construirTotaisFixture();

    const resumo = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais, versao: 1 },
    });

    expect(() => EsquemaResumo.parse(resumo)).not.toThrow();
  });

  it("versaoContrato é sempre 'v1'", () => {
    const { totais } = construirTotaisFixture();

    const resumo = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais },
    });

    expect(resumo.versaoContrato).toBe("v1");
  });

  it("idPublicacao é determinístico: mesma entrada 2x produz o mesmo hash", () => {
    const { totais } = construirTotaisFixture();
    const conteudoParaHash = { totais, extra: { b: 2, a: 1 } };

    const primeiro = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash,
    });
    const segundo = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais, extra: { a: 1, b: 2 } },
    });

    expect(primeiro.idPublicacao).toBe(segundo.idPublicacao);
  });

  it("idPublicacao muda quando 1 campo do conteúdo de hash muda", () => {
    const { totais } = construirTotaisFixture();

    const primeiro = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais, valor: 1 },
    });
    const segundo = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais, valor: 2 },
    });

    expect(primeiro.idPublicacao).not.toBe(segundo.idPublicacao);
  });

  it("totais.porTipo mapeia cada linha do bloco de domínio para { tipo, cartao } correspondente", () => {
    const { totais, divergencias } = construirTotaisFixture();

    const resumo = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais },
    });

    const blocoDominio = indicadorDivergenciasPorTipo(divergencias);

    expect(resumo.totais.porTipo).toHaveLength(blocoDominio.linhas.length);
    resumo.totais.porTipo.forEach((item, indice) => {
      const linhaDominio = obrigatorio(blocoDominio.linhas[indice]);
      expect(item.tipo).toBe(linhaDominio.rotulos[0]);
      expect(item.cartao).toEqual({
        titulo: blocoDominio.titulo,
        formula: blocoDominio.formula,
        numerador: linhaDominio.numerador,
        denominador: linhaDominio.denominador,
        resultado: linhaDominio.resultado,
      });
    });
  });

  it("totais.entregasNoPrazo é o bloco entregasNoPrazoTotal do domínio achatado em Cartao", () => {
    const { totais } = construirTotaisFixture();

    const resumo = montarDocumentoResumo({
      dataCorte: "2026-01-05T10:00:00Z",
      semente: 20261007,
      totais,
      conteudoParaHash: { totais },
    });

    const linha = obrigatorio(totais.entregasNoPrazoTotal.linhas[0]);
    expect(resumo.totais.entregasNoPrazo).toEqual({
      titulo: totais.entregasNoPrazoTotal.titulo,
      formula: totais.entregasNoPrazoTotal.formula,
      numerador: linha.numerador,
      denominador: linha.denominador,
      resultado: linha.resultado,
    });
  });
});

describe("montarDocumentoIndicadores", () => {
  it("passa no esquema EsquemaRespostaIndicadores sem lançar", () => {
    const pedidosEntrega: PedidoParaIndicadorEntrega[] = [
      {
        transportadora: "Transportadora 1",
        dataLimite: "2026-01-10",
        eventoEntrega: { momento_fato: "2026-01-05T10:00:00Z" },
      },
      { transportadora: "Transportadora 2", dataLimite: "2026-01-10" },
    ];
    const divergencias: DivergenciaComPedido[] = [
      { tipo: "parcial", motivo: "pago menor que devido", idsEventos: ["EV-1"], idPedido: "PED-000001" },
    ];

    const blocos = [
      indicadorEntregasNoPrazo(pedidosEntrega),
      indicadorDivergenciasPorTipo(divergencias),
    ];

    const documento = montarDocumentoIndicadores(blocos);

    expect(() => EsquemaRespostaIndicadores.parse(documento)).not.toThrow();
  });

  it("bloco com aParte definido: aParte === true e há uma linha extra com rótulo/valor da parte separada", () => {
    const pedidosEntrega: PedidoParaIndicadorEntrega[] = [
      {
        transportadora: "Transportadora 1",
        dataLimite: "2026-01-10",
        eventoEntrega: { momento_fato: "2026-01-05T10:00:00Z" },
      },
      // Pedido sem evento de entrega: cai no "à parte" (semEntrega).
      { transportadora: "Transportadora 2", dataLimite: "2026-01-10" },
    ];

    const blocoDominio = indicadorEntregasNoPrazo(pedidosEntrega);
    expect(blocoDominio.aParte).toBeDefined();

    const resultado = obrigatorio(montarDocumentoIndicadores([blocoDominio])[0]);

    expect(resultado.aParte).toBe(true);
    expect(resultado.linhas).toHaveLength(blocoDominio.linhas.length + 1);

    const linhaExtra = resultado.linhas[resultado.linhas.length - 1];
    expect(linhaExtra).toEqual({
      rotulo: obrigatorio(blocoDominio.aParte).rotulo,
      numerador: obrigatorio(blocoDominio.aParte).valor,
      denominador: 1,
      resultado: obrigatorio(blocoDominio.aParte).valor,
    });
  });

  it("bloco sem aParte: aParte === false e nenhuma linha extra é adicionada", () => {
    const divergencias: DivergenciaComPedido[] = [
      { tipo: "duplicado", motivo: "pago maior que devido", idsEventos: ["EV-1"], idPedido: "PED-000001" },
    ];
    const blocoDominio = indicadorDivergenciasPorTipo(divergencias);
    expect(blocoDominio.aParte).toBeUndefined();

    const resultado = obrigatorio(montarDocumentoIndicadores([blocoDominio])[0]);

    expect(resultado.aParte).toBe(false);
    expect(resultado.linhas).toHaveLength(blocoDominio.linhas.length);
  });

  it("rotulo de cada linha é o rotulos.join(' / ') da linha de domínio correspondente", () => {
    const pedidosEntrega: PedidoParaIndicadorEntrega[] = [
      {
        transportadora: "Transportadora 1",
        dataLimite: "2026-01-10",
        eventoEntrega: { momento_fato: "2026-01-05T10:00:00Z" },
      },
    ];
    const blocoDominio = indicadorEntregasNoPrazo(pedidosEntrega);

    const resultado = obrigatorio(montarDocumentoIndicadores([blocoDominio])[0]);

    blocoDominio.linhas.forEach((linhaDominio, indice) => {
      expect(obrigatorio(resultado.linhas[indice]).rotulo).toBe(linhaDominio.rotulos.join(" / "));
    });
  });
});

/**
 * TP-0070 — Os 2 blocos novos do Lote 15 (`calcularTempoMedioPedidoEnvioEntrega`,
 * TP-0068, e `calcularValorPagoVsDevido`, TP-0069) entram como itens novos da
 * lista de `montarDocumentoIndicadores`, na ordem fixa: Must primeiro
 * (entregas no prazo, divergências por tipo), depois tempo médio, depois
 * valor pago×devido (mesma ordem usada em `publicacao/publicar.ts`).
 *
 * Nota de regressão (confirmada por leitura, não por execução): o teste de
 * contrato do TP-0049 (`web/test/worker/indicadores.test.ts`) monta sua
 * própria fixture de D1 com um documento `indicadores` independente deste
 * módulo e não foi alterado — ele só valida `EsquemaRespostaIndicadores`
 * contra o conteúdo gravado na fixture, sem depender de quantos/quais blocos
 * `montarDocumentoIndicadores` produz em produção. Como o esquema v1
 * (`contrato/indicadores.ts`) continua "lista genérica de blocos", sem campo
 * novo, esse teste continua verde sem qualquer alteração nele.
 */
describe("montarDocumentoIndicadores — blocos novos do Lote 15 (TP-0070)", () => {
  function construirQuatroBlocosFixture() {
    const pedidosEntrega: PedidoParaIndicadorEntrega[] = [
      {
        transportadora: "Transportadora 1",
        dataLimite: "2026-01-10",
        eventoEntrega: { momento_fato: "2026-01-05T10:00:00Z" },
      },
      { transportadora: "Transportadora 2", dataLimite: "2026-01-10" },
    ];
    const divergencias: DivergenciaComPedido[] = [
      {
        tipo: "parcial",
        motivo: "pago menor que devido",
        idsEventos: ["EV-1"],
        idPedido: "PED-000001",
      },
    ];
    const pedidosTempoMedio: PedidoParaIndicadorTempoMedio[] = [
      { dataPedido: "2026-01-01", dataEnvio: "2026-01-04", dataEntrega: "2026-01-09" },
      { dataPedido: "2026-01-02", dataEnvio: "2026-01-03" },
    ];
    const pedidosValorPagoVsDevido: PedidoParaIndicadorValorPagoVsDevido[] = [
      { devido: 100, pago: 40, situacao: "parcial" },
      { devido: 200, pago: 200, situacao: "quitado" },
    ];

    const blocoEntregasNoPrazo = indicadorEntregasNoPrazo(pedidosEntrega);
    const blocoDivergenciasPorTipo = indicadorDivergenciasPorTipo(divergencias);
    const blocoTempoMedio = calcularTempoMedioPedidoEnvioEntrega(pedidosTempoMedio);
    const blocoValorPagoVsDevido = calcularValorPagoVsDevido(pedidosValorPagoVsDevido);

    return {
      blocos: [
        blocoEntregasNoPrazo,
        blocoDivergenciasPorTipo,
        blocoTempoMedio,
        blocoValorPagoVsDevido,
      ],
    };
  }

  it("monta uma lista com os 4 blocos, cada um passando em EsquemaBlocoIndicador, na ordem fixa esperada", () => {
    const { blocos } = construirQuatroBlocosFixture();

    const documento = montarDocumentoIndicadores(blocos);

    expect(documento).toHaveLength(4);
    for (const bloco of documento) {
      expect(EsquemaBlocoIndicador.safeParse(bloco).success).toBe(true);
    }

    expect(documento.map((bloco) => bloco.chave)).toEqual([
      "entregas_no_prazo",
      "divergencias_por_tipo",
      "tempoMedioPedidoEnvioEntrega",
      "valorPagoVsDevido",
    ]);
  });

  it("o esquema v1 (EsquemaRespostaIndicadores) continua aceitando a lista de 4 blocos sem lançar", () => {
    const { blocos } = construirQuatroBlocosFixture();

    const documento = montarDocumentoIndicadores(blocos);

    expect(() => EsquemaRespostaIndicadores.parse(documento)).not.toThrow();
  });

  it("é determinístico: 2 chamadas com a mesma entrada produzem a mesma lista, mesma ordem, bytes idênticos", () => {
    const { blocos: blocosA } = construirQuatroBlocosFixture();
    const { blocos: blocosB } = construirQuatroBlocosFixture();

    const documentoA = montarDocumentoIndicadores(blocosA);
    const documentoB = montarDocumentoIndicadores(blocosB);

    expect(documentoA).toEqual(documentoB);
    expect(JSON.stringify(documentoA)).toBe(JSON.stringify(documentoB));
  });
});
