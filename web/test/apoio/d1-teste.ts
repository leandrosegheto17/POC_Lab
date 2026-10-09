// Adaptador de teste: subconjunto da interface do D1
// (`prepare`/`bind`/`first`/`all`/`run`) implementado sobre `node:sqlite` em
// memória. Existe só para os testes de rota do Worker
// injetarem como `env.DB`, sem precisar de um D1 real nem de Miniflare.
//
// `node:sqlite` só é importado aqui porque este arquivo vive em `web/test/`
// — G-03 permite `node:*` dentro de `test/` (ver nota de interpretação em
// `eslint.config.js`); o Worker em si (`web/worker/**`, fora de `test/`)
// continua proibido de importar `node:*`.
import { DatabaseSync, type StatementSync } from "node:sqlite";

/** Valor de parâmetro aceito tanto pelo D1 quanto por este adaptador. */
export type ValorParametroD1 = string | number | bigint | null;

/** Linha genérica devolvida por uma query — mesmo formato de uma linha do D1. */
export type LinhaD1 = Record<string, unknown>;

/**
 * Instrução preparada, no subconjunto usado do `D1PreparedStatement`:
 * `bind` fixa os parâmetros posicionais (`?`) e devolve uma nova instrução
 * já vinculada (não muta a original); `first`/`all`/`run` executam com os
 * parâmetros vinculados até então (nenhum, se `bind` nunca foi chamado).
 */
export class InstrucaoD1Teste {
  private readonly stmt: StatementSync;
  private readonly valores: readonly ValorParametroD1[];

  constructor(stmt: StatementSync, valores: readonly ValorParametroD1[] = []) {
    this.stmt = stmt;
    this.valores = valores;
  }

  /** Vincula parâmetros posicionais; devolve uma nova instrução vinculada. */
  bind(...valores: ValorParametroD1[]): InstrucaoD1Teste {
    return new InstrucaoD1Teste(this.stmt, valores);
  }

  /** Semântica D1: primeira linha como objeto, ou `null` se não houver nenhuma. */
  first(): LinhaD1 | null {
    const linha = this.stmt.get(...this.valores);
    return linha === undefined ? null : linha;
  }

  /** Semântica D1: todas as linhas, envelopadas em `{ results: [...] }`. */
  all(): { results: LinhaD1[] } {
    return { results: this.stmt.all(...this.valores) };
  }

  /** Semântica D1: executa sem devolver linhas; não lança erro em caso de sucesso. */
  run(): void {
    this.stmt.run(...this.valores);
  }
}

/**
 * Banco de teste com o subconjunto usado de `D1Database`: só `prepare`,
 * suficiente para o que as rotas do Worker consomem de `env.DB`. `prepare`
 * nunca lança por SQL inválido na hora de preparar — o erro, se houver, só
 * aparece ao executar (`first`/`all`/`run`), mesmo comportamento de driver
 * SQL real.
 */
export class D1Teste {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  prepare(sql: string): InstrucaoD1Teste {
    return new InstrucaoD1Teste(this.db.prepare(sql));
  }

  /** Acesso direto à conexão subjacente — só para a fixture carregar o SQL inicial. */
  conexaoBruta(): DatabaseSync {
    return this.db;
  }
}

/** Cria um `D1Teste` vazio (sem schema nem dados), sobre `node:sqlite` em memória. */
export function criarD1TesteVazio(): D1Teste {
  return new D1Teste(new DatabaseSync(":memory:"));
}
