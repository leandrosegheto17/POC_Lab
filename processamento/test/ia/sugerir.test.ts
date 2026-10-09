import { describe, expect, it } from "vitest";

import { criarRepositorio } from "../../src/armazenamento/repositorio.js";
import { criarProvedorFalso } from "../../src/ia/provedor-falso.js";
import { conferirSugestao } from "nucleo/dominio/conferencia-sugestao.js";
import type { ProvedorSugestao } from "../../src/ia/porta.js";
import { obrigatorio } from "apoio-teste/obrigatorio.js";
import { inserirPagamentoSemIdentificacao, inserirPedidoComVenda, sugerir } from "../apoio/ia.js";

/** Provedor espião: nunca decide nada por conta própria, só registra as chamadas recebidas. */
function criarProvedorEspiao(resposta: string | null): ProvedorSugestao & {
  chamadas: number;
  argumentos: Array<{ texto: string; candidatos: string[]; modelo: string }>;
} {
  const provedor = {
    chamadas: 0,
    argumentos: [] as Array<{ texto: string; candidatos: string[]; modelo: string }>,
    sugerir(texto: string, candidatos: string[], modelo: string): Promise<string | null> {
      provedor.chamadas += 1;
      provedor.argumentos.push({ texto, candidatos, modelo });
      return Promise.resolve(resposta);
    },
  };
  return provedor;
}

const DATA_PAGAMENTO = "2026-03-01T00:00:00.000Z";

describe("sugerir — montagem de candidatos", () => {
  it("aplica os 3 filtros de L-03 e ordena pela menor diferença de saldo primeiro", async () => {
    const repositorio = criarRepositorio(":memory:");

    // PED-QUITADO: excluído por já estar quitado, mesmo com saldo "perfeito".
    inserirPedidoComVenda(repositorio, "PED-QUITADO", 100, "2026-01-01T00:00:00.000Z", [100]);
    // PED-DATA-FUTURA: excluído porque data_limite é posterior à data do pagamento.
    inserirPedidoComVenda(repositorio, "PED-DATA-FUTURA", 100, "2026-04-01T00:00:00.000Z");
    // PED-SALDO-BAIXO: excluído porque o saldo em aberto (50) é menor que o valor pago (100).
    inserirPedidoComVenda(repositorio, "PED-SALDO-BAIXO", 50, "2026-01-01T00:00:00.000Z");
    // PED-EXATO: elegível, diferença de saldo = 0 (melhor candidato).
    inserirPedidoComVenda(repositorio, "PED-EXATO", 100, "2026-01-01T00:00:00.000Z");
    // PED-PROXIMO: elegível, diferença de saldo = 30 (segundo colocado).
    inserirPedidoComVenda(repositorio, "PED-PROXIMO", 150, "2026-01-01T00:00:00.000Z", [20]);

    inserirPagamentoSemIdentificacao(repositorio, "TRANS-001", 100, DATA_PAGAMENTO, "REF-AMBIGUA");

    const espiao = criarProvedorEspiao(null);
    await sugerir(repositorio, espiao, { modelo: "falso" });

    expect(espiao.chamadas).toBe(1);
    expect(obrigatorio(espiao.argumentos[0]).candidatos).toEqual(["PED-EXATO", "PED-PROXIMO"]);
  });

  it("limita a 20 candidatos mesmo havendo mais pedidos elegíveis", async () => {
    const repositorio = criarRepositorio(":memory:");

    for (let indice = 0; indice < 25; indice += 1) {
      // Saldo cresce com o índice, então a diferença também cresce — os 20
      // primeiros índices (menor diferença) devem ser os escolhidos.
      inserirPedidoComVenda(
        repositorio,
        `PED-${String(indice).padStart(2, "0")}`,
        100 + indice,
        "2026-01-01T00:00:00.000Z",
      );
    }

    inserirPagamentoSemIdentificacao(repositorio, "TRANS-002", 100, DATA_PAGAMENTO, "REF-MUITOS");

    const espiao = criarProvedorEspiao(null);
    await sugerir(repositorio, espiao, { modelo: "falso" });

    expect(obrigatorio(espiao.argumentos[0]).candidatos).toHaveLength(20);
    expect(obrigatorio(espiao.argumentos[0]).candidatos[0]).toBe("PED-00");
    expect(obrigatorio(espiao.argumentos[0]).candidatos[19]).toBe("PED-19");
  });
});

describe("sugerir — cache", () => {
  it("a 2ª chamada com o mesmo texto/candidatos/modelo não invoca o provedor de novo", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-003", 100, DATA_PAGAMENTO, "REF-CACHE");

    const provedorFalso = criarProvedorFalso({ "REF-CACHE": "PED-A" });

    const primeiraExecucao = await sugerir(repositorio, provedorFalso, { modelo: "falso" });
    expect(provedorFalso.chamadas).toBe(1);

    const segundaExecucao = await sugerir(repositorio, provedorFalso, { modelo: "falso" });
    expect(provedorFalso.chamadas).toBe(1);

    expect(segundaExecucao).toEqual(primeiraExecucao);
    expect(obrigatorio(primeiraExecucao[0]).pedidoSugerido).toBe("PED-A");
  });
});

describe("sugerir — teto de chamadas", () => {
  it("ao atingir o teto, os pagamentos restantes viram sem sugestão sem chamar o provedor", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");

    inserirPagamentoSemIdentificacao(repositorio, "TRANS-010", 100, DATA_PAGAMENTO, "REF-1");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-011", 100, DATA_PAGAMENTO, "REF-2");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-012", 100, DATA_PAGAMENTO, "REF-3");

    const provedorFalso = criarProvedorFalso({ "REF-1": "PED-A", "REF-2": "PED-A", "REF-3": "PED-A" });

    const resultados = await sugerir(repositorio, provedorFalso, { tetoChamadas: 2, modelo: "falso" });

    expect(provedorFalso.chamadas).toBe(2);
    expect(resultados).toHaveLength(3);

    const terceiro = obrigatorio(resultados.find((resultado) => resultado.pagamento === "TRANS-012"));
    expect(terceiro.pedidoSugerido).toBeNull();
    expect(terceiro.motivo).toContain("teto de chamadas");
  });

  it("respeita IA_TETO_CHAMADAS do ambiente quando definido", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-020", 100, DATA_PAGAMENTO, "REF-ENV-1");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-021", 100, DATA_PAGAMENTO, "REF-ENV-2");

    const anterior = process.env.IA_TETO_CHAMADAS;
    process.env.IA_TETO_CHAMADAS = "1";
    try {
      const provedorFalso = criarProvedorFalso({ "REF-ENV-1": "PED-A", "REF-ENV-2": "PED-A" });
      const resultados = await sugerir(repositorio, provedorFalso, { modelo: "falso" });

      expect(provedorFalso.chamadas).toBe(1);
      const segundo = obrigatorio(resultados.find((resultado) => resultado.pagamento === "TRANS-021"));
      expect(segundo.pedidoSugerido).toBeNull();
      expect(segundo.motivo).toContain("teto de chamadas");
    } finally {
      if (anterior === undefined) {
        delete process.env.IA_TETO_CHAMADAS;
      } else {
        process.env.IA_TETO_CHAMADAS = anterior;
      }
    }
  });
});

describe("sugerir — sem provedor configurado", () => {
  it("todos os pagamentos viram sem sugestão, sem nenhuma chamada nem gravação de cache", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-030", 100, DATA_PAGAMENTO, "REF-SEM-CHAVE");

    const resultados = await sugerir(repositorio, undefined);

    expect(resultados).toHaveLength(1);
    expect(obrigatorio(resultados[0]).pedidoSugerido).toBeNull();
    expect(obrigatorio(resultados[0]).motivo).toContain("nenhum provedor de IA configurado");

    expect(repositorio.listarCacheIa()).toHaveLength(0);
  });
});

describe("sugerir — resposta do provedor", () => {
  it("quando o provedor sugere um candidato, aplica conferirSugestao e grava conferida/motivo", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-040", 100, DATA_PAGAMENTO, "REF-CONFERE");

    const provedorFalso = criarProvedorFalso({ "REF-CONFERE": "PED-A" });
    const resultados = await sugerir(repositorio, provedorFalso, { modelo: "falso" });

    const esperado = conferirSugestao(
      { devido: 100, pago: 0, dataPedido: "2026-01-01T00:00:00.000Z" },
      { valor: 100, dataPagamento: DATA_PAGAMENTO },
    );

    expect(obrigatorio(resultados[0]).pedidoSugerido).toBe("PED-A");
    expect(obrigatorio(resultados[0]).conferida).toBe(esperado.conferida);
    expect(obrigatorio(resultados[0]).motivo).toBe(esperado.motivo);
  });

  it("quando o provedor devolve null, o resultado é sem sugestão sem chamar conferirSugestao", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-050", 100, DATA_PAGAMENTO, "REF-NULO");

    const provedorFalso = criarProvedorFalso({ "REF-NULO": null });
    const resultados = await sugerir(repositorio, provedorFalso, { modelo: "falso" });

    expect(obrigatorio(resultados[0]).pedidoSugerido).toBeNull();
    expect(obrigatorio(resultados[0]).conferida).toBe(false);
    expect(obrigatorio(resultados[0]).motivo).toContain("não sugeriu nenhum pedido");
  });
});
