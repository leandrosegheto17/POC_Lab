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

  linha_do_tempo: [
    {
      id_pedido: "PED-000001",
      posicao: 0,
      codigo_evento: "pedido_criado",
      fonte: "vendas",
      tipo: "fato",
      momento_fato: "2026-01-01T10:00:00Z",
      versao_schema: 1,
      dados: "{}",
      fora_de_ordem: 0,
    },
    {
      id_pedido: "PED-000001",
      posicao: 1,
      codigo_evento: "pagamento_recebido",
      fonte: "pagamentos",
      tipo: "fato",
      momento_fato: "2026-01-05T10:00:00Z",
      versao_schema: 1,
      dados: "{}",
      fora_de_ordem: 0,
    },
    {
      id_pedido: "PED-000002",
      posicao: 0,
      codigo_evento: "pedido_criado",
      fonte: "vendas",
      tipo: "fato",
      momento_fato: "2026-02-01T10:00:00Z",
      versao_schema: 1,
      dados: "{}",
      fora_de_ordem: 0,
    },
  ],

  // 5 linhas para o mesmo id_pedido (PED-000002), uma por `tipo` distinto —
  // a PK de `divergencia` é `(tipo, id_pedido)`. Suficiente para simular
  // mais de uma "página" nos testes de paginação das rotas futuras (a
  // paginação em si é lógica da rota, não deste arquivo).
  divergencia: [
    {
      tipo: "valor_divergente",
      id_pedido: "PED-000002",
      motivo: "Valor devido não bate entre vendas e pagamentos.",
      eventos: "[\"EV-0001\"]",
    },
    {
      tipo: "data_divergente",
      id_pedido: "PED-000002",
      motivo: "Data limite informada por fontes diferentes não coincide.",
      eventos: "[\"EV-0002\"]",
    },
    {
      tipo: "fonte_duplicada",
      id_pedido: "PED-000002",
      motivo: "Mesmo evento relatado por duas fontes distintas.",
      eventos: "[\"EV-0003\", \"EV-0004\"]",
    },
    {
      tipo: "status_inconsistente",
      id_pedido: "PED-000002",
      motivo: "Situação de pagamento conflita entre fontes.",
      eventos: "[\"EV-0005\"]",
    },
    {
      tipo: "documento_ausente",
      id_pedido: "PED-000002",
      motivo: "Documento de referência citado, mas não encontrado.",
      eventos: "[\"EV-0006\"]",
    },
  ],

  documento: [
    { chave: "DOC-0001", conteudo: "Conteúdo de exemplo do pedido PED-000001." },
    { chave: "DOC-0002", conteudo: "Conteúdo de exemplo do pedido PED-000002." },
  ],
};
