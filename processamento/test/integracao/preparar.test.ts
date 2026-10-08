/**
 * TP-0045 — Testes de `executarPreparar`/`decidirSugerir` (`cli/preparar.ts`).
 *
 * Os dois primeiros testes (pipeline completo) dependem da base real
 * (`dados/origem/northwind.db`) e são pulados quando ela não está presente
 * neste ambiente (nada foi executado nesta sessão) — mesmo padrão de
 * `leitura-vendas.test.ts`/`gabarito.test.ts`/`qualidade.test.ts`.
 *
 * Mesmo quando a base real existe, o `wrangler` NUNCA é executado de
 * verdade: `executarWrangler` é sempre substituído por uma função fake
 * injetada via `dependenciasPublicar` (mesma técnica de
 * `publicacao.test.ts`). O event store, o diretório de dados gerados e o
 * diretório de publicação usados pelo teste são sempre temporários
 * (`mkdtempSync` em `os.tmpdir()`), nunca os caminhos reais do projeto —
 * para não deixar rastro em `dados/` nem colidir com outras tarefas rodando
 * em paralelo na mesma árvore.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { executarPreparar, decidirSugerir } from "../../src/cli/preparar.ts";
import { DIR_DESTINO_PADRAO, NOME_ARQUIVO_PADRAO } from "../../src/cli/baixar-base.ts";

const CAMINHO_BASE_REAL = path.join(DIR_DESTINO_PADRAO, NOME_ARQUIVO_PADRAO);
const baseDisponivel = existsSync(CAMINHO_BASE_REAL);

const diretoriosTemporarios: string[] = [];

function criarDiretorioTemporario(prefixo: string): string {
  const caminho = mkdtempSync(path.join(os.tmpdir(), prefixo));
  diretoriosTemporarios.push(caminho);
  return caminho;
}

afterEach(() => {
  while (diretoriosTemporarios.length > 0) {
    const caminho = diretoriosTemporarios.pop()!;
    rmSync(caminho, { recursive: true, force: true });
  }
});

/** Dependências de publicação fake (nunca roda o `wrangler` real) + caminhos isolados para uma chamada a `executarPreparar`. */
function montarOpcoesIsoladas() {
  const dirGerado = criarDiretorioTemporario("poc-lab-preparar-gerado-");
  const dirBanco = criarDiretorioTemporario("poc-lab-preparar-banco-");
  const dirPublicacao = criarDiretorioTemporario("poc-lab-preparar-publicacao-");

  return {
    dirPublicacao,
    opcoes: {
      // Base já baixada no destino real (teste só roda quando ela existe) —
      // garantirBaseLocal confere o hash e não baixa nada (idempotente).
      baixarBase: {
        dirDestino: DIR_DESTINO_PADRAO,
        nomeArquivo: NOME_ARQUIVO_PADRAO,
      },
      dirGerado,
      caminhoBanco: path.join(dirBanco, "poc_lab.sqlite"),
      diretorioPublicacao: dirPublicacao,
      caminhoWeb: "web",
      ambiente: {} as NodeJS.ProcessEnv,
      dependenciasPublicar: {
        executarWrangler: () => ({ codigo: 0, stdout: "ok", stderr: "" }),
      },
    },
  };
}

describe.skipIf(!baseDisponivel)("executarPreparar (pipeline completo, base real)", () => {
  it("encadeia os 5 passos sem lançar erro, mede o tempo e devolve o resumo da importação", async () => {
    const { opcoes } = montarOpcoesIsoladas();

    const resumo = await executarPreparar(opcoes);

    expect(resumo.tempoSegundos).toBeGreaterThan(0);
    expect(Number.isFinite(resumo.tempoSegundos)).toBe(true);

    for (const fonte of ["vendas", "pagamentos", "rastreio"] as const) {
      expect(resumo.resumoImportacao[fonte]).toMatchObject({
        lidas: expect.any(Number),
        novas: expect.any(Number),
        jaExistentes: expect.any(Number),
        rejeitadas: expect.any(Number),
      });
    }

    // Sem OPENAI_API_KEY no ambiente isolado: passo de sugestão pulado.
    expect(resumo.sugestao.pular).toBe(true);
    expect(resumo.sugestao.mensagem).toMatch(/sem sugestão/i);
  });

  it("duas execuções produzem o mesmo leitura.sql byte a byte", async () => {
    const primeira = montarOpcoesIsoladas();
    await executarPreparar(primeira.opcoes);
    const sqlPrimeira = await readFile(
      path.join(primeira.dirPublicacao, "leitura.sql"),
      "utf-8",
    );

    const segunda = montarOpcoesIsoladas();
    await executarPreparar(segunda.opcoes);
    const sqlSegunda = await readFile(
      path.join(segunda.dirPublicacao, "leitura.sql"),
      "utf-8",
    );

    expect(sqlSegunda).toBe(sqlPrimeira);
  });
});

describe("decidirSugerir (TP-0045, passo 4 isolado)", () => {
  it("pula o passo com mensagem clara quando OPENAI_API_KEY não está definida", () => {
    const decisao = decidirSugerir({} as NodeJS.ProcessEnv);

    expect(decisao.pular).toBe(true);
    expect(decisao.mensagem).toMatch(/sem sugestão/i);
    expect(() => decidirSugerir({} as NodeJS.ProcessEnv)).not.toThrow();
  });

  it("também pula o passo (sem lançar erro) quando OPENAI_API_KEY está definida, pois a CLI `sugerir` ainda não existe", () => {
    const decisao = decidirSugerir({ OPENAI_API_KEY: "chave-fake" } as NodeJS.ProcessEnv);

    expect(decisao.pular).toBe(true);
    expect(decisao.mensagem).toMatch(/ainda não existe/i);
  });
});
