import { useState } from "react";
import { Link, useParams } from "react-router";
import "./Pedido.css";
import { EsquemaLinhaDoTempoV1 } from "processamento/contrato/linha-do-tempo-v1.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { comTentativa, useConsulta } from "../dados/use-consulta.ts";
import { DetalheLinhaDoTempo } from "../componentes/pedido/DetalheLinhaDoTempo.tsx";
import { EtiquetasDoPedido } from "../componentes/pedido/EtiquetasDoPedido.tsx";
import { SubtituloPc } from "../componentes/pedido/SubtituloPc.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../componentes/EstadoVazio.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";

// Página do pedido: GET /api/v1/pedidos/{codigo}/linha-do-tempo. Uma única
// chamada traz cabeçalho (identidade/fontes/valores/divergências) e a lista
// de eventos.
//
// 404 `pedido_nao_encontrado` e 400 `parametro_invalido` são ESTADO VAZIO,
// não erro: um código que não existe ou está em formato inesperado é um
// resultado de busca sem achado — por isso não ganha "Tentar de novo"
// (recarregar não muda o resultado) nem `role="alert"`. Qualquer outro erro
// (5xx/rede/timeout) é falha real, com `EstadoErro` + "Tentar de novo".

/** URL da consulta; o código vai codificado e a tentativa só força nova chamada. */
function construirUrlConsulta(codigo: string, tentativa: number): string {
  return comTentativa(
    `/api/v1/pedidos/${encodeURIComponent(codigo)}/linha-do-tempo`,
    tentativa,
  );
}

export function Pedido() {
  const { codigo } = useParams();
  const refTitulo = useFocoNoTitulo();

  const [tentativa, setTentativa] = useState(0);
  const urlConsulta = codigo ? construirUrlConsulta(codigo, tentativa) : null;
  const estadoConsulta = useConsulta(urlConsulta, EsquemaLinhaDoTempoV1);

  const vazioCorrigivel =
    estadoConsulta.status === "erro" &&
    (estadoConsulta.codigo === "pedido_nao_encontrado" ||
      estadoConsulta.codigo === "parametro_invalido");

  const tituloDocumento =
    estadoConsulta.status === "sucesso"
      ? `Pedido ${estadoConsulta.dados.pedido.identidade}`
      : vazioCorrigivel
        ? "Pedido não encontrado"
        : "Pedido";
  useTituloDocumento(tituloDocumento);

  function aoTentarDeNovo() {
    setTentativa((atual) => atual + 1);
  }

  const dadosCarregados =
    estadoConsulta.status === "sucesso" ? estadoConsulta.dados : null;

  return (
    <>
      <div className="pedido-topo">
        <Link to="/" className="pedido-voltar">
          <span aria-hidden="true">← </span>Divergências
        </Link>
        <div className="pedido-titulo-linha">
          <h1
            ref={refTitulo}
            tabIndex={-1}
            className={dadosCarregados ? "pedido-titulo" : undefined}
          >
            {dadosCarregados ? (
              <>
                <span className="visualmente-oculto">Pedido </span>
                {dadosCarregados.pedido.identidade}
              </>
            ) : (
              tituloDocumento
            )}
          </h1>
          {dadosCarregados ? (
            <EtiquetasDoPedido pedido={dadosCarregados.pedido} />
          ) : null}
        </div>
        {dadosCarregados ? (
          <SubtituloPc pedido={dadosCarregados.pedido} />
        ) : null}
      </div>

      <div aria-live="polite" className="pedido-corpo">
        {vazioCorrigivel ? (
          <EstadoVazio mensagem="Pedido não encontrado" />
        ) : estadoConsulta.status === "carregando" ? (
          <EstadoCarregando mensagem="Buscando pedido…" semAriaLiveProprio />
        ) : estadoConsulta.status === "erro" ? (
          <EstadoErro
            mensagem={estadoConsulta.mensagem}
            onTentarDeNovo={aoTentarDeNovo}
            interrompe={false}
          />
        ) : (
          <DetalheLinhaDoTempo dados={estadoConsulta.dados} />
        )}
        {vazioCorrigivel ? (
          <p>
            Use o código do pedido (PED-nnnnnn), o código de vendas, de
            pagamento (TX-) ou de rastreio (RS-).
          </p>
        ) : null}
      </div>
    </>
  );
}
