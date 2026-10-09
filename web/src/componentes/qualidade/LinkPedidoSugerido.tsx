import { Link } from "react-router";

export function LinkPedidoSugerido({ codigo }: { codigo: string }) {
  return (
    <Link to={`/pedido/${encodeURIComponent(codigo)}`} className="mono">
      {codigo}
    </Link>
  );
}
