/**
 * Teste de integração ponta a ponta: gerar (semente padrão) →
 * importar → `calcularDivergencias` por pedido → comparar com o gabarito.
 *
 * ÚNICO arquivo do projeto autorizado a ler/usar o `problemas-plantados.json` (aqui, o
 * `gabarito` devolvido em memória por `gerarConteudo`, sem nenhuma leitura de
 * disco) fora de teste.
 *
 * Depende da base real `dados/origem/northwind.db` (`pnpm
 * baixar-base`). Se o arquivo ainda não existir neste ambiente, os testes
 * abaixo são pulados em vez de falhar — mesmo padrão de
 * `test/integracao/leitura-vendas.test.ts`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { lerBaseDeVendas } from "../../src/fontes/leitura-vendas.ts";
import { gerarConteudo } from "../../src/aplicacao/gerar.ts";
import { construirCodigosConhecidos } from "../../src/aplicacao/importar.ts";
import type { Repositorio } from "../../src/armazenamento/repositorio.ts";
import { abrirRepositorioParaTeste } from "../../src/armazenamento/repositorio-teste.ts";
import type { Evento } from "../../src/dominio/evento.ts";
import { importar } from "../../src/importacao/importar.ts";
import { calcularDivergencias } from "../../src/dominio/divergencias/index.ts";
import { agruparEventosPorPedido } from "../../src/publicacao/eventos-por-pedido.ts";
import { SEMENTE_PADRAO } from "../../src/gerador/prng.ts";

const CAMINHO_BASE = path.join("dados", "origem", "northwind.db");
const baseDisponivel = existsSync(CAMINHO_BASE);

/** Cede o event loop para o worker do vitest responder ao RPC do runner. */
function ceder(): Promise<void> {
  return new Promise((resolver) => setImmediate(resolver));
}

/** Os 5 tipos de `TipoDivergencia` do domínio — o gabarito também contém
 * tipos de achado de qualidade (ex. `sem_identificacao`, `linha_invalida`,
 * `registro_repetido`, `fora_de_ordem`), que não são divergências e
 * são filtrados fora. */
const TIPOS_DIVERGENCIA = new Set([
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
]);

describe.skipIf(!baseDisponivel)("pipeline completo (gerar → importar → divergências) contra o gabarito", () => {
  // Timeout maior que o padrão (5s): pipeline completo (gerar → importar →
  // divergências) sobre a base real inteira (~16 mil pedidos) é pesado —
  // mesmo padrão já usado em `test/integracao/qualidade.test.ts`
  // (verificação de 2026-10-08).
  // O pipeline pesado (gerar → importar → divergências) roda UMA
  // vez, aqui, cedendo o event loop entre as etapas e a cada lote de pedidos.
  // Sem isso, o trabalho síncrono longo bloqueava o worker do vitest, que
  // perdia o RPC `onTaskUpdate` ("Unhandled Error: Timeout calling
  // onTaskUpdate") e saía com código 1 mesmo com os testes passando.
  let pedidosVendas: ReturnType<typeof lerBaseDeVendas>;
  let gabaritoCompleto: Array<{ pedido_venda: string; tipo: string }>;
  let repositorio: Repositorio;
  let eventosPorPedido: Map<string, Evento[]>;
  let dataCorte: string | null;
  let calculadoPorPedido: Map<string, Set<string>>;

  beforeAll(async () => {
    pedidosVendas = lerBaseDeVendas(CAMINHO_BASE);
    await ceder();
    const { pagamentosCsv, rastreioCsv, gabaritoJson } = gerarConteudo(
      pedidosVendas,
      SEMENTE_PADRAO,
    );
    gabaritoCompleto = JSON.parse(gabaritoJson) as Array<{
      pedido_venda: string;
      tipo: string;
    }>;
    await ceder();

    const codigosConhecidos = construirCodigosConhecidos(
      pedidosVendas.map((pedido) => pedido.idPedido),
    );

    ({ repositorio } = abrirRepositorioParaTeste(":memory:"));
    importar(repositorio, {
      vendas: pedidosVendas,
      pagamentosCsv,
      rastreioCsv,
      codigosConhecidos,
    });
    await ceder();


    // RN-14: dataCorte = maior momento_fato de TODOS os eventos de TODOS os
    // pedidos importados nesta chamada.
    dataCorte = repositorio.obterMaiorMomentoFato() ?? null;
    if (dataCorte === null) {
      return;
    }

    eventosPorPedido = new Map(
      [...agruparEventosPorPedido(repositorio.listarEventos())].map(([idPedido, armazenados]) => [
        idPedido,
        armazenados.map((armazenado) => armazenado.evento),
      ]),
    );

    // (idPedido interno, tipo) calculado, para todos os pedidos importados.
    calculadoPorPedido = new Map<string, Set<string>>();
    let contador = 0;
    for (const [idPedido, eventos] of eventosPorPedido) {
      const divergencias = calcularDivergencias(eventos, dataCorte);
      calculadoPorPedido.set(idPedido, new Set<string>(divergencias.map((d) => d.tipo)));
      contador += 1;
      if (contador % 500 === 0) {
        await ceder();
      }
    }
  }, 600_000);

  it("o pipeline compartilhado importou eventos e calculou divergências por pedido", () => {
    expect(dataCorte).not.toBeNull();
    expect(calculadoPorPedido.size).toBeGreaterThan(0);
  });

  it("acha 100% dos casos plantados de RN-03 a RN-06 e nenhum falso positivo", { timeout: 300_000 }, () => {

    // Gabarito filtrado aos 5 tipos de divergência (RN-03 a RN-06), com o
    // `pedido_venda` (código bruto) resolvido para o `id_pedido` interno.
    const esperadoPorPedido = new Map<string, Set<string>>();
    const entradasNaoResolviveis: Array<{ pedido_venda: string; tipo: string }> = [];
    for (const entrada of gabaritoCompleto) {
      if (!TIPOS_DIVERGENCIA.has(entrada.tipo)) {
        continue;
      }
      const idPedido = repositorio.obterIdPedidoPorVinculo("vendas", entrada.pedido_venda);
      if (idPedido === undefined) {
        entradasNaoResolviveis.push(entrada);
        continue;
      }
      const conjunto = esperadoPorPedido.get(idPedido) ?? new Set<string>();
      conjunto.add(entrada.tipo);
      esperadoPorPedido.set(idPedido, conjunto);
    }

    // Todo item do gabarito (dos 5 tipos) deve ter resolvido para um
    // id_pedido existente no event store.
    expect(entradasNaoResolviveis).toEqual([]);

    // Cobertura: todo (pedido, tipo) esperado está no calculado.
    const faltantes: Array<{ idPedido: string; tipo: string }> = [];
    for (const [idPedido, tipos] of esperadoPorPedido) {
      const calculado = calculadoPorPedido.get(idPedido) ?? new Set<string>();
      for (const tipo of tipos) {
        if (!calculado.has(tipo)) {
          faltantes.push({ idPedido, tipo });
        }
      }
    }

    // Precisão: nenhum (pedido, tipo) calculado fora do gabarito.
    const falsosPositivos: Array<{ idPedido: string; tipo: string }> = [];
    for (const [idPedido, tipos] of calculadoPorPedido) {
      const esperado = esperadoPorPedido.get(idPedido) ?? new Set<string>();
      for (const tipo of tipos) {
        if (!esperado.has(tipo)) {
          falsosPositivos.push({ idPedido, tipo });
        }
      }
    }

    if (faltantes.length > 0) {
      console.warn("Divergências do gabarito NÃO encontradas (falso negativo):", faltantes);
    }
    if (falsosPositivos.length > 0) {
      console.warn("Divergências calculadas fora do gabarito (falso positivo):", falsosPositivos);
    }

    expect(faltantes).toEqual([]);
    expect(falsosPositivos).toEqual([]);
  });

  // Timeout maior que o padrão (5s), mesma razão do teste anterior.
  it(
    "pedido com caso plantado de pagamento E de rastreio simultaneamente tem ambos os tipos na lista calculada",
    { timeout: 300_000 },
    () => {
      const porPedidoVenda = new Map<string, Set<string>>();
      for (const entrada of gabaritoCompleto) {
        if (!TIPOS_DIVERGENCIA.has(entrada.tipo)) {
          continue;
        }
        const conjunto = porPedidoVenda.get(entrada.pedido_venda) ?? new Set<string>();
        conjunto.add(entrada.tipo);
        porPedidoVenda.set(entrada.pedido_venda, conjunto);
      }

      const comDoisTipos = [...porPedidoVenda.entries()].filter(([, tipos]) => tipos.size >= 2);

      if (comDoisTipos.length === 0) {
        // Pools de pagamento e rastreio são sorteados de forma independente
        // (ver `plantar-rastreio.ts`): nesta semente pode não haver colisão.
        // Sem caso de borda para exercitar, o teste não falha — apenas não
        // cobre esta combinação específica nesta rodada.
        return;
      }


      for (const [codigoVenda, tiposEsperados] of comDoisTipos) {
        const idPedido = repositorio.obterIdPedidoPorVinculo("vendas", codigoVenda);
        expect(idPedido).toBeDefined();
        const eventos = eventosPorPedido.get(idPedido as string) ?? [];
        const divergencias = calcularDivergencias(eventos, dataCorte as string);
        const tiposCalculados = new Set<string>(divergencias.map((d) => d.tipo));

        for (const tipo of tiposEsperados) {
          expect(tiposCalculados.has(tipo)).toBe(true);
        }
      }
    },
  );
});
