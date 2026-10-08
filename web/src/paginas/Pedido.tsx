import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import "./Pedido.css";
import {
  EsquemaLinhaDoTempoV1,
  type EventoV1,
  type LinhaDoTempoV1,
} from "processamento/contrato/linha-do-tempo-v1.js";
import { derivarEstado } from "processamento/dominio/estado.js";
import { detectarDuplicado } from "processamento/dominio/divergencias/duplicado.js";
import type { Evento } from "processamento/dominio/evento.js";
import { useFocoNoTitulo } from "../nav/useFocoNoTitulo.ts";
import { useTituloDocumento } from "../nav/useTituloDocumento.ts";
import { useConsulta } from "../dados/use-consulta.ts";
import {
  formatarData,
  formatarMoeda,
  formatarValor,
} from "../dados/formatacao.ts";
import { EtiquetaEstado } from "../componentes/EtiquetaEstado.tsx";
import { EtiquetaTipo } from "../componentes/EtiquetaTipo.tsx";
import { LinhaDoTempo } from "../componentes/LinhaDoTempo.tsx";
import { SeletorData } from "../componentes/SeletorData.tsx";
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
/** Total de sistemas de origem (vendas, pagamentos, transportadora). */
const TOTAL_SISTEMAS = 3;

/** Arredonda para centavos (evita "−R$ 0,00" por resíduo de ponto flutuante). */
function emCentavos(valor: number): number {
  return Math.round(valor * 100);
}

/** Saldo pago − devido com sinal: "+R$ 440,00", "−R$ 176,00", "R$ 0,00". */
function formatarSaldo(saldoEmCentavos: number): string {
  const texto = formatarMoeda(Math.abs(saldoEmCentavos) / 100);
  if (saldoEmCentavos > 0) {
    return `+${texto}`;
  }
  if (saldoEmCentavos < 0) {
    return `−${texto}`;
  }
  return texto;
}

/**
 * Pagamentos a marcar como "duplicado" na linha do tempo. Só quando a API já
 * apontou a divergência `duplicado` para o pedido; a regra é a mesma do
 * processamento (`detectarDuplicado`, RN-03), rodando no navegador sobre os
 * pagamentos já carregados. O primeiro pagamento integral é o legítimo e
 * fica sem marca.
 */
function idsPagamentosDuplicados(dados: LinhaDoTempoV1): string[] {
  const { pedido, eventos } = dados;
  if (!pedido.divergencias.some((item) => item.tipo === "duplicado")) {
    return [];
  }

  const pagamentos = eventos.flatMap((evento) =>
    evento.tipo === "pagamento"
      ? [{ codigoEvento: evento.codigoEvento, valor: evento.valor }]
      : [],
  );
  const achado = detectarDuplicado(pedido.devido, pagamentos);
  return achado ? achado.idsEventos.slice(1) : [];
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

// TP-0073 — `EventoV1` (contrato da API) não tem `versao_schema` (não
// exposto na API v1 — ver comentário em linha-do-tempo-v1.ts); `Evento`
// (dominio, consumido por `derivarEstado`) exige esse campo. O cast abaixo
// é seguro porque `derivarEstado`/`ordenarEventos`/`calcularQuitacao` nunca
// leem `versao_schema` — só `tipo`, `momentoFato`, `codigoEvento`,
// `valor_devido` e `valor`, todos presentes em `EventoV1`.
function comoEventosDeDominio(eventos: EventoV1[]): Evento[] {
  return eventos as unknown as Evento[];
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

// TP-0073 — "Ver estado numa data": usa `derivarEstado` (TP-0012) no
// navegador, sobre os `eventos` JÁ carregados por esta mesma consulta —
// nenhuma nova chamada à API. Gatilho escolhido: REATIVO (recalcula a cada
// mudança de `dataEscolhida`, inclusive a cada tecla/seleção no
// `<input type="date">`), não preso ao clique em "Ver estado" — é o
// disparo mais simples (sem estado adicional de "data aplicada" nem
// handler dedicado) e o botão "Ver estado" do `SeletorData` (TP-0072) seria
// redundante com o próprio `onChange`; o botão continua renderizado (prop
// obrigatória do componente) mas seu `onClick` não faz nada além do que já
// aconteceu reativamente.
function DetalheLinhaDoTempo({ dados }: { dados: LinhaDoTempoV1 }) {
  const { pedido, eventos } = dados;
  const [dataEscolhida, setDataEscolhida] = useState<string | undefined>(
    undefined,
  );

  const estadoNaData = useMemo(() => {
    if (!dataEscolhida) {
      return null;
    }
    // AAAA-MM-DD vira o fim do dia, para incluir eventos do próprio dia.
    return derivarEstado(
      comoEventosDeDominio(eventos),
      `${dataEscolhida}T23:59:59.999Z`,
    );
  }, [eventos, dataEscolhida]);

  const idsDuplicados = useMemo(() => idsPagamentosDuplicados(dados), [dados]);

  const resultado =
    estadoNaData === null ? null : estadoNaData.vendido ? (
      <>
        Em <span className="mono">{dataEscolhida}</span>: {estadoNaData.frase}.
      </>
    ) : (
      "Nenhum evento até esta data."
    );

  return (
    <>
      <CartoesValores pedido={pedido} />

      <SeletorData
        valor={dataEscolhida ?? ""}
        onMudar={(valor) => setDataEscolhida(valor === "" ? undefined : valor)}
        onVerEstado={() => {}}
        onLimpar={() => setDataEscolhida(undefined)}
        resultado={resultado}
      />

      <section
        className="pedido-secao-linha"
        aria-labelledby="pedido-linha-do-tempo-titulo"
      >
        <h2 id="pedido-linha-do-tempo-titulo">
          <span className="so-pc">
            Linha do tempo por sistema{" "}
            <span className="pedido-h2-nota">· ordem do momento do fato</span>
          </span>
          <span className="so-celular">Linha do tempo</span>
        </h2>
        <LinhaDoTempo
          eventos={eventos}
          dataEscolhida={dataEscolhida}
          codigoVendas={
            pedido.fontes.find((item) => item.fonte === "vendas")?.codigo
          }
          dataLimite={pedido.dataLimite}
          idsDuplicados={idsDuplicados}
        />
      </section>
    </>
  );
}

type PedidoV1 = LinhaDoTempoV1["pedido"];

/**
 * Etiquetas da situação, ao lado do h1 no PC. No celular elas descem para a
 * linha de baixo, junto de "3 de 3 sistemas" (+ "encontrado por …" quando a
 * busca foi por outro código — requisito mantido, o mockup não mostra).
 */
function EtiquetasDoPedido({ pedido }: { pedido: PedidoV1 }) {
  const buscadoPorOutroCodigo = pedido.codigoBuscado !== pedido.identidade;

  return (
    <div className="pedido-etiquetas">
      {pedido.divergencias.length === 0 ? (
        <EtiquetaEstado variante="ok">Sem divergência</EtiquetaEstado>
      ) : (
        pedido.divergencias.map((divergencia, indice) => (
          <EtiquetaTipo
            key={`${divergencia.tipo}-${indice}`}
            tipo={divergencia.tipo}
          />
        ))
      )}
      <span className="so-celular pedido-sistemas">
        {pedido.fontes.length} de {TOTAL_SISTEMAS} sistemas
        {buscadoPorOutroCodigo ? (
          <>
            {" · encontrado por "}
            <span className="mono">{pedido.codigoBuscado}</span>
          </>
        ) : null}
      </span>
    </div>
  );
}

/** Subtítulo do PC (oculto no celular, onde a mesma informação vai para a
 * linha das etiquetas). */
function SubtituloPc({ pedido }: { pedido: PedidoV1 }) {
  const presenca = `${pedido.fontes.length} de ${TOTAL_SISTEMAS} sistemas`;

  return (
    <p className="so-pc pedido-subtitulo">
      {pedido.codigoBuscado !== pedido.identidade ? (
        <>
          Encontrado pelo código{" "}
          <span className="mono pedido-codigo-destaque">
            {pedido.codigoBuscado}
          </span>{" "}
          · presente em {presenca}
        </>
      ) : (
        `Presente em ${presenca}`
      )}
    </p>
  );
}

/**
 * Cartões de valor. PC: Devido, Pago, Saldo e Data limite (com "R$"). Celular:
 * Devido, Pago e Limite, sem "R$" e sem Saldo (mockup). Pago e Saldo ficam em
 * vermelho quando o pago difere do devido — o texto do valor e o sinal do
 * saldo dizem o mesmo sem depender da cor.
 */
function CartoesValores({ pedido }: { pedido: PedidoV1 }) {
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
