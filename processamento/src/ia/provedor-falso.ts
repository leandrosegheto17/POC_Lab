import type { ProvedorSugestao } from "./porta.js";

/**
 * Provedor falso de `ProvedorSugestao`, só para testes.
 *
 * Determinístico e sem rede: se `mapa` tiver uma entrada para o `texto`
 * recebido, devolve o valor mapeado (uma identidade de pedido, ou `null`
 * explícito para forçar "sem sugestão" nesse texto); para qualquer texto
 * sem entrada em `mapa`, devolve `null` por padrão ("sem sugestão").
 *
 * Expõe `chamadas` (contador de invocações de `sugerir`, incrementado a cada
 * chamada efetiva) para os testes confirmarem quantas vezes o provedor foi
 * de fato invocado — ex. para comprovar que o cache ou o teto de chamadas
 * evitaram uma segunda chamada.
 */
export function criarProvedorFalso(
  mapa: Record<string, string | null> = {},
): ProvedorSugestao & { chamadas: number } {
  const provedor = {
    chamadas: 0,
    sugerir(texto: string): Promise<string | null> {
      provedor.chamadas += 1;
      if (Object.prototype.hasOwnProperty.call(mapa, texto)) {
        return Promise.resolve(mapa[texto] ?? null);
      }
      return Promise.resolve(null);
    },
  };
  return provedor;
}
