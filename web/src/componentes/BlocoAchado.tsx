import { Link } from "react-router";
import type {
  Achado,
  ExemploAchado,
} from "nucleo/contrato/qualidade.js";
import { TabelaDados } from "./TabelaDados.tsx";
import { rotuloFonte } from "./EtiquetaFonte.tsx";
import { formatarNumero } from "../dados/formatacao.ts";

type BlocoAchadoProps = {
  /** Título em português do tipo de achado (mapeado pela página — nunca o literal de `tipo`). */
  titulo: string;
  achado: Achado;
};

/** Id da âncora do achado na forma PC (alvo dos mini-cartões da T4). */
export function idAchado(tipo: Achado["tipo"]): string {
  return `achado-${tipo}`;
}

/**
 * Texto da referência: no sistema de vendas a referência é o número do
 * pedido (ex. "11078") e o mockup mostra "#11078". As demais fontes (e
 * referências que não são só dígitos) aparecem como vieram da API.
 */
function textoReferencia(exemplo: ExemploAchado): string {
  return exemplo.fonte === "vendas" && /^\d+$/.test(exemplo.referencia)
    ? `#${exemplo.referencia}`
    : exemplo.referencia;
}

/** Referência em mono; link para a T2 quando o exemplo tem `pedido`. */
function Referencia({ exemplo }: { exemplo: ExemploAchado }) {
  const texto = textoReferencia(exemplo);
  return exemplo.pedido ? (
    <Link
      to={`/pedido/${encodeURIComponent(exemplo.pedido)}`}
      className="mono"
    >
      {texto}
    </Link>
  ) : (
    <span className="mono">{texto}</span>
  );
}

// Cartão de um tipo de achado de
// qualidade na forma PC da T4: h2 + contagem à direita, regra na caixa de
// fórmula e, quando há casos (`contagem > 0`), os exemplos que a API mandar
// (até 10) numa tabela compacta Fonte | Referência | Detalhe. `contagem ===
// 0` mostra só a regra e "Nenhum caso encontrado." — sem tabela. Os textos
// de regra e detalhe vêm do processamento e são exibidos como vieram.
export function BlocoAchado({ titulo, achado }: BlocoAchadoProps) {
  return (
    <section className="cartao bloco-achado" id={idAchado(achado.tipo)}>
      <div className="bloco-achado__topo">
        <h2>{titulo}</h2>
        <span className="bloco-achado__contagem">
          <span className="visualmente-oculto">Casos: </span>
          <span className="mono">{formatarNumero(achado.contagem)}</span>
        </span>
      </div>
      <p className="caixa-formula">Regra: {achado.regra}</p>
      {achado.contagem === 0 ? (
        <p className="bloco-achado__vazio">Nenhum caso encontrado.</p>
      ) : (
        <TabelaDados
          caption={`Exemplos: ${titulo}`}
          cabecalhos={["Fonte", "Referência", "Detalhe"]}
          legendaOculta
          semMoldura
          compacta
          // Até 7 tabelas na mesma página: cada região rolável precisa de
          // nome distinto (regra `landmark-unique` do axe).
          rotuloRegiao={`Exemplos: ${titulo}`}
        >
          {achado.exemplos.map((exemplo, indice) => (
            <tr key={`${exemplo.fonte}-${exemplo.referencia}-${String(indice)}`}>
              <td>{rotuloFonte(exemplo.fonte)}</td>
              <td>
                <Referencia exemplo={exemplo} />
              </td>
              <td>{exemplo.detalhe}</td>
            </tr>
          ))}
        </TabelaDados>
      )}
    </section>
  );
}

type BlocoAchadoCelularProps = BlocoAchadoProps & {
  /** O primeiro achado da lista começa aberto. */
  aberto?: boolean;
};

// O mesmo achado na forma do celular: um
// <details> com o <h2> dentro do <summary> (mantém a hierarquia de títulos)
// e a contagem à direita; no corpo, a regra e os exemplos em linhas
// (referência à esquerda, detalhe à direita).
export function BlocoAchadoCelular({
  titulo,
  achado,
  aberto = false,
}: BlocoAchadoCelularProps) {
  return (
    <details className="achado-celular" open={aberto}>
      <summary className="achado-celular__resumo">
        <h2>{titulo}</h2>
        <span className="achado-celular__contagem">
          <span className="visualmente-oculto">Casos: </span>
          {formatarNumero(achado.contagem)}
        </span>
      </summary>
      <div className="achado-celular__corpo">
        <p className="caixa-formula">Regra: {achado.regra}</p>
        {achado.contagem === 0 ? (
          <p className="achado-celular__vazio">Nenhum caso encontrado.</p>
        ) : (
          <ul className="achado-celular__exemplos">
            {achado.exemplos.map((exemplo, indice) => (
              <li
                key={`${exemplo.fonte}-${exemplo.referencia}-${String(indice)}`}
                className="achado-celular__exemplo"
              >
                <Referencia exemplo={exemplo} />
                <span className="achado-celular__detalhe">
                  {exemplo.detalhe}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
