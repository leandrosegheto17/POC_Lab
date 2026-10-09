import path from "node:path";

/**
 * Caminhos e nomes padrão do pipeline, relativos ao cwd do processo (a raiz do
 * pacote `processamento` quando rodado via `pnpm --filter processamento run …`).
 */

/** Diretório padrão da base de origem (já coberto por .gitignore). */
export const DIR_DESTINO_PADRAO = path.join("dados", "origem");
export const NOME_ARQUIVO_PADRAO = "northwind.db";

/** Caminho padrão da base de origem (Northwind). */
export const CAMINHO_BASE_PADRAO = path.join(DIR_DESTINO_PADRAO, NOME_ARQUIVO_PADRAO);

/** Diretório padrão dos arquivos gerados. */
export const DIR_GERADO_PADRAO = path.join("dados", "gerado");

export const NOME_PAGAMENTOS_CSV = "pagamentos.csv";
export const NOME_RASTREIO_CSV = "rastreio.csv";
export const NOME_GABARITO_JSON = "problemas-plantados.json";

/** Caminho padrão do banco SQLite do event store. */
export const CAMINHO_BANCO_PADRAO = path.join("dados", "poc_lab.sqlite");

/** Diretório e arquivo padrão de saída do SQL de publicação. */
export const DIR_PUBLICACAO_PADRAO = path.join("dados", "publicacao");
export const NOME_ARQUIVO_LEITURA_SQL = "leitura.sql";

/**
 * Caminho padrão do pacote `web`, onde `wrangler` é invocado — relativo à raiz
 * do pacote `processamento`, não à raiz do monorepo.
 */
export const CAMINHO_WEB_PADRAO = path.join("..", "web");
