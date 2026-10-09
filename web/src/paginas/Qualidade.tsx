import { useState } from "react";
import { EsquemaRespostaQualidade } from "nucleo/contrato/qualidade.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { comTentativa, useConsulta } from "../dados/use-consulta.ts";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";
import { RelatorioQualidade } from "../componentes/qualidade/RelatorioQualidade.tsx";
import "./Qualidade.css";

// GET /api/v1/qualidade: 7 achados numa ordem fixa mais as sugestões da IA.
/** Monta a URL de consulta; ver `comTentativa`. */
function construirUrlConsulta(tentativa: number): string {
  return comTentativa("/api/v1/qualidade", tentativa);
}

export function Qualidade() {
  const refTitulo = useFocoNoTitulo();
  useTituloDocumento("Qualidade dos dados");

  const [tentativa, setTentativa] = useState(0);
  const estadoConsulta = useConsulta(
    construirUrlConsulta(tentativa),
    EsquemaRespostaQualidade,
  );

  function aoTentarDeNovo() {
    setTentativa((atual) => atual + 1);
  }

  return (
    <div className="qualidade">
      <div className="qualidade__topo">
        <p className="rotulo-pagina">Problemas do dado, não do pedido</p>
        <h1 ref={refTitulo} tabIndex={-1}>
          Qualidade dos dados
        </h1>
        {/* Só no celular (o rótulo acima do h1 some < 1024px). */}
        <p className="qualidade__subtitulo">Problemas do dado, não do pedido.</p>
      </div>

      <div aria-live="polite" className="qualidade__corpo">
        {estadoConsulta.status === "carregando" ? (
          <EstadoCarregando
            mensagem="Carregando relatório…"
            semAriaLiveProprio
          />
        ) : estadoConsulta.status === "erro" ? (
          <EstadoErro
            mensagem={estadoConsulta.mensagem}
            onTentarDeNovo={aoTentarDeNovo}
            interrompe={false}
          />
        ) : (
          <RelatorioQualidade dados={estadoConsulta.dados} />
        )}
      </div>
    </div>
  );
}
