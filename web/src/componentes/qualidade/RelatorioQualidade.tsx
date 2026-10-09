import { useState } from "react";
import { useLocation } from "react-router";
import type { Achado, RespostaQualidade } from "nucleo/contrato/qualidade.js";
import type { TipoAchado } from "nucleo/dominio/modelo.js";
import { TIPOS_ACHADO_EM_ORDEM } from "../../dados/rotulos.ts";
import { filtrarSugestoesValidas } from "../../dados/sugestoes-ia.ts";
import { formatarNumero } from "../../dados/formatacao.ts";
import {
  BlocoAchado,
  BlocoAchadoCelular,
  idAchado,
} from "../BlocoAchado.tsx";
import { TabelaDados } from "../TabelaDados.tsx";
import { EtiquetaConferida } from "./EtiquetaConferida.tsx";
import { LinkPedidoSugerido } from "./LinkPedidoSugerido.tsx";

// A API devolve os 7 achados em qualquer ordem (o contrato só garante um por
// tipo); a ordem de exibição vem de `TIPOS_ACHADO_EM_ORDEM` e cada entrada
// busca o achado por `tipo`, nunca pela posição no array.
//
// Duas formas, alternadas só por CSS (`Qualidade.css`, breakpoint 1024px):
// - PC (`.qualidade__pc`): mini-cartões-âncora e um cartão por achado;
// - celular (`.qualidade__celular`): um `<details>` por achado, o primeiro
//   aberto. A forma oculta sai com `display:none` (fora da árvore de
//   acessibilidade), então não há leitura em dobro.

/** Mensagem exibida quando a IA não foi usada ou não sobrou sugestão válida. */
const MENSAGEM_SEM_SUGESTOES_IA = (
  <p className="caixa-formula">
    IA não utilizada nesta publicação: pagamentos ficaram &quot;sem
    sugestão&quot;.
  </p>
);

/** Tipo de achado apontado pelo fragmento da URL (`#achado-<tipo>`), se houver. */
function tipoDoHash(hash: string): TipoAchado | null {
  const encontrado = TIPOS_ACHADO_EM_ORDEM.find(
    ({ tipo }) => `#${idAchado(tipo)}` === hash,
  );
  return encontrado ? encontrado.tipo : null;
}

export function RelatorioQualidade({ dados }: { dados: RespostaQualidade }) {
  const { hash } = useLocation();
  // Mini-cartão selecionado: o último clicado; antes de qualquer clique, o
  // do fragmento da URL; sem fragmento, o primeiro.
  const [tipoClicado, setTipoClicado] = useState<TipoAchado | null>(null);
  const tipoAtual =
    tipoClicado ?? tipoDoHash(hash) ?? TIPOS_ACHADO_EM_ORDEM[0]?.tipo;

  // Defensivo: se algum achado faltar, ele não é renderizado em vez de
  // quebrar a tela inteira.
  const achadosEmOrdem = TIPOS_ACHADO_EM_ORDEM.flatMap(({ tipo, titulo }) => {
    const achado: Achado | undefined = dados.achados.find(
      (item) => item.tipo === tipo,
    );
    return achado ? [{ tipo, titulo, achado }] : [];
  });

  const sugestoes = dados.ia.utilizada
    ? filtrarSugestoesValidas(dados.ia.sugestoes)
    : [];
  const temSugestoes = sugestoes.length > 0;

  return (
    <>
      <div className="qualidade__pc">
        <nav aria-label="Tipos de achado" className="qualidade__tipos">
          {achadosEmOrdem.map(({ tipo, titulo, achado }) => {
            const atual = tipo === tipoAtual;
            return (
              <a
                key={tipo}
                href={`#${idAchado(tipo)}`}
                className={
                  atual
                    ? "qualidade__tipo qualidade__tipo--atual"
                    : "qualidade__tipo"
                }
                aria-current={atual ? "true" : undefined}
                onClick={() => { setTipoClicado(tipo); }}
              >
                <span className="qualidade__tipo-nome">{titulo}</span>
                <span className="qualidade__tipo-contagem">
                  {formatarNumero(achado.contagem)}
                </span>
              </a>
            );
          })}
        </nav>

        {achadosEmOrdem.map(({ tipo, titulo, achado }) => (
          <BlocoAchado key={tipo} titulo={titulo} achado={achado} />
        ))}

        <section className="cartao qualidade-ia">
          <div className="qualidade-ia__topo">
            <h2>Sugestões da IA</h2>
            <span className="qualidade-ia__aparte">
              À parte: não entram nos indicadores
            </span>
          </div>
          {temSugestoes ? (
            <>
              <p className="caixa-formula">
                A IA sugere o pedido de um pagamento com referência vaga. Uma
                regra confere valor e data; se não bater, a sugestão é
                rejeitada.
              </p>
              <TabelaDados
                caption="Sugestões da IA para pagamentos sem identificação"
                cabecalhos={[
                  "Pagamento",
                  "Texto da referência",
                  "Pedido sugerido",
                  "Conferida?",
                  "Motivo da regra",
                ]}
                rotuloRegiao="Sugestões da IA"
                legendaOculta
                semMoldura
                compacta
              >
                {sugestoes.map((sugestao) => (
                  <tr key={sugestao.pagamento}>
                    <td className="mono">{sugestao.pagamento}</td>
                    <td>&quot;{sugestao.textoReferencia}&quot;</td>
                    <td>
                      <LinkPedidoSugerido codigo={sugestao.pedidoSugerido} />
                    </td>
                    <td>
                      <EtiquetaConferida conferida={sugestao.conferida} />
                    </td>
                    <td>{sugestao.motivo}</td>
                  </tr>
                ))}
              </TabelaDados>
            </>
          ) : (
            MENSAGEM_SEM_SUGESTOES_IA
          )}
        </section>
      </div>

      <div className="qualidade__celular">
        {achadosEmOrdem.map(({ tipo, titulo, achado }, indice) => (
          <BlocoAchadoCelular
            key={tipo}
            titulo={titulo}
            achado={achado}
            aberto={indice === 0}
          />
        ))}

        <details className="achado-celular achado-celular--tracejado">
          <summary className="achado-celular__resumo">
            <h2>Sugestões da IA</h2>
          </summary>
          <div className="achado-celular__corpo">
            {temSugestoes ? (
              <>
                <p className="caixa-formula">
                  Não entram nos indicadores. Uma regra confere valor e data de
                  cada sugestão.
                </p>
                <ul className="achado-celular__exemplos">
                  {sugestoes.map((sugestao) => (
                    <li
                      key={sugestao.pagamento}
                      className="achado-celular__exemplo"
                    >
                      <span>
                        <span className="mono">{sugestao.pagamento}</span>
                        {" → "}
                        <LinkPedidoSugerido codigo={sugestao.pedidoSugerido} />
                      </span>
                      <EtiquetaConferida conferida={sugestao.conferida} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              MENSAGEM_SEM_SUGESTOES_IA
            )}
          </div>
        </details>
      </div>
    </>
  );
}
