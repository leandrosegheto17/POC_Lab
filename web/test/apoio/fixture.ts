// Fixture reutilizável: monta um `D1Teste` (ver `./d1-teste.ts`)
// já carregado com o DDL de `./leitura-d1.sql` + os dados de
// exemplo (`./dados-exemplo.ts`) ou um dataset próprio.
//
// `./leitura-d1.sql` é cópia de `processamento/src/publicacao/leitura-d1.sql`
// (o web não importa `processamento`). Para regravar a cópia:
// `node scripts/sincronizar-ddl-web.mjs` (e `--check` só confere; o
// `pnpm test:scripts` falha se a cópia estiver desatualizada). As linhas são
// inseridas por instruções preparadas (colunas na ordem do DDL).
//
// `node:fs` só é lido aqui porque este arquivo vive em `web/test/` (mesma
// exceção documentada em `d1-teste.ts`/`eslint.config.js` para `node:*`
// dentro de `test/`).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { TabelasParaPublicacao } from "nucleo/contrato/tabelas-publicacao.js";

import { D1Teste } from "./d1-teste.js";
import { DADOS_EXEMPLO } from "./dados-exemplo.js";

const DDL = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "leitura-d1.sql"), "utf8");

/** INSERT por tabela, com as colunas na ordem do DDL de `./leitura-d1.sql`. */
const INSERCOES: Record<keyof TabelasParaPublicacao, { sql: string; colunas: string[] }> = {
  pedido_resumo: {
    sql: "INSERT INTO pedido_resumo (id_pedido, valor_devido, valor_pago, data_limite, situacao_pagamento, fontes) VALUES (?, ?, ?, ?, ?, ?)",
    colunas: ["id_pedido", "valor_devido", "valor_pago", "data_limite", "situacao_pagamento", "fontes"],
  },
  vinculo_codigo: {
    sql: "INSERT INTO vinculo_codigo (codigo, fonte, id_pedido) VALUES (?, ?, ?)",
    colunas: ["codigo", "fonte", "id_pedido"],
  },
  linha_do_tempo: {
    sql: "INSERT INTO linha_do_tempo (id_pedido, posicao, codigo_evento, fonte, tipo, momento_fato, versao_schema, dados, fora_de_ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    colunas: ["id_pedido", "posicao", "codigo_evento", "fonte", "tipo", "momento_fato", "versao_schema", "dados", "fora_de_ordem"],
  },
  divergencia: {
    sql: "INSERT INTO divergencia (tipo, id_pedido, motivo, eventos) VALUES (?, ?, ?, ?)",
    colunas: ["tipo", "id_pedido", "motivo", "eventos"],
  },
  documento: {
    sql: "INSERT INTO documento (chave, conteudo) VALUES (?, ?)",
    colunas: ["chave", "conteudo"],
  },
};

function valorSqlite(valor: unknown): SQLInputValue {
  if (valor === undefined || valor === null) return null;
  if (typeof valor === "boolean") return valor ? 1 : 0;
  return valor as SQLInputValue;
}

/**
 * Cria um `D1Teste` com o DDL de `leitura-d1.sql` + as linhas das `tabelas`
 * informadas, numa conexão `node:sqlite` nova em memória. Serve aos testes que
 * precisam de um dataset próprio (ex.: eventos com payload válido contra o contrato).
 */
export function criarD1TesteComTabelas(tabelas: TabelasParaPublicacao): D1Teste {
  const db = new DatabaseSync(":memory:");
  db.exec(DDL);

  for (const nome of Object.keys(INSERCOES) as (keyof TabelasParaPublicacao)[]) {
    const { sql, colunas } = INSERCOES[nome];
    const insercao = db.prepare(sql);
    for (const linha of tabelas[nome]) {
      insercao.run(...colunas.map((coluna) => valorSqlite(linha[coluna])));
    }
  }

  return new D1Teste(db);
}

/**
 * Cria um `D1Teste` pronto para ser injetado como `env.DB` nos testes das
 * rotas do Worker, carregado com `DADOS_EXEMPLO`.
 */
export function criarD1Teste(): D1Teste {
  return criarD1TesteComTabelas(DADOS_EXEMPLO);
}
