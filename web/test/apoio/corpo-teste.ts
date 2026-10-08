/**
 * Formato solto das respostas de linha do tempo nos testes do worker: serve só
 * para ler campos de um JSON já recebido (a validação estrita fica a cargo dos
 * esquemas Zod do contrato, chamados nos próprios testes).
 */
export type CorpoLinhaDoTempoSolto = {
  pedido: Record<string, unknown>;
  eventos: Array<Record<string, unknown>>;
};
