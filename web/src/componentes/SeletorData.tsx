import "./SeletorData.css";

type SeletorDataProps = {
  valor: string;
  onMudar: (valor: string) => void;
  onVerEstado: () => void;
  onLimpar: () => void;
};

const ID_INPUT = "seletor-data-input";

// TP-0072 — SeletorData: componente CONTROLADO, sem lógica de domínio e sem
// chamada à API — só captura a data escolhida e dispara os callbacks
// recebidos via props. Integração com LinhaDoTempo.tsx/página de pedido e
// uso de dominio/estado.ts ficam fora de escopo aqui.
//
// O botão "Limpar" usa `aria-disabled` (nunca `disabled` nativo) quando
// `valor` está vazio, para permanecer focável; o próprio `onClick` só chama
// `onLimpar` de fato quando há valor preenchido.
export function SeletorData({
  valor,
  onMudar,
  onVerEstado,
  onLimpar,
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
      <label htmlFor={ID_INPUT} className="seletor-data__rotulo">
        Ver estado em uma data
      </label>
      <input
        id={ID_INPUT}
        type="date"
        className="seletor-data__input"
        value={valor}
        onChange={(event) => onMudar(event.target.value)}
      />
      <button type="button" onClick={onVerEstado}>
        Ver estado
      </button>
      <button
        type="button"
        aria-disabled={limparDesabilitado || undefined}
        onClick={aoClicarLimpar}
      >
        Limpar
      </button>
    </div>
  );
}
