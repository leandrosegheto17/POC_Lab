import { useState } from "react";
import { useParams } from "react-router";
import "./Pedido.css";
import {
  EsquemaLinhaDoTempoV1,
  type LinhaDoTempoV1,
} from "processamento/contrato/linha-do-tempo-v1.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import { EtiquetaFonte } from "../componentes/EtiquetaFonte.tsx";
import { EtiquetaTipo } from "../componentes/EtiquetaTipo.tsx";
import { LinhaDoTempo } from "../componentes/LinhaDoTempo.tsx";
import { EstadoCarregando } from "../componentes/EstadoCarregando.tsx";
import { EstadoVazio } from "../componentes/EstadoVazio.tsx";
import { EstadoErro } from "../componentes/EstadoErro.tsx";

// TP-0062 — T2 Linha do tempo do pedido: GET
// /api/v1/pedidos/{codigo}/linha-do-tempo. UMA ÚNICA chamada traz
// cabeçalho (identidade/fontes/valores/divergências) e a lista de eventos
// (renderizada por `LinhaDoTempo`, TP-0061, sem reordenar).
//
// 404 `pedido_nao_encontrado` e 400 `parametro_invalido` são tratados como
// ESTADO VAZIO (não erro): um código que não existe/está em formato
// inesperado não é uma falha do sistema, é um resultado de busca sem
// achado — por isso não ganha "Tentar de novo" (recarregar a mesma consulta
// não vai mudar o resultado) nem `role="alert"`. Qualquer outro erro
// (5xx/rede/timeout) é tratado como falha real, com `EstadoErro` + "Tentar
// de novo".
const FORMATADOR_MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** `AAAA-MM-DD` a partir de uma data ISO completa ou já curta. */
function formatarDataLimite(dataLimite: string): string {
  return dataLimite.slice(0, 10);
}

/**
 * Monta a URL de consulta. O sufixo `#tentativa` é um fragmento, nunca
 * enviado ao servidor — só força `useConsulta` a refazer a mesma chamada a
 * cada clique em "Tentar de novo" (mesmo padrão de `Divergencias.tsx`,
 * TP-0059, e `Qualidade.tsx`, TP-0064).
 */
function construirUrlConsulta(codigo: string, tentativa: number): string {
  return `/api/v1/pedidos/${encodeURIComponent(codigo)}/linha-do-tempo#${tentativa}`;
}

export function Pedido() {
  const { codigo } = useParams();
  const refTitulo = useFocoNoTitulo<HTMLHeadingElement>();

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

  return (
    <>
      <h1 ref={refTitulo} tabIndex={-1}>
        {tituloDocumento}
      </h1>

      <div aria-live="polite">
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

function DetalheLinhaDoTempo({ dados }: { dados: LinhaDoTempoV1 }) {
  const { pedido, eventos } = dados;

  return (
    <>
      {pedido.codigoBuscado !== pedido.identidade ? (
        <p>Encontrado pelo código {pedido.codigoBuscado}</p>
      ) : null}

      <p>
        Aparece em {pedido.fontes.length} de 3 fontes:{" "}
        {pedido.fontes.map((item, indice) => (
          <span key={item.fonte}>
            {indice > 0 ? " · " : ""}
            <EtiquetaFonte fonte={item.fonte} />: <span>{item.codigo}</span>
          </span>
        ))}
      </p>

      <p className="pedido-valores-mono">
        Valor devido {FORMATADOR_MOEDA.format(pedido.devido)} · Pago{" "}
        {FORMATADOR_MOEDA.format(pedido.pago)} · Data limite{" "}
        {formatarDataLimite(pedido.dataLimite)}
      </p>

      <p>
        Situação:{" "}
        {pedido.divergencias.length === 0 ? (
          <EtiquetaTipo tipo="sem_divergencia" />
        ) : (
          pedido.divergencias.map((divergencia, indice) => (
            <span key={`${divergencia.tipo}-${indice}`}>
              <EtiquetaTipo tipo={divergencia.tipo} />
            </span>
          ))
        )}
      </p>

      <LinhaDoTempo eventos={eventos} />
    </>
  );
}
