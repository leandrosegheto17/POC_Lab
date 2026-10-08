/**
 * TP-0081 — Porta de sugestão de vínculo via IA (SDD §5, L-03).
 *
 * Única porta do projeto para "perguntar a um modelo de IA qual pedido
 * corresponde a um pagamento sem identificação". Implementações reais (ex.:
 * chamada HTTP a um provedor externo) ficam fora de escopo desta tarefa —
 * aqui só a interface e um provedor falso (`provedor-falso.ts`) para testes.
 */

/**
 * `sugerir` recebe o texto da referência original do pagamento, a lista de
 * candidatos (identidades `id_pedido`, já filtrados e ordenados por quem os
 * monta) e o nome/versão do modelo usado, e devolve a identidade escolhida
 * entre `candidatos`, ou `null` quando a resposta é "sem sugestão" (o modelo
 * não conseguiu decidir, ou decidiu que nenhum candidato é compatível).
 *
 * Implementações nunca devolvem uma identidade fora de `candidatos` — quem
 * consome a porta (`sugerir.ts`) trata defensivamente o caso de uma
 * implementação malcomportada devolver algo fora da lista, mas o contrato é
 * este.
 */
export interface ProvedorSugestao {
  sugerir(texto: string, candidatos: string[], modelo: string): Promise<string | null>;
}
