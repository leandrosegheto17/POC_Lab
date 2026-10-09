/**
 * Testes unitários/deterministas da projeção `qualidade`
 * (`publicacao/qualidade.ts`), sem depender da base real.
 *
 * Fixture via event store `:memory:` (`criarRepositorio`), inserindo
 * achados/eventos/vínculos diretamente com os métodos do repositório (sem
 * reimplementar nenhuma regra de domínio — só monta o cenário de entrada).
 * O teste contra a base real (contagens 830/15.452/21) está em
 * `test/integracao/qualidade.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { criarRepositorio, type EventoParaInserir } from "../../src/armazenamento/repositorio.ts";
import type { AchadoQualidade } from "nucleo/dominio/modelo.js";
import { montarDocumentoQualidade } from "../../src/publicacao/qualidade.ts";

const ORDEM_TIPOS_ESPERADA = [
  "fora_de_ordem",
  "sem_identificacao",
  "registro_repetido",
  "linha_invalida",
  "valor_fora_do_padrao",
  "formato_data",
  "pedido_sem_envio",
] as const;

function eventoPagamento(
  codigoEvento: string,
  idPedido: string | null,
  momentoFato: string,
  ordemChegada: number,
): EventoParaInserir {
  return {
    fonte: "pagamentos",
    codigoEvento,
    idPedido,
    tipo: "pagamento",
    momentoFato,
    ordemChegada,
    versaoSchema: 1,
    dados: JSON.stringify({
      tipo: "pagamento",
      versao_schema: 1,
      valor: 100,
      referencia_original: codigoEvento,
    }),
  };
}

describe("montarDocumentoQualidade", () => {
  it("sempre devolve os 7 tipos, na ordem fixa, mesmo sem nenhum achado gravado", () => {
    const repositorio = criarRepositorio(":memory:");

    const documento = montarDocumentoQualidade(repositorio);

    expect(documento.achados).toHaveLength(7);
    expect(documento.achados.map((achado) => achado.tipo)).toEqual(ORDEM_TIPOS_ESPERADA);
    for (const achado of documento.achados) {
      expect(achado.contagem).toBe(0);
      expect(achado.exemplos).toEqual([]);
      expect(typeof achado.regra).toBe("string");
      expect(achado.regra.length).toBeGreaterThan(0);
    }
  });

  it("tipo sem nenhum achado gravado aparece com contagem 0 e exemplos vazio, ao lado de tipos com ocorrência", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirAchadoQualidade({
      tipo: "valor_fora_do_padrao",
      fonte: "vendas",
      referencia: "10248",
      regra: "RN-10",
      detalhe: "preço <= 0",
    });

    const documento = montarDocumentoQualidade(repositorio);

    const valorForaDoPadrao = documento.achados.find((a) => a.tipo === "valor_fora_do_padrao");
    expect(valorForaDoPadrao?.contagem).toBe(1);

    const pedidoSemEnvio = documento.achados.find((a) => a.tipo === "pedido_sem_envio");
    expect(pedidoSemEnvio).toMatchObject({ contagem: 0, exemplos: [] });

    const formatoData = documento.achados.find((a) => a.tipo === "formato_data");
    expect(formatoData).toMatchObject({ contagem: 0, exemplos: [] });
  });

  it("resolve o pedido do exemplo via vinculo_fonte quando a referência casa com um vínculo existente", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000001");
    repositorio.inserirVinculoFonte("vendas", "10248", "PED-000001");
    repositorio.inserirAchadoQualidade({
      tipo: "valor_fora_do_padrao",
      fonte: "vendas",
      referencia: "10248",
      regra: "RN-10",
      detalhe: "preço <= 0",
    });

    const documento = montarDocumentoQualidade(repositorio);

    const valorForaDoPadrao = documento.achados.find((a) => a.tipo === "valor_fora_do_padrao");
    expect(valorForaDoPadrao?.exemplos).toEqual([
      { fonte: "vendas", referencia: "10248", detalhe: "preço <= 0", pedido: "PED-000001" },
    ]);
  });

  it("achado sem vínculo resolvível (ex.: sem_identificacao) tem exemplo sem o campo pedido", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirAchadoQualidade({
      tipo: "sem_identificacao",
      fonte: "pagamentos",
      referencia: "TRX-999",
      regra: "RN-09",
      detalhe: "referência não casou com exatamente 1 pedido conhecido",
    });

    const documento = montarDocumentoQualidade(repositorio);

    const semIdentificacao = documento.achados.find((a) => a.tipo === "sem_identificacao");
    expect(semIdentificacao?.exemplos).toEqual([
      {
        fonte: "pagamentos",
        referencia: "TRX-999",
        detalhe: "referência não casou com exatamente 1 pedido conhecido",
      },
    ]);
    expect(semIdentificacao?.exemplos[0]).not.toHaveProperty("pedido");
  });

  it("recalcula fora_de_ordem (RN-08) a partir dos eventos, mesmo sem nenhuma linha em achado_qualidade para esse tipo", () => {
    const repositorio = criarRepositorio(":memory:");
    repositorio.inserirPedido("PED-000002");
    // Chegada: PAG-002 antes de PAG-001 (ordemChegada 0 e 1), mas a ordem
    // canônica (por momentoFato) é PAG-001 antes de PAG-002 — gera fora_de_ordem
    // para os 2 eventos desta mesma fonte.
    repositorio.inserirEvento(
      eventoPagamento("PAG-002", "PED-000002", "2024-01-02T10:00:00.000Z", 0),
    );
    repositorio.inserirEvento(
      eventoPagamento("PAG-001", "PED-000002", "2024-01-01T10:00:00.000Z", 1),
    );

    const documento = montarDocumentoQualidade(repositorio);

    const foraDeOrdem = documento.achados.find((a) => a.tipo === "fora_de_ordem");
    expect(foraDeOrdem?.contagem).toBe(2);
    expect(foraDeOrdem?.exemplos).toHaveLength(2);
    for (const exemplo of foraDeOrdem?.exemplos ?? []) {
      expect(exemplo.pedido).toBe("PED-000002");
      expect(exemplo.fonte).toBe("pagamentos");
    }
  });

  it("limita exemplos a 10 mesmo com mais de 10 ocorrências do mesmo tipo", () => {
    const repositorio = criarRepositorio(":memory:");
    for (let i = 0; i < 15; i += 1) {
      const achado: AchadoQualidade = {
        tipo: "linha_invalida",
        fonte: "rastreio",
        referencia: `linha-${String(i)}`,
        regra: "campos_obrigatorios",
        detalhe: `linha ${String(i)} malformada`,
      };
      repositorio.inserirAchadoQualidade(achado);
    }

    const documento = montarDocumentoQualidade(repositorio);

    const linhaInvalida = documento.achados.find((a) => a.tipo === "linha_invalida");
    expect(linhaInvalida?.contagem).toBe(15);
    expect(linhaInvalida?.exemplos).toHaveLength(10);
  });

  it("ia.utilizada é false e ia.sugestoes é array vazio", () => {
    const repositorio = criarRepositorio(":memory:");

    const documento = montarDocumentoQualidade(repositorio);

    expect(documento.ia).toEqual({ utilizada: false, sugestoes: [] });
  });
});
