import type { Fonte } from "./modelo.js";

/**
 * Payload de uma venda, versão de schema 1.
 */
export type PayloadVendaV1 = {
  tipo: "venda";
  versao_schema: 1;
  valor_devido: number;
  data_limite: string;
  transportadora: string;
};

/**
 * Payload de um pagamento, versão de schema 1.
 *
 * Nota: uma v2 com `meio_pagamento` é tarefa futura — não implementada aqui.
 * A união de payload abaixo (`PayloadEvento`) é aditiva, então a v2 pode ser
 * acrescentada como mais um membro da união sem alterar os existentes.
 */
export type PayloadPagamentoV1 = {
  tipo: "pagamento";
  versao_schema: 1;
  valor: number;
  referencia_original: string;
};

/**
 * Payload de coleta, versão de schema 1.
 */
export type PayloadColetaV1 = {
  tipo: "coleta";
  versao_schema: 1;
  transportadora: string;
  codigo_rastreio: string;
};

/**
 * Payload de transporte, versão de schema 1.
 */
export type PayloadTransporteV1 = {
  tipo: "transporte";
  versao_schema: 1;
  transportadora: string;
  codigo_rastreio: string;
};

/**
 * Payload de entrega, versão de schema 1.
 */
export type PayloadEntregaV1 = {
  tipo: "entrega";
  versao_schema: 1;
  transportadora: string;
  codigo_rastreio: string;
};

/**
 * União discriminada dos payloads de evento, por `tipo` + `versao_schema`.
 * Aditiva: novas variantes/versões (ex.: `pagamento` v2) entram como novos
 * membros desta união, sem alterar os já existentes.
 */
export type PayloadEvento =
  | PayloadVendaV1
  | PayloadPagamentoV1
  | PayloadColetaV1
  | PayloadTransporteV1
  | PayloadEntregaV1;

/**
 * Envelope comum a todo evento, independente do tipo de payload.
 *
 * `ordemChegada` é opcional e aditivo: identifica a posição em que o evento
 * foi recebido (ordem de chegada), usada para comparar com a ordem canônica
 * (RN-08, ver `fora-de-ordem.ts`). Código existente que não preenche este
 * campo continua compilando sem alteração.
 */
export type EnvelopeEvento = {
  fonte: Fonte;
  codigoEvento: string;
  momentoFato: string;
  ordemChegada?: number;
};

/**
 * Evento completo: envelope comum + payload discriminado por `tipo`.
 * Consumido pelas tarefas futuras de ordenação e de máquina de estados.
 */
export type Evento = EnvelopeEvento & PayloadEvento;
