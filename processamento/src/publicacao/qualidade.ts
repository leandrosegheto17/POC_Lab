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
 * Acessa `repositorio.db` diretamente só com `db.prepare(...)` (nunca edita
 * `armazenamento/repositorio.ts`), mesmo padrão de
 * `publicacao/divergencias.ts`/`publicacao/linha-do-tempo.ts`.
 *
 * Fora de escopo: sugestões de IA (`ia.utilizada` é sempre `false` nesta
 * versão) e os demais documentos (`resumo`/`indicadores`).
 */
import type { DatabaseSync } from "node:sqlite";

import type { Evento } from "../dominio/evento.js";
import { detectarForaDeOrdem } from "../dominio/fora-de-ordem.js";
import type { AchadoQualidade, Fonte, TipoAchado } from "../dominio/modelo.js";
import {
  EsquemaRespostaQualidade,
  type RespostaQualidade,
} from "../contrato/qualidade.js";

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

/** Formato de cada linha lida de `SELECT * FROM achado_qualidade`. */
type LinhaAchadoQualidade = {
  tipo: string;
  fonte: Fonte;
  referencia: string;
  regra: string;
  detalhe: string;
};

/** Formato de cada linha lida de `SELECT * FROM evento` (mesmo formato de `repositorio.ts`/TP-0018). */
type LinhaEvento = {
  fonte: Fonte;
  codigo_evento: string;
  id_pedido: string | null;
  tipo: string;
  momento_fato: string;
  ordem_chegada: number | null;
  versao_schema: number;
  dados: string;
};

/** Um achado já com o `id_pedido` resolvido (quando possível), para montar o exemplo. */
type AchadoComPedido = AchadoQualidade & { pedido?: string };

/**
 * Reconstrói um `Evento` de domínio a partir de uma linha da tabela `evento`:
 * o envelope comum vem das colunas próprias; o restante (`tipo`,
 * `versao_schema` e os campos específicos do payload) vem do JSON gravado em
 * `dados` — mesmo padrão de `publicacao/divergencias.ts` e
 * `test/integracao/gabarito.test.ts`.
 */
function linhaParaEvento(linha: LinhaEvento): Evento {
  const payload = JSON.parse(linha.dados) as Record<string, unknown>;
  const envelope: Record<string, unknown> = {
    fonte: linha.fonte,
    codigoEvento: linha.codigo_evento,
    momentoFato: linha.momento_fato,
  };
  if (linha.ordem_chegada !== null) {
    envelope.ordemChegada = linha.ordem_chegada;
  }
  return { ...envelope, ...payload } as Evento;
}

/** Agrupa os eventos (já reconstruídos) por `id_pedido`, descartando os sem pedido vinculado. */
function agruparEventosPorPedido(linhas: LinhaEvento[]): Map<string, Evento[]> {
  const porPedido = new Map<string, Evento[]>();
  for (const linha of linhas) {
    if (linha.id_pedido === null) {
      continue;
    }
    const eventos = porPedido.get(linha.id_pedido) ?? [];
    eventos.push(linhaParaEvento(linha));
    porPedido.set(linha.id_pedido, eventos);
  }
  return porPedido;
}

/**
 * Recalcula RN-08 (fora de ordem) a partir de todos os eventos gravados: lê
 * `evento`, agrupa por `id_pedido` e chama `detectarForaDeOrdem` por pedido
 * (a função espera eventos já de um único pedido), agregando os achados
 * resultantes com o `id_pedido` correspondente anexado.
 */
function recalcularForaDeOrdem(db: DatabaseSync): AchadoComPedido[] {
  const linhas = db.prepare(`SELECT * FROM evento`).all() as unknown as LinhaEvento[];
  const eventosPorPedido = agruparEventosPorPedido(linhas);

  const achados: AchadoComPedido[] = [];
  for (const [idPedido, eventos] of eventosPorPedido) {
    const resultado = detectarForaDeOrdem(eventos);
    for (const achado of resultado.achados) {
      achados.push({ ...achado, pedido: idPedido });
    }
  }
  return achados;
}

/**
 * Tenta resolver o `id_pedido` interno de um achado gravado via
 * `vinculo_fonte` (mesma fonte + mesma referência). Nem todo achado tem
 * vínculo resolvível (ex.: `sem_identificacao` é, por definição, uma
 * referência que não casou com nenhum pedido) — por isso devolve
 * `undefined` nesses casos, em vez de lançar.
 */
function resolverPedido(
  db: DatabaseSync,
  fonte: Fonte,
  referencia: string,
): string | undefined {
  const linha = db
    .prepare(`SELECT id_pedido FROM vinculo_fonte WHERE fonte = ? AND codigo_externo = ?`)
    .get(fonte, referencia) as { id_pedido: string } | undefined;
  return linha?.id_pedido;
}

/** Lê os achados gravados de um tipo específico em `achado_qualidade`, com `pedido` resolvido quando possível. */
function lerAchadosGravados(db: DatabaseSync, tipo: TipoAchado): AchadoComPedido[] {
  const linhas = db
    .prepare(`SELECT * FROM achado_qualidade WHERE tipo = ?`)
    .all(tipo) as unknown as LinhaAchadoQualidade[];

  return linhas.map((linha): AchadoComPedido => ({
    tipo: linha.tipo as TipoAchado,
    fonte: linha.fonte,
    referencia: linha.referencia,
    regra: linha.regra,
    detalhe: linha.detalhe,
    pedido: resolverPedido(db, linha.fonte, linha.referencia),
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
 * Monta o documento `qualidade`: os 7 tipos de `TipoAchado`, cada um com
 * contagem total, a regra textual fixa e até 10 exemplos (tipo sem nenhuma
 * ocorrência entra com `contagem: 0, exemplos: []`, nunca omitido). `ia` é
 * sempre `{ utilizada: false, sugestoes: [] }` nesta versão (Must). Valida o
 * resultado contra `EsquemaRespostaQualidade` antes de devolver — uma falha
 * aqui é bug de montagem, não é absorvida.
 */
export function montarDocumentoQualidade(db: DatabaseSync): RespostaQualidade {
  const achadosForaDeOrdem = recalcularForaDeOrdem(db);

  const achados = ORDEM_TIPOS.map((tipo) => {
    const achadosDoTipo =
      tipo === "fora_de_ordem" ? achadosForaDeOrdem : lerAchadosGravados(db, tipo);

    return {
      tipo,
      contagem: achadosDoTipo.length,
      regra: REGRAS[tipo],
      exemplos: montarExemplos(achadosDoTipo),
    };
  });

  const documento: RespostaQualidade = {
    achados,
    ia: { utilizada: false, sugestoes: [] },
  };

  return EsquemaRespostaQualidade.parse(documento);
}
