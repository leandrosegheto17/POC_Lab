/**
 * TP-0038 — Projeção do documento `qualidade` (RF-07/RF-08, contrato
 * `contrato/qualidade.ts`).
 *
 * Lê os achados já gravados em `achado_qualidade` (6 dos 7 tipos de
 * `TipoAchado` — ver `dominio/modelo.ts`) e recalcula `fora_de_ordem` (RN-08)
 * a partir dos eventos consolidados, já que esse achado nunca é persistido em
 * `achado_qualidade` por quem grava os eventos (ver `dominio/fora-de-ordem.ts`
 * e `publicacao/linha-do-tempo.ts`, que o recalculam para outro fim). Monta o
 * documento com os 7 tipos sempre presentes (contagem 0 quando não há
 * ocorrência), valida contra `EsquemaRespostaQualidade` e devolve.
 *
 * Os achados e eventos vêm das consultas do repositório; só o bloco de IA
 * ainda lê `repositorio.db` direto.
 *
 * TP-0084 — Projeta também `ia.utilizada`/`ia.sugestoes` a partir de
 * `cache_ia` (ver seção "Reconstrução das sugestões de IA" mais abaixo).
 * Fora de escopo: os demais documentos (`resumo`/`indicadores`) nunca são
 * tocados por este módulo.
 */
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import type { Consultas } from "../armazenamento/consultas.js";
import type { Repositorio } from "../armazenamento/repositorio.js";
import { conferirSugestao } from "../dominio/conferencia-sugestao.js";
import { detectarForaDeOrdem } from "../dominio/fora-de-ordem.js";
import type { AchadoQualidade, TipoAchado } from "../dominio/modelo.js";
import {
  EsquemaRespostaQualidade,
  type RespostaQualidade,
} from "../contrato/qualidade.js";
import { agruparEventosPorPedido } from "./eventos-por-pedido.js";
import { montarPedidosEVinculos, type LinhaPedidoResumo } from "./pedidos.js";

/** Ordem fixa dos 7 tipos no documento final — sempre os mesmos 7, nessa ordem. */
const ORDEM_TIPOS: readonly TipoAchado[] = [
  "fora_de_ordem",
  "sem_identificacao",
  "registro_repetido",
  "linha_invalida",
  "valor_fora_do_padrao",
  "formato_data",
  "pedido_sem_envio",
];

/**
 * Texto fixo da regra por tipo de achado — um por tipo, o mesmo para todas as
 * ocorrências desse tipo (não é copiado do `regra` gravado em cada linha de
 * `achado_qualidade`, que pode variar por achado individual).
 */
const REGRAS: Record<TipoAchado, string> = {
  fora_de_ordem:
    "RN-08: evento recebido fora da ordem canônica (momentoFato, tipo, codigoEvento) dentro da mesma fonte.",
  sem_identificacao:
    "RN-09: referência de pagamento não casou com exatamente 1 código de pedido conhecido.",
  registro_repetido:
    "Código de evento/transação repetido dentro da mesma importação; só a primeira ocorrência gera vínculo/evento.",
  linha_invalida:
    "Linha de CSV malformada (campo obrigatório ausente, tipo fora do enum esperado ou data inválida).",
  valor_fora_do_padrao:
    "RN-10: valor/desconto de item ou pagamento fora do padrão esperado (ex.: preço <= 0, desconto fora de [0,1], valor de pagamento incompatível).",
  formato_data:
    "dataPedido fora do formato curto (YYYY-MM-DD) esperado como padrão da base de vendas.",
  pedido_sem_envio:
    "Pedido sem data de envio (ShippedDate nula na base de vendas de origem).",
};

/** Um achado já com o `id_pedido` resolvido (quando possível), para montar o exemplo. */
type AchadoComPedido = AchadoQualidade & { pedido?: string };

/**
 * Recalcula RN-08 (fora de ordem) a partir de todos os eventos gravados:
 * agrupa por `id_pedido` e chama `detectarForaDeOrdem` por pedido (a função
 * espera eventos já de um único pedido), agregando os achados resultantes com
 * o `id_pedido` correspondente anexado.
 */
function recalcularForaDeOrdem(consultas: Pick<Consultas, "listarEventos">): AchadoComPedido[] {
  const eventosPorPedido = agruparEventosPorPedido(consultas.listarEventos());

  const achados: AchadoComPedido[] = [];
  for (const [idPedido, armazenados] of eventosPorPedido) {
    const resultado = detectarForaDeOrdem(armazenados.map((armazenado) => armazenado.evento));
    for (const achado of resultado.achados) {
      achados.push({ ...achado, pedido: idPedido });
    }
  }
  return achados;
}

/**
 * Mapa `fonte:codigoExterno` → `id_pedido`, lido uma vez. Nem todo achado tem
 * vínculo resolvível (ex.: `sem_identificacao` é, por definição, uma
 * referência que não casou com nenhum pedido) — nesses casos a busca no mapa
 * devolve `undefined`.
 */
function lerPedidoPorVinculo(consultas: Pick<Consultas, "listarVinculos">): Map<string, string> {
  return new Map(
    consultas
      .listarVinculos()
      .map((vinculo) => [`${vinculo.fonte}:${vinculo.codigoExterno}`, vinculo.idPedido]),
  );
}

/** Lê os achados gravados de um tipo específico em `achado_qualidade`, com `pedido` resolvido quando possível. */
function lerAchadosGravados(
  consultas: Pick<Consultas, "listarAchadosPorTipo">,
  pedidoPorVinculo: Map<string, string>,
  tipo: TipoAchado,
): AchadoComPedido[] {
  return consultas.listarAchadosPorTipo(tipo).map((achado): AchadoComPedido => ({
    ...achado,
    pedido: pedidoPorVinculo.get(`${achado.fonte}:${achado.referencia}`),
  }));
}

/** Monta até 10 exemplos `{ fonte, referencia, detalhe, pedido? }` a partir da lista de achados de um tipo. */
function montarExemplos(
  achados: AchadoComPedido[],
): RespostaQualidade["achados"][number]["exemplos"] {
  return achados.slice(0, 10).map((achado) => {
    const exemplo: RespostaQualidade["achados"][number]["exemplos"][number] = {
      fonte: achado.fonte,
      referencia: achado.referencia,
      detalhe: achado.detalhe,
    };
    if (achado.pedido !== undefined) {
      exemplo.pedido = achado.pedido;
    }
    return exemplo;
  });
}

/**
 * TP-0084 — Reconstrução das sugestões de IA (`ia.sugestoes`) a partir de
 * `cache_ia`.
 *
 * `cache_ia` só guarda `{ chave, resposta, criado_em }` (TP-0079); `chave` é
 * um hash SHA-256 (`ia/sugerir.ts`) que não é reversível, então não há como
 * ir de uma linha de `cache_ia` direto para "qual pagamento/candidatos
 * geraram esta entrada". A alternativa pragmática adotada aqui — mesma
 * decisão já tomada em `ia/sugerir.ts` de nunca cachear a decisão de
 * conferência (RN-11), só a resposta bruta do provedor — é RE-RODAR a mesma
 * busca de pagamentos `sem_identificacao` + montagem de candidatos (L-03) que
 * `ia/sugerir.ts` faz, recalcular a MESMA chave de cache para cada pagamento
 * e conferir se essa chave existe em `cache_ia`; se existir e não for "sem
 * sugestão", a sugestão é reconstituída e `conferirSugestao` é aplicada na
 * hora sobre o candidato indicado.
 *
 * A chave de cache inclui o `modelo` (`ia/sugerir.ts`); desde RTP-0041 ele é
 * persistido em `cache_ia.modelo`, e esta reconstrução tenta os modelos
 * gravados. Entradas antigas (modelo NULL) só são reconstituídas se usaram os
 * modelos de `MODELOS_RECONSTITUICAO` ("falso" e "gpt-4o-mini"). As funções de leitura/montagem de candidatos abaixo duplicam a lógica
 * (não exportada) de `ia/sugerir.ts` — ver aquele módulo para a versão
 * "fonte da verdade" usada pelo caso de uso de sugestão em si.
 */
const MODELOS_RECONSTITUICAO: readonly string[] = ["falso", "gpt-4o-mini"];

/** Mesma convenção de `ia/sugerir.ts`: `""` representa "sem sugestão" em `cache_ia.resposta`. */
const RESPOSTA_CACHE_SEM_SUGESTAO = "";

/** Tolerância monetária (mesma convenção de RN-02/RN-11/`ia/sugerir.ts`). */
const TOLERANCIA_VALOR_IA = 0.01;

/** Número máximo de candidatos por pagamento (mesma convenção de `ia/sugerir.ts`). */
const MAXIMO_CANDIDATOS_IA = 20;

type LinhaCacheIaDb = {
  chave: string;
  resposta: string;
  criado_em: string;
  modelo: string | null;
};

type AchadoSemIdentificacaoDb = { referencia: string };

type EventoPagamentoDb = { dados: string; momento_fato: string };

/** Forma mínima do payload de pagamento (v1 ou v2) relevante para esta reconstrução. */
type PayloadPagamentoParcial = { valor: number; referencia_original: string };

type PagamentoSemIdentificacaoIa = {
  codigoTransacao: string;
  textoReferencia: string;
  valor: number;
  momentoFato: string;
};

type CandidatoIa = {
  idPedido: string;
  devido: number;
  pago: number;
  dataPedido: string;
  diferencaSaldo: number;
};

/** Item de `ia.sugestoes` (TP-0084) — mesma forma de `ia/sugerir.ts`, `ResultadoSugestao`, sem o campo `pagamento` renomeado. */
type SugestaoQualidade = {
  pagamento: string;
  textoReferencia: string;
  pedidoSugerido: string;
  conferida: boolean;
  motivo: string;
};

/** Lê todas as entradas de `cache_ia` (chave/resposta/criadoEm), sem nenhuma relação ainda com pagamento/pedido. */
function lerCacheIa(
  db: DatabaseSync,
): { chave: string; resposta: string; criadoEm: string; modelo: string | null }[] {
  const linhas = db
    .prepare(`SELECT chave, resposta, criado_em, modelo FROM cache_ia`)
    .all() as unknown as LinhaCacheIaDb[];
  return linhas.map((linha) => ({
    chave: linha.chave,
    resposta: linha.resposta,
    criadoEm: linha.criado_em,
    modelo: linha.modelo,
  }));
}

/**
 * Mesma leitura de `ia/sugerir.ts#lerPagamentosSemIdentificacao`, mas só a
 * parte "completos" (pagamentos cujo evento ainda está no event store) — sem
 * ela não há como recalcular a chave de cache.
 */
function lerPagamentosSemIdentificacaoIa(db: DatabaseSync): PagamentoSemIdentificacaoIa[] {
  const achados = db
    .prepare(
      `SELECT referencia FROM achado_qualidade WHERE tipo = 'sem_identificacao' AND fonte = 'pagamentos'`,
    )
    .all() as unknown as AchadoSemIdentificacaoDb[];

  const completos: PagamentoSemIdentificacaoIa[] = [];

  for (const achado of achados) {
    const codigoTransacao = achado.referencia;
    const linhaEvento = db
      .prepare(
        `SELECT dados, momento_fato FROM evento WHERE fonte = 'pagamentos' AND codigo_evento = ? AND id_pedido IS NULL`,
      )
      .get(codigoTransacao) as EventoPagamentoDb | undefined;

    if (linhaEvento === undefined) {
      continue;
    }

    const payload = JSON.parse(linhaEvento.dados) as PayloadPagamentoParcial;
    completos.push({
      codigoTransacao,
      textoReferencia: payload.referencia_original,
      valor: payload.valor,
      momentoFato: linhaEvento.momento_fato,
    });
  }

  return completos;
}

/** Mesma lógica de `ia/sugerir.ts#montarCandidatos` (L-03), duplicada aqui (ver limitação no bloco acima). */
function montarCandidatosIa(
  pedidoResumo: LinhaPedidoResumo[],
  pagamento: PagamentoSemIdentificacaoIa,
): CandidatoIa[] {
  const candidatos: CandidatoIa[] = [];

  for (const resumo of pedidoResumo) {
    if (resumo.situacao_pagamento === "quitado") {
      continue;
    }
    if (resumo.data_limite === null || resumo.valor_devido === null) {
      continue;
    }
    if (resumo.data_limite > pagamento.momentoFato) {
      continue;
    }

    const saldoEmAberto = resumo.valor_devido - resumo.valor_pago;
    const diferencaSaldo = Math.abs(saldoEmAberto - pagamento.valor);
    if (saldoEmAberto < pagamento.valor - TOLERANCIA_VALOR_IA) {
      continue;
    }

    candidatos.push({
      idPedido: resumo.id_pedido,
      devido: resumo.valor_devido,
      pago: resumo.valor_pago,
      dataPedido: resumo.data_limite,
      diferencaSaldo,
    });
  }

  candidatos.sort((a, b) => a.diferencaSaldo - b.diferencaSaldo);
  return candidatos.slice(0, MAXIMO_CANDIDATOS_IA);
}

/**
 * Monta `ia.utilizada`/`ia.sugestoes`: `cache_ia` vazia → `{ utilizada:
 * false, sugestoes: [] }` (Must preservado, regressão de TP-0038). Com 1+
 * entradas, `utilizada` é sempre `true`; `sugestoes` só inclui as entradas
 * cuja chave recalculada (ver bloco acima) bate com uma entrada de
 * `cache_ia` que não seja "sem sugestão" — para essas, aplica
 * `conferirSugestao` (RN-11) sobre o candidato indicado, sempre recalculada
 * nesta hora, nunca cacheada.
 */
function montarBlocoIa(repositorio: Repositorio): RespostaQualidade["ia"] {
  const db = repositorio.db;
  const cache = lerCacheIa(db);
  if (cache.length === 0) {
    return { utilizada: false, sugestoes: [] };
  }

  const cachePorChave = new Map(cache.map((entrada) => [entrada.chave, entrada]));
  // RTP-0041: modelos persistidos em `cache_ia` + os conhecidos (entradas antigas, sem modelo).
  const modelosConhecidos = new Set<string>(MODELOS_RECONSTITUICAO);
  for (const entrada of cache) {
    if (entrada.modelo !== null) {
      modelosConhecidos.add(entrada.modelo);
    }
  }
  const pagamentos = lerPagamentosSemIdentificacaoIa(db);
  const { pedidoResumo } = montarPedidosEVinculos(repositorio);

  const sugestoes: SugestaoQualidade[] = [];

  for (const pagamento of pagamentos) {
    const candidatos = montarCandidatosIa(pedidoResumo, pagamento);
    if (candidatos.length === 0) {
      continue;
    }

    const candidatosOrdenados = candidatos.map((candidato) => candidato.idPedido);
    // RTP-0028/RTP-0041: tenta cada modelo conhecido (persistido em `cache_ia`
    // ou padrão para entradas antigas) e usa a primeira chave que existe.
    let entradaCache: { chave: string; resposta: string; criadoEm: string } | undefined;
    for (const modelo of modelosConhecidos) {
      const chave = createHash("sha256")
        .update(pagamento.textoReferencia + JSON.stringify(candidatosOrdenados) + modelo)
        .digest("hex");
      entradaCache = cachePorChave.get(chave);
      if (entradaCache !== undefined) {
        break;
      }
    }
    if (entradaCache === undefined || entradaCache.resposta === RESPOSTA_CACHE_SEM_SUGESTAO) {
      continue;
    }

    const candidatoSugerido = candidatos.find(
      (candidato) => candidato.idPedido === entradaCache.resposta,
    );
    if (candidatoSugerido === undefined) {
      // Defensivo (mesmo padrão de `ia/sugerir.ts#conferirContraCandidato`):
      // resposta de provedor que não está entre os candidatos recalculados.
      continue;
    }

    const { conferida, motivo } = conferirSugestao(
      {
        devido: candidatoSugerido.devido,
        pago: candidatoSugerido.pago,
        dataPedido: candidatoSugerido.dataPedido,
      },
      { valor: pagamento.valor, dataPagamento: pagamento.momentoFato },
    );

    sugestoes.push({
      pagamento: pagamento.codigoTransacao,
      textoReferencia: pagamento.textoReferencia,
      pedidoSugerido: entradaCache.resposta,
      conferida,
      motivo,
    });
  }

  return { utilizada: true, sugestoes };
}

/**
 * Monta o documento `qualidade`: os 7 tipos de `TipoAchado`, cada um com
 * contagem total, a regra textual fixa e até 10 exemplos (tipo sem nenhuma
 * ocorrência entra com `contagem: 0, exemplos: []`, nunca omitido). `ia` é
 * reconstruída a partir de `cache_ia` (TP-0084, ver `montarBlocoIa`) —
 * `{ utilizada: false, sugestoes: [] }` quando não há nenhuma entrada de
 * cache (Must preservado). Valida o resultado contra
 * `EsquemaRespostaQualidade` antes de devolver — uma falha aqui é bug de
 * montagem, não é absorvida.
 */
export function montarDocumentoQualidade(repositorio: Repositorio): RespostaQualidade {
  const achadosForaDeOrdem = recalcularForaDeOrdem(repositorio);
  const pedidoPorVinculo = lerPedidoPorVinculo(repositorio);

  const achados = ORDEM_TIPOS.map((tipo) => {
    const achadosDoTipo =
      tipo === "fora_de_ordem"
        ? achadosForaDeOrdem
        : lerAchadosGravados(repositorio, pedidoPorVinculo, tipo);

    return {
      tipo,
      contagem: achadosDoTipo.length,
      regra: REGRAS[tipo],
      exemplos: montarExemplos(achadosDoTipo),
    };
  });

  const documento: RespostaQualidade = {
    achados,
    ia: montarBlocoIa(repositorio),
  };

  return EsquemaRespostaQualidade.parse(documento);
}
