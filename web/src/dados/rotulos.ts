// Nomes amigáveis, ordem de exibição e variante visual dos tipos que o site
// mostra. As listas vêm do domínio (e do contrato, no caso do evento); aqui
// só entra o texto. Os `Record` obrigam a cobrir todo valor novo do enum.
import { FONTES, TIPOS_DIVERGENCIA } from "nucleo/dominio/modelo.js";
import type {
  Fonte,
  TipoAchado,
  TipoDivergencia,
} from "nucleo/dominio/modelo.js";
import type { EventoV1 } from "nucleo/contrato/linha-do-tempo-v1.js";

export type { Fonte, TipoDivergencia };
export { FONTES, TIPOS_DIVERGENCIA };

/** Tipo de divergência ou a marca "sem divergência" (só a etiqueta usa). */
export type TipoComEtiqueta = TipoDivergencia | "sem_divergencia";

type RotuloTipo = { rotulo: string; curto: string; variante: string };

const TIPOS: Record<TipoComEtiqueta, RotuloTipo> = {
  duplicado: { rotulo: "Pago duas vezes", curto: "Pago 2×", variante: "duplicado" },
  parcial: { rotulo: "Pagamento parcial", curto: "Parcial", variante: "parcial" },
  pago_nao_enviado: {
    rotulo: "Pago e não enviado",
    curto: "Não enviado",
    variante: "pago-nao-enviado",
  },
  enviado_nao_pago: {
    rotulo: "Enviado e não pago",
    curto: "Não pago",
    variante: "enviado-nao-pago",
  },
  entrega_atrasada: {
    rotulo: "Entrega atrasada",
    curto: "Atrasada",
    variante: "entrega-atrasada",
  },
  sem_divergencia: {
    rotulo: "Sem divergência",
    curto: "Sem divergência",
    variante: "sem-divergencia",
  },
};

export function ehTipoDivergencia(valor: string): valor is TipoDivergencia {
  return (TIPOS_DIVERGENCIA as readonly string[]).includes(valor);
}

export function dadosDoTipo(tipo: TipoComEtiqueta): RotuloTipo {
  return TIPOS[tipo];
}

export function rotuloTipo(tipo: TipoComEtiqueta): string {
  return TIPOS[tipo].rotulo;
}

/** Tipos de divergência na ordem de exibição, com rótulo longo e curto. */
export const OPCOES_TIPO_DIVERGENCIA: ReadonlyArray<
  { tipo: TipoDivergencia } & RotuloTipo
> = TIPOS_DIVERGENCIA.map((tipo) => ({ tipo, ...TIPOS[tipo] }));

/** Valor do filtro de tipo que significa "sem filtro" (explícito, nunca vazio). */
export const VALOR_TODOS = "todos";

const FONTES_ROTULO: Record<Fonte, string> = {
  vendas: "Vendas",
  pagamentos: "Pagamentos",
  // A fonte de rastreio aparece pelo papel de negócio, nunca como "rastreio".
  rastreio: "Transportadora",
};

export function rotuloFonte(fonte: Fonte): string {
  return FONTES_ROTULO[fonte];
}

export type TipoEvento = EventoV1["tipo"];

const EVENTOS: Record<TipoEvento, { rotulo: string; fonte: Fonte }> = {
  venda: { rotulo: "Venda", fonte: "vendas" },
  pagamento: { rotulo: "Pagamento", fonte: "pagamentos" },
  coleta: { rotulo: "Coleta", fonte: "rastreio" },
  transporte: { rotulo: "Em trânsito", fonte: "rastreio" },
  entrega: { rotulo: "Entrega", fonte: "rastreio" },
};

export const TIPOS_EVENTO = Object.keys(EVENTOS) as TipoEvento[];

export function fonteDoEvento(tipo: TipoEvento): Fonte {
  return EVENTOS[tipo].fonte;
}

/** Nome do tipo de evento; tipo desconhecido aparece como veio. */
export function rotuloEvento(tipo: string): string {
  return (EVENTOS as Record<string, { rotulo: string } | undefined>)[tipo]?.rotulo ?? tipo;
}

const TITULOS_ACHADO: Record<TipoAchado, string> = {
  formato_data: "Datas em dois formatos",
  pedido_sem_envio: "Pedidos sem envio",
  valor_fora_do_padrao: "Valores fora do padrão",
  linha_invalida: "Linhas rejeitadas",
  registro_repetido: "Registros repetidos",
  sem_identificacao: "Pagamentos sem identificação",
  fora_de_ordem: "Eventos fora de ordem",
};

/** Ordem de exibição dos achados de qualidade (definida pelo wireframe). */
const ORDEM_ACHADOS: readonly TipoAchado[] = [
  "formato_data",
  "pedido_sem_envio",
  "valor_fora_do_padrao",
  "linha_invalida",
  "registro_repetido",
  "sem_identificacao",
  "fora_de_ordem",
];

/** Tipos de achado na ordem de exibição, com o título de cada um. */
export const TIPOS_ACHADO_EM_ORDEM: ReadonlyArray<{
  tipo: TipoAchado;
  titulo: string;
}> = ORDEM_ACHADOS.map((tipo) => ({ tipo, titulo: TITULOS_ACHADO[tipo] }));

const SITUACOES_PAGAMENTO: Record<string, string> = {
  sem_pagamento: "Sem pagamento",
  parcial: "Parcial",
  quitado: "Quitado",
  excedente: "Pago a mais",
};

/** Situação de pagamento; valor desconhecido aparece como veio. */
export function rotuloSituacaoPagamento(situacao: string): string {
  return SITUACOES_PAGAMENTO[situacao] ?? situacao;
}
