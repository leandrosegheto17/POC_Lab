// TP-0053 — ícone decorativo de carregamento (spinner).
// `aria-hidden="true"` porque é puramente decorativo: o texto da mensagem é
// quem comunica o estado, o ícone nunca deve ser lido por leitor de tela.
export function IconeSpinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" strokeOpacity="0.25" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" strokeLinecap="round" />
    </svg>
  );
}
