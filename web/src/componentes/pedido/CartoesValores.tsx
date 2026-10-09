import {
  emCentavos,
  formatarData,
  formatarMoeda,
  formatarSaldo,
  formatarValor,
} from "../../dados/formatacao.ts";
import type { PedidoV1 } from "./EtiquetasDoPedido.tsx";

/**
 * Cartões de valor. PC: Devido, Pago, Saldo e Data limite (com "R$"). Celular:
 * Devido, Pago e Limite, sem "R$" e sem Saldo (mockup). Pago e Saldo ficam em
 * vermelho quando o pago difere do devido — o texto do valor e o sinal do
 * saldo dizem o mesmo sem depender da cor.
 */
export function CartoesValores({ pedido }: { pedido: PedidoV1 }) {
  const saldo = emCentavos(pedido.pago) - emCentavos(pedido.devido);
  const classeValorPago =
    saldo !== 0 ? "kpi__valor pedido-valor--ruim" : "kpi__valor";
  const dataLimite = formatarData(pedido.dataLimite);

  return (
    <>
      <dl className="kpis pedido-kpis pedido-kpis--pc">
        <div className="kpi">
          <dt className="kpi__rotulo">Devido</dt>
          <dd className="kpi__valor">{formatarMoeda(pedido.devido)}</dd>
        </div>
        <div className="kpi">
          <dt className="kpi__rotulo">Pago</dt>
          <dd className={classeValorPago}>{formatarMoeda(pedido.pago)}</dd>
        </div>
        <div className="kpi">
          <dt className="kpi__rotulo">Saldo</dt>
          <dd className={classeValorPago}>{formatarSaldo(saldo)}</dd>
        </div>
        <div className="kpi">
          <dt className="kpi__rotulo">Data limite</dt>
          <dd className="kpi__valor mono pedido-valor-data">{dataLimite}</dd>
        </div>
      </dl>

      <dl className="kpis kpis--celular pedido-kpis pedido-kpis--celular">
        <div className="kpi">
          <dt className="kpi__rotulo">Devido</dt>
          <dd className="kpi__valor">{formatarValor(pedido.devido)}</dd>
        </div>
        <div className="kpi">
          <dt className="kpi__rotulo">Pago</dt>
          <dd className={classeValorPago}>{formatarValor(pedido.pago)}</dd>
        </div>
        <div className="kpi">
          <dt className="kpi__rotulo">Limite</dt>
          <dd className="kpi__valor mono pedido-valor-data">{dataLimite}</dd>
        </div>
      </dl>
    </>
  );
}
