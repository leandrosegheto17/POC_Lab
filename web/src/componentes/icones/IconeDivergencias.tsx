import { IconeBase } from "./IconeBase.tsx";

// Ícone do item "Divergências" (triângulo de alerta). Tamanho por CSS (.icone-nav: 18px no PC, 20px no celular).
export function IconeDivergencias() {
  return (
    <IconeBase className="icone-nav" viewBox="0 0 24 24" strokeWidth="2" arredondado>
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </IconeBase>
  );
}
