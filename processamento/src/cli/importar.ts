import { pathToFileURL } from "node:url";

import { formatarRelatorioImportacao, importarDados } from "../aplicacao/importar.js";
import { CAMINHO_BANCO_PADRAO, CAMINHO_BASE_PADRAO, DIR_GERADO_PADRAO } from "../config/caminhos.js";

function main(): void {
  try {
    const relatorio = importarDados({
      caminhoBase: CAMINHO_BASE_PADRAO,
      dirGerado: DIR_GERADO_PADRAO,
      caminhoBanco: CAMINHO_BANCO_PADRAO,
    });

    console.log(`Importação concluída em "${CAMINHO_BANCO_PADRAO}":`);
    for (const linha of formatarRelatorioImportacao(relatorio)) {
      console.log(linha);
    }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao importar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
