import { describe, expect, it } from "vitest";

import { criarRepositorio, type Repositorio } from "../../src/armazenamento/repositorio.js";
import { montarLinhaDoTempo } from "../../src/publicacao/linha-do-tempo.js";
import { obrigatorio } from "../apoio/obrigatorio.js";

/**
 * TP-0036 — Testes da projeção `linha_do_tempo`.
 *
 * Usa `criarRepositorio(":memory:")` (event store real em memória) e insere
 * eventos via `inserirPedido`/`inserirVinculoFonte`/`inserirEvento` —
 * nenhuma edição em `armazenamento/repositorio.ts`, só leitura do seu
 * contrato público.
 */

function montarEventoDeVenda(idPedido: string, ordemChegada: number) {
  return {
    fonte: "vendas" as const,
    codigoEvento: `VENDA-${idPedido}`,
    idPedido,
    tipo: "venda",
    momentoFato: "2026-01-01T10:00:00Z",
    ordemChegada,
    versaoSchema: 1,
    dados: JSON.stringify({
      tipo: "venda",
      versao_schema: 1,
      valor_devido: 100,
      data_limite: "2026-01-10",
      transportadora: "Transportadora X",
    }),
  };
}

function montarEventoDeRastreio(
  idPedido: string,
  codigoEvento: string,
  tipo: "coleta" | "transporte" | "entrega",
  momentoFato: string,
  ordemChegada: number,
) {
  return {
    fonte: "rastreio" as const,
    codigoEvento,
    idPedido,
    tipo,
    momentoFato,
    ordemChegada,
    versaoSchema: 1,
    dados: JSON.stringify({
      tipo,
      versao_schema: 1,
      transportadora: "Transportadora X",
      codigo_rastreio: codigoEvento,
    }),
  };
}

function prepararPedidoBase(repositorio: Repositorio, idPedido: string): void {
  repositorio.inserirPedido(idPedido);
  repositorio.inserirVinculoFonte("vendas", `VENDA-${idPedido}`, idPedido);
}

describe("montarLinhaDoTempo", () => {
  it("3 eventos já na ordem canônica: posicao 0,1,2 e fora_de_ordem 0 em todos", () => {
    const repositorio = criarRepositorio(":memory:");
    const idPedido = "PED-000001";
    prepararPedidoBase(repositorio, idPedido);

    repositorio.inserirEvento(montarEventoDeVenda(idPedido, 1));
    repositorio.inserirEvento(
      montarEventoDeRastreio(idPedido, "RAST-001", "coleta", "2026-01-02T10:00:00Z", 2),
    );
    repositorio.inserirEvento(
      montarEventoDeRastreio(idPedido, "RAST-002", "entrega", "2026-01-03T10:00:00Z", 3),
    );

    const linhas = montarLinhaDoTempo(repositorio.db);

    expect(linhas).toHaveLength(3);
    expect(linhas.map((linha) => linha.posicao)).toEqual([0, 1, 2]);
    expect(linhas.map((linha) => linha.tipo)).toEqual(["venda", "coleta", "entrega"]);
    expect(linhas.every((linha) => linha.fora_de_ordem === 0)).toBe(true);
    expect(linhas.every((linha) => linha.id_pedido === idPedido)).toBe(true);
  });

  it("evento de rastreio recebido fora de ordem é marcado fora_de_ordem=1, com posicao pela ordem canônica (não pela chegada)", () => {
    const repositorio = criarRepositorio(":memory:");
    const idPedido = "PED-000002";
    prepararPedidoBase(repositorio, idPedido);

    repositorio.inserirEvento(montarEventoDeVenda(idPedido, 1));
    // Canonicamente: coleta (T1) antes de transporte (T2). Chegada: transporte
    // (ordemChegada=2) chega antes de coleta (ordemChegada=3) — invertido.
    repositorio.inserirEvento(
      montarEventoDeRastreio(idPedido, "RAST-COL", "coleta", "2026-01-02T10:00:00Z", 3),
    );
    repositorio.inserirEvento(
      montarEventoDeRastreio(idPedido, "RAST-TRA", "transporte", "2026-01-03T10:00:00Z", 2),
    );

    const linhas = montarLinhaDoTempo(repositorio.db);

    expect(linhas).toHaveLength(3);

    // posicao segue a ordem canônica por momentoFato: venda, coleta, transporte.
    const porCodigo = new Map(linhas.map((linha) => [linha.codigo_evento, linha]));
    expect(obrigatorio(porCodigo.get(`VENDA-${idPedido}`)).posicao).toBe(0);
    expect(obrigatorio(porCodigo.get("RAST-COL")).posicao).toBe(1);
    expect(obrigatorio(porCodigo.get("RAST-TRA")).posicao).toBe(2);

    // A venda (fonte isolada, grupo de 1) nunca é marcada fora de ordem.
    expect(obrigatorio(porCodigo.get(`VENDA-${idPedido}`)).fora_de_ordem).toBe(0);

    // Dentro da fonte "rastreio", a ordem de chegada (transporte, coleta)
    // diverge da ordem canônica (coleta, transporte) — ambos os eventos de
    // rastreio ficam marcados, já que a divergência de posição é mútua.
    expect(obrigatorio(porCodigo.get("RAST-COL")).fora_de_ordem).toBe(1);
    expect(obrigatorio(porCodigo.get("RAST-TRA")).fora_de_ordem).toBe(1);
  });

  it("pagamento sem id_pedido (sem identificação) não gera linha", () => {
    const repositorio = criarRepositorio(":memory:");
    const idPedido = "PED-000003";
    prepararPedidoBase(repositorio, idPedido);
    repositorio.inserirEvento(montarEventoDeVenda(idPedido, 1));

    repositorio.inserirEvento({
      fonte: "pagamentos",
      codigoEvento: "PAG-SEM-ID",
      idPedido: null,
      tipo: "pagamento",
      momentoFato: "2026-01-02T10:00:00Z",
      ordemChegada: null,
      versaoSchema: 1,
      dados: JSON.stringify({
        tipo: "pagamento",
        versao_schema: 1,
        valor: 100,
        referencia_original: "REF-DESCONHECIDA",
      }),
    });

    const linhas = montarLinhaDoTempo(repositorio.db);

    expect(linhas).toHaveLength(1);
    expect(obrigatorio(linhas[0]).codigo_evento).toBe(`VENDA-${idPedido}`);
    expect(linhas.some((linha) => linha.codigo_evento === "PAG-SEM-ID")).toBe(false);
  });

  it("dados é exatamente a string gravada na coluna, com a ordem de chaves original preservada", () => {
    const repositorio = criarRepositorio(":memory:");
    const idPedido = "PED-000004";
    prepararPedidoBase(repositorio, idPedido);

    // Chaves deliberadamente fora de ordem alfabética, para confirmar que a
    // string não é reserializada (o que normalizaria a ordem).
    const dadosOriginais = `{"tipo":"venda","versao_schema":1,"transportadora":"Transportadora X","valor_devido":100,"data_limite":"2026-01-10"}`;
    repositorio.inserirEvento({
      fonte: "vendas",
      codigoEvento: `VENDA-${idPedido}`,
      idPedido,
      tipo: "venda",
      momentoFato: "2026-01-01T10:00:00Z",
      ordemChegada: 1,
      versaoSchema: 1,
      dados: dadosOriginais,
    });

    const linhas = montarLinhaDoTempo(repositorio.db);

    expect(linhas).toHaveLength(1);
    expect(obrigatorio(linhas[0]).dados).toBe(dadosOriginais);
  });

  it("determinismo: mesma entrada 2x produz as mesmas linhas, na mesma ordem, bytes idênticos", () => {
    const repositorio = criarRepositorio(":memory:");
    const idPedidoA = "PED-000005";
    const idPedidoB = "PED-000006";
    prepararPedidoBase(repositorio, idPedidoA);
    prepararPedidoBase(repositorio, idPedidoB);

    repositorio.inserirEvento(montarEventoDeVenda(idPedidoA, 1));
    repositorio.inserirEvento(
      montarEventoDeRastreio(idPedidoA, "RAST-A1", "coleta", "2026-01-02T10:00:00Z", 2),
    );
    repositorio.inserirEvento(montarEventoDeVenda(idPedidoB, 1));
    repositorio.inserirEvento(
      montarEventoDeRastreio(idPedidoB, "RAST-B1", "entrega", "2026-01-02T10:00:00Z", 2),
    );

    const primeira = montarLinhaDoTempo(repositorio.db);
    const segunda = montarLinhaDoTempo(repositorio.db);

    expect(JSON.stringify(segunda)).toBe(JSON.stringify(primeira));

    // E a ordenação final é por (id_pedido, posicao).
    const chaves = primeira.map((linha) => `${linha.id_pedido}:${String(linha.posicao)}`);
    const chavesOrdenadas = [...chaves].sort();
    expect(chaves).toEqual(chavesOrdenadas);
  });
});
