import { pathToFileURL } from "node:url";

import { gerarEEscrever } from "../aplicacao/gerar.js";
import { obterSemente } from "../config/argumentos.js";
import {
  CAMINHO_BASE_PADRAO,
  DIR_GERADO_PADRAO,
  NOME_GABARITO_JSON,
  NOME_PAGAMENTOS_CSV,
  NOME_RASTREIO_CSV,
} from "../config/caminhos.js";

async function main(): Promise<void> {
  try {
    const semente = obterSemente(process.argv.slice(2));
    await gerarEEscrever(CAMINHO_BASE_PADRAO, DIR_GERADO_PADRAO, semente);

    console.log(
      `Dados gerados com semente ${String(semente)} em "${DIR_GERADO_PADRAO}" (${NOME_PAGAMENTOS_CSV}, ${NOME_RASTREIO_CSV}, ${NOME_GABARITO_JSON}).`,
    );
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao gerar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
