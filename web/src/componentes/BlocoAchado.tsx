import { Link } from "react-router";
import type { Achado } from "processamento/contrato/qualidade.js";
import { TabelaDados } from "./TabelaDados.tsx";
import { EtiquetaFonte } from "./EtiquetaFonte.tsx";

type BlocoAchadoProps = {
  /** Título em português do tipo de achado (mapeado pela página — nunca o literal de `tipo`). */
  titulo: string;
  achado: Achado;
};

// TP-0064 — Bloco de um tipo de achado de qualidade (T4): título, regra
// aplicada e, quando há casos (`contagem > 0`), até 10 exemplos em tabela
// (fonte/referência/detalhe), com link para o pedido relacionado (T2) quando
// o exemplo tiver `pedido`. `contagem === 0` mostra só a regra e "Nenhum
// caso encontrado." — sem tabela, já que `exemplos` vem vazio nesse caso.
export function BlocoAchado({ titulo, achado }: BlocoAchadoProps) {
  return (
    <section>
      <h2>{titulo}</h2>
      <p>Regra: {achado.regra}</p>
      {achado.contagem === 0 ? (
        <p>Nenhum caso encontrado.</p>
      ) : (
        <>
          <p>Contagem: {achado.contagem}</p>
          <TabelaDados
            caption={titulo}
            cabecalhos={["Fonte", "Referência", "Detalhe"]}
            // T4 renderiza um `BlocoAchado` por tipo (até 7 na mesma página);
            // sem um rótulo que incorpore `titulo`, todas as regiões
            // roláveis compartilhariam o mesmo `aria-label` padrão de
            // `TabelaDados` ("Tabela com rolagem horizontal"), violando a
            // regra `landmark-unique` do axe (landmarks com o mesmo papel
            // precisam de nome acessível distinto).
            rotuloRegiao={`Tabela com rolagem horizontal: ${titulo}`}
          >
            {achado.exemplos.map((exemplo, indice) => (
              <tr key={`${exemplo.fonte}-${exemplo.referencia}-${indice}`}>
                <td>
                  <EtiquetaFonte fonte={exemplo.fonte} />
                </td>
                <td>
                  {exemplo.pedido ? (
                    <Link to={`/pedido/${encodeURIComponent(exemplo.pedido)}`}>
                      {exemplo.referencia}
                    </Link>
                  ) : (
                    exemplo.referencia
                  )}
                </td>
                <td>{exemplo.detalhe}</td>
              </tr>
            ))}
          </TabelaDados>
        </>
      )}
    </section>
  );
}
