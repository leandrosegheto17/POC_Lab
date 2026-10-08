// TP-0056 — Faixa de resumo: texto estático na barra lateral/cabeçalho da
// Casca (via slotResumo). Enquanto carrega ou se a consulta falhar, mostra
// só "Dados sintéticos" — sem aria-live, sem role="alert", sem expor
// nenhum detalhe técnico do erro. Em sucesso, acrescenta a data de corte e
// o total de pedidos.
//
// Ajuste Modelo B (2026-10-08): três <span> separados por "·" (aria-hidden).
// PC: três linhas encostadas embaixo, separadores ocultos. Celular: uma
// linha "dados sintéticos · 1998-05-06" à direita do logo, total oculto
// (ver casca.css).
import { useResumo } from "../dados/contexto-resumo.tsx";
import { formatarData, formatarNumero } from "../dados/formatacao.ts";

export function FaixaResumo() {
  const { resumo, estado } = useResumo();

  if (estado !== "sucesso" || resumo === null) {
    // Carregando ou erro: mesmo texto estático, nunca um anúncio
    // (aria-live) nem um alerta (role="alert"), e nunca a mensagem de erro
    // técnica de `useConsulta`/`consultarApi`.
    return (
      <p className="faixa-resumo">
        <span className="faixa-resumo__item">Dados sintéticos</span>
      </p>
    );
  }

  const dataCorte = formatarData(resumo.dataCorte);
  const totalPedidos = formatarNumero(resumo.totais.pedidos.numerador);

  return (
    <p className="faixa-resumo">
      <span className="faixa-resumo__item">Dados sintéticos</span>
      <span className="faixa-resumo__separador" aria-hidden="true">
        {" · "}
      </span>
      <span className="faixa-resumo__item">
        <span className="faixa-resumo__corte">corte </span>
        <span className="mono">{dataCorte}</span>
      </span>
      <span
        className="faixa-resumo__separador faixa-resumo__separador--total"
        aria-hidden="true"
      >
        {" · "}
      </span>
      <span className="faixa-resumo__item faixa-resumo__total">
        {totalPedidos} pedidos
      </span>
    </p>
  );
}
