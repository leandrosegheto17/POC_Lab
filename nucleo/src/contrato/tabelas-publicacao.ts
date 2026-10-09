// Formato das linhas das tabelas de leitura publicadas no D1 (SDD §5): o
// processamento as monta e o web as lê. Só tipos — sem I/O.

/** Linha genérica de uma tabela: mapa coluna → valor já pronto para publicação. */
export type LinhaTabela = Record<string, unknown>;

/** Linhas de cada tabela de leitura, já montadas e ordenadas. */
export type TabelasParaPublicacao = {
  pedido_resumo: LinhaTabela[];
  vinculo_codigo: LinhaTabela[];
  linha_do_tempo: LinhaTabela[];
  divergencia: LinhaTabela[];
  documento: LinhaTabela[];
};
