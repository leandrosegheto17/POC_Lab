-- TP-0018 — Schema do event store (SDD §5).
--
-- Todas as tabelas usam `CREATE TABLE IF NOT EXISTS`: mudança de schema é
-- sempre aditiva (TASK.md §1, GUARDRAILS G-05/G-06). Este módulo nunca gera
-- `UPDATE`/`DELETE` — só `INSERT ... ON CONFLICT DO NOTHING` (ver
-- repositorio.ts).

CREATE TABLE IF NOT EXISTS pedido (
  id_pedido TEXT PRIMARY KEY
);

-- Base da idempotência de ingestão (ADR-004): um par (fonte, codigo_externo)
-- só pode apontar para um pedido.
CREATE TABLE IF NOT EXISTS vinculo_fonte (
  fonte TEXT NOT NULL,
  codigo_externo TEXT NOT NULL,
  id_pedido TEXT NOT NULL,
  UNIQUE (fonte, codigo_externo)
);

-- `id_pedido` é NULL quando o evento ainda não pôde ser vinculado a um
-- pedido (ex.: pagamento sem identificação).
CREATE TABLE IF NOT EXISTS evento (
  fonte TEXT NOT NULL,
  codigo_evento TEXT NOT NULL,
  id_pedido TEXT NULL,
  tipo TEXT NOT NULL,
  momento_fato TEXT NOT NULL,
  ordem_chegada INTEGER,
  versao_schema INTEGER NOT NULL,
  dados TEXT NOT NULL,
  UNIQUE (fonte, codigo_evento)
);

CREATE TABLE IF NOT EXISTS achado_qualidade (
  tipo TEXT NOT NULL,
  fonte TEXT NOT NULL,
  referencia TEXT NOT NULL,
  regra TEXT NOT NULL,
  detalhe TEXT NOT NULL,
  UNIQUE (tipo, fonte, referencia)
);

-- TP-0079 — Cache de respostas de IA (chave = hash SHA-256 do prompt/entrada).
CREATE TABLE IF NOT EXISTS cache_ia (
  chave TEXT PRIMARY KEY,
  resposta TEXT NOT NULL,
  criado_em TEXT NOT NULL,
  -- RTP-0041 — modelo usado na chave (NULL em entradas antigas; ver criarRepositorio).
  modelo TEXT
);
