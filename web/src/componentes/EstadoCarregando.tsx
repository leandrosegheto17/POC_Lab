import { IconeSpinner } from "./icones/IconeSpinner.tsx";

type EstadoCarregandoProps = {
  mensagem: string;
  /**
   * Quando `true`, o próprio componente NÃO declara `aria-live`: presume-se
   * que a tela-mãe já declarou uma região `aria-live` externa (uso composto,
   * por exemplo quando o mesmo container alterna entre EstadoCarregando e
   * EstadoErro). Quando `false` (padrão), o componente funciona isolado,
   * declarando sua própria região `aria-live="polite"`.
   */
  semAriaLiveProprio?: boolean;
};

// TP-0053 — estado de carregamento: `aria-busy` sinaliza que a região está
// ocupada; `aria-live="polite"` (quando não suprimido por `semAriaLiveProprio`)
// garante que a mensagem seja anunciada por leitores de tela sem interromper
// o que estiver sendo lido no momento. O texto da mensagem é sempre visível
// (não depende só do ícone, que é puramente decorativo).
export function EstadoCarregando({
  mensagem,
  semAriaLiveProprio = false,
}: EstadoCarregandoProps) {
  return (
    <div
      aria-busy="true"
      aria-live={semAriaLiveProprio ? undefined : "polite"}
    >
      <IconeSpinner />
      <span>{mensagem}</span>
    </div>
  );
}
