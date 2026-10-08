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
};

// TP-0053 — estado de erro.
//
// Devolução de foco ao container no "Tentar de novo" (TP-0053) desativada —
// POC não precisa de suporte a leitor de tela.
export function EstadoErro({
  mensagem,
  onTentarDeNovo,
  interrompe = true,
}: EstadoErroProps) {
  function aoClicarTentarDeNovo() {
    onTentarDeNovo();
  }

  return (
    <div role={interrompe ? "alert" : undefined}>
      <IconeErro />
      <span>{mensagem}</span>
      <button type="button" onClick={aoClicarTentarDeNovo}>
        Tentar de novo
      </button>
    </div>
  );
}
