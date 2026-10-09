import type { ReactNode, Ref } from "react";
import "./TabelaDados.css";

/**
 * Cabeçalho de coluna: texto simples ou objeto com opções.
 * `numerico` alinha à direita com números tabulares (`.num`);
 * `oculto` deixa o texto do `<th>` só para leitor de tela.
 */
export type CabecalhoTabela =
  | string
  | { texto: string; numerico?: boolean; oculto?: boolean };

type TabelaDadosProps = {
  /** Legenda da tabela, renderizada em `<caption>` (acessível, não visual-only). */
  caption: ReactNode;
  /** Rótulos das colunas, um `<th scope="col">` por item. */
  cabecalhos: CabecalhoTabela[];
  /** Linhas `<tr>` já montadas pela tela consumidora (mantém este componente
   * agnóstico do formato de dados — reutilizável por qualquer tela). */
  children?: ReactNode;
  /** Rótulo do contêiner rolável; default cobre o caso comum de rolagem
   * horizontal em telas estreitas. */
  rotuloRegiao?: string;
  /**
   * Ref opcional para o `<caption>` — usada por telas que
   * precisam mover o foco de teclado para ele programaticamente (ex.: ao
   * trocar de página). Quando fornecida, o `<caption>` recebe
   * `tabIndex={-1}` (focável só via `.focus()`, não pelo Tab).
   */
  refCaption?: Ref<HTMLTableCaptionElement>;
  /** Legenda só para leitor de tela (`.visualmente-oculto`). */
  legendaOculta?: boolean;
  /** Sem fundo/borda/raio no contêiner — para tabela dentro de `.cartao`. */
  semMoldura?: boolean;
  /** Células mais baixas (th `10px 12px`, td `11px 12px`). */
  compacta?: boolean;
};

function normalizar(cabecalho: CabecalhoTabela) {
  return typeof cabecalho === "string" ? { texto: cabecalho } : cabecalho;
}

// Tabela de dados genérica e acessível.
//
// O contêiner externo com `role="region"` + `aria-label` + `tabIndex={0}`
// torna a área rolável alcançável via teclado (sem isso, um `overflow:
// auto` só é operável com mouse/touch) e identificável por leitor de tela
// quando a tabela é mais larga que a viewport.
export function TabelaDados({
  caption,
  cabecalhos,
  children,
  rotuloRegiao = "Tabela com rolagem horizontal",
  refCaption,
  legendaOculta = false,
  semMoldura = false,
  compacta = false,
}: TabelaDadosProps) {
  const classeRegiao = [
    "tabela-dados-regiao",
    semMoldura ? "tabela-dados-regiao--sem-moldura" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const classeTabela = ["tabela-dados", compacta ? "tabela-dados--compacta" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classeRegiao}
      tabIndex={0}
      role="region"
      aria-label={rotuloRegiao}
    >
      <table className={classeTabela}>
        <caption
          ref={refCaption}
          tabIndex={refCaption ? -1 : undefined}
          className={legendaOculta ? "visualmente-oculto" : undefined}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {cabecalhos.map((item, indice) => {
              const { texto, numerico, oculto } = normalizar(item);

              return (
                <th
                  key={`${texto}-${String(indice)}`}
                  scope="col"
                  className={numerico ? "num" : undefined}
                >
                  {oculto ? (
                    <span className="visualmente-oculto">{texto}</span>
                  ) : (
                    texto
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
