/**
 * TP-0084 — Testes da projeção de `ia.utilizada`/`ia.sugestoes` no documento
 * `qualidade` (`publicacao/qualidade.ts`), a partir de `cache_ia`.
 *
 * Fixture via event store `:memory:` (`criarRepositorio`): para os casos com
 * sugestão, roda o caso de uso real `ia/sugerir.ts` (com `criarProvedorFalso`)
 * para popular `cache_ia` com uma entrada real — garante que a chave
 * recalculada por `qualidade.ts` bate com a chave gravada por `sugerir`, sem
 * duplicar o cálculo de hash no teste. Os testes de `ia.utilizada === false`
 * (regressão TP-0038) e de forma dos 7 tipos já estão em
 * `test/publicacao/qualidade.test.ts` — este arquivo cobre só o bloco `ia`.
 */
import { describe, expect, it } from "vitest";

import { criarRepositorio, type Repositorio } from "../../src/armazenamento/repositorio.ts";
import { conferirSugestao } from "../../src/dominio/conferencia-sugestao.ts";
import { criarProvedorFalso } from "../../src/ia/provedor-falso.ts";
import { sugerir } from "../../src/ia/sugerir.ts";
import { EsquemaRespostaQualidade } from "../../src/contrato/qualidade.ts";
import { montarDocumentoQualidade } from "../../src/publicacao/qualidade.ts";

const DATA_PAGAMENTO = "2026-03-01T00:00:00.000Z";

/** Mesmo helper de `test/ia/sugerir.test.ts`: pedido com evento de venda (valor_devido/data_limite). */
function inserirPedidoComVenda(
  repositorio: Repositorio,
  idPedido: string,
  valorDevido: number,
  dataLimite: string,
): void {
  repositorio.inserirPedido(idPedido);
  repositorio.inserirEvento({
    fonte: "vendas",
    codigoEvento: `VENDA-${idPedido}`,
    idPedido,
    tipo: "venda",
    momentoFato: dataLimite,
    ordemChegada: 1,
    versaoSchema: 1,
    dados: JSON.stringify({
      valor_devido: valorDevido,
      data_limite: dataLimite,
      transportadora: "Transportadora X",
    }),
  });
}

/** Mesmo helper de `test/ia/sugerir.test.ts`: pagamento sem identificação (evento + achado `sem_identificacao`). */
function inserirPagamentoSemIdentificacao(
  repositorio: Repositorio,
  codigoTransacao: string,
  valor: number,
  momentoFato: string,
  referenciaOriginal: string,
): void {
  repositorio.inserirEvento({
    fonte: "pagamentos",
    codigoEvento: codigoTransacao,
    idPedido: null,
    tipo: "pagamento",
    momentoFato,
    ordemChegada: null,
    versaoSchema: 1,
    dados: JSON.stringify({ valor, referencia_original: referenciaOriginal }),
  });
  repositorio.inserirAchadoQualidade({
    tipo: "sem_identificacao",
    fonte: "pagamentos",
    referencia: codigoTransacao,
    regra: "RN-09: referência de pagamento sem casamento único com pedido conhecido",
    detalhe: `referência "${referenciaOriginal}" não casou com exatamente 1 código de pedido conhecido`,
  });
}

describe("montarDocumentoQualidade — bloco ia (TP-0084)", () => {
  it("cache_ia vazia: ia.utilizada é false e ia.sugestoes é array vazio (regressão TP-0038)", () => {
    const repositorio = criarRepositorio(":memory:");

    const documento = montarDocumentoQualidade(repositorio.db);

    expect(documento.ia).toEqual({ utilizada: false, sugestoes: [] });
    expect(EsquemaRespostaQualidade.safeParse(documento).success).toBe(true);
  });

  it("cache_ia com 1 sugestão para candidato COMPATÍVEL (RN-11): conferida true e motivo igual ao de conferirSugestao", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-A", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-040", 100, DATA_PAGAMENTO, "REF-CONFERE");

    const provedorFalso = criarProvedorFalso({ "REF-CONFERE": "PED-A" });
    await sugerir(repositorio, provedorFalso, { modelo: "falso" });

    const documento = montarDocumentoQualidade(repositorio.db);

    expect(documento.ia.utilizada).toBe(true);
    expect(documento.ia.sugestoes).toHaveLength(1);

    const esperado = conferirSugestao(
      { devido: 100, pago: 0, dataPedido: "2026-01-01T00:00:00.000Z" },
      { valor: 100, dataPagamento: DATA_PAGAMENTO },
    );

    const sugestao = documento.ia.sugestoes[0] as {
      pagamento: string;
      pedidoSugerido: string;
      conferida: boolean;
      motivo: string;
    };
    expect(sugestao.pagamento).toBe("TRANS-040");
    expect(sugestao.pedidoSugerido).toBe("PED-A");
    expect(sugestao.conferida).toBe(true);
    expect(sugestao.motivo).toBe(esperado.motivo);
    expect(esperado.conferida).toBe(true);

    expect(EsquemaRespostaQualidade.safeParse(documento).success).toBe(true);
  });

  it("cache_ia com 1 sugestão para candidato NÃO compatível (valor fora da tolerância): conferida false e motivo de rejeição", async () => {
    const repositorio = criarRepositorio(":memory:");
    // Saldo em aberto (150) bem maior que o valor pago (100): elegível como
    // candidato em `montarCandidatos` (L-03, só exige saldo >= valor -
    // tolerância), mas RN-11 rejeita por incompatibilidade de valor
    // (diferença de 50, acima da tolerância de 0,01) — mesmo cenário de
    // PED-PROXIMO em `test/ia/sugerir.test.ts`.
    inserirPedidoComVenda(repositorio, "PED-B", 150, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-041", 100, DATA_PAGAMENTO, "REF-REJEITA");

    const provedorFalso = criarProvedorFalso({ "REF-REJEITA": "PED-B" });
    await sugerir(repositorio, provedorFalso, { modelo: "falso" });

    const documento = montarDocumentoQualidade(repositorio.db);

    expect(documento.ia.utilizada).toBe(true);
    expect(documento.ia.sugestoes).toHaveLength(1);

    const esperado = conferirSugestao(
      { devido: 150, pago: 0, dataPedido: "2026-01-01T00:00:00.000Z" },
      { valor: 100, dataPagamento: DATA_PAGAMENTO },
    );
    expect(esperado.conferida).toBe(false);

    const sugestao = documento.ia.sugestoes[0] as {
      pagamento: string;
      pedidoSugerido: string;
      conferida: boolean;
      motivo: string;
    };
    expect(sugestao.pagamento).toBe("TRANS-041");
    expect(sugestao.pedidoSugerido).toBe("PED-B");
    expect(sugestao.conferida).toBe(false);
    expect(sugestao.motivo).toBe(esperado.motivo);
    expect(sugestao.motivo).toContain("valor incompatível");

    expect(EsquemaRespostaQualidade.safeParse(documento).success).toBe(true);
  });

  it("RTP-0028: sugestão gerada com modelo gpt-4o-mini aparece em ia.sugestoes com conferida/motivo corretos", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-D", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-043", 100, DATA_PAGAMENTO, "REF-MODELO");

    const provedorFalso = criarProvedorFalso({ "REF-MODELO": "PED-D" });
    await sugerir(repositorio, provedorFalso, { modelo: "gpt-4o-mini" });

    const documento = montarDocumentoQualidade(repositorio.db);
    const esperado = conferirSugestao(
      { devido: 100, pago: 0, dataPedido: "2026-01-01T00:00:00.000Z" },
      { valor: 100, dataPagamento: DATA_PAGAMENTO },
    );

    expect(documento.ia.utilizada).toBe(true);
    expect(documento.ia.sugestoes).toHaveLength(1);
    const sugestao = documento.ia.sugestoes[0] as {
      pagamento: string;
      pedidoSugerido: string;
      conferida: boolean;
      motivo: string;
    };
    expect(sugestao.pagamento).toBe("TRANS-043");
    expect(sugestao.pedidoSugerido).toBe("PED-D");
    expect(sugestao.conferida).toBe(esperado.conferida);
    expect(sugestao.motivo).toBe(esperado.motivo);
  });

  it("cache_ia com entrada 'sem sugestão' (resposta vazia): ia.utilizada true, mas sugestoes não inclui essa entrada", async () => {
    const repositorio = criarRepositorio(":memory:");
    inserirPedidoComVenda(repositorio, "PED-C", 100, "2026-01-01T00:00:00.000Z");
    inserirPagamentoSemIdentificacao(repositorio, "TRANS-042", 100, DATA_PAGAMENTO, "REF-NULA");

    const provedorFalso = criarProvedorFalso({ "REF-NULA": null });
    await sugerir(repositorio, provedorFalso, { modelo: "falso" });

    const documento = montarDocumentoQualidade(repositorio.db);

    expect(documento.ia.utilizada).toBe(true);
    expect(documento.ia.sugestoes).toEqual([]);
    expect(EsquemaRespostaQualidade.safeParse(documento).success).toBe(true);
  });
});
