// Contexto do resumo: consulta `/api/v1/resumo` UMA ÚNICA VEZ por
// carga do app (a URL passada a `useConsulta` é a constante `URL_RESUMO`,
// que nunca muda, então o efeito interno de `useConsulta` dispara só na
// montagem) e compartilha o resultado entre todos os consumidores via
// `ProvedorResumo`/`useResumo` — evita que cada componente que precise do
// resumo (faixa, busca, cartões) dispare sua própria chamada.
import { createContext, useContext, type ReactNode } from "react";
import { EsquemaResumo, type Resumo } from "processamento/contrato/resumo.js";
import { useConsulta, type EstadoConsulta } from "./use-consulta.ts";

const URL_RESUMO = "/api/v1/resumo";

interface ValorContextoResumo {
  resumo: Resumo | null;
  estado: EstadoConsulta<Resumo>["status"];
}

const ContextoResumo = createContext<ValorContextoResumo | null>(null);

/**
 * Provedor do resumo: chama `useConsulta(URL_RESUMO, EsquemaResumo)` uma
 * única vez (URL fixa, nunca muda) e expõe `{ resumo, estado }` para toda a
 * árvore abaixo, via `useResumo()`.
 */
export function ProvedorResumo({ children }: { children: ReactNode }) {
  const estadoConsulta = useConsulta(URL_RESUMO, EsquemaResumo);

  const valor: ValorContextoResumo = {
    resumo: estadoConsulta.status === "sucesso" ? estadoConsulta.dados : null,
    estado: estadoConsulta.status,
  };

  return (
    <ContextoResumo.Provider value={valor}>
      {children}
    </ContextoResumo.Provider>
  );
}

/**
 * Lê o contexto do resumo. Lança erro claro se usado fora de
 * `<ProvedorResumo>` — mesmo padrão de "hook sem provider" de outros
 * contextos do projeto.
 */
export function useResumo(): ValorContextoResumo {
  const valor = useContext(ContextoResumo);
  if (valor === null) {
    throw new Error("useResumo deve ser usado dentro de <ProvedorResumo>.");
  }
  return valor;
}
