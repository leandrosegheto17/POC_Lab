import { IconeBase } from "./IconeBase.tsx";

// Ícone do item "Indicadores" (barras). Tamanho por CSS (.icone-nav: 18px no PC, 20px no celular).
export function IconeIndicadores() {
  return (
    <IconeBase className="icone-nav" viewBox="0 0 24 24" strokeWidth="2" arredondado>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </IconeBase>
  );
}
