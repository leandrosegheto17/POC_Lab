import type { ReactNode, Ref } from "react";
import "./TabelaDados.css";

type TabelaDadosProps = {
  /** Legenda da tabela, renderizada em `<caption>` (acessível, não visual-only). */
  caption: ReactNode;
  /** Rótulos das colunas, um `<th scope="col">` por item. */
  cabecalhos: string[];
  /** Linhas `<tr>` já montadas pela tela consumidora (mantém este componente
   * agnóstico do formato de dados — reutilizável por qualquer tela). */
  children?: ReactNode;
  /** Rótulo do contêiner rolável; default cobre o caso comum de rolagem
   * horizontal em telas estreitas. */
  rotuloRegiao?: string;
  /**
   * Ref opcional para o `<caption>` (TP-0060) — usada por telas que
   * precisam mover o foco de teclado para ele programaticamente (ex.: ao
   * trocar de página). Quando fornecida, o `<caption>` recebe
   * `tabIndex={-1}` (focável só via `.focus()`, não pelo Tab).
   */
  refCaption?: Ref<HTMLTableCaptionElement>;
};

// TP-0054 — tabela de dados genérica e acessível.
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
}: TabelaDadosProps) {
  return (
    <div
      className="tabela-dados-regiao"
      tabIndex={0}
      role="region"
      aria-label={rotuloRegiao}
    >
      <table className="tabela-dados">
        <caption ref={refCaption} tabIndex={refCaption ? -1 : undefined}>
          {caption}
        </caption>
        <thead>
          <tr>
            {cabecalhos.map((cabecalho) => (
              <th key={cabecalho} scope="col">
                {cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
