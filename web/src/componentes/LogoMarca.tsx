// Marca do produto: selo "P" decorativo
// (aria-hidden) + nome "POC_Lab" + subtítulo "conciliação de pedidos", como
// no topo da barra lateral do mockup (Modelo B). Elemento puramente
// apresentacional — sem link, sem campo focável —, então a posição dele no
// DOM não participa da ordem de foco documentada em Casca.tsx (pular para
// o conteúdo -> busca -> navegação -> conteúdo).
export function LogoMarca() {
  return (
    <div className="logo-marca">
      <span className="logo-marca__selo" aria-hidden="true">
        P
      </span>
      <div className="logo-marca__texto">
        <span className="logo-marca__nome">POC_Lab</span>
        <span className="logo-marca__subtitulo">conciliação de pedidos</span>
      </div>
    </div>
  );
}
