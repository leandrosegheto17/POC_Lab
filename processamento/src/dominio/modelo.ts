/**
 * Fontes de dados reconhecidas pelo modelo comum (lista única, na ordem de exibição).
 */
export const FONTES = ["vendas", "pagamentos", "rastreio"] as const;
export type Fonte = (typeof FONTES)[number];

/**
 * Vínculo entre um registro de uma fonte externa e o pedido correspondente
 * no modelo comum.
 */
export type VinculoFonte = {
  fonte: Fonte;
  codigoExterno: string;
  idPedido: string;
};

/**
 * Tipos de divergência detectáveis entre as fontes de dados.
 */
export const TIPOS_DIVERGENCIA = [
  "duplicado",
  "parcial",
  "pago_nao_enviado",
  "enviado_nao_pago",
  "entrega_atrasada",
] as const;
export type TipoDivergencia = (typeof TIPOS_DIVERGENCIA)[number];

/**
 * Divergência identificada entre eventos de uma ou mais fontes.
 */
export type Divergencia = {
  tipo: TipoDivergencia;
  motivo: string;
  idsEventos: string[];
};

/**
 * Tipos de achado de qualidade de dados.
 */
export const TIPOS_ACHADO = [
  "fora_de_ordem",
  "sem_identificacao",
  "registro_repetido",
  "linha_invalida",
  "valor_fora_do_padrao",
  "formato_data",
  "pedido_sem_envio",
] as const;
export type TipoAchado = (typeof TIPOS_ACHADO)[number];

/**
 * Achado de qualidade de dados identificado durante o processamento de uma
 * fonte.
 */
export type AchadoQualidade = {
  tipo: TipoAchado;
  fonte: Fonte;
  referencia: string;
  regra: string;
  detalhe: string;
};
