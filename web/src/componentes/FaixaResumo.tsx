// TP-0056 — Faixa de resumo: texto estático na barra lateral/cabeçalho da
// Casca (via slotResumo), encostado embaixo em telas >=1024px (ver
// casca.css, `.faixa-resumo`). Enquanto carrega ou se a consulta falhar,
// mostra só "Dados sintéticos" — sem aria-live, sem role="alert", sem
// expor nenhum detalhe técnico do erro. Em sucesso, acrescenta a data de
// corte e o total de pedidos.
import { useResumo } from "../dados/contexto-resumo.tsx";

const FORMATADOR_NUMERO = new Intl.NumberFormat("pt-BR");

export function FaixaResumo() {
  const { resumo, estado } = useResumo();

  if (estado !== "sucesso" || resumo === null) {
    // Carregando ou erro: mesmo texto estático, nunca um anúncio
    // (aria-live) nem um alerta (role="alert"), e nunca a mensagem de erro
    // técnica de `useConsulta`/`consultarApi`.
    return <p className="faixa-resumo">Dados sintéticos</p>;
  }

  // `dataCorte` chega como string ISO (ex. "2026-10-08T00:00:00.000Z");
  // exibimos só a parte "AAAA-MM-DD", sem nenhuma conversão de fuso.
  const dataCorte = resumo.dataCorte.slice(0, 10);
  const totalPedidos = FORMATADOR_NUMERO.format(resumo.totais.pedidos.numerador);

  return (
    <p className="faixa-resumo">
      Dados sintéticos · corte {dataCorte} · {totalPedidos} pedidos
    </p>
  );
}
