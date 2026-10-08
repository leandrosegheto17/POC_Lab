/**
 * Projeção `linha_do_tempo` (TP-0036, SDD §5).
 *
 * Lê a tabela `evento` do event store (`armazenamento/repositorio.ts`,
 * acessada aqui só via `db.prepare(...)`, nunca editando aquele módulo) e
 * monta, por pedido, a lista de eventos na ordem canônica (RN-07,
 * `dominio/ordenacao.ts`), marcando os que chegaram fora de ordem (RN-08,
 * `dominio/fora-de-ordem.ts`).
 *
 * Fora de escopo deste módulo: gerar o SQL de `INSERT` para a tabela
 * `linha_do_tempo` do D1 (ver `publicacao/leitura-d1.sql`) e persistir o
 * achado `fora_de_ordem` em `achado_qualidade` (isso já é feito, para o event
 * store local, por quem grava os eventos — este módulo só lê e projeta).
 */
import type { DatabaseSync } from "node:sqlite";

import type { Evento } from "../dominio/evento.js";
import type { Fonte } from "../dominio/modelo.js";
import { ordenarEventos } from "../dominio/ordenacao.js";
import { detectarForaDeOrdem } from "../dominio/fora-de-ordem.js";

/** Uma linha da projeção `linha_do_tempo` (ver `publicacao/leitura-d1.sql`). */
export type LinhaTempoProjecao = {
  id_pedido: string;
  posicao: number;
  codigo_evento: string;
  fonte: Fonte;
  tipo: string;
  momento_fato: string;
  versao_schema: number;
  /**
   * Mesma string `dados` gravada na tabela `evento` (JSON de chaves
   * ordenadas tal como `importar.ts` serializou) — nunca reserializada aqui.
   */
  dados: string;
  fora_de_ordem: 0 | 1;
};

/** Formato de cada linha lida de `SELECT * FROM evento`. */
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

/** Chave usada para casar uma linha SQL com seu `Evento` reconstruído: mesmo formato usado internamente por `detectarForaDeOrdem`. */
function chaveLinha(linha: LinhaEvento): string {
  return `${linha.fonte}:${linha.codigo_evento}`;
}

/**
 * Reconstrói o `Evento` de domínio a partir de uma linha SQL: o envelope
 * (`fonte`, `codigoEvento`, `momentoFato`, `ordemChegada`) vem das colunas
 * próprias; o restante (`tipo`, `versao_schema` e os campos específicos do
 * payload) vem de `JSON.parse(dados)`, espalhado por cima — espelhando como
 * `importar.ts` serializou (`serializarDados`).
 */
function reconstruirEvento(linha: LinhaEvento): Evento {
  const payload = JSON.parse(linha.dados) as Record<string, unknown>;
  return {
    fonte: linha.fonte,
    codigoEvento: linha.codigo_evento,
    momentoFato: linha.momento_fato,
    ordemChegada: linha.ordem_chegada ?? undefined,
    ...payload,
  } as Evento;
}

/**
 * Monta a projeção `linha_do_tempo` para todos os pedidos do event store
 * aberto em `db`.
 *
 * Agrupa as linhas de `evento` por `id_pedido`, descartando as com
 * `id_pedido IS NULL` (pagamentos sem identificação — não entram na
 * projeção). Para cada pedido: reconstrói os `Evento[]`, ordena pela ordem
 * canônica (RN-07, `ordenarEventos`) para atribuir `posicao` (índice
 * 0,1,2... nessa ordem — nunca pela `ordem_chegada` gravada) e consulta o
 * `Map` de `detectarForaDeOrdem` (RN-08) para marcar `fora_de_ordem`, sem
 * recalcular aquela lógica aqui.
 *
 * Função pura em relação ao banco (só leitura via `db.prepare(...).all()`);
 * mesma entrada sempre produz a mesma saída, ordenada por
 * `(id_pedido, posicao)`.
 */
export function montarLinhaDoTempo(db: DatabaseSync): LinhaTempoProjecao[] {
  const linhas = db.prepare(`SELECT * FROM evento`).all() as unknown as LinhaEvento[];

  const porPedido = new Map<string, LinhaEvento[]>();
  for (const linha of linhas) {
    if (linha.id_pedido === null) {
      continue;
    }
    const grupo = porPedido.get(linha.id_pedido);
    if (grupo) {
      grupo.push(linha);
    } else {
      porPedido.set(linha.id_pedido, [linha]);
    }
  }

  const resultado: LinhaTempoProjecao[] = [];

  for (const [idPedido, grupo] of porPedido) {
    const linhasPorChave = new Map<string, LinhaEvento>();
    for (const linha of grupo) {
      linhasPorChave.set(chaveLinha(linha), linha);
    }

    const eventos = grupo.map(reconstruirEvento);
    const ordemCanonica = ordenarEventos(eventos);
    const { marcados } = detectarForaDeOrdem(eventos);

    ordemCanonica.forEach((evento, indice) => {
      const chaveEvento = `${evento.fonte}:${evento.codigoEvento}`;
      const linhaOriginal = linhasPorChave.get(chaveEvento);
      if (!linhaOriginal) {
        // Não deve acontecer: toda chave de `ordemCanonica` vem de `grupo`.
        throw new Error(`linha_do_tempo: linha original não encontrada para ${chaveEvento}`);
      }

      resultado.push({
        id_pedido: idPedido,
        posicao: indice,
        codigo_evento: linhaOriginal.codigo_evento,
        fonte: linhaOriginal.fonte,
        tipo: linhaOriginal.tipo,
        momento_fato: linhaOriginal.momento_fato,
        versao_schema: linhaOriginal.versao_schema,
        dados: linhaOriginal.dados,
        fora_de_ordem: marcados.get(chaveEvento) ? 1 : 0,
      });
    });
  }

  resultado.sort((a, b) => {
    if (a.id_pedido < b.id_pedido) return -1;
    if (a.id_pedido > b.id_pedido) return 1;
    return a.posicao - b.posicao;
  });

  return resultado;
}
