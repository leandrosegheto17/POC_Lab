import { createHash } from "node:crypto";

import type { Repositorio } from "../armazenamento/repositorio.js";
import { montarPedidosEVinculos, type LinhaPedidoResumo } from "../publicacao/pedidos.js";
import { conferirSugestao } from "../dominio/conferencia-sugestao.js";
import type { ProvedorSugestao } from "./porta.js";

/**
 * TP-0081 — Caso de uso `sugerir` (SDD §5, L-03).
 *
 * Para cada pagamento com achado `sem_identificacao` (RN-09), monta os
 * candidatos de pedido não quitado compatíveis e consulta `ProvedorSugestao`
 * para obter uma sugestão de vínculo, com cache (TP-0079) e teto de chamadas
 * (`IA_TETO_CHAMADAS`). Nunca grava vínculo/evento — só devolve o resultado
 * em memória; a gravação do vínculo sugerido, se vier a existir, é
 * responsabilidade de uma camada posterior (fora de escopo desta tarefa).
 */

/** Modelo padrão usado na chave de cache quando `opcoes.modelo` não é informado. */
const MODELO_PADRAO = "falso";

/** Teto de chamadas efetivas ao provedor, padrão quando nada é configurado. */
const TETO_PADRAO = 20;

/** Tolerância monetária (mesma convenção de RN-02/RN-11). */
const TOLERANCIA_VALOR = 0.01;

/** Número máximo de candidatos oferecidos ao provedor, por pagamento. */
const MAXIMO_CANDIDATOS = 20;

/**
 * Convenção de serialização no `cache_ia.resposta` (TP-0079): como a tabela
 * só guarda `TEXT NOT NULL`, "sem sugestão" (`null`) é representado por
 * string vazia (`""`); qualquer outro valor é a identidade (`id_pedido`) do
 * candidato escolhido. `obterCache`/`gravarCache` desta tarefa sempre passam
 * por esta convenção — nunca gravam `null` diretamente.
 */
const RESPOSTA_CACHE_SEM_SUGESTAO = "";

export type ResultadoSugestao = {
  pagamento: string;
  textoReferencia: string;
  pedidoSugerido: string | null;
  conferida: boolean;
  motivo: string;
};

export type OpcoesSugerir = {
  tetoChamadas?: number;
  modelo?: string;
  /**
   * Momento gravado em `cache_ia.criado_em` para toda entrada escrita nesta
   * execução. Determinístico por construção: nunca usa `Date.now()`. Se
   * omitido, usa o maior `momento_fato` já presente em `evento` (a "data de
   * corte" natural do event store nesta execução); se a tabela `evento`
   * estiver vazia, usa a época Unix (`1970-01-01T00:00:00.000Z`) como último
   * recurso determinístico.
   */
  dataCorte?: string;
};

type AchadoSemIdentificacaoDb = {
  referencia: string;
};

type EventoPagamentoDb = {
  dados: string;
  momento_fato: string;
};

/** Forma mínima do payload de pagamento (v1 ou v2) relevante para esta tarefa. */
type PayloadPagamentoParcial = {
  valor: number;
  referencia_original: string;
};

type PagamentoSemIdentificacao = {
  codigoTransacao: string;
  textoReferencia: string;
  valor: number;
  momentoFato: string;
};

type Candidato = {
  idPedido: string;
  devido: number;
  pago: number;
  dataPedido: string;
  diferencaSaldo: number;
};

/**
 * Lê, do event store (`achado_qualidade` + `evento`), os pagamentos com
 * achado `sem_identificacao` cujo evento de pagamento correspondente ainda
 * está no banco (`id_pedido IS NULL`, mesma linha que gerou o achado).
 *
 * Fonte do "texto da referência original": o campo `referencia_original` do
 * payload do evento de pagamento (`PayloadPagamentoV1`/`V2`,
 * `dominio/evento.ts`), não o texto livre de `achado_qualidade.detalhe`. O
 * `detalhe` gravado por `fontes/pagamentos.ts` é uma frase completa (ex.:
 * `referência "X" não casou com exatamente 1 código de pedido conhecido`),
 * não o texto puro da referência — usar o payload estruturado do evento é
 * mais robusto e evita reparsear a frase.
 *
 * Se, por algum motivo, o evento de pagamento correspondente não existir
 * mais no event store, o pagamento ainda aparece no resultado (para que a
 * contagem de achados `sem_identificacao` bata com a de `ResultadoSugestao`),
 * mas como "sem sugestão" — não há dados suficientes para candidatos.
 */
function lerPagamentosSemIdentificacao(
  repositorio: Repositorio,
): { completos: PagamentoSemIdentificacao[]; semDadosDeEvento: string[] } {
  const achados = repositorio.db
    .prepare(
      `SELECT referencia FROM achado_qualidade WHERE tipo = 'sem_identificacao' AND fonte = 'pagamentos'`,
    )
    .all() as unknown as AchadoSemIdentificacaoDb[];

  const completos: PagamentoSemIdentificacao[] = [];
  const semDadosDeEvento: string[] = [];

  for (const achado of achados) {
    const codigoTransacao = achado.referencia;
    const linhaEvento = repositorio.db
      .prepare(
        `SELECT dados, momento_fato FROM evento WHERE fonte = 'pagamentos' AND codigo_evento = ? AND id_pedido IS NULL`,
      )
      .get(codigoTransacao) as EventoPagamentoDb | undefined;

    if (linhaEvento === undefined) {
      semDadosDeEvento.push(codigoTransacao);
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

  return { completos, semDadosDeEvento };
}

/**
 * Monta, para um pagamento, os candidatos de pedido elegíveis (L-03):
 *
 *   1. não quitado (`situacao_pagamento !== 'quitado'`);
 *   2. "data do pedido" ≤ data do pagamento — a "data do pedido" usada é
 *      `pedido_resumo.data_limite` (vinda do evento `venda`,
 *      `PayloadVendaV1.data_limite`; não há, no modelo atual, uma data de
 *      criação do pedido separada da data-limite). Pedidos sem `data_limite`
 *      (sem evento `venda` localizado) ficam de fora: não há como aplicar
 *      este filtro sem essa data;
 *   3. `valor_devido` conhecido (`!== null`) e saldo em aberto
 *      (`valor_devido - valor_pago`) compatível com o valor do pagamento,
 *      com a mesma tolerância de RN-02/RN-11 (`saldo >= valorPagamento -
 *      0.01`).
 *
 * Ordenados pela MENOR diferença absoluta entre saldo em aberto e valor do
 * pagamento (melhor candidato primeiro), limitado a `MAXIMO_CANDIDATOS`.
 */
function montarCandidatos(
  pedidoResumo: LinhaPedidoResumo[],
  pagamento: PagamentoSemIdentificacao,
): Candidato[] {
  const candidatos: Candidato[] = [];

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
    if (saldoEmAberto < pagamento.valor - TOLERANCIA_VALOR) {
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
  return candidatos.slice(0, MAXIMO_CANDIDATOS);
}

/**
 * Lê `IA_TETO_CHAMADAS` do ambiente; se ausente/inválido (não numérico, ou
 * `0`/negativo tratado como "ausente" pelo `||`), usa `opcoes.tetoChamadas`;
 * na ausência de ambos, usa `TETO_PADRAO` (20).
 */
function resolverTetoChamadas(opcoes: OpcoesSugerir | undefined): number {
  return Number(process.env.IA_TETO_CHAMADAS) || opcoes?.tetoChamadas || TETO_PADRAO;
}

/**
 * Determina `criadoEm` para as entradas de cache gravadas nesta execução
 * (ver `OpcoesSugerir.dataCorte`).
 */
function resolverDataCorte(repositorio: Repositorio, opcoes: OpcoesSugerir | undefined): string {
  if (opcoes?.dataCorte !== undefined) {
    return opcoes.dataCorte;
  }
  const linha = repositorio.db
    .prepare(`SELECT MAX(momento_fato) AS maximo FROM evento`)
    .get() as { maximo: string | null } | undefined;
  return linha?.maximo ?? "1970-01-01T00:00:00.000Z";
}

/**
 * Executa `conferirSugestao` (RN-11) para a sugestão `idPedidoSugerido`
 * contra os candidatos já montados para este pagamento. Se a identidade
 * devolvida pelo provedor não estiver entre os candidatos (implementação
 * malcomportada — o contrato da porta diz que isso não deveria acontecer),
 * trata defensivamente como "sem sugestão", sem lançar exceção.
 */
function conferirContraCandidato(
  candidatos: Candidato[],
  idPedidoSugerido: string,
  pagamento: PagamentoSemIdentificacao,
): { conferida: boolean; motivo: string } {
  const candidato = candidatos.find((item) => item.idPedido === idPedidoSugerido);
  if (candidato === undefined) {
    return {
      conferida: false,
      motivo: `Sugestão rejeitada: o provedor devolveu "${idPedidoSugerido}", que não está entre os candidatos oferecidos.`,
    };
  }

  return conferirSugestao(
    { devido: candidato.devido, pago: candidato.pago, dataPedido: candidato.dataPedido },
    { valor: pagamento.valor, dataPagamento: pagamento.momentoFato },
  );
}

/**
 * Caso de uso principal: percorre os pagamentos sem identificação e produz
 * um `ResultadoSugestao` por pagamento (mesma ordem de leitura de
 * `achado_qualidade`).
 *
 * Quando `provedor` é `undefined` (sem chave de IA configurada — fora de
 * escopo desta tarefa como essa chave chega), TODOS os pagamentos viram "sem
 * sugestão" imediatamente: não há candidatos montados, não há consulta de
 * cache, nenhuma chamada é contada. Decisão simples e deliberada — sem
 * provedor não há nada que `sugerir` possa fazer além de devolver "sem
 * sugestão", então evita-se o trabalho de montar candidatos/consultar cache
 * para nada.
 */
export async function sugerir(
  repositorio: Repositorio,
  provedor: ProvedorSugestao | undefined,
  opcoes?: OpcoesSugerir,
): Promise<ResultadoSugestao[]> {
  const { completos, semDadosDeEvento } = lerPagamentosSemIdentificacao(repositorio);

  const resultados: ResultadoSugestao[] = semDadosDeEvento.map((codigoTransacao) => ({
    pagamento: codigoTransacao,
    textoReferencia: "",
    pedidoSugerido: null,
    conferida: false,
    motivo:
      "Sem sugestão: o evento de pagamento correspondente não foi encontrado no event store.",
  }));

  if (provedor === undefined) {
    for (const pagamento of completos) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: "Sem sugestão: nenhum provedor de IA configurado.",
      });
    }
    return resultados;
  }

  const modelo = opcoes?.modelo ?? MODELO_PADRAO;
  const tetoChamadas = resolverTetoChamadas(opcoes);
  const dataCorte = resolverDataCorte(repositorio, opcoes);

  const { pedidoResumo } = montarPedidosEVinculos(repositorio.db);

  let chamadasEfetivas = 0;

  for (const pagamento of completos) {
    const candidatos = montarCandidatos(pedidoResumo, pagamento);

    if (candidatos.length === 0) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: "Sem sugestão: nenhum candidato elegível encontrado para este pagamento.",
      });
      continue;
    }

    const candidatosOrdenados = candidatos.map((candidato) => candidato.idPedido);
    const chave = createHash("sha256")
      .update(pagamento.textoReferencia + JSON.stringify(candidatosOrdenados) + modelo)
      .digest("hex");

    const cache = repositorio.obterCache(chave);
    let respostaBruta: string;

    if (cache !== undefined) {
      respostaBruta = cache.resposta;
    } else if (chamadasEfetivas >= tetoChamadas) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: `Sem sugestão: teto de chamadas de IA (${tetoChamadas}) atingido nesta execução.`,
      });
      continue;
    } else {
      const resposta = await provedor.sugerir(pagamento.textoReferencia, candidatosOrdenados, modelo);
      chamadasEfetivas += 1;
      respostaBruta = resposta ?? RESPOSTA_CACHE_SEM_SUGESTAO;
      repositorio.gravarCache(chave, respostaBruta, dataCorte);
    }

    if (respostaBruta === RESPOSTA_CACHE_SEM_SUGESTAO) {
      resultados.push({
        pagamento: pagamento.codigoTransacao,
        textoReferencia: pagamento.textoReferencia,
        pedidoSugerido: null,
        conferida: false,
        motivo: "Sem sugestão: o provedor de IA não sugeriu nenhum pedido para este pagamento.",
      });
      continue;
    }

    const { conferida, motivo } = conferirContraCandidato(candidatos, respostaBruta, pagamento);
    resultados.push({
      pagamento: pagamento.codigoTransacao,
      textoReferencia: pagamento.textoReferencia,
      pedidoSugerido: respostaBruta,
      conferida,
      motivo,
    });
  }

  return resultados;
}
