import { IconeBase } from "./IconeBase.tsx";

// Ícone decorativo de carregamento; o texto da mensagem comunica o estado.
export function IconeSpinner() {
  return (
    <IconeBase tamanho={20} viewBox="0 0 20 20" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.5" strokeOpacity="0.25" />
      <path d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5" strokeLinecap="round" />
    </IconeBase>
  );
}
