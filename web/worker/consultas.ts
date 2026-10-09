// Consultas ao D1 (tabelas de leitura publicadas pelo processamento,
// SDD §5). Todas usam `prepare(CONSTANTE).bind(...)` com parâmetros
// posicionais — nunca concatenação/interpolação de valor em string SQL
// (G-08). Este arquivo é compartilhado pelas rotas da API.

type LinhaDocumento = { conteudo: string };

type LinhaPedidoResumo = {
  id_pedido: string;
  valor_devido: number;
  valor_pago: number;
  data_limite: string;
  situacao_pagamento: string;
  fontes: string;
};

type LinhaTempoProjecaoDb = {
  id_pedido: string;
  posicao: number;
  codigo_evento: string;
  fonte: string;
  tipo: string;
  momento_fato: string;
  versao_schema: number;
  dados: string;
  fora_de_ordem: number;
};

type LinhaDivergenciaDb = {
  tipo: string;
  id_pedido: string;
  motivo: string;
  eventos: string;
};

/**
 * Documento publicado por chave (`resumo` | `indicadores` | `qualidade`,
 * publicados pelo processamento). `chave` é sempre um literal fixo no código de quem
 * chama, nunca vem da requisição — sem superfície de injeção aqui.
 */
export async function buscarDocumento(
  db: D1Database,
  chave: "resumo" | "indicadores" | "qualidade",
): Promise<string | null> {
  const linha = await db
    .prepare("SELECT conteudo FROM documento WHERE chave = ?")
    .bind(chave)
    .first<LinhaDocumento>();
  return linha ? linha.conteudo : null;
}

/**
 * Resolve um código (já normalizado) + o resumo do pedido numa única
 * consulta (`JOIN` de `vinculo_codigo` com `pedido_resumo`) — a rota de
 * linha do tempo usa no máximo 2 consultas no total; esta função cobre
 * a 1ª (resolução + resumo juntos).
 */
export async function resolverPedidoComResumo(
  db: D1Database,
  codigoNormalizado: string,
): Promise<LinhaPedidoResumo | null> {
  const linha = await db
    .prepare(
      `SELECT pr.* FROM vinculo_codigo vc
       JOIN pedido_resumo pr ON pr.id_pedido = vc.id_pedido
       WHERE vc.codigo = ?`,
    )
    .bind(codigoNormalizado)
    .first<LinhaPedidoResumo>();
  return linha ?? null;
}

/** Eventos da linha do tempo de um pedido, já na ordem canônica (posicao). */
export async function listarLinhaDoTempo(
  db: D1Database,
  idPedido: string,
): Promise<LinhaTempoProjecaoDb[]> {
  const resultado = await db
    .prepare(
      "SELECT * FROM linha_do_tempo WHERE id_pedido = ? ORDER BY posicao",
    )
    .bind(idPedido)
    .all<LinhaTempoProjecaoDb>();
  return resultado.results;
}

/** Divergências de um pedido (usadas pela rota de linha do tempo). */
export async function listarDivergenciasDoPedido(
  db: D1Database,
  idPedido: string,
): Promise<LinhaDivergenciaDb[]> {
  const resultado = await db
    .prepare("SELECT tipo, id_pedido, motivo, eventos FROM divergencia WHERE id_pedido = ?")
    .bind(idPedido)
    .all<LinhaDivergenciaDb>();
  return resultado.results;
}

/** Total de divergências, opcionalmente filtrado por tipo. */
export async function contarDivergencias(
  db: D1Database,
  tipo?: string,
): Promise<number> {
  const linha = tipo
    ? await db
        .prepare("SELECT COUNT(*) as total FROM divergencia WHERE tipo = ?")
        .bind(tipo)
        .first<{ total: number }>()
    : await db
        .prepare("SELECT COUNT(*) as total FROM divergencia")
        .first<{ total: number }>();
  return linha ? linha.total : 0;
}

/**
 * Página de divergências, ordenada por `(id_pedido, tipo)` — mesma ordem
 * tanto filtrada por tipo quanto em "Todos" (L-11), usa o índice
 * `(id_pedido, tipo)` da tabela `divergencia`.
 */
export async function listarDivergencias(
  db: D1Database,
  tipo: string | undefined,
  pagina: number,
  tamanho: number,
): Promise<LinhaDivergenciaDb[]> {
  const offset = (pagina - 1) * tamanho;
  const resultado = tipo
    ? await db
        .prepare(
          `SELECT tipo, id_pedido, motivo, eventos FROM divergencia
           WHERE tipo = ? ORDER BY id_pedido, tipo LIMIT ? OFFSET ?`,
        )
        .bind(tipo, tamanho, offset)
        .all<LinhaDivergenciaDb>()
    : await db
        .prepare(
          `SELECT tipo, id_pedido, motivo, eventos FROM divergencia
           ORDER BY id_pedido, tipo LIMIT ? OFFSET ?`,
        )
        .bind(tamanho, offset)
        .all<LinhaDivergenciaDb>();
  return resultado.results;
}
