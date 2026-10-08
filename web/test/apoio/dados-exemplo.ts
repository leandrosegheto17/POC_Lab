// TP-0043 — Linhas de exemplo mínimas e determinísticas para as 5 tabelas
// de leitura publicadas no D1 (TP-0032), usadas pela fixture `criarD1Teste`
// (ver `./fixture.ts`) e, por meio dela, pelos testes de rota do Worker
// (Lote 9 em diante).
//
// Cenários cobertos:
// - PED-000001: pedido pago, SEM divergência.
// - PED-000002: pedido pendente, COM 5 divergências (tipos distintos — a PK
//   de `divergencia` é `(tipo, id_pedido)`), o bastante para simular mais de
//   uma "página" nos testes de paginação das rotas futuras.
// - `vinculo_codigo` traz, para PED-000001, dois códigos distintos
//   apontando para o MESMO `id_pedido`: o código de vendas original
//   (`VENDA-0001`) e a própria identidade (`PED-000001`).
// Import de módulo TS via especificador de pacote
// (`processamento/publicacao/escritor-sql.js`), resolvido pelo campo
// `exports` de `processamento/package.json` através do symlink do
// workspace — não sujeito à checagem de `rootDir` do `web/tsconfig.json`
// (ver nota equivalente em `./fixture.ts`).
import type { TabelasParaPublicacao } from "processamento/publicacao/escritor-sql.js";

export const DADOS_EXEMPLO: TabelasParaPublicacao = {
  pedido_resumo: [
    {
      id_pedido: "PED-000001",
      valor_devido: 100,
      valor_pago: 100,
      data_limite: "2026-01-10",
      situacao_pagamento: "pago",
      fontes: "{\"vendas\":\"VENDA-0001\",\"pagamentos\":\"PAG-0001\"}",
    },
    {
      id_pedido: "PED-000002",
      valor_devido: 250.5,
      valor_pago: 0,
      data_limite: "2026-02-15",
      situacao_pagamento: "pendente",
      fontes: "{\"vendas\":\"VENDA-0002\"}",
    },
  ],

  vinculo_codigo: [
    // Dois códigos distintos para o MESMO id_pedido (PED-000001): o código
    // de vendas original e a própria identidade `PED-`.
    { codigo: "VENDA-0001", fonte: "vendas", id_pedido: "PED-000001" },
    { codigo: "PED-000001", fonte: "pedido", id_pedido: "PED-000001" },
    { codigo: "VENDA-0002", fonte: "vendas", id_pedido: "PED-000002" },
    { codigo: "PED-000002", fonte: "pedido", id_pedido: "PED-000002" },
  ],

  // `dados` de cada linha é o payload v1 real do evento (`dominio/evento.ts`),
  // igual ao que `importacao/importar.ts` grava na coluna `dados` do event
  // store — necessário para que as rotas (TP-0046/48) consigam montar a
  // resposta v1 de verdade a partir desta fixture.
  linha_do_tempo: [
    {
      id_pedido: "PED-000001",
      posicao: 0,
      codigo_evento: "VENDA-0001",
      fonte: "vendas",
      tipo: "venda",
      momento_fato: "2026-01-01T10:00:00.000Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "venda",
        versao_schema: 1,
        valor_devido: 100,
        data_limite: "2026-01-10T00:00:00.000Z",
        transportadora: "Transportadora 1",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: "PED-000001",
      posicao: 1,
      codigo_evento: "PAG-0001",
      fonte: "pagamentos",
      tipo: "pagamento",
      momento_fato: "2026-01-05T10:00:00.000Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "pagamento",
        versao_schema: 1,
        valor: 100,
        referencia_original: "PV-000001",
      }),
      fora_de_ordem: 0,
    },
    {
      id_pedido: "PED-000002",
      posicao: 0,
      codigo_evento: "VENDA-0002",
      fonte: "vendas",
      tipo: "venda",
      momento_fato: "2026-02-01T10:00:00.000Z",
      versao_schema: 1,
      dados: JSON.stringify({
        tipo: "venda",
        versao_schema: 1,
        valor_devido: 250.5,
        data_limite: "2026-02-15T00:00:00.000Z",
        transportadora: "Transportadora 2",
      }),
      fora_de_ordem: 0,
    },
  ],

  // 5 linhas para o mesmo id_pedido (PED-000002), uma por `tipo` real de
  // `TipoDivergencia` (`dominio/modelo.ts`) — a PK de `divergencia` é
  // `(tipo, id_pedido)`. `eventos` é o JSON de `{tipo, data, fonte, codigo}`
  // que a projeção real (`publicacao/divergencias.ts`) produz, não uma
  // lista de strings cruas — necessário para passar em
  // `EsquemaRespostaDivergencias`/`EsquemaEventoDivergencia` (TP-0030).
  divergencia: [
    {
      tipo: "duplicado",
      id_pedido: "PED-000002",
      motivo: "Duas transações de valor integral pagaram mais que o devido.",
      eventos: JSON.stringify([
        { tipo: "pagamento", data: "2026-02-03T10:00:00.000Z", fonte: "pagamentos", codigo: "PAG-0002" },
        { tipo: "pagamento", data: "2026-02-04T10:00:00.000Z", fonte: "pagamentos", codigo: "PAG-0003" },
      ]),
    },
    {
      tipo: "parcial",
      id_pedido: "PED-000002",
      motivo: "Pago R$100 de R$250,5 devido.",
      eventos: JSON.stringify([
        { tipo: "pagamento", data: "2026-02-03T10:00:00.000Z", fonte: "pagamentos", codigo: "PAG-0002" },
      ]),
    },
    {
      tipo: "pago_nao_enviado",
      id_pedido: "PED-000002",
      motivo: "Pedido quitado sem evento de coleta até a data de corte.",
      eventos: JSON.stringify([
        { tipo: "venda", data: "2026-02-01T10:00:00.000Z", fonte: "vendas", codigo: "VENDA-0002" },
      ]),
    },
    {
      tipo: "enviado_nao_pago",
      id_pedido: "PED-000002",
      motivo: "Evento de coleta sem nenhum pagamento vinculado.",
      eventos: JSON.stringify([
        { tipo: "coleta", data: "2026-02-05T10:00:00.000Z", fonte: "rastreio", codigo: "RS-000002" },
      ]),
    },
    {
      tipo: "entrega_atrasada",
      id_pedido: "PED-000002",
      motivo: "Entrega em 2026-02-20 após a data limite 2026-02-15.",
      eventos: JSON.stringify([
        { tipo: "entrega", data: "2026-02-20T10:00:00.000Z", fonte: "rastreio", codigo: "RS-000002" },
      ]),
    },
  ],

  documento: [
    { chave: "DOC-0001", conteudo: "Conteúdo de exemplo do pedido PED-000001." },
    { chave: "DOC-0002", conteudo: "Conteúdo de exemplo do pedido PED-000002." },
  ],
};
