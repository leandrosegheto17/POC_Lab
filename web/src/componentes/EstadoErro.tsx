import { useRef, type RefObject } from "react";
import { IconeErro } from "./icones/IconeErro.tsx";

type EstadoErroProps = {
  mensagem: string;
  onTentarDeNovo: () => void;
  /**
   * Quando `true` (padrão), o erro interrompe a leitura da tela e o
   * container recebe `role="alert"` (anúncio assertivo, imediato). Quando
   * `false`, nenhum `role` é aplicado — útil para erro "discreto" dentro de
   * uma região `aria-live="polite"` já controlada pela tela-mãe, onde um
   * segundo `role="alert"` aninhado seria redundante/competiria com ela.
   */
  interrompe?: boolean;
  /** Região de conteúdo da tela-mãe (precisa de tabIndex=-1) que recebe o foco. */
  regiaoFoco?: RefObject<HTMLElement | null>;
};

// TP-0053 — estado de erro.
//
// "Tentar de novo" devolve o foco à região de conteúdo (a externa, se a
// tela-mãe passar `regiaoFoco`; senão o próprio container, com tabIndex=-1) e
// chama o callback; a tela-mãe então troca para `EstadoCarregando`, e a região
// aria-live reanuncia "Carregando…".
export function EstadoErro({
  mensagem,
  onTentarDeNovo,
  interrompe = true,
  regiaoFoco,
}: EstadoErroProps) {
  const ref = useRef<HTMLDivElement>(null);

  function aoClicarTentarDeNovo() {
    (regiaoFoco?.current ?? ref.current)?.focus();
    onTentarDeNovo();
  }

  return (
    <div ref={ref} tabIndex={-1} role={interrompe ? "alert" : undefined}>
      <IconeErro />
      <span>{mensagem}</span>
      <button
        type="button"
        className="botao botao--secundario"
        onClick={aoClicarTentarDeNovo}
      >
        Tentar de novo
      </button>
    </div>
  );
}
