/**
 * TP-0044 — Testes de `montarSqlPublicacao` (`publicacao/publicar.ts`) e de
 * `publicarDados`/`executarWrangler` (`cli/publicar-dados.ts`).
 *
 * Fixture montada diretamente via as funções de inserção do repositório
 * (mesma técnica de `test/publicacao/pedidos.test.ts`), num event store
 * `:memory:`. O `wrangler` real NUNCA é rodado aqui — só a lógica de
 * propagação de erro é testada, com `executarWrangler` substituído por uma
 * função fake injetada.
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import { criarRepositorio, type Repositorio } from "../../src/armazenamento/repositorio.ts";
import { montarSqlPublicacao } from "../../src/publicacao/publicar.ts";
import {
  executarWrangler,
  publicarDados,
  type ResultadoExecucaoWrangler,
} from "../../src/cli/publicar-dados.ts";
import { obrigatorio } from "../apoio/obrigatorio.js";

function eventoVenda(
  repositorio: Repositorio,
  opcoes: { codigoEvento: string; idPedido: string; valorDevido: number; dataLimite: string },
) {
  repositorio.inserirEvento({
    fonte: "vendas",
    codigoEvento: opcoes.codigoEvento,
    idPedido: opcoes.idPedido,
    tipo: "venda",
    momentoFato: "2026-01-01T10:00:00Z",
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      valor_devido: opcoes.valorDevido,
      data_limite: opcoes.dataLimite,
      transportadora: "Transportadora 1",
    }),
  });
}

function eventoPagamento(
  repositorio: Repositorio,
  opcoes: { codigoEvento: string; idPedido: string; valor: number; referenciaOriginal: string },
) {
  repositorio.inserirEvento({
    fonte: "pagamentos",
    codigoEvento: opcoes.codigoEvento,
    idPedido: opcoes.idPedido,
    tipo: "pagamento",
    momentoFato: "2026-01-02T10:00:00Z",
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      valor: opcoes.valor,
      referencia_original: opcoes.referenciaOriginal,
    }),
  });
}

function montarRepositorioComFixture(): Repositorio {
  const repositorio = criarRepositorio(":memory:");
  repositorio.inserirPedido("PED-000001");
  repositorio.inserirVinculoFonte("vendas", "PED-000001", "PED-000001");
  eventoVenda(repositorio, {
    codigoEvento: "PED-000001",
    idPedido: "PED-000001",
    valorDevido: 100,
    dataLimite: "2026-01-10",
  });
  repositorio.inserirVinculoFonte("pagamentos", "PAG-001", "PED-000001");
  eventoPagamento(repositorio, {
    codigoEvento: "PAG-001",
    idPedido: "PED-000001",
    valor: 40,
    referenciaOriginal: "PED-000001",
  });
  return repositorio;
}

describe("montarSqlPublicacao", () => {
  it("monta uma string SQL não vazia, com o DDL e ao menos um INSERT INTO pedido_resumo", () => {
    const repositorio = montarRepositorioComFixture();

    const sql = montarSqlPublicacao(repositorio, { semente: 20261007 });

    expect(sql.length).toBeGreaterThan(0);
    expect(sql).toContain("CREATE TABLE");
    expect(sql).toContain("INSERT INTO pedido_resumo");
    expect(sql).toContain("'PED-000001'");
  });

  it("é determinístico: a mesma entrada produz sempre a mesma string", () => {
    const repositorioA = montarRepositorioComFixture();
    const repositorioB = montarRepositorioComFixture();

    const sqlA = montarSqlPublicacao(repositorioA, { semente: 20261007 });
    const sqlB = montarSqlPublicacao(repositorioB, { semente: 20261007 });

    expect(sqlA).toBe(sqlB);
  });

  /**
   * TP-0070 — Fim a fim: o documento `indicadores` publicado no SQL final
   * contém os 2 blocos Must (TP-0033) + os 2 blocos novos do Lote 15
   * (TP-0068, TP-0069), na ordem fixa esperada. Extrai o JSON da tupla
   * `('indicadores', '<conteudo>')` dentro do `INSERT INTO documento` (via
   * regex sobre a string SQL — `escritor-sql.ts` gera um único `INSERT` com
   * várias tuplas separadas por vírgula/quebra de linha, não um `INSERT` por
   * linha; não há parser de SQL disponível aqui). A classe `(?:[^']|'')*`
   * cobre eventuais aspas simples escapadas (dobradas) dentro do conteúdo,
   * mesma convenção de `escaparValor`.
   */
  it("o documento 'resumo' publicado tem dataCorte igual ao maior momento_fato da fixture (RN-14)", () => {
    const repositorio = montarRepositorioComFixture();

    const sql = montarSqlPublicacao(repositorio, { semente: 20261007 });

    const correspondencia = sql.match(/\('resumo', '((?:[^']|'')*)'\)/);
    expect(correspondencia).not.toBeNull();
    const resumo = JSON.parse(obrigatorio(obrigatorio(correspondencia)[1]).replace(/''/g, "'")) as { dataCorte: string };

    // Na fixture, o maior momento_fato é o do pagamento (2026-01-02), posterior ao da venda.
    expect(resumo.dataCorte).toBe("2026-01-02T10:00:00Z");
    expect(resumo.dataCorte).toBe(repositorio.obterMaiorMomentoFato());
  });

  it("o documento 'indicadores' no SQL final contém as 4 chaves de bloco, na ordem fixa", () => {
    const repositorio = montarRepositorioComFixture();

    const sql = montarSqlPublicacao(repositorio, { semente: 20261007 });

    const correspondencia = sql.match(/\('indicadores', '((?:[^']|'')*)'\)/);
    expect(correspondencia).not.toBeNull();

    const conteudoEscapado = obrigatorio(obrigatorio(correspondencia)[1]);
    // `escritor-sql.ts` escapa aspas simples dobrando-as (convenção SQL) —
    // desfaz antes de fazer `JSON.parse`.
    const conteudoJson = conteudoEscapado.replace(/''/g, "'");
    const indicadores = JSON.parse(conteudoJson) as Array<{ chave: string }>;

    expect(indicadores.map((bloco) => bloco.chave)).toEqual([
      "entregas_no_prazo",
      "divergencias_por_tipo",
      "tempoMedioPedidoEnvioEntrega",
      "valorPagoVsDevido",
    ]);
  });
});

describe("publicarDados / executarWrangler", () => {
  it("executarWrangler não usa shell e entrega o caminho com espaço e & intacto", () => {
    const chamadas: Array<{ comando: string; args: readonly string[]; opcoes: Record<string, unknown> }> = [];
    const executorFalso = ((comando: string, args: readonly string[], opcoes: Record<string, unknown>) => {
      chamadas.push({ comando, args, opcoes });
      return "ok";
    }) as unknown as Parameters<typeof executarWrangler>[2];

    const caminho = "pasta com espaco & outra/leitura.sql";
    const resultado = executarWrangler(caminho, "web", executorFalso);

    expect(resultado.codigo).toBe(0);
    expect(chamadas).toHaveLength(1);
    const chamada = obrigatorio(chamadas[0]);
    expect(chamada.opcoes.shell).toBeUndefined();
    expect(chamada.comando).toBe(process.execPath);
    expect(chamada.args[chamada.args.length - 1]).toBe(path.resolve(caminho));
    expect(chamada.args).toContain("--local");
    expect(chamada.args).not.toContain("--remote");
  });

  it("propaga uma mensagem de erro clara (com stdout/stderr) quando o wrangler sai com código != 0", () => {
    const resultadoFalho: ResultadoExecucaoWrangler = {
      codigo: 1,
      stdout: "saida padrao do wrangler",
      stderr: "mensagem de erro do wrangler",
    };

    const arquivosEscritos: Array<{ caminho: string; conteudo: string }> = [];
    const diretoriosCriados: string[] = [];

    expect(() => { publicarDados(
        {
          semente: 20261007,
          caminhoBanco: ":memory:",
          diretorioPublicacao: "dados/publicacao-teste",
          caminhoWeb: "web",
        },
        {
          criarRepositorio: (caminho: string) => {
            expect(caminho).toBe(":memory:");
            return montarRepositorioComFixture();
          },
          criarDiretorio: (caminho: string) => {
            diretoriosCriados.push(caminho);
          },
          escreverArquivo: (caminho: string, conteudo: string) => {
            arquivosEscritos.push({ caminho, conteudo });
          },
          executarWrangler: () => resultadoFalho,
        },
      ); },
    ).toThrowError(/mensagem de erro do wrangler/);

    // Confirma que o arquivo foi escrito e o diretório criado ANTES da
    // tentativa de carga — a falha é só na etapa de execução do wrangler.
    expect(diretoriosCriados).toEqual(["dados/publicacao-teste"]);
    expect(arquivosEscritos).toHaveLength(1);
    expect(obrigatorio(arquivosEscritos[0]).conteudo).toContain("CREATE TABLE");
  });

  it("não lança quando o wrangler sai com código 0", () => {
    const resultadoOk: ResultadoExecucaoWrangler = { codigo: 0, stdout: "ok", stderr: "" };

    expect(() => { publicarDados(
        {
          semente: 20261007,
          caminhoBanco: ":memory:",
          diretorioPublicacao: "dados/publicacao-teste",
          caminhoWeb: "web",
        },
        {
          criarRepositorio: () => montarRepositorioComFixture(),
          criarDiretorio: () => {},
          escreverArquivo: () => {},
          executarWrangler: () => resultadoOk,
        },
      ); },
    ).not.toThrow();
  });
});
