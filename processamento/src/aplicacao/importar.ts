import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { criarRepositorio } from "../armazenamento/repositorio.js";
import { NOME_PAGAMENTOS_CSV, NOME_RASTREIO_CSV } from "../config/caminhos.js";
import { lerBaseDeVendas } from "../fontes/leitura-vendas.js";
import { importar, type RelatorioFonte, type RelatorioImportacao } from "../importacao/importar.js";

/** Lê um arquivo de texto se existir; devolve string vazia caso contrário. */
function lerArquivoOuVazio(caminho: string): string {
  return existsSync(caminho) ? readFileSync(caminho, "utf-8") : "";
}

/**
 * Monta o conjunto de códigos de pedido de vendas conhecidos, já
 * normalizados (RN-09: sem zeros à esquerda), a partir da lista de pedidos
 * lida da base de vendas.
 */
export function construirCodigosConhecidos(idsPedidoVendas: string[]): Set<string> {
  return new Set(
    idsPedidoVendas.map((id) => {
      const semZerosEsquerda = id.replace(/^0+/, "");
      return semZerosEsquerda === "" ? "0" : semZerosEsquerda;
    }),
  );
}

export type EntradaImportarDados = {
  caminhoBase: string;
  dirGerado: string;
  caminhoBanco: string;
};

/**
 * Passo "importar": lê a base de vendas e os CSVs gerados (ausentes contam como
 * vazios) e importa tudo para o event store em `caminhoBanco`. A conexão é
 * fechada ao final, para que os passos seguintes abram a sua.
 */
export function importarDados(entrada: EntradaImportarDados): RelatorioImportacao {
  const vendas = lerBaseDeVendas(entrada.caminhoBase);
  const pagamentosCsv = lerArquivoOuVazio(path.join(entrada.dirGerado, NOME_PAGAMENTOS_CSV));
  const rastreioCsv = lerArquivoOuVazio(path.join(entrada.dirGerado, NOME_RASTREIO_CSV));
  const codigosConhecidos = construirCodigosConhecidos(vendas.map((pedido) => pedido.idPedido));

  const repositorio = criarRepositorio(entrada.caminhoBanco);
  try {
    return importar(repositorio, { vendas, pagamentosCsv, rastreioCsv, codigosConhecidos });
  } finally {
    repositorio.fechar();
  }
}

/** Linha de relatório de uma fonte, usada pela CLI e por `preparar`. */
export function formatarLinhaRelatorio(nomeFonte: string, relatorio: RelatorioFonte): string {
  return `${nomeFonte}: lidas=${String(relatorio.lidas)} novas=${String(relatorio.novas)} ja_existentes=${String(relatorio.jaExistentes)} rejeitadas=${String(relatorio.rejeitadas)}`;
}

/** Linhas do relatório de importação, uma por fonte. */
export function formatarRelatorioImportacao(relatorio: RelatorioImportacao): string[] {
  return [
    formatarLinhaRelatorio("vendas", relatorio.vendas),
    formatarLinhaRelatorio("pagamentos", relatorio.pagamentos),
    formatarLinhaRelatorio("rastreio", relatorio.rastreio),
  ];
}
