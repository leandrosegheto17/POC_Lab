/**
 * TP-0040 — Escritor do arquivo `leitura.sql` (SDD §5).
 *
 * Módulo puro em relação a I/O de disco: recebe o DDL já pronto (texto
 * verbatim de `publicacao/leitura-d1.sql`, TP-0032) e as linhas de cada
 * tabela já montadas/ordenadas pelo chamador (ex. `publicacao/pedidos.ts`,
 * TP-0035) e devolve uma única string com o SQL completo a ser gravado em
 * disco por outra tarefa. Nunca lê nem escreve arquivo, nunca roda
 * `wrangler d1 execute`, nunca reordena as linhas recebidas.
 *
 * Determinístico: a mesma entrada produz sempre a mesma string, byte a
 * byte — sem `Date.now()` nem qualquer fonte não determinística
 * (RNF-05/ADR-002).
 */

/** Ordem fixa das tabelas no arquivo gerado — mesma ordem do DDL em `leitura-d1.sql`. */
const ORDEM_TABELAS = [
  "pedido_resumo",
  "vinculo_codigo",
  "linha_do_tempo",
  "divergencia",
  "documento",
] as const;

type NomeTabela = (typeof ORDEM_TABELAS)[number];

/**
 * Lista de colunas FIXA por tabela, na mesma ordem do `CREATE TABLE` em
 * `leitura-d1.sql` (TP-0032). Não usa `Object.keys` dos objetos de linha:
 * a ordem de chaves de um objeto JS não é garantida de forma estável entre
 * runtimes/versões, e a lista de colunas do `INSERT` precisa bater
 * exatamente com o DDL.
 */
const COLUNAS_POR_TABELA: Record<NomeTabela, readonly string[]> = {
  pedido_resumo: [
    "id_pedido",
    "valor_devido",
    "valor_pago",
    "data_limite",
    "situacao_pagamento",
    "fontes",
  ],
  vinculo_codigo: ["codigo", "fonte", "id_pedido"],
  linha_do_tempo: [
    "id_pedido",
    "posicao",
    "codigo_evento",
    "fonte",
    "tipo",
    "momento_fato",
    "versao_schema",
    "dados",
    "fora_de_ordem",
  ],
  divergencia: ["tipo", "id_pedido", "motivo", "eventos"],
  documento: ["chave", "conteudo"],
};

/** Linha genérica de uma tabela: mapa coluna → valor já pronto para publicação. */
export type LinhaTabela = Record<string, unknown>;

/** Entrada de `escreverSqlPublicacao`: linhas já montadas/ordenadas por tabela. */
export type TabelasParaPublicacao = {
  pedido_resumo: LinhaTabela[];
  vinculo_codigo: LinhaTabela[];
  linha_do_tempo: LinhaTabela[];
  divergencia: LinhaTabela[];
  documento: LinhaTabela[];
};

/** Tamanho máximo, em bytes UTF-8, de uma única instrução `INSERT` gerada. */
const MAX_BYTES_POR_INSTRUCAO = 100_000;

/**
 * Escapa um valor de coluna para uso direto no texto de um `INSERT`:
 * - `null`/`undefined` → literal `NULL`, sem aspas.
 * - `number` → literal direto (sem aspas), via `String(valor)`.
 * - `boolean` → literal direto `1`/`0` (sem aspas), compatível com a
 *   afinidade `INTEGER` das colunas booleanas do DDL (ex. `fora_de_ordem`).
 * - `string` → entre aspas simples, com cada aspas simples duplicada
 *   (`'` → `''`). Nenhuma outra sanitização é aplicada.
 */
function escaparValor(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "NULL";
  }
  if (typeof valor === "number") {
    return String(valor);
  }
  if (typeof valor === "boolean") {
    return valor ? "1" : "0";
  }
  const texto = String(valor);
  return `'${texto.replace(/'/g, "''")}'`;
}

/** Formata uma linha como tupla `(v1, v2, ...)`, na ordem fixa de `colunas`. */
function formatarTupla(linha: LinhaTabela, colunas: readonly string[]): string {
  const valores = colunas.map((coluna) => escaparValor(linha[coluna]));
  return `(${valores.join(", ")})`;
}

/**
 * Monta as instruções `INSERT` de uma tabela, quebrando em múltiplas
 * instruções quando o total passaria de `MAX_BYTES_POR_INSTRUCAO` (aproxima
 * via `Buffer.byteLength` em UTF-8). Cada instrução carrega o maior número
 * de tuplas que couber dentro do limite, preservando a ordem recebida —
 * nunca reordena. Se uma única tupla já exceder o limite por si só, ela é
 * emitida sozinha em sua própria instrução (não há como quebrar uma tupla).
 *
 * Devolve lista vazia quando `linhas` está vazio: nenhuma instrução é
 * gerada para tabela sem linhas.
 */
function montarInstrucoesInsert(nomeTabela: NomeTabela, linhas: LinhaTabela[]): string[] {
  if (linhas.length === 0) {
    return [];
  }

  const colunas = COLUNAS_POR_TABELA[nomeTabela];
  const prefixo = `INSERT INTO ${nomeTabela} (${colunas.join(", ")}) VALUES `;
  const sufixo = ";\n";
  const bytesPrefixoSufixo =
    Buffer.byteLength(prefixo, "utf8") + Buffer.byteLength(sufixo, "utf8");

  const tuplas = linhas.map((linha) => formatarTupla(linha, colunas));

  const instrucoes: string[] = [];
  let grupoAtual: string[] = [];
  let bytesGrupoAtual = 0;

  for (const tupla of tuplas) {
    const separador = grupoAtual.length === 0 ? "" : ",\n";
    const bytesAdicionais = Buffer.byteLength(separador + tupla, "utf8");

    if (
      grupoAtual.length > 0 &&
      bytesPrefixoSufixo + bytesGrupoAtual + bytesAdicionais > MAX_BYTES_POR_INSTRUCAO
    ) {
      instrucoes.push(prefixo + grupoAtual.join(",\n") + sufixo);
      grupoAtual = [tupla];
      bytesGrupoAtual = Buffer.byteLength(tupla, "utf8");
      continue;
    }

    grupoAtual.push(tupla);
    bytesGrupoAtual += bytesAdicionais;
  }

  if (grupoAtual.length > 0) {
    instrucoes.push(prefixo + grupoAtual.join(",\n") + sufixo);
  }

  return instrucoes;
}

/**
 * Monta o texto completo do `leitura.sql`: o DDL recebido verbatim (string
 * `ddl`, tal como vem de `publicacao/leitura-d1.sql`) seguido dos blocos de
 * `INSERT` por tabela, na ordem fixa `pedido_resumo, vinculo_codigo,
 * linha_do_tempo, divergencia, documento`. Tabela sem linhas não gera
 * nenhuma instrução. Nunca inclui `BEGIN`/`COMMIT` — a transação, se
 * houver, é responsabilidade de quem aplica o script (mesma convenção do
 * DDL em `leitura-d1.sql`).
 *
 * Puro: não lê nem grava nada em disco, não chama `wrangler d1 execute`, não
 * reordena as linhas recebidas (chegam já ordenadas pelo chamador).
 * Determinístico: mesma entrada produz sempre a mesma string.
 */
export function escreverSqlPublicacao(ddl: string, tabelas: TabelasParaPublicacao): string {
  const blocos = ORDEM_TABELAS.map((nomeTabela) =>
    montarInstrucoesInsert(nomeTabela, tabelas[nomeTabela]).join(""),
  );

  return ddl + blocos.join("");
}
