import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AchadoQualidade, Fonte } from "../dominio/modelo.js";
import { criarConsultas, type Consultas } from "./consultas.js";

/**
 * Repositório SQLite do event store (SDD §5, ADR-004): inserções idempotentes,
 * consultas de leitura (`consultas.ts`) e transação. Os comandos são preparados
 * uma vez, na criação. Só gera `INSERT ... ON CONFLICT DO NOTHING` e `SELECT`
 * — nunca `UPDATE`/`DELETE` nas tabelas do event store (GUARDRAILS G-05).
 * Enquanto os módulos de importação, publicação e IA ainda acessam `db`
 * diretamente, este não é o único ponto de acesso ao SQLite.
 */

const DIRETORIO_ATUAL = dirname(fileURLToPath(import.meta.url));
const CAMINHO_SCHEMA = join(DIRETORIO_ATUAL, "schema.sql");

/**
 * Resultado de toda função de inserção idempotente: `nova: true` quando a
 * linha foi de fato inserida; `nova: false` quando já existia (conflito
 * absorvido por `ON CONFLICT DO NOTHING`, sem lançar exceção).
 */
export type ResultadoInsercao = { nova: boolean };

/**
 * Dados de um evento a inserir na tabela `evento`.
 *
 * `idPedido` é `null` quando o evento ainda não pôde ser vinculado a um
 * pedido (ex.: pagamento sem identificação). `dados` é o payload já
 * serializado (JSON) — a serialização/desserialização não é responsabilidade
 * deste módulo.
 */
export type EventoParaInserir = {
  fonte: Fonte;
  codigoEvento: string;
  idPedido: string | null;
  tipo: string;
  momentoFato: string;
  ordemChegada: number | null;
  versaoSchema: number;
  dados: string;
};

export type Repositorio = {
  /** Conexão SQLite aberta — exposta para os testes consultarem o estado diretamente. */
  db: DatabaseSync;
  inserirPedido: (idPedido: string) => ResultadoInsercao;
  inserirVinculoFonte: (
    fonte: Fonte,
    codigoExterno: string,
    idPedido: string,
  ) => ResultadoInsercao;
  inserirEvento: (evento: EventoParaInserir) => ResultadoInsercao;
  inserirAchadoQualidade: (achado: AchadoQualidade) => ResultadoInsercao;
  /** Lê a cache de IA pela chave (hash SHA-256); `undefined` se não houver. */
  obterCache: (chave: string) => { resposta: string; criadoEm: string } | undefined;
  /** Grava a cache de IA; se a chave já existir, a gravação é ignorada (ON CONFLICT DO NOTHING). */
  gravarCache: (chave: string, resposta: string, criadoEm: string, modelo?: string) => void;
  emTransacao: <T>(fn: () => T) => T;
} & Consultas;

/**
 * `changes` do resultado de `run()` vem como `number | bigint` dependendo do
 * driver; normalizamos para `number` antes de comparar.
 */
function foiLinhaNova(changes: number | bigint): boolean {
  return Number(changes) === 1;
}

/**
 * Abre (ou cria) o banco SQLite em `caminhoArquivo` — use `:memory:` para
 * testes — aplica o `schema.sql` (idempotente, só `CREATE TABLE IF NOT
 * EXISTS`) e devolve as funções de inserção do event store.
 */
export function criarRepositorio(caminhoArquivo: string): Repositorio {
  const db = new DatabaseSync(caminhoArquivo);
  const sqlSchema = readFileSync(CAMINHO_SCHEMA, "utf8");
  db.exec(sqlSchema);
  // Bancos criados antes da coluna `modelo` em `cache_ia` recebem a coluna
  // aditiva (nullable); nenhum dado é alterado.
  const colunasCache = db.prepare(`PRAGMA table_info(cache_ia)`).all() as unknown as {
    name: string;
  }[];
  if (!colunasCache.some((coluna) => coluna.name === "modelo")) {
    db.exec(`ALTER TABLE cache_ia ADD COLUMN modelo TEXT`);
  }

  const comandoInserirPedido = db.prepare(
    `INSERT INTO pedido (id_pedido) VALUES (?) ON CONFLICT DO NOTHING`,
  );
  const comandoInserirVinculo = db.prepare(
    `INSERT INTO vinculo_fonte (fonte, codigo_externo, id_pedido) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
  );
  const comandoInserirEvento = db.prepare(
    `INSERT INTO evento (fonte, codigo_evento, id_pedido, tipo, momento_fato, ordem_chegada, versao_schema, dados) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
  );
  const comandoInserirAchado = db.prepare(
    `INSERT INTO achado_qualidade (tipo, fonte, referencia, regra, detalhe) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
  );
  const comandoObterCache = db.prepare(
    `SELECT resposta, criado_em FROM cache_ia WHERE chave = ?`,
  );
  const comandoGravarCache = db.prepare(
    `INSERT INTO cache_ia (chave, resposta, criado_em, modelo) VALUES (?, ?, ?, ?) ON CONFLICT(chave) DO NOTHING`,
  );

  function inserirPedido(idPedido: string): ResultadoInsercao {
    return { nova: foiLinhaNova(comandoInserirPedido.run(idPedido).changes) };
  }

  function inserirVinculoFonte(
    fonte: Fonte,
    codigoExterno: string,
    idPedido: string,
  ): ResultadoInsercao {
    return {
      nova: foiLinhaNova(comandoInserirVinculo.run(fonte, codigoExterno, idPedido).changes),
    };
  }

  function inserirEvento(evento: EventoParaInserir): ResultadoInsercao {
    const resultado = comandoInserirEvento.run(
      evento.fonte,
      evento.codigoEvento,
      evento.idPedido,
      evento.tipo,
      evento.momentoFato,
      evento.ordemChegada,
      evento.versaoSchema,
      evento.dados,
    );
    return { nova: foiLinhaNova(resultado.changes) };
  }

  function inserirAchadoQualidade(achado: AchadoQualidade): ResultadoInsercao {
    const resultado = comandoInserirAchado.run(
      achado.tipo,
      achado.fonte,
      achado.referencia,
      achado.regra,
      achado.detalhe,
    );
    return { nova: foiLinhaNova(resultado.changes) };
  }

  function obterCache(chave: string): { resposta: string; criadoEm: string } | undefined {
    const linha = comandoObterCache.get(chave) as
      | { resposta: string; criado_em: string }
      | undefined;
    if (linha === undefined) {
      return undefined;
    }
    return { resposta: linha.resposta, criadoEm: linha.criado_em };
  }

  function gravarCache(
    chave: string,
    resposta: string,
    criadoEm: string,
    modelo?: string,
  ): void {
    comandoGravarCache.run(chave, resposta, criadoEm, modelo ?? null);
  }

  /** Executa `fn` numa transação: `COMMIT` ao terminar, `ROLLBACK` (e relança o erro) se lançar. */
  function emTransacao<T>(fn: () => T): T {
    db.exec("BEGIN");
    try {
      const resultado = fn();
      db.exec("COMMIT");
      return resultado;
    } catch (erro) {
      db.exec("ROLLBACK");
      throw erro;
    }
  }

  return {
    db,
    emTransacao,
    ...criarConsultas(db),
    inserirPedido,
    inserirVinculoFonte,
    inserirEvento,
    inserirAchadoQualidade,
    obterCache,
    gravarCache,
  };
}
