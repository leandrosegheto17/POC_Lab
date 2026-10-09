import { describe, expect, it } from "vitest";
import { processarRastreio } from "../../src/fontes/rastreio.js";
import { obrigatorio } from "apoio-teste/obrigatorio.js";

const cabecalho =
  "codigo_evento,codigo_rastreio,pedido_venda,tipo,momento_fato,transportadora";

describe("processarRastreio", () => {
  it("processa uma linha de coleta válida", () => {
    const csv = [
      cabecalho,
      "evt-1,RS-000001,ped-1,coleta,2026-01-01T10:00:00Z,Transportadora X",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toEqual([]);
    expect(resultado.vinculos).toEqual([
      { fonte: "rastreio", codigoExterno: "RS-000001", idPedido: "ped-1" },
    ]);
    expect(resultado.eventos).toEqual([
      {
        fonte: "rastreio",
        codigoEvento: "evt-1",
        momentoFato: "2026-01-01T10:00:00Z",
        ordemChegada: 0,
        tipo: "coleta",
        versao_schema: 1,
        transportadora: "Transportadora X",
        codigo_rastreio: "RS-000001",
      },
    ]);
  });

  it("processa uma linha de transporte válida", () => {
    const csv = [
      cabecalho,
      "evt-2,RS-000002,ped-2,transporte,2026-01-02T10:00:00Z,Transportadora Y",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toEqual([]);
    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.eventos[0]).toMatchObject({
      tipo: "transporte",
      codigoEvento: "evt-2",
      ordemChegada: 0,
    });
    expect(resultado.vinculos[0]).toEqual({
      fonte: "rastreio",
      codigoExterno: "RS-000002",
      idPedido: "ped-2",
    });
  });

  it("processa uma linha de entrega válida", () => {
    const csv = [
      cabecalho,
      "evt-3,RS-000003,ped-3,entrega,2026-01-03T10:00:00Z,Transportadora Z",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toEqual([]);
    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.eventos[0]).toMatchObject({
      tipo: "entrega",
      codigoEvento: "evt-3",
      ordemChegada: 0,
    });
    expect(resultado.vinculos[0]).toEqual({
      fonte: "rastreio",
      codigoExterno: "RS-000003",
      idPedido: "ped-3",
    });
  });

  it("preserva a ordem física das linhas em ordemChegada, sem reordenar", () => {
    const csv = [
      cabecalho,
      "evt-1,RS-000001,ped-1,coleta,2026-01-01T10:00:00Z,Transportadora X",
      "evt-2,RS-000001,ped-1,transporte,2026-01-02T10:00:00Z,Transportadora X",
      "evt-3,RS-000001,ped-1,entrega,2026-01-03T10:00:00Z,Transportadora X",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toEqual([]);
    expect(resultado.eventos.map((evento) => evento.ordemChegada)).toEqual([
      0, 1, 2,
    ]);
    expect(resultado.eventos.map((evento) => evento.tipo)).toEqual([
      "coleta",
      "transporte",
      "entrega",
    ]);
  });

  it("gera achado linha_invalida para tipo fora do enum e continua processando as demais linhas", () => {
    const csv = [
      cabecalho,
      "evt-1,RS-000001,ped-1,tipo-invalido,2026-01-01T10:00:00Z,Transportadora X",
      "evt-2,RS-000002,ped-2,coleta,2026-01-02T10:00:00Z,Transportadora Y",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toHaveLength(1);
    expect(resultado.achados[0]).toMatchObject({
      tipo: "linha_invalida",
      fonte: "rastreio",
      regra: "tipo_valido",
    });
    expect(resultado.eventos).toHaveLength(1);
    expect(obrigatorio(resultado.eventos[0]).codigoEvento).toBe("evt-2");
    expect(resultado.vinculos).toHaveLength(1);
  });

  it("gera achado linha_invalida para data não ISO e continua processando as demais linhas", () => {
    const csv = [
      cabecalho,
      "evt-1,RS-000001,ped-1,coleta,data-invalida,Transportadora X",
      "evt-2,RS-000002,ped-2,entrega,2026-01-02T10:00:00Z,Transportadora Y",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toHaveLength(1);
    expect(resultado.achados[0]).toMatchObject({
      tipo: "linha_invalida",
      fonte: "rastreio",
      regra: "momento_fato_iso",
    });
    expect(resultado.eventos).toHaveLength(1);
    expect(obrigatorio(resultado.eventos[0]).codigoEvento).toBe("evt-2");
  });

  it("gera achado linha_invalida quando falta campo obrigatório", () => {
    const csv = [
      cabecalho,
      ",RS-000001,ped-1,coleta,2026-01-01T10:00:00Z,Transportadora X",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toHaveLength(1);
    expect(resultado.achados[0]).toMatchObject({
      tipo: "linha_invalida",
      fonte: "rastreio",
      regra: "campos_obrigatorios",
    });
    expect(resultado.eventos).toEqual([]);
    expect(resultado.vinculos).toEqual([]);
  });

  it("gera linha_invalida (campos_obrigatorios) para linha truncada e processa as seguintes, sem lançar exceção", () => {
    const csv = [
      cabecalho,
      "evt-1,RS-000001,ped-1,coleta",
      "evt-2,RS-000002,ped-2,entrega,2026-01-02T10:00:00Z,Transportadora Y",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.achados).toHaveLength(1);
    expect(resultado.achados[0]).toMatchObject({
      tipo: "linha_invalida",
      fonte: "rastreio",
      regra: "campos_obrigatorios",
    });
    expect(resultado.eventos).toHaveLength(1);
    expect(obrigatorio(resultado.eventos[0]).codigoEvento).toBe("evt-2");
    expect(obrigatorio(resultado.eventos[0]).ordemChegada).toBe(1);
  });

  it("gera achado registro_repetido para codigo_evento duplicado, sem duplicar vínculo/evento", () => {
    const csv = [
      cabecalho,
      "evt-1,RS-000001,ped-1,coleta,2026-01-01T10:00:00Z,Transportadora X",
      "evt-1,RS-000001,ped-1,coleta,2026-01-01T10:00:00Z,Transportadora X",
    ].join("\n");

    const resultado = processarRastreio(csv);

    expect(resultado.eventos).toHaveLength(1);
    expect(resultado.vinculos).toHaveLength(1);
    expect(resultado.achados).toHaveLength(1);
    expect(resultado.achados[0]).toMatchObject({
      tipo: "registro_repetido",
      fonte: "rastreio",
      referencia: "evt-1",
      regra: "codigo_evento_unico",
    });
  });

  it("devolve listas vazias para arquivo apenas com cabeçalho", () => {
    const resultado = processarRastreio(cabecalho);

    expect(resultado.vinculos).toEqual([]);
    expect(resultado.eventos).toEqual([]);
    expect(resultado.achados).toEqual([]);
  });
});
