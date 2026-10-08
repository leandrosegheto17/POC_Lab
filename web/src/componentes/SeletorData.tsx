import type { ReactNode } from "react";
import "./SeletorData.css";

type SeletorDataProps = {
  valor: string;
  onMudar: (valor: string) => void;
  onVerEstado: () => void;
  onLimpar: () => void;
  /**
   * Ajuste Modelo B (2026-10-08): frase do resultado ("Em 1996-07-10:
   * vendido, …"), mostrada no mesmo cartão, à direita dos botões. Sem
   * resultado, o parágrafo fica vazio (e oculto por CSS), mas continua no
   * DOM como região `aria-live` — assim a primeira frase também é anunciada.
   */
  resultado?: ReactNode;
};

const ID_INPUT = "seletor-data-input";

// TP-0072 — SeletorData: componente CONTROLADO, sem lógica de domínio e sem
// chamada à API — só captura a data escolhida e dispara os callbacks
// recebidos via props. O cálculo do estado (dominio/estado.ts) fica na
// página (Pedido.tsx), que só passa a frase pronta em `resultado`.
//
// O botão "Limpar" usa `aria-disabled` (nunca `disabled` nativo) quando
// `valor` está vazio, para permanecer focável; o próprio `onClick` só chama
// `onLimpar` de fato quando há valor preenchido.
//
// Ajuste Modelo B (2026-10-08, mockup à risca): cartão "Ver estado em" com
// rótulo acima do campo, `.campo`, `.botao--primario` e `.botao--secundario`
// (painel.css). No celular o cartão é mantido (requisito RF-06), com os
// controles de 44px que a Base já aplica a `.campo`/`.botao`.
export function SeletorData({
  valor,
  onMudar,
  onVerEstado,
  onLimpar,
  resultado,
}: SeletorDataProps) {
  const limparDesabilitado = valor === "";

  function aoClicarLimpar() {
    if (limparDesabilitado) {
      return;
    }

    onLimpar();
  }

  return (
    <div className="seletor-data">
      <div className="seletor-data__campo">
        <label htmlFor={ID_INPUT} className="rotulo-campo">
          Ver estado em
        </label>
        <input
          id={ID_INPUT}
          type="date"
          className="campo seletor-data__input"
          value={valor}
          onChange={(event) => onMudar(event.target.value)}
        />
      </div>
      <button
        type="button"
        className="botao botao--primario"
        onClick={onVerEstado}
      >
        Ver estado
      </button>
      <button
        type="button"
        className="botao botao--secundario"
        aria-disabled={limparDesabilitado || undefined}
        onClick={aoClicarLimpar}
      >
        Limpar
      </button>
      <p className="seletor-data__resultado" aria-live="polite">
        {resultado}
      </p>
    </div>
  );
}
