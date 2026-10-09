// Gancho `useConsulta`: dispara `consultarApi` quando a URL muda,
// cancelando a chamada anterior (troca de URL ou desmonte) e nunca
// deixando uma resposta cancelada atualizar o estado.
import { useEffect, useState } from "react";
import type { z } from "zod";
import { consultarApi } from "./cliente-api.ts";

/**
 * Acrescenta à URL o fragmento `#tentativa`. O fragmento nunca vai ao
 * servidor; só dá ao `useConsulta` uma URL diferente a cada "Tentar de
 * novo", o que refaz a mesma chamada (o gancho não tem `refetch`).
 */
export function comTentativa(url: string, tentativa: number): string {
  return `${url}#${String(tentativa)}`;
}

/** Estado exposto pelo gancho — união discriminada por `status`. */
export type EstadoConsulta<T> =
  | { status: "carregando" }
  | { status: "sucesso"; dados: T }
  | { status: "erro"; mensagem: string; codigo?: string };

/**
 * Consulta `url` com `esquema` sempre que `url` mudar. Se `url` for `null`,
 * não dispara nenhuma chamada (fica em `carregando` indefinidamente — cabe
 * a quem consome decidir o que fazer com `url: null`).
 *
 * Ao trocar `url` (ou desmontar), a chamada anterior é abortada; como
 * `consultarApi` devolve `{ tipo: 'cancelada' }` nesse caso, o `then`
 * abaixo ignora o resultado. Como segunda camada de proteção — para não
 * depender só de `consultarApi` respeitar o `signal` —, uma flag local por
 * execução do efeito (`chamadaAtiva`) também é checada antes de atualizar o
 * estado: ela é marcada como inativa na limpeza do efeito (troca de `url`
 * ou desmonte), então uma resposta tardia da chamada anterior nunca
 * sobrescreve o estado da chamada mais recente, mesmo que chegue depois
 * dela.
 *
 * `esquema` deve ser uma referência estável (ex.: constante de módulo,
 * como `EsquemaResumo`) — passar um esquema novo a cada render reinicia a
 * consulta a cada render, por entrar nas dependências do `useEffect`.
 */
export function useConsulta<T>(
  url: string | null,
  esquema: z.ZodType<T>,
): EstadoConsulta<T> {
  const [estado, setEstado] = useState<EstadoConsulta<T>>({
    status: "carregando",
  });

  useEffect(() => {
    if (url === null) {
      return;
    }

    setEstado({ status: "carregando" });
    const controller = new AbortController();
    let chamadaAtiva = true;

    void consultarApi(url, esquema, { signal: controller.signal }).then(
      (resultado) => {
        // Chamada superada por uma mais recente, ou componente
        // desmontado — ignora silenciosamente, mesmo que a resposta não
        // tenha vindo marcada como `cancelada`.
        if (!chamadaAtiva || resultado.tipo === "cancelada") {
          return;
        }

        if (resultado.tipo === "sucesso") {
          setEstado({ status: "sucesso", dados: resultado.dados });
        } else {
          setEstado({
            status: "erro",
            mensagem: resultado.mensagem,
            codigo: resultado.codigo,
          });
        }
      },
    );

    return () => {
      chamadaAtiva = false;
      controller.abort();
    };
  }, [url, esquema]);

  return estado;
}
