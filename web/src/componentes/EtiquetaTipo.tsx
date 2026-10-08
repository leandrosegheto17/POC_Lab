import "./Etiquetas.css";

export type TipoDivergencia =
  | "duplicado"
  | "parcial"
  | "pago_nao_enviado"
  | "enviado_nao_pago"
  | "entrega_atrasada"
  | "sem_divergencia";

type EtiquetaTipoProps = {
  tipo: TipoDivergencia;
};

// TP-0054 — mapeamento de cada `tipo` de divergência para uma das 6
// variantes de etiqueta definidas em tokens.css (TP-0051). Cada tipo usa
// uma variante distinta (nenhuma reaproveitada), preservando o significado
// documentado de cada cor:
//
//   duplicado         -> "duplicado" (azul/roxo): pago mais de uma vez.
//   parcial            -> "parcial" (âmbar forte): falta complementar.
//   pago_nao_enviado   -> "pendente" (neutro): pagamento ok, aguardando
//                         processamento/expedição — não é erro, é fila.
//   enviado_nao_pago   -> "sem-pagamento" (âmbar leve): nenhum pagamento
//                         encontrado para uma cobrança já enviada —
//                         pendência a investigar no financeiro.
//   entrega_atrasada   -> "erro" (vermelho): atraso logístico que precisa
//                         de ação corretiva.
//   sem_divergencia    -> "quitado" (verde): estado "bom", sem ação.
const CONFIGURACAO: Record<
  TipoDivergencia,
  { variante: string; rotulo: string }
> = {
  duplicado: { variante: "duplicado", rotulo: "Pagamento duplicado" },
  parcial: { variante: "parcial", rotulo: "Pagamento parcial" },
  pago_nao_enviado: { variante: "pendente", rotulo: "Pago e não enviado" },
  enviado_nao_pago: {
    variante: "sem-pagamento",
    rotulo: "Enviado e não pago",
  },
  entrega_atrasada: { variante: "erro", rotulo: "Entrega atrasada" },
  sem_divergencia: { variante: "quitado", rotulo: "Sem divergência" },
};

export function EtiquetaTipo({ tipo }: EtiquetaTipoProps) {
  const { variante, rotulo } = CONFIGURACAO[tipo];

  return (
    <span
      className={`etiqueta etiqueta--${variante}`}
      data-variante={variante}
    >
      {rotulo}
    </span>
  );
}
