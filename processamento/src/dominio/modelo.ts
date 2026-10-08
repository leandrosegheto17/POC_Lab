/**
 * Fontes de dados reconhecidas pelo modelo comum.
 */
export type Fonte = "vendas" | "pagamentos" | "rastreio";

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
export type TipoDivergencia =
  | "duplicado"
  | "parcial"
  | "pago_nao_enviado"
  | "enviado_nao_pago"
  | "entrega_atrasada";

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
export type TipoAchado =
  | "fora_de_ordem"
  | "sem_identificacao"
  | "registro_repetido"
  | "linha_invalida"
  | "valor_fora_do_padrao"
  | "formato_data"
  | "pedido_sem_envio";

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
