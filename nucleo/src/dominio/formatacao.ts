/**
 * Formatação de valores para texto em linguagem simples (`motivo` das
 * divergências — RF-08, UX-SPEC §4: datas `AAAA-MM-DD`, sem hora nem fuso;
 * moeda `R$ 1.234,56` via `Intl.NumberFormat('pt-BR')`).
 */

const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Trunca uma data/hora ISO-8601 (`AAAA-MM-DDTHH:mm:ss.sssZ`) para `AAAA-MM-DD`. */
export function formatarDataCurta(iso: string): string {
  return iso.slice(0, 10);
}

/** Formata um valor numérico como moeda em português (`R$ 1.234,56`). */
export function formatarMoeda(valor: number): string {
  return FORMATADOR_MOEDA.format(valor);
}
