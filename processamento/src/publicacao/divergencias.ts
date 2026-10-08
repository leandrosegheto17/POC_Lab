import type { DatabaseSync } from "node:sqlite";

import type { Evento } from "../dominio/evento.js";
import type { TipoDivergencia } from "../dominio/modelo.js";
import { calcularDivergencias } from "../dominio/divergencias/index.js";

/**
 * TP-0037 — Projeção de `divergencia` (RF-07, §6 L-11).
 *
 * Lê os eventos gravados no event store (`repositorio.db`, tabela `evento`),
 * agrupa por pedido, aplica `calcularDivergencias` (TP-0028, já pronta — a
 * regra de divergência em si não é reimplementada aqui) e monta uma linha por
 * `(tipo, pedido)` com os eventos que sustentam a divergência em JSON.
 *
 * `dataCorte` (RN-14) já chega pronta como parâmetro — o cálculo da data de
 * corte global é de outra camada, fora de escopo aqui. Gerar o SQL
 * multi-linha final também é fora de escopo (TP-0040).
 */

/** Linha de uma linha reconstruída da tabela `evento` (mesmo formato de `repositorio.ts`/TP-0018). */
type LinhaEvento = {
  fonte: "vendas" | "pagamentos" | "rastreio";
  codigo_evento: string;
  id_pedido: string | null;
  tipo: string;
  momento_fato: string;
  ordem_chegada: number | null;
  versao_schema: number;
  dados: string;
};

/** Um item do JSON de `eventos` da projeção, chaves em ordem fixa. */
type EventoSustentacao = {
  tipo: string;
  data: string;
  fonte: string;
  codigo: string;
};

/** Linha final da projeção `divergencia`. */
export type LinhaDivergenciaProjecao = {
  tipo: TipoDivergencia;
  id_pedido: string;
  motivo: string;
  eventos: string;
};

/**
 * Reconstrói um `Evento` de domínio a partir de uma linha da tabela
 * `evento`: o envelope comum vem das colunas próprias; o restante (`tipo`,
 * `versao_schema` e os campos específicos do payload) vem do JSON gravado em
 * `dados` — mesmo padrão de `test/integracao/gabarito.test.ts`.
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
 * Monta o JSON de `eventos` que sustentam uma divergência: resolve cada
 * `codigoEvento` de `idsEventos` para os dados completos entre os eventos já
 * carregados do pedido, preservando a ordem de `idsEventos` e as chaves em
 * ordem fixa (`tipo`, `data`, `fonte`, `codigo`).
 */
function montarEventosSustentacao(idsEventos: string[], eventosDoPedido: Evento[]): string {
  const porCodigo = new Map(eventosDoPedido.map((evento) => [evento.codigoEvento, evento]));
  const itens: EventoSustentacao[] = idsEventos.map((codigoEvento) => {
    const evento = porCodigo.get(codigoEvento);
    if (evento === undefined) {
      throw new Error(`Evento ${codigoEvento} não encontrado entre os eventos do pedido`);
    }
    return {
      tipo: evento.tipo,
      data: evento.momentoFato,
      fonte: evento.fonte,
      codigo: evento.codigoEvento,
    };
  });
  return JSON.stringify(itens);
}

/**
 * Monta a projeção `divergencia`: uma linha por `(tipo, pedido)`, ordenada
 * por `id_pedido` e depois `tipo` (§6 L-11).
 */
export function montarDivergencias(db: DatabaseSync, dataCorte: string): LinhaDivergenciaProjecao[] {
  const linhas = db.prepare(`SELECT * FROM evento`).all() as unknown as LinhaEvento[];
  const eventosPorPedido = agruparEventosPorPedido(linhas);

  const projecao: LinhaDivergenciaProjecao[] = [];
  for (const [idPedido, eventosDoPedido] of eventosPorPedido) {
    const divergencias = calcularDivergencias(eventosDoPedido, dataCorte);
    for (const divergencia of divergencias) {
      projecao.push({
        tipo: divergencia.tipo,
        id_pedido: idPedido,
        motivo: divergencia.motivo,
        eventos: montarEventosSustentacao(divergencia.idsEventos, eventosDoPedido),
      });
    }
  }

  projecao.sort((a, b) => {
    if (a.id_pedido !== b.id_pedido) {
      return a.id_pedido < b.id_pedido ? -1 : 1;
    }
    return a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : 0;
  });

  return projecao;
}
