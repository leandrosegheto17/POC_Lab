/**
 * Entrada do gabarito: um problema plantado (tarefas futuras) associado a
 * um pedido. Nesta tarefa (TP-0023) nenhum problema ainda é plantado — quem
 * chama `escreverGabarito` passa lista vazia — mas a estrutura/escritor já
 * fica fixada para as tarefas futuras de plantio usarem.
 */
export type EntradaGabarito = {
  pedido_venda: string;
  tipo: string;
};

/**
 * Serializa a lista de problemas plantados como JSON (array), ordenado
 * deterministicamente por `pedido_venda` e depois por `tipo`, com
 * indentação fixa de 2 espaços e terminando em `\n`.
 *
 * Função pura: não lê nem escreve nada em disco (quem grava em
 * `dados/gerado/gabarito.json` é a CLI, via `node:fs`).
 */
export function escreverGabarito(problemas: EntradaGabarito[]): string {
  const ordenados = [...problemas].sort((a, b) => {
    const comparacaoPedido = a.pedido_venda.localeCompare(b.pedido_venda);
    if (comparacaoPedido !== 0) {
      return comparacaoPedido;
    }
    return a.tipo.localeCompare(b.tipo);
  });

  return `${JSON.stringify(ordenados, null, 2)}\n`;
}
