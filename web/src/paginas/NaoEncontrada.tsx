import { Link } from "react-router";
import { CampoBusca } from "../componentes/CampoBusca.tsx";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import "./NaoEncontrada.css";

// TP-0055 — T5: página de rota não encontrada. Puramente apresentacional —
// não importa `cliente-api` nem faz qualquer chamada de rede, só monta a
// partir da rota corrente (`path="*"` em Rotas.tsx).
//
// Ajuste Modelo B (2026-10-08, mockup à risca): fica na casca simples (sem
// busca na barra, sem faixa, navegação sem ícones — ver Rotas.tsx), então a
// página tem a própria busca (`CampoBusca variante="pagina"`, id próprio) e
// o link "Ir para Divergências →".
export function NaoEncontrada() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Página não encontrada");

  return (
    <div className="nao-encontrada">
      <p className="mono nao-encontrada__codigo">404</p>
      <h1 ref={refTitulo} tabIndex={-1}>
        Página não encontrada
      </h1>
      <p className="nao-encontrada__texto">
        O endereço não existe. Para ver um pedido, busque pelo código:{" "}
        <span className="mono nao-encontrada__exemplo">PED-000123</span> ou o
        código de qualquer sistema.
      </p>
      <CampoBusca variante="pagina" id="busca-pedido-404" />
      <Link to="/" className="nao-encontrada__link">
        Ir para Divergências <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
