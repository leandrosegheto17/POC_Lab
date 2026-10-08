import { useRef } from "react";
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
// Fluxo esperado de "Tentar de novo" (a troca de componente NÃO é feita
// aqui, é responsabilidade da tela-mãe):
//   1. Usuário clica em "Tentar de novo".
//   2. Este componente devolve o foco ao próprio container (via ref +
//      tabIndex={-1} + .focus()) ANTES/junto de disparar `onTentarDeNovo`.
//   3. `onTentarDeNovo` dispara a nova chamada (hook `useConsulta`/
//      `clienteApi` — fora de escopo aqui).
//   4. A tela-mãe substitui este componente por `EstadoCarregando` dentro da
//      MESMA região `aria-live` externa que já envolve ambos, e essa região
//      anuncia "Carregando…" automaticamente porque o foco já estava
//      posicionado nela quando a troca ocorreu.
export function EstadoErro({
  mensagem,
  onTentarDeNovo,
  interrompe = true,
}: EstadoErroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  function aoClicarTentarDeNovo() {
    containerRef.current?.focus();
    onTentarDeNovo();
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role={interrompe ? "alert" : undefined}
    >
      <IconeErro />
      <span>{mensagem}</span>
      <button type="button" onClick={aoClicarTentarDeNovo}>
        Tentar de novo
      </button>
    </div>
  );
}
