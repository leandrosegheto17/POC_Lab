import { IconeVazio } from "./icones/IconeVazio.tsx";

type EstadoVazioProps = {
  mensagem: string;
  acao?: {
    texto: string;
    href: string;
  };
};

// Estado vazio (sem resultados/sem itens). Sem `aria-live`/`role`
// próprio: não há nada "ocorrendo" a anunciar, é um estado estático de tela.
export function EstadoVazio({ mensagem, acao }: EstadoVazioProps) {
  return (
    <div>
      <IconeVazio />
      <span>{mensagem}</span>
      {acao ? <a href={acao.href}>{acao.texto}</a> : null}
    </div>
  );
}
