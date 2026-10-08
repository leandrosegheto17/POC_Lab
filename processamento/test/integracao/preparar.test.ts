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
import { afterEach, describe, expect, it, vi } from "vitest";

import { executarPreparar, decidirSugerir } from "../../src/cli/preparar.ts";
import { DIR_DESTINO_PADRAO, NOME_ARQUIVO_PADRAO } from "../../src/cli/baixar-base.ts";
import { executarSugerir } from "../../src/cli/sugerir.ts";
import { criarRepositorio } from "../../src/armazenamento/repositorio.ts";
import { criarProvedorFalso } from "../../src/ia/provedor-falso.ts";

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
    // `maxRetries`/`retryDelay`: no Windows, o SO pode levar um instante
    // para liberar o handle do arquivo do banco mesmo após `db.close()`
    // (visto em execução real deste teste) — tenta novamente em vez de
    // falhar com EPERM na primeira tentativa.
    rmSync(caminho, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
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
  it(
    "encadeia os 5 passos sem lançar erro, mede o tempo e devolve o resumo da importação",
    async () => {
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
    },
    // Pipeline completo (baixar-base/gerar/importar/publicar-dados) contra a
    // base real: bem acima do timeout padrão de 5s do vitest (mesma
    // necessidade dos testes "TP-0083, pipeline completo" abaixo, que já
    // usam este mesmo valor).
    300_000,
  );

  it(
    "duas execuções produzem o mesmo leitura.sql byte a byte",
    async () => {
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
    },
    300_000,
  );
});

describe("decidirSugerir (TP-0045, passo 4 isolado)", () => {
  it("pula o passo com mensagem clara quando OPENAI_API_KEY não está definida", () => {
    const decisao = decidirSugerir({} as NodeJS.ProcessEnv);

    expect(decisao.pular).toBe(true);
    expect(decisao.mensagem).toMatch(/sem sugestão/i);
    expect(() => decidirSugerir({} as NodeJS.ProcessEnv)).not.toThrow();
  });

  it("sem chave, a mensagem não cita 'ainda não existe' (RTP-0027)", () => {
    const decisao = decidirSugerir({} as NodeJS.ProcessEnv);

    expect(decisao.mensagem).not.toMatch(/ainda não existe/i);
    expect(decisao.mensagem).toMatch(/OPENAI_API_KEY/);
  });

  it("com OPENAI_API_KEY definida, pula sem lançar erro e sem citar 'ainda não existe'", () => {
    const decisao = decidirSugerir({ OPENAI_API_KEY: "chave-fake" } as NodeJS.ProcessEnv);

    expect(decisao.pular).toBe(true);
    expect(decisao.mensagem).not.toMatch(/ainda não existe/i);
  });
});

/**
 * TP-0083 — CLI `sugerir` e sua chamada dentro de `preparar` (passo 4).
 *
 * `executarSugerir` é testada diretamente (em vez de só através de
 * `executarPreparar`) nos casos de fixture controlada, porque montar um
 * pagamento "sem identificação" através do pipeline completo dependeria da
 * base real e do conteúdo exato gerado por `gerar.ts` para aquela semente —
 * incerto e desnecessário para provar o comportamento desta tarefa. O
 * provedor de IA real NUNCA é chamado nestes testes — sempre
 * `criarProvedorFalso` (TP-0081), injetado via `opcoes.provedor`.
 */
describe("executarSugerir (TP-0083)", () => {
  it("sem OPENAI_API_KEY: não lança, imprime a mensagem esperada e não abre nenhuma conexão de escrita", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Caminho de banco deliberadamente inválido (diretório inexistente): se
    // `executarSugerir` chamasse `criarRepositorio` neste ramo, o teste
    // lançaria — como não lança, confirma que a abertura nunca ocorre.
    const caminhoInvalido = path.join(
      os.tmpdir(),
      "poc-lab-sugerir-caminho-inexistente",
      "sub",
      "poc_lab.sqlite",
    );

    const resultado = await executarSugerir(caminhoInvalido, {
      ambiente: {} as NodeJS.ProcessEnv,
    });

    expect(resultado).toEqual([]);
    expect(logSpy).toHaveBeenCalledWith("sem chave, nenhuma sugestão gerada");

    logSpy.mockRestore();
  });

  it("com OPENAI_API_KEY e provedor falso injetado: grava cache_ia quando há pagamento sem identificação", async () => {
    const dirBanco = criarDiretorioTemporario("poc-lab-sugerir-banco-");
    const caminhoBanco = path.join(dirBanco, "poc_lab.sqlite");

    // Fixture mínima: um pedido não quitado, elegível (RN-09/L-03), e um
    // pagamento sem identificação compatível com ele.
    const repositorioFixture = criarRepositorio(caminhoBanco);
    repositorioFixture.inserirPedido("PED-083");
    repositorioFixture.inserirEvento({
      fonte: "vendas",
      codigoEvento: "VENDA-PED-083",
      idPedido: "PED-083",
      tipo: "venda",
      momentoFato: "2026-01-01T00:00:00.000Z",
      ordemChegada: 1,
      versaoSchema: 1,
      dados: JSON.stringify({
        valor_devido: 100,
        data_limite: "2026-01-01T00:00:00.000Z",
        transportadora: "Transportadora X",
      }),
    });
    repositorioFixture.inserirEvento({
      fonte: "pagamentos",
      codigoEvento: "TRANS-083",
      idPedido: null,
      tipo: "pagamento",
      momentoFato: "2026-03-01T00:00:00.000Z",
      ordemChegada: null,
      versaoSchema: 1,
      dados: JSON.stringify({ valor: 100, referencia_original: "REF-083" }),
    });
    repositorioFixture.inserirAchadoQualidade({
      tipo: "sem_identificacao",
      fonte: "pagamentos",
      referencia: "TRANS-083",
      regra: "RN-09: referência de pagamento sem casamento único com pedido conhecido",
      detalhe: 'referência "REF-083" não casou com exatamente 1 código de pedido conhecido',
    });

    const provedorFalso = criarProvedorFalso({ "REF-083": "PED-083" });

    const resultado = await executarSugerir(caminhoBanco, {
      ambiente: { OPENAI_API_KEY: "chave-fake" } as NodeJS.ProcessEnv,
      provedor: provedorFalso,
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      pagamento: "TRANS-083",
      pedidoSugerido: "PED-083",
    });
    expect(provedorFalso.chamadas).toBe(1);

    const linhaCache = repositorioFixture.db
      .prepare(`SELECT COUNT(*) AS total FROM cache_ia`)
      .get() as { total: number };
    expect(linhaCache.total).toBe(1);

    // Fecha a conexão da fixture (a de `executarSugerir` já se fecha
    // sozinha) — sem isso, o `rmSync` do `afterEach` falha com EPERM no
    // Windows por handle aberto no arquivo do banco.
    repositorioFixture.db.close();
  });
});

describe("executarPreparar + passo 4 (TP-0083, pipeline completo, base real)", () => {
  it.skipIf(!baseDisponivel)(
    "com OPENAI_API_KEY e provedor falso: roda o passo de sugestão entre importar e publicar-dados sem lançar",
    async () => {
      const { opcoes } = montarOpcoesIsoladas();

      const resumo = await executarPreparar({
        ...opcoes,
        ambiente: { OPENAI_API_KEY: "chave-fake" } as NodeJS.ProcessEnv,
        provedorSugestao: criarProvedorFalso({}),
      });

      expect(resumo.sugestao.pular).toBe(false);
      expect(resumo.sugestao.mensagem).toMatch(/concluída/i);
    },
    // Pipeline completo contra a base real (download/import): bem acima do
    // timeout padrão de 5s do vitest, mesma necessidade dos 2 testes
    // "pipeline completo, base real" de TP-0045 acima.
    300_000,
  );

  it.skipIf(!baseDisponivel)(
    "ordem dos passos: importar -> sugerir -> publicar-dados (RTP-0027)",
    async () => {
      const { opcoes } = montarOpcoesIsoladas();
      const eventos: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
        const texto = String(args[0]);
        if (texto.startsWith("[3/5]")) eventos.push("importar");
        else if (texto.startsWith("[4/5]")) eventos.push("sugerir");
        else if (texto.startsWith("[5/5]")) eventos.push("log-publicar");
      });
      const executarWranglerSpy = vi.fn(() => {
        eventos.push("publicar-dados");
        return { codigo: 0, stdout: "ok", stderr: "" };
      });

      try {
        await executarPreparar({
          ...opcoes,
          dependenciasPublicar: { executarWrangler: executarWranglerSpy },
        });
      } finally {
        logSpy.mockRestore();
      }

      expect(executarWranglerSpy).toHaveBeenCalled();
      expect(eventos.indexOf("importar")).toBeGreaterThanOrEqual(0);
      expect(eventos.indexOf("importar")).toBeLessThan(eventos.indexOf("sugerir"));
      expect(eventos.indexOf("sugerir")).toBeLessThan(eventos.indexOf("publicar-dados"));
      expect(eventos.indexOf("publicar-dados")).toBeLessThan(eventos.indexOf("log-publicar"));
    },
    300_000,
  );

  it.skipIf(!baseDisponivel)(
    "sem OPENAI_API_KEY: nenhuma linha é gravada em cache_ia pelo pipeline completo",
    async () => {
      const { opcoes } = montarOpcoesIsoladas();

      await executarPreparar(opcoes);

      const repositorioVerificacao = criarRepositorio(opcoes.caminhoBanco);
      const linhaCache = repositorioVerificacao.db
        .prepare(`SELECT COUNT(*) AS total FROM cache_ia`)
        .get() as { total: number };
      expect(linhaCache.total).toBe(0);

      repositorioVerificacao.db.close();
    },
    300_000,
  );
});
