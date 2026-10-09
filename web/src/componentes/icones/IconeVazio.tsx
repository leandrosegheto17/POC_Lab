import { IconeBase } from "./IconeBase.tsx";

// Ícone decorativo de estado vazio; a mensagem de texto comunica o estado.
export function IconeVazio() {
  return (
    <IconeBase tamanho={20} viewBox="0 0 20 20" strokeWidth="1.5">
      <path d="M2.5 7.5 10 3.5l7.5 4v8l-7.5 4-7.5-4v-8Z" strokeLinejoin="round" />
      <path d="M2.5 7.5 10 11.5l7.5-4" strokeLinejoin="round" />
      <path d="M10 11.5v8" />
    </IconeBase>
  );
}
