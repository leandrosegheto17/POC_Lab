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
import "./CartoesResumo.css";
import { useResumo } from "../dados/contexto-resumo.tsx";

export const VALOR_TODOS = "todos";

const OPCOES: ReadonlyArray<{ valor: string; rotulo: string }> = [
  { valor: VALOR_TODOS, rotulo: "Todos" },
  { valor: "duplicado", rotulo: "Pago duas vezes" },
  { valor: "parcial", rotulo: "Pagamento parcial" },
  { valor: "pago_nao_enviado", rotulo: "Pago e não enviado" },
  { valor: "enviado_nao_pago", rotulo: "Enviado e não pago" },
  { valor: "entrega_atrasada", rotulo: "Entrega atrasada" },
];

type FiltroTipoProps = {
  valor: string;
  aoMudar: (tipo: string) => void;
};

export function FiltroTipo({ valor, aoMudar }: FiltroTipoProps) {
  const { resumo, estado } = useResumo();
  const temResumo = estado === "sucesso" && resumo !== null;

  function contagemDoTipo(tipoOpcao: string): number | null {
    // "Todos" nunca mostra contagem: a aceite só define número ao lado dos
    // 5 tipos de divergência (vindos de `porTipo`), não de "Todos".
    if (!temResumo || tipoOpcao === VALOR_TODOS) {
      return null;
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
                onChange={() => aoMudar(opcao.valor)}
              />
              {selecionada && (
                <span className="filtro-tipo-chip-marca" aria-hidden="true">
                  ✓
                </span>
              )}
              {opcao.rotulo}
              {contagem !== null && (
                <span className="filtro-tipo-chip-contagem">
                  {" "}
                  · {contagem}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
