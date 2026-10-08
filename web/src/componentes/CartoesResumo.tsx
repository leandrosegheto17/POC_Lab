// TP-0058 — Cartões de resumo: 4 indicadores agregados vindos de
// `useResumo()` (mesmo contexto da TP-0056/FaixaResumo, sem chamada de rede
// própria). Enquanto a consulta carrega ou falha, cada cartão mostra "—"
// + "indisponível agora" — nunca `role="alert"`/`aria-live`, nunca a
// mensagem técnica do erro, mesmo padrão de silêncio de `FaixaResumo`.
//
// Percentuais são calculados de numerador/denominador do `Cartao`
// (processamento/contrato/resumo.ts) por `formatarPercentual`; com
// denominador 0 o cartão mostra "—"/"indisponível agora", nunca "NaN%".
//
// Ajuste Modelo B (2026-10-08, mockup à risca): cartões `.kpi` dentro de
// `.kpis` (painel.css). Moeda em destaque compacta ("R$ 65,4 mi") com o
// valor exato na linha de base. No celular só ficam "Em aberto" e "Pago a
// mais", com rótulo curto e sem linha de base (CartoesResumo.css).
import "./CartoesResumo.css";
import { useResumo } from "../dados/contexto-resumo.tsx";
import {
  formatarMoeda,
  formatarMoedaCompacta,
  formatarNumero,
  formatarPercentual,
} from "../dados/formatacao.ts";
import type { Cartao } from "processamento/contrato/resumo.js";

type LinhaCartao = {
  titulo: string;
  /** Rótulo curto do celular; ausente = cartão só aparece no PC. */
  tituloCurto?: string;
  /** `null` quando não há resumo disponível ou o indicador não pôde ser calculado. */
  valor: string | null;
  /** `null` no mesmo caso de `valor`; nunca renderizado sem `valor`. */
  base: string | null;
};

function CartaoResumo({ titulo, tituloCurto, valor, base }: LinhaCartao) {
  return (
    <div className={tituloCurto ? "kpi" : "kpi kpi--so-pc"}>
      <p className="kpi__rotulo">
        {tituloCurto ? (
          <>
            <span className="so-pc">{titulo}</span>
            <span className="so-celular">{tituloCurto}</span>
          </>
        ) : (
          titulo
        )}
      </p>
      <p className="kpi__valor">{valor ?? "—"}</p>
      <p className="kpi__base">{base ?? "indisponível agora"}</p>
    </div>
  );
}

function linhaComDivergencia(cartao: Cartao): LinhaCartao {
  const titulo = "Com divergência";
  const percentual = formatarPercentual(cartao.numerador, cartao.denominador);

  if (percentual === null) {
    return { titulo, valor: null, base: null };
  }

  return {
    titulo,
    valor: formatarNumero(cartao.numerador),
    base: `${percentual} dos pedidos`,
  };
}

function linhaMoeda(
  titulo: string,
  tituloCurto: string,
  cartao: Cartao,
  complemento: string,
): LinhaCartao {
  return {
    titulo,
    tituloCurto,
    valor: formatarMoedaCompacta(cartao.numerador),
    base: `${formatarMoeda(cartao.numerador)} · ${complemento}`,
  };
}

function linhaEntregas(cartao: Cartao): LinhaCartao {
  const titulo = "Entregas no prazo";
  const percentual = formatarPercentual(cartao.numerador, cartao.denominador);

  if (percentual === null) {
    return { titulo, valor: null, base: null };
  }

  // Numerador/denominador ficam visíveis (requisito mantido); "ver
  // Indicadores" é só texto, não link.
  return {
    titulo,
    valor: percentual,
    base: `${formatarNumero(cartao.numerador)} de ${formatarNumero(
      cartao.denominador,
    )} · ver Indicadores`,
  };
}

export function CartoesResumo() {
  const { resumo, estado } = useResumo();

  const semResumo = estado !== "sucesso" || resumo === null;

  const linhas: LinhaCartao[] = semResumo
    ? [
        { titulo: "Com divergência", valor: null, base: null },
        { titulo: "Valor em aberto", tituloCurto: "Em aberto", valor: null, base: null },
        { titulo: "Pago a mais", tituloCurto: "Pago a mais", valor: null, base: null },
        { titulo: "Entregas no prazo", valor: null, base: null },
      ]
    : [
        linhaComDivergencia(resumo.totais.pedidosComDivergencia),
        linhaMoeda(
          "Valor em aberto",
          "Em aberto",
          resumo.totais.valorEmAberto,
          "parciais + não pagos",
        ),
        linhaMoeda(
          "Pago a mais",
          "Pago a mais",
          resumo.totais.pagoAMais,
          "duplicidades",
        ),
        linhaEntregas(resumo.totais.entregasNoPrazo),
      ];

  return (
    <div className="kpis cartoes-resumo">
      {linhas.map((linha) => (
        <CartaoResumo key={linha.titulo} {...linha} />
      ))}
    </div>
  );
}
