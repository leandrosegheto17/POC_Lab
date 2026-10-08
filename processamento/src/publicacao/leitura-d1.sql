-- TP-0032 — Schema das visões de leitura publicadas no D1 (SDD §5).
--
-- DDL puro: só `DROP TABLE IF EXISTS` + `CREATE TABLE` por tabela, para que o
-- script possa ser reaplicado do zero a cada publicação (idempotente por
-- substituição total, diferente do event store local em
-- armazenamento/schema.sql, que é aditivo via `CREATE TABLE IF NOT EXISTS`).
-- Sem `BEGIN`/`COMMIT`: a transação, se houver, é responsabilidade de quem
-- aplica o script, não deste arquivo.

DROP TABLE IF EXISTS pedido_resumo;
CREATE TABLE pedido_resumo (
  id_pedido TEXT PRIMARY KEY,
  valor_devido REAL,
  valor_pago REAL,
  data_limite TEXT,
  situacao_pagamento TEXT,
  fontes TEXT
);

DROP TABLE IF EXISTS vinculo_codigo;
CREATE TABLE vinculo_codigo (
  codigo TEXT PRIMARY KEY,
  fonte TEXT,
  id_pedido TEXT
);

DROP TABLE IF EXISTS linha_do_tempo;
CREATE TABLE linha_do_tempo (
  id_pedido TEXT,
  posicao INTEGER,
  codigo_evento TEXT,
  fonte TEXT,
  tipo TEXT,
  momento_fato TEXT,
  versao_schema INTEGER,
  dados TEXT,
  fora_de_ordem INTEGER,
  PRIMARY KEY (id_pedido, posicao)
);

DROP TABLE IF EXISTS divergencia;
CREATE TABLE divergencia (
  tipo TEXT,
  id_pedido TEXT,
  motivo TEXT,
  eventos TEXT,
  PRIMARY KEY (tipo, id_pedido)
);

-- A PK (tipo, id_pedido) já atende consultas "por tipo" (prefixo da PK).
-- Este índice atende o acesso pelo outro lado: consultas "por pedido".
CREATE INDEX idx_divergencia_pedido_tipo ON divergencia (id_pedido, tipo);

DROP TABLE IF EXISTS documento;
CREATE TABLE documento (
  chave TEXT PRIMARY KEY,
  conteudo TEXT
);
