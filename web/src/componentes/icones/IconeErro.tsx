// TP-0053 — ícone decorativo de erro (alerta/triângulo com exclamação).
// `aria-hidden="true"`: o anúncio de erro é feito pelo texto da mensagem e
// pelo `role="alert"` do container, não pelo ícone.
export function IconeErro() {
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
      <path d="M10 2.5 18 16.5H2L10 2.5Z" strokeLinejoin="round" />
      <path d="M10 8v4" strokeLinecap="round" />
      <circle cx="10" cy="14.25" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
