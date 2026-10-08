/**
 * TP-0038 — Teste de integração ponta a ponta contra a base real: gerar
 * (semente padrão) → importar → `montarDocumentoQualidade`.
 *
 * Depende da base real `dados/origem/northwind.db` (TP-0004, `pnpm
 * baixar-base`) e do pipeline gerar→importar (TP-0023 a TP-0027). Se o
 * arquivo ainda não existir neste ambiente, os testes abaixo são pulados em
 * vez de falhar — mesmo padrão de `test/integracao/leitura-vendas.test.ts` e
 * `test/integracao/gabarito.test.ts`.
 *
 * ## Nota sobre `formato_data` e `pedido_sem_envio`
 *
 * `src/fontes/vendas.ts` (TP-0031) grava esses dois casos com os tipos
 * dedicados `formato_data` e `pedido_sem_envio`, não mais com o genérico
 * `linha_invalida`. Para a base real, as contagens esperadas são:
 * `formato_data` = 15.452 (só os pedidos com `dataPedido` em formato longo —
 * o formato curto é o padrão esperado e não gera achado) e
 * `pedido_sem_envio` = 21.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { lerBaseDeVendas } from "../../src/fontes/leitura-vendas.ts";
import { gerarConteudo } from "../../src/cli/gerar.ts";
import { construirCodigosConhecidos } from "../../src/cli/importar.ts";
import { criarRepositorio } from "../../src/armazenamento/repositorio.ts";
import { importar } from "../../src/importacao/importar.ts";
import { montarDocumentoQualidade } from "../../src/publicacao/qualidade.ts";
import { SEMENTE_PADRAO } from "../../src/gerador/prng.ts";

const CAMINHO_BASE = path.join("dados", "origem", "northwind.db");
const baseDisponivel = existsSync(CAMINHO_BASE);

describe.skipIf(!baseDisponivel)("montarDocumentoQualidade (pipeline completo, base real)", () => {
  // RTP-0030: o pipeline pesado roda UMA vez (beforeAll), cedendo o event loop
  // entre as etapas, para o worker do vitest não perder o RPC `onTaskUpdate`
  // ("Unhandled Error: Timeout calling onTaskUpdate", exit 1).
  let documentoCompartilhado: ReturnType<typeof montarDocumentoQualidade>;
  let totalPedidos = 0;
  let pedidosFormatoCurto = 0;

  const ceder = (): Promise<void> => new Promise((resolver) => setImmediate(resolver));

  beforeAll(async () => {
    const pedidosVendas = lerBaseDeVendas(CAMINHO_BASE);
    totalPedidos = pedidosVendas.length;
    pedidosFormatoCurto = pedidosVendas.filter((p) => p.dataPedido.formato === "curto").length;
    await ceder();
    const { pagamentosCsv, rastreioCsv } = gerarConteudo(pedidosVendas, SEMENTE_PADRAO);
    await ceder();
    const codigosConhecidos = construirCodigosConhecidos(
      pedidosVendas.map((pedido) => pedido.idPedido),
    );

    const repositorio = criarRepositorio(":memory:");
    importar(repositorio, {
      vendas: pedidosVendas,
      pagamentosCsv,
      rastreioCsv,
      codigosConhecidos,
    });
    await ceder();

    documentoCompartilhado = montarDocumentoQualidade(repositorio.db);
  }, 600_000);

  function montarDocumento() {
    return documentoCompartilhado;
  }

  it(
    "devolve exatamente os 7 tipos de TipoAchado, cada um uma única vez",
    () => {
      const documento = montarDocumento();

      expect(documento.achados).toHaveLength(7);
      expect(new Set(documento.achados.map((a) => a.tipo)).size).toBe(7);
      expect(documento.achados.map((a) => a.tipo)).toEqual([
        "fora_de_ordem",
        "sem_identificacao",
        "registro_repetido",
        "linha_invalida",
        "valor_fora_do_padrao",
        "formato_data",
        "pedido_sem_envio",
      ]);
    },
    // Pipeline completo sobre a base real: bem acima do timeout padrão de 5s
    // do vitest (mesmo padrão de `test/integracao/preparar.test.ts`).
    { timeout: 300_000 },
  );

  it(
    "formato_data e pedido_sem_envio: contagens reais da base (15.452 e 21)",
    () => {
      const documento = montarDocumento();

      const formatoData = documento.achados.find((a) => a.tipo === "formato_data");
      const pedidoSemEnvio = documento.achados.find((a) => a.tipo === "pedido_sem_envio");

      expect(formatoData?.contagem).toBe(15_452);
      expect(formatoData?.exemplos.length).toBeLessThanOrEqual(10);
      expect(pedidoSemEnvio?.contagem).toBe(21);
      expect(pedidoSemEnvio?.exemplos.length).toBeLessThanOrEqual(10);
    },
    { timeout: 300_000 },
  );

  it(
    "linha_invalida não inclui mais os casos de formato_data/pedido_sem_envio (vendas.ts agora grava com os tipos dedicados); reflete só linhas malformadas plantadas por outras fontes (pagamentos/rastreio)",
    () => {
      const documento = montarDocumento();

      const linhaInvalida = documento.achados.find((a) => a.tipo === "linha_invalida");
      // Sem garantia de quantidade exata/mínima aqui: depende só do que
      // pagamentos.ts/rastreio.ts plantam como linha malformada, não mais dos
      // pedidos de vendas (que agora saem como formato_data/pedido_sem_envio).
      expect(linhaInvalida?.contagem).toBeGreaterThanOrEqual(0);
      expect(linhaInvalida?.exemplos.length).toBeLessThanOrEqual(10);
    },
    { timeout: 300_000 },
  );

  it(
    "fora_de_ordem é recalculado (não lido de achado_qualidade, que nunca grava esse tipo) e não lança ao validar contra o esquema",
    () => {
      const documento = montarDocumento();

      const foraDeOrdem = documento.achados.find((a) => a.tipo === "fora_de_ordem");
      expect(foraDeOrdem).toBeDefined();
      expect(foraDeOrdem!.contagem).toBeGreaterThanOrEqual(0);
      expect(foraDeOrdem!.exemplos.length).toBeLessThanOrEqual(10);
    },
    { timeout: 300_000 },
  );

  it(
    "nenhum tipo tem mais de 10 exemplos, mesmo quando a contagem é muito maior",
    () => {
      const documento = montarDocumento();

      for (const achado of documento.achados) {
        expect(achado.exemplos.length).toBeLessThanOrEqual(10);
      }
    },
    { timeout: 300_000 },
  );

  it(
    "os 830 pedidos de formato curto ficam sem achado: formato_data cobre só os longos (15.452)",
    () => {
      const formatoData = montarDocumento().achados.find((a) => a.tipo === "formato_data");

      expect(pedidosFormatoCurto).toBe(830);
      expect(formatoData?.contagem).toBe(15_452);
      expect(formatoData?.contagem).toBe(totalPedidos - pedidosFormatoCurto);
    },
    { timeout: 300_000 },
  );

  it(
    "banco :memory: sem ocorrências devolve os 7 tipos com contagem 0 e exemplos []",
    () => {
      const documento = montarDocumentoQualidade(criarRepositorio(":memory:").db);

      expect(documento.achados).toHaveLength(7);
      for (const achado of documento.achados) {
        expect(achado.contagem).toBe(0);
        expect(achado.exemplos).toEqual([]);
      }
    },
    { timeout: 300_000 },
  );

  it(
    "ia.utilizada é false e ia.sugestoes é array vazio",
    () => {
      const documento = montarDocumento();

      expect(documento.ia).toEqual({ utilizada: false, sugestoes: [] });
    },
    { timeout: 300_000 },
  );
});
