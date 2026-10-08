import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { AchadoQualidade, Fonte } from "../dominio/modelo.js";

/**
 * TP-0018 — Repositório SQLite do event store (SDD §5, ADR-004).
 *
 * Este módulo é o único lugar do projeto com acesso ao SQLite local
 * (GUARDRAILS G-05). Só gera `INSERT ... ON CONFLICT DO NOTHING` — nunca
 * `UPDATE`/`DELETE` nas tabelas do event store.
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
};

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

  function inserirPedido(idPedido: string): ResultadoInsercao {
    const resultado = db
      .prepare(`INSERT INTO pedido (id_pedido) VALUES (?) ON CONFLICT DO NOTHING`)
      .run(idPedido);
    return { nova: foiLinhaNova(resultado.changes) };
  }

  function inserirVinculoFonte(
    fonte: Fonte,
    codigoExterno: string,
    idPedido: string,
  ): ResultadoInsercao {
    const resultado = db
      .prepare(
        `INSERT INTO vinculo_fonte (fonte, codigo_externo, id_pedido) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
      )
      .run(fonte, codigoExterno, idPedido);
    return { nova: foiLinhaNova(resultado.changes) };
  }

  function inserirEvento(evento: EventoParaInserir): ResultadoInsercao {
    const resultado = db
      .prepare(
        `INSERT INTO evento (fonte, codigo_evento, id_pedido, tipo, momento_fato, ordem_chegada, versao_schema, dados) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      )
      .run(
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
    const resultado = db
      .prepare(
        `INSERT INTO achado_qualidade (tipo, fonte, referencia, regra, detalhe) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
      )
      .run(achado.tipo, achado.fonte, achado.referencia, achado.regra, achado.detalhe);
    return { nova: foiLinhaNova(resultado.changes) };
  }

  return {
    db,
    inserirPedido,
    inserirVinculoFonte,
    inserirEvento,
    inserirAchadoQualidade,
  };
}
