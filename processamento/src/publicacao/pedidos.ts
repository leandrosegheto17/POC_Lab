import type { DatabaseSync } from "node:sqlite";

import { calcularQuitacao, type SituacaoPagamento } from "../dominio/quitacao.js";
import { normalizarCodigo } from "../contrato/codigo.js";
import type { Fonte } from "../dominio/modelo.js";

/**
 * TP-0035 — Projeção de `pedido_resumo` e `vinculo_codigo` (SDD §5).
 *
 * Lê o event store já populado (via a conexão `db` aberta pelo repositório —
 * `armazenamento/repositorio.ts`, TP-0018) e monta, em memória, as duas
 * tabelas de leitura publicadas no D1 (`publicacao/leitura-d1.sql`, TP-0032):
 * uma linha de resumo por pedido e uma linha de vínculo por código
 * normalizado (de cada fonte + da própria identidade `id_pedido`).
 *
 * Este módulo só lê do `db` (via `db.prepare(...).all()`) — nunca grava,
 * nunca abre uma nova conexão e nunca edita `repositorio.ts` (outras
 * instâncias também leem via `db` em paralelo).
 */

/** Ordem fixa das chaves do JSON de `fontes` em `pedido_resumo` (RF — TP-0035). */
const ORDEM_FONTES: readonly Fonte[] = ["vendas", "pagamentos", "rastreio"];

/** Linha de `pedido_resumo`, mesma forma de colunas do DDL em `leitura-d1.sql`. */
export type LinhaPedidoResumo = {
  id_pedido: string;
  valor_devido: number | null;
  valor_pago: number;
  data_limite: string | null;
  situacao_pagamento: SituacaoPagamento;
  fontes: string;
};

/**
 * Linha de `vinculo_codigo`. `fonte` é `"pedido"` para a linha gerada a
 * partir da própria identidade `id_pedido` (não vem de `vinculo_fonte`,
 * então não é uma das três fontes externas).
 */
export type LinhaVinculoCodigo = {
  codigo: string;
  fonte: Fonte | "pedido";
  id_pedido: string;
};

type LinhaPedidoDb = { id_pedido: string };

type LinhaVinculoFonteDb = {
  fonte: Fonte;
  codigo_externo: string;
  id_pedido: string;
};

type LinhaEventoDb = {
  fonte: Fonte;
  codigo_evento: string;
  id_pedido: string | null;
  tipo: string;
  momento_fato: string;
  ordem_chegada: number | null;
  versao_schema: number;
  dados: string;
};

/**
 * Agrupa uma lista de eventos por `id_pedido`, ignorando eventos ainda sem
 * vínculo (`id_pedido === null`) — estes não entram em nenhum resumo.
 */
function agruparEventosPorPedido(
  eventos: LinhaEventoDb[],
): Map<string, LinhaEventoDb[]> {
  const mapa = new Map<string, LinhaEventoDb[]>();
  for (const evento of eventos) {
    if (evento.id_pedido === null) {
      continue;
    }
    const lista = mapa.get(evento.id_pedido) ?? [];
    lista.push(evento);
    mapa.set(evento.id_pedido, lista);
  }
  return mapa;
}

/**
 * Monta a linha de `pedido_resumo` de um pedido a partir dos eventos já
 * vinculados a ele.
 *
 * `valor_devido` e `data_limite` vêm do evento `venda` (payload já calculado
 * por `fontes/vendas.ts` — não recalculados aqui). `valor_pago` e
 * `situacao_pagamento` vêm de `calcularQuitacao` (RN-02), a partir dos
 * valores dos eventos `pagamento` vinculados a este pedido.
 */
function montarResumoPedido(
  idPedido: string,
  eventosDoPedido: LinhaEventoDb[],
  vinculosDoPedido: LinhaVinculoFonteDb[],
): LinhaPedidoResumo {
  const eventoVenda = eventosDoPedido.find((evento) => evento.tipo === "venda");
  const dadosVenda = eventoVenda
    ? (JSON.parse(eventoVenda.dados) as { valor_devido?: number; data_limite?: string })
    : undefined;

  const valorDevido = dadosVenda?.valor_devido ?? null;
  const dataLimite = dadosVenda?.data_limite ?? null;

  const valoresPagamento = eventosDoPedido
    .filter((evento) => evento.tipo === "pagamento")
    .map((evento) => (JSON.parse(evento.dados) as { valor: number }).valor);

  const quitacao = calcularQuitacao(valorDevido ?? 0, valoresPagamento);

  const fontesPedido: Partial<Record<Fonte, string>> = {};
  for (const vinculo of vinculosDoPedido) {
    fontesPedido[vinculo.fonte] = vinculo.codigo_externo;
  }

  const fontesOrdenadas: Partial<Record<Fonte, string>> = {};
  for (const fonte of ORDEM_FONTES) {
    const codigoExterno = fontesPedido[fonte];
    if (codigoExterno !== undefined) {
      fontesOrdenadas[fonte] = codigoExterno;
    }
  }

  return {
    id_pedido: idPedido,
    valor_devido: valorDevido,
    valor_pago: quitacao.pago,
    data_limite: dataLimite,
    situacao_pagamento: quitacao.situacao,
    fontes: JSON.stringify(fontesOrdenadas),
  };
}

/**
 * Monta as linhas de `vinculo_codigo`: uma por `vinculo_fonte` (código
 * externo de cada fonte) + uma por identidade `id_pedido`. Normaliza cada
 * código original com `normalizarCodigo` e lança erro explícito se dois
 * códigos normalizados iguais apontarem para `id_pedido` diferentes
 * (colisão — a publicação não pode seguir, já que `codigo` é PK da tabela).
 *
 * Quando o mesmo código normalizado aparece mais de uma vez apontando para
 * o MESMO `id_pedido` (ex.: a identidade do pedido coincide, após
 * normalização, com um código externo já vinculado), a segunda ocorrência é
 * descartada silenciosamente — não é uma colisão, é a mesma linha.
 */
function montarVinculosCodigo(
  pedidos: LinhaPedidoDb[],
  vinculosFonte: LinhaVinculoFonteDb[],
): LinhaVinculoCodigo[] {
  type Candidato = { codigoOriginal: string; fonte: Fonte | "pedido"; idPedido: string };

  const candidatos: Candidato[] = [
    ...vinculosFonte.map((vinculo) => ({
      codigoOriginal: vinculo.codigo_externo,
      fonte: vinculo.fonte,
      idPedido: vinculo.id_pedido,
    })),
    ...pedidos.map((pedido) => ({
      codigoOriginal: pedido.id_pedido,
      fonte: "pedido" as const,
      idPedido: pedido.id_pedido,
    })),
  ];

  const vistosPorCodigoNormalizado = new Map<
    string,
    { codigoOriginal: string; idPedido: string }
  >();
  const linhas: LinhaVinculoCodigo[] = [];

  for (const candidato of candidatos) {
    const codigoNormalizado = normalizarCodigo(candidato.codigoOriginal);
    const visto = vistosPorCodigoNormalizado.get(codigoNormalizado);

    if (visto === undefined) {
      vistosPorCodigoNormalizado.set(codigoNormalizado, {
        codigoOriginal: candidato.codigoOriginal,
        idPedido: candidato.idPedido,
      });
      linhas.push({
        codigo: codigoNormalizado,
        fonte: candidato.fonte,
        id_pedido: candidato.idPedido,
      });
      continue;
    }

    if (visto.idPedido === candidato.idPedido) {
      // Mesmo pedido, mesmo código normalizado (ex.: identidade coincide com
      // um código externo já vinculado) — não é colisão, descarta a
      // duplicata para não violar a PK de `vinculo_codigo`.
      continue;
    }

    throw new Error(
      `Colisão de código normalizado em vinculo_codigo: "${visto.codigoOriginal}" ` +
        `(pedido "${visto.idPedido}") e "${candidato.codigoOriginal}" ` +
        `(pedido "${candidato.idPedido}") normalizam para o mesmo código "${codigoNormalizado}".`,
    );
  }

  return linhas;
}

/**
 * Monta, a partir do event store já populado em `db`, as linhas de
 * `pedido_resumo` e `vinculo_codigo` prontas para publicação no D1
 * (`leitura-d1.sql`). Determinístico: a mesma entrada produz sempre a mesma
 * saída, na mesma ordem.
 */
export function montarPedidosEVinculos(db: DatabaseSync): {
  pedidoResumo: LinhaPedidoResumo[];
  vinculoCodigo: LinhaVinculoCodigo[];
} {
  const pedidos = db
    .prepare("SELECT id_pedido FROM pedido")
    .all() as unknown as LinhaPedidoDb[];

  const vinculosFonte = db
    .prepare("SELECT fonte, codigo_externo, id_pedido FROM vinculo_fonte")
    .all() as unknown as LinhaVinculoFonteDb[];

  const eventos = db
    .prepare(
      "SELECT fonte, codigo_evento, id_pedido, tipo, momento_fato, ordem_chegada, versao_schema, dados FROM evento",
    )
    .all() as unknown as LinhaEventoDb[];

  const eventosPorPedido = agruparEventosPorPedido(eventos);
  const vinculosPorPedido = new Map<string, LinhaVinculoFonteDb[]>();
  for (const vinculo of vinculosFonte) {
    const lista = vinculosPorPedido.get(vinculo.id_pedido) ?? [];
    lista.push(vinculo);
    vinculosPorPedido.set(vinculo.id_pedido, lista);
  }

  const pedidoResumo = pedidos
    .map((pedido) =>
      montarResumoPedido(
        pedido.id_pedido,
        eventosPorPedido.get(pedido.id_pedido) ?? [],
        vinculosPorPedido.get(pedido.id_pedido) ?? [],
      ),
    )
    .sort((a, b) => a.id_pedido.localeCompare(b.id_pedido));

  const vinculoCodigo = montarVinculosCodigo(pedidos, vinculosFonte).sort((a, b) =>
    a.codigo.localeCompare(b.codigo),
  );

  return { pedidoResumo, vinculoCodigo };
}
