/**
 * Projeção `linha_do_tempo` (SDD §5).
 *
 * Lê os eventos do event store pelo repositório e monta, por pedido, a lista
 * de eventos na ordem canônica (RN-07, `dominio/ordenacao.ts`), marcando os
 * que chegaram fora de ordem (RN-08, `dominio/fora-de-ordem.ts`).
 *
 * Fora de escopo: gerar o SQL de `INSERT` para a tabela `linha_do_tempo` do D1
 * (ver `publicacao/leitura-d1.sql`) e persistir o achado `fora_de_ordem` em
 * `achado_qualidade` (isso é feito por quem grava os eventos — este módulo só
 * lê e projeta).
 */
import type { Consultas, EventoArmazenado } from "../armazenamento/consultas.js";
import type { Evento } from "nucleo/dominio/evento.js";
import type { Fonte } from "nucleo/dominio/modelo.js";
import { ordenarEventos } from "nucleo/dominio/ordenacao.js";
import { detectarForaDeOrdem } from "nucleo/dominio/fora-de-ordem.js";
import { agruparEventosPorPedido } from "./eventos-por-pedido.js";

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

/** Chave que casa um evento armazenado com o `Evento` ordenado: mesmo formato usado internamente por `detectarForaDeOrdem`. */
function chaveEvento(evento: Evento): string {
  return `${evento.fonte}:${evento.codigoEvento}`;
}

/**
 * Monta a projeção `linha_do_tempo` para todos os pedidos do event store.
 *
 * Agrupa os eventos por pedido, descartando os sem pedido vinculado
 * (pagamentos sem identificação — não entram na projeção). Para cada pedido:
 * ordena pela ordem canônica (RN-07, `ordenarEventos`) para atribuir
 * `posicao` (índice 0,1,2... nessa ordem — nunca pela `ordem_chegada`
 * gravada) e consulta o `Map` de `detectarForaDeOrdem` (RN-08) para marcar
 * `fora_de_ordem`, sem recalcular aquela lógica aqui.
 *
 * Só lê; a mesma entrada sempre produz a mesma saída, ordenada por
 * `(id_pedido, posicao)`.
 */
export function montarLinhaDoTempo(
  consultas: Pick<Consultas, "listarEventos">,
): LinhaTempoProjecao[] {
  const porPedido = agruparEventosPorPedido(consultas.listarEventos());

  const resultado: LinhaTempoProjecao[] = [];

  for (const [idPedido, grupo] of porPedido) {
    const armazenadoPorChave = new Map<string, EventoArmazenado>();
    for (const armazenado of grupo) {
      armazenadoPorChave.set(chaveEvento(armazenado.evento), armazenado);
    }

    const eventos = grupo.map((armazenado) => armazenado.evento);
    const ordemCanonica = ordenarEventos(eventos);
    const { marcados } = detectarForaDeOrdem(eventos);

    ordemCanonica.forEach((evento, indice) => {
      const chave = chaveEvento(evento);
      const armazenado = armazenadoPorChave.get(chave);
      if (!armazenado) {
        // Não deve acontecer: toda chave de `ordemCanonica` vem de `grupo`.
        throw new Error(`linha_do_tempo: evento armazenado não encontrado para ${chave}`);
      }

      resultado.push({
        id_pedido: idPedido,
        posicao: indice,
        codigo_evento: evento.codigoEvento,
        fonte: evento.fonte,
        tipo: evento.tipo,
        momento_fato: evento.momentoFato,
        versao_schema: armazenado.versaoSchema,
        dados: armazenado.dados,
        fora_de_ordem: marcados.get(chave) ? 1 : 0,
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
