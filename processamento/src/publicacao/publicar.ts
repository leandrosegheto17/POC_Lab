import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Consultas } from "../armazenamento/consultas.js";
import type { Repositorio } from "../armazenamento/repositorio.js";
import { montarPedidosEVinculos } from "./pedidos.js";
import { montarLinhaDoTempo } from "./linha-do-tempo.js";
import { montarDivergencias, type LinhaDivergenciaProjecao } from "./divergencias.js";
import { montarDocumentoQualidade } from "./qualidade.js";
import { montarDocumentoResumo, montarDocumentoIndicadores } from "./documentos.js";
import { escreverSqlPublicacao, type LinhaTabela, type TabelasParaPublicacao } from "./escritor-sql.js";
import { totaisResumo, type DivergenciaComPedido, type PedidoParaTotais } from "../dominio/totais.js";
import {
  indicadorEntregasNoPrazo,
  calcularTempoMedioPedidoEnvioEntrega,
  calcularValorPagoVsDevido,
  type PedidoParaIndicadorEntrega,
  type PedidoParaIndicadorTempoMedio,
} from "../dominio/indicadores.js";

/**
 * Monta o SQL completo de publicação (DDL + dados) a partir do event store
 * já populado, encadeando as projeções
 * (`pedidos.ts`, `linha-do-tempo.ts`, `divergencias.ts`, `qualidade.ts`) e os
 * documentos finais (`documentos.ts`, `dominio/totais.ts`,
 * `dominio/indicadores.ts`).
 *
 * Função pura em relação a I/O de disco: lê o DDL verbatim de
 * `leitura-d1.sql` (caminho relativo a este módulo, mesmo padrão de
 * `armazenamento/repositorio.ts` para `schema.sql`) e devolve a string SQL
 * final — nunca escreve em disco nem roda `wrangler` (isso é
 * responsabilidade do CLI, `cli/publicar-dados.ts`).
 */

const DIRETORIO_ATUAL = dirname(fileURLToPath(import.meta.url));
const CAMINHO_DDL = join(DIRETORIO_ATUAL, "leitura-d1.sql");

/** Calcula `dataCorte` (RN-14): o maior `momento_fato` entre todos os eventos do event store. */
function calcularDataCorte(consultas: Pick<Consultas, "obterMaiorMomentoFato">): string {
  return consultas.obterMaiorMomentoFato() ?? "";
}

/**
 * Informações extraídas da linha do tempo de um pedido, necessárias para o
 * indicador de entregas no prazo (`transportadora`/`dataLimite`/
 * `momentoEntrega`) e para o indicador de tempo médio pedido→envio e
 * envio→entrega (`momentoPedido`/`momentoEnvio`/`momentoEntrega` — reaproveita
 * `momentoEntrega`, já extraído para o primeiro indicador).
 *
 * `momentoEnvio` vem do evento `coleta` (fonte `rastreio`): é o momento em
 * que a transportadora retira o pedido, proxy de "envio" — não há um tipo de
 * evento literal `"envio"` em `dominio/evento.ts`; a cadeia de rastreio é
 * `coleta` → `transporte` → `entrega`, e `coleta` é a etapa que marca o
 * pedido como enviado.
 */
type InfoEntregaPedido = {
  transportadora?: string;
  dataLimite?: string;
  momentoEntrega?: string;
  momentoPedido?: string;
  momentoEnvio?: string;
};

type DadosVendaPayload = { transportadora?: string; data_limite?: string };

/**
 * A partir da projeção `linha_do_tempo` (já montada), extrai por pedido a
 * `transportadora`/`dataLimite` (do evento `venda`), o `momento_fato` do
 * evento `venda` (data do pedido), o `momento_fato` do evento `coleta` (data
 * de envio) e o `momento_fato` do evento `entrega` (quando existir) — sem
 * reconsultar o banco, já que essas informações já estão disponíveis em
 * `dados` (JSON do payload do evento, gravado verbatim pela importação).
 */
function extrairInfoEntregaPorPedido(
  linhaDoTempo: { id_pedido: string; tipo: string; momento_fato: string; dados: string }[],
): Map<string, InfoEntregaPedido> {
  const porPedido = new Map<string, InfoEntregaPedido>();

  for (const linha of linhaDoTempo) {
    const info = porPedido.get(linha.id_pedido) ?? {};

    if (linha.tipo === "venda") {
      const payload = JSON.parse(linha.dados) as DadosVendaPayload;
      info.transportadora = payload.transportadora;
      info.dataLimite = payload.data_limite;
      info.momentoPedido = linha.momento_fato;
    } else if (linha.tipo === "coleta") {
      info.momentoEnvio = linha.momento_fato;
    } else if (linha.tipo === "entrega") {
      info.momentoEntrega = linha.momento_fato;
    }

    porPedido.set(linha.id_pedido, info);
  }

  return porPedido;
}

/** Monta a lista de `PedidoParaIndicadorEntrega` (`dominio/indicadores.ts`), um item por pedido de `pedidoResumo`. */
function montarPedidosParaIndicadorEntrega(
  pedidoResumo: { id_pedido: string; data_limite: string | null }[],
  infoPorPedido: Map<string, InfoEntregaPedido>,
): PedidoParaIndicadorEntrega[] {
  return pedidoResumo.map((pedido) => {
    const info = infoPorPedido.get(pedido.id_pedido);
    return {
      transportadora: info?.transportadora ?? "",
      dataLimite: info?.dataLimite ?? pedido.data_limite ?? "",
      eventoEntrega:
        info?.momentoEntrega !== undefined ? { momento_fato: info.momentoEntrega } : undefined,
    };
  });
}

/**
 * Monta a lista de `PedidoParaIndicadorTempoMedio` (`dominio/indicadores.ts`), um item por pedido de `pedidoResumo`. Um pedido sem `momentoPedido`
 * (não deveria ocorrer — todo pedido tem evento `venda`) usa string vazia, na
 * mesma convenção de `momentoEntregaPedido ?? ""` já usada para o indicador de
 * entregas no prazo; pedidos sem envio/entrega simplesmente não preenchem
 * `dataEnvio`/`dataEntrega`, deixando a função de domínio excluí-los do
 * denominador correspondente.
 */
function montarPedidosParaIndicadorTempoMedio(
  pedidoResumo: { id_pedido: string }[],
  infoPorPedido: Map<string, InfoEntregaPedido>,
): PedidoParaIndicadorTempoMedio[] {
  return pedidoResumo.map((pedido) => {
    const info = infoPorPedido.get(pedido.id_pedido);
    return {
      dataPedido: info?.momentoPedido ?? "",
      dataEnvio: info?.momentoEnvio,
      dataEntrega: info?.momentoEntrega,
    };
  });
}

/** Converte `LinhaDivergenciaProjecao[]` (`publicacao/divergencias.ts`) para `DivergenciaComPedido[]` (`dominio/totais.ts`). */
function montarDivergenciasComPedido(
  divergenciasProjecao: LinhaDivergenciaProjecao[],
): DivergenciaComPedido[] {
  return divergenciasProjecao.map((divergencia) => {
    const eventos = JSON.parse(divergencia.eventos) as Array<{ codigo: string }>;
    return {
      tipo: divergencia.tipo,
      motivo: divergencia.motivo,
      idsEventos: eventos.map((evento) => evento.codigo),
      idPedido: divergencia.id_pedido,
    };
  });
}

/**
 * Monta o SQL completo de publicação (DDL + `INSERT`s) a partir do event
 * store aberto em `db`. Determinístico: a mesma entrada (mesmo `db`, mesma
 * `semente`) produz sempre a mesma string.
 */
export function montarSqlPublicacao(repositorio: Repositorio, args: { semente: number }): string {
  const { semente } = args;

  const { pedidoResumo, vinculoCodigo } = montarPedidosEVinculos(repositorio);
  const dataCorte = calcularDataCorte(repositorio);
  const linhaDoTempo = montarLinhaDoTempo(repositorio);
  const divergenciasProjecao = montarDivergencias(repositorio, dataCorte);
  const qualidade = montarDocumentoQualidade(repositorio);

  const pedidosParaTotais: PedidoParaTotais[] = pedidoResumo.map((pedido) => ({
    idPedido: pedido.id_pedido,
    devido: pedido.valor_devido ?? 0,
    pago: pedido.valor_pago,
    situacao: pedido.situacao_pagamento,
  }));

  const divergenciasComPedido = montarDivergenciasComPedido(divergenciasProjecao);

  const infoEntregaPorPedido = extrairInfoEntregaPorPedido(linhaDoTempo);
  const pedidosParaIndicadorEntrega = montarPedidosParaIndicadorEntrega(
    pedidoResumo,
    infoEntregaPorPedido,
  );
  const blocoEntregasNoPrazo = indicadorEntregasNoPrazo(pedidosParaIndicadorEntrega);

  const pedidosParaIndicadorTempoMedio = montarPedidosParaIndicadorTempoMedio(
    pedidoResumo,
    infoEntregaPorPedido,
  );
  const blocoTempoMedio = calcularTempoMedioPedidoEnvioEntrega(pedidosParaIndicadorTempoMedio);

  // `pedidosParaTotais` já tem exatamente a forma de
  // `PedidoParaIndicadorValorPagoVsDevido` (devido/pago/situacao), com
  // `idPedido` extra — `calcularValorPagoVsDevido` ignora campos extras
  // (RN-11), então é reaproveitada sem remapear.
  const blocoValorPagoVsDevido = calcularValorPagoVsDevido(pedidosParaTotais);

  const totais = totaisResumo(pedidosParaTotais, divergenciasComPedido, blocoEntregasNoPrazo);

  const resumo = montarDocumentoResumo({
    dataCorte,
    semente,
    totais,
    conteudoParaHash: { totais, blocoEntregasNoPrazo, qualidade },
  });

  // Ordem fixa (determinismo, RNF-05; UX-SPEC T3): blocos Must primeiro
  // (entregas no prazo, divergências por tipo), depois tempo médio e
  // valor pago vs devido, nesta ordem.
  const indicadores = montarDocumentoIndicadores([
    blocoEntregasNoPrazo,
    totais.porTipo,
    blocoTempoMedio,
    blocoValorPagoVsDevido,
  ]);

  const documento: LinhaTabela[] = [
    { chave: "resumo", conteudo: JSON.stringify(resumo) },
    { chave: "indicadores", conteudo: JSON.stringify(indicadores) },
    { chave: "qualidade", conteudo: JSON.stringify(qualidade) },
  ];

  const ddl = readFileSync(CAMINHO_DDL, "utf8");

  const tabelas: TabelasParaPublicacao = {
    pedido_resumo: pedidoResumo,
    vinculo_codigo: vinculoCodigo,
    linha_do_tempo: linhaDoTempo,
    divergencia: divergenciasProjecao,
    documento,
  };

  return escreverSqlPublicacao(ddl, tabelas);
}
