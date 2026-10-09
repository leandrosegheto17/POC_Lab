// TP-0058 — Filtro de tipo de divergência em chips: rádio nativo dentro de
// `<fieldset>`/`<legend>`, controlado via props (não lê/escreve a URL —
// isso é responsabilidade de outra tarefa que vai compor este componente).
// Usa `useResumo()` só para exibir a contagem de cada tipo
// (`resumo.totais.porTipo`); nenhuma chamada de API própria.
//
// Decisão sobre o valor de "Todos": usamos a string `"todos"` (não `""`),
// documentada aqui — evita ambiguidade entre "nenhum filtro selecionado" e
// "string vazia" quando este componente for ligado a um estado de URL por
// outra tarefa; `"todos"` é um valor explícito e autoexplicativo tanto no
// código quanto numa eventual querystring.
//
// Ajuste Modelo B (2026-10-08, mockup à risca): rádio nativo visível no PC
// (oculto no celular, onde o chip vira pílula com rolagem horizontal);
// contagem em <b> com milhar, separada por espaço, inclusive em "Todos"
// (soma de `porTipo`); sem "✓". Rótulo longo (PC) e curto (celular) em
// duas <span> alternadas por CSS.
import "./CartoesResumo.css";
import { useResumo } from "../dados/contexto-resumo.tsx";
import { formatarNumero } from "../dados/formatacao.ts";
import { OPCOES_TIPO_DIVERGENCIA } from "../dados/rotulos.ts";

export const VALOR_TODOS = "todos";

const OPCOES: ReadonlyArray<{ valor: string; rotulo: string; curto: string }> = [
  { valor: VALOR_TODOS, rotulo: "Todos", curto: "Todos" },
  ...OPCOES_TIPO_DIVERGENCIA.map(({ tipo, rotulo, curto }) => ({
    valor: tipo,
    rotulo,
    curto,
  })),
];

type FiltroTipoProps = {
  valor: string;
  aoMudar: (tipo: string) => void;
};

export function FiltroTipo({ valor, aoMudar }: FiltroTipoProps) {
  const { resumo, estado } = useResumo();
  const temResumo = estado === "sucesso" && resumo !== null;

  function contagemDoTipo(tipoOpcao: string): number | null {
    if (!temResumo) {
      return null;
    }

    // "Todos" mostra a soma das contagens por tipo.
    if (tipoOpcao === VALOR_TODOS) {
      return resumo.totais.porTipo.reduce(
        (soma, p) => soma + p.cartao.numerador,
        0,
      );
    }

    const item = resumo.totais.porTipo.find((p) => p.tipo === tipoOpcao);
    // Tipo com contagem 0 ainda mostra "0" (é um resumo válido, só que
    // zerado) — diferente de "sem resumo", que omite o número por completo.
    return item ? item.cartao.numerador : null;
  }

  return (
    <fieldset className="filtro-tipo">
      <legend>Tipo</legend>
      <div className="filtro-tipo-opcoes">
        {OPCOES.map((opcao) => {
          const selecionada = opcao.valor === valor;
          const contagem = contagemDoTipo(opcao.valor);
          const classeChip = selecionada
            ? "filtro-tipo-chip filtro-tipo-chip--selecionado"
            : "filtro-tipo-chip";

          return (
            <label key={opcao.valor} className={classeChip}>
              <input
                type="radio"
                name="filtro-tipo"
                value={opcao.valor}
                checked={selecionada}
                onChange={() => { aoMudar(opcao.valor); }}
              />
              <span className="so-pc">{opcao.rotulo}</span>{" "}
              <span className="so-celular">{opcao.curto}</span>
              {contagem !== null && (
                <>
                  {" "}
                  <b className="filtro-tipo-chip-contagem">
                    {formatarNumero(contagem)}
                  </b>
                </>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
