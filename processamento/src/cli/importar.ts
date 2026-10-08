import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { lerBaseDeVendas } from "../fontes/leitura-vendas.js";
import { criarRepositorio } from "../armazenamento/repositorio.js";
import { importar, type RelatorioFonte } from "../importacao/importar.js";

/** Caminho padrão da base de origem (Northwind), relativo ao cwd do processo. */
export const CAMINHO_BASE_PADRAO = path.join("dados", "origem", "northwind.db");

/** Diretório padrão dos arquivos gerados (TP-0023). */
export const DIR_GERADO_PADRAO = path.join("dados", "gerado");

export const NOME_PAGAMENTOS_CSV = "pagamentos.csv";
export const NOME_RASTREIO_CSV = "rastreio.csv";

/** Caminho padrão do banco SQLite do event store (TP-0018). */
export const CAMINHO_BANCO_PADRAO = path.join("dados", "poc_lab.sqlite");

/**
 * Lê um arquivo de texto se ele existir; devolve string vazia caso
 * contrário (ex.: `rastreio.csv` ainda não gerado — gerador é de outra
 * tarefa). Nunca lança erro por arquivo ausente.
 */
function lerArquivoOuVazio(caminho: string): string {
  if (!existsSync(caminho)) {
    return "";
  }
  return readFileSync(caminho, "utf-8");
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

function formatarLinhaRelatorio(nomeFonte: string, relatorio: RelatorioFonte): string {
  return `${nomeFonte}: lidas=${relatorio.lidas} novas=${relatorio.novas} ja_existentes=${relatorio.jaExistentes} rejeitadas=${relatorio.rejeitadas}`;
}

async function main(): Promise<void> {
  try {
    const pedidosVendas = lerBaseDeVendas(CAMINHO_BASE_PADRAO);
    const pagamentosCsv = lerArquivoOuVazio(path.join(DIR_GERADO_PADRAO, NOME_PAGAMENTOS_CSV));
    const rastreioCsv = lerArquivoOuVazio(path.join(DIR_GERADO_PADRAO, NOME_RASTREIO_CSV));
    const codigosConhecidos = construirCodigosConhecidos(
      pedidosVendas.map((pedido) => pedido.idPedido),
    );

    const repositorio = criarRepositorio(CAMINHO_BANCO_PADRAO);

    const relatorio = importar(repositorio, {
      vendas: pedidosVendas,
      pagamentosCsv,
      rastreioCsv,
      codigosConhecidos,
    });

    console.log(`Importação concluída em "${CAMINHO_BANCO_PADRAO}":`);
    console.log(formatarLinhaRelatorio("vendas", relatorio.vendas));
    console.log(formatarLinhaRelatorio("pagamentos", relatorio.pagamentos));
    console.log(formatarLinhaRelatorio("rastreio", relatorio.rastreio));
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao importar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
