import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Regra de fronteira G-04/RN-13: o nome `problemas-plantados`
// (gabarito) fica barrado fora de test/, exceto nos arquivos de geração, que
// ESCREVEM o arquivo. Usa os caminhos reais do repositório (o projectService
// do typescript-eslint exige arquivo existente em algum tsconfig).

const RAIZ = path.resolve(import.meta.dirname, "../../..");
const eslint = new ESLint({ cwd: RAIZ });

const REGRAS_GABARITO = ["no-restricted-imports", "no-restricted-syntax"];

async function regrasVioladas(caminhoRelativo: string, codigo: string): Promise<string[]> {
  const [resultado] = await eslint.lintText(codigo, {
    filePath: path.join(RAIZ, caminhoRelativo),
  });
  return (resultado?.messages ?? [])
    .filter(
      (m) =>
        m.ruleId !== null &&
        REGRAS_GABARITO.includes(m.ruleId) &&
        m.message.includes("gabarito"),
    )
    .map((m) => m.ruleId ?? "");
}

const IMPORTA_NOME_NOVO = 'import { x } from "../gerador/problemas-plantados.js";\nexport const y = x;\n';
const CITA_NOME_NOVO = 'export const nome = "problemas-plantados.json";\n';
const IMPORTA_NOME_ANTIGO = 'import { x } from "../gerador/gabarito.js";\nexport const y = x;\n';

// Timeout explícito: o 1º lintText inicia o projectService do typescript-eslint (lento).
describe("lint — fronteira do gabarito (problemas-plantados)", { timeout: 60000 }, () => {
  it("barra o import do nome novo fora de test/ (fontes)", async () => {
    const regras = await regrasVioladas("processamento/src/fontes/vendas.ts", IMPORTA_NOME_NOVO);
    expect(regras).toContain("no-restricted-imports");
  });

  it("barra o import do nome novo no dominio", async () => {
    const regras = await regrasVioladas("processamento/src/dominio/valores.ts", IMPORTA_NOME_NOVO);
    expect(regras).toContain("no-restricted-imports");
  });

  it("barra a string com o nome novo fora de test/ (fontes)", async () => {
    const regras = await regrasVioladas("processamento/src/fontes/vendas.ts", CITA_NOME_NOVO);
    expect(regras).toContain("no-restricted-syntax");
  });

  it("permite o nome novo nos arquivos de geração (aplicacao/gerar.ts e gerador/)", async () => {
    expect(await regrasVioladas("processamento/src/aplicacao/gerar.ts", CITA_NOME_NOVO)).toEqual([]);
    expect(
      await regrasVioladas("processamento/src/gerador/plantar-rastreio.ts", IMPORTA_NOME_NOVO),
    ).toEqual([]);
  });

  it("segue barrando o nome antigo (gabarito) até nos arquivos de geração", async () => {
    const regras = await regrasVioladas("processamento/src/aplicacao/gerar.ts", IMPORTA_NOME_ANTIGO);
    expect(regras).toContain("no-restricted-imports");
  });

  it("permite o nome novo em test/", async () => {
    expect(
      await regrasVioladas("processamento/test/integracao/gerador.test.ts", IMPORTA_NOME_NOVO),
    ).toEqual([]);
  });
});
