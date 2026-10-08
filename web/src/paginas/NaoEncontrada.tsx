import { Link } from "react-router";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";

// TP-0055 — T5: página de rota não encontrada. Puramente apresentacional —
// não importa `cliente-api` nem faz qualquer chamada de rede, só monta a
// partir da rota corrente (`path="*"` em Rotas.tsx).
//
// Decisão documentada: não implementamos foco cruzado para o campo de
// busca (TP-0057 é tarefa paralela e ainda não existe nesta rodada) — a
// frase abaixo só indica textualmente que a busca está disponível no topo
// da página, sem mover o foco para lá via ref compartilhada.
export function NaoEncontrada() {
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();
  useTituloDocumento("Página não encontrada");

  return (
    <>
      <h1 ref={refTitulo} tabIndex={-1}>
        Página não encontrada
      </h1>
      <p>A página que você tentou acessar não existe ou foi movida.</p>
      <p>
        <Link to="/">Voltar para Divergências</Link>
      </p>
      <p>Dica: o campo de busca está disponível no topo da página.</p>
    </>
  );
}
