// TP-0053 — ícone decorativo de estado vazio (caixa/bandeja vazia).
// `aria-hidden="true"`: a mensagem de texto já comunica o estado vazio.
export function IconeVazio() {
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
      <path d="M2.5 7.5 10 3.5l7.5 4v8l-7.5 4-7.5-4v-8Z" strokeLinejoin="round" />
      <path d="M2.5 7.5 10 11.5l7.5-4" strokeLinejoin="round" />
      <path d="M10 11.5v8" />
    </svg>
  );
}
