import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  garantirBaseLocal,
  URL_BASE,
  SHA256_ESPERADO,
  DIR_DESTINO_PADRAO,
  NOME_ARQUIVO_PADRAO,
  type OpcoesGarantirBaseLocal,
} from "./baixar-base.js";
import {
  gerarConteudo,
  DIR_SAIDA_PADRAO,
  NOME_PAGAMENTOS_CSV,
  NOME_RASTREIO_CSV,
  NOME_GABARITO_JSON,
} from "./gerar.js";
import { SEMENTE_PADRAO } from "../gerador/prng.js";
import { lerBaseDeVendas } from "../fontes/leitura-vendas.js";
import { criarRepositorio } from "../armazenamento/repositorio.js";
import { importar, type RelatorioImportacao, type RelatorioFonte } from "../importacao/importar.js";
import { construirCodigosConhecidos, CAMINHO_BANCO_PADRAO } from "./importar.js";
import {
  publicarDados,
  DIR_PUBLICACAO_PADRAO,
  NOME_ARQUIVO_LEITURA_SQL,
  CAMINHO_WEB_PADRAO,
  type DependenciasPublicarDados,
} from "./publicar-dados.js";
import { executarSugerir, type OpcoesExecutarSugerir } from "./sugerir.js";
import type { ProvedorSugestao } from "../ia/porta.js";

/**
 * TP-0045 — CLI `preparar`: encadeia, nesta ordem estrita (cada etapa espera
 * a anterior terminar, sem paralelismo, para não intercalar I/O e preservar
 * o determinismo já garantido por cada peça):
 *
 *   1. baixar-base  (idempotente, confere SHA-256)
 *   2. gerar        (semente padrão `SEMENTE_PADRAO` = 20261007)
 *   3. importar
 *   4. sugerir      (TP-0083 — chama `executarSugerir`, que só efetivamente
 *                     consulta o provedor de IA quando há `OPENAI_API_KEY`
 *                     no ambiente; sem chave, `decidirSugerir` é reaproveitado
 *                     só para a mensagem/formato de retorno — ver abaixo)
 *   5. publicar-dados
 *
 * Reaproveitamento dos 4 CLIs já existentes — NENHUMA das etapas abaixo
 * duplica lógica de negócio de `baixar-base.ts`/`gerar.ts`/`importar.ts`/
 * `publicar-dados.ts`:
 *
 * - `baixar-base.ts` e `publicar-dados.ts` já expõem uma função reutilizável
 *   de ponta a ponta (`garantirBaseLocal`, `publicarDados`) — chamadas
 *   diretamente aqui, por import de função (não processo filho): é a forma
 *   mais simples e dá acesso ao retorno estruturado (hash/caminho,
 *   erro detalhado do wrangler) sem precisar parsear stdout.
 * - `gerar.ts` separa a montagem de conteúdo determinística
 *   (`gerarConteudo`, pura) da escrita em disco (feita dentro do `main()`
 *   dele, não exportada). Como a escrita é só I/O trivial (três
 *   `writeFile`), este módulo reaproveita `gerarConteudo` e refaz a escrita
 *   — a MESMA lógica de escrita de `gerar.ts`, sem adicionar nenhum cálculo
 *   novo — em vez de rodar `gerar.ts` como processo filho.
 * - `importar.ts` (CLI) NÃO exporta uma função única reaproveitável (seu
 *   `main()` não é exportado); mas exporta `construirCodigosConhecidos`,
 *   e usa `lerBaseDeVendas`/`criarRepositorio`/`importar` (caso de uso em
 *   `importacao/importar.ts`) — todas essas funções já exportadas pelos
 *   módulos de origem. Este arquivo chama exatamente as mesmas funções, na
 *   mesma ordem, que o `main()` de `importar.ts` chama — nenhuma lógica nova
 *   de importação é escrita aqui, só a mesma orquestração fina (ler CSVs
 *   opcionais do disco, que também não é lógica de negócio).
 *
 * Decisão registrada: encadear por IMPORT DE FUNÇÃO em todos os 4 passos
 * (nunca `execFileSync` para os CLIs), porque cada CLI relevante já expõe
 * (diretamente ou via seus módulos de apoio) tudo que `preparar` precisa de
 * forma estruturada — rodar como processo filho e reparsear stdout seria
 * estritamente pior aqui (perderia o retorno estruturado de
 * `RelatorioImportacao` e do resultado de `publicarDados`/`executarWrangler`,
 * que o enunciado pede para reaproveitar sem reformular).
 */

/** Diretório padrão dos arquivos gerados (mesmo valor usado por `gerar.ts`/`importar.ts`). */
const DIR_GERADO_PADRAO = DIR_SAIDA_PADRAO;

/**
 * Lê um arquivo de texto se ele existir; devolve string vazia caso
 * contrário (mesmo comportamento de `lerArquivoOuVazio` em `importar.ts`,
 * refeito aqui em versão assíncrona só para não misturar fs síncrono e
 * assíncrono neste módulo — não é lógica de negócio, é leitura trivial de
 * arquivo opcional).
 */
async function lerArquivoOuVazioAsync(caminho: string): Promise<string> {
  try {
    return await readFile(caminho, "utf-8");
  } catch {
    return "";
  }
}

/** Mesma formatação de linha de relatório usada por `importar.ts` (apresentação, não lógica). */
function formatarLinhaRelatorio(nomeFonte: string, relatorio: RelatorioFonte): string {
  return `${nomeFonte}: lidas=${relatorio.lidas} novas=${relatorio.novas} ja_existentes=${relatorio.jaExistentes} rejeitadas=${relatorio.rejeitadas}`;
}

/**
 * Decisão/resultado do passo 4, isolada para ser testável sem rodar o
 * pipeline inteiro. `pular: true` quando o passo não chamou o provedor de IA
 * (sem `OPENAI_API_KEY`); `pular: false` quando `executarSugerir` (TP-0083)
 * de fato consultou a porta de IA.
 */
export type DecisaoSugerir = {
  pular: boolean;
  mensagem: string;
};

/**
 * Decide a mensagem do passo de "sugerir" (porta de IA) para o caso em que
 * NÃO há `OPENAI_API_KEY` no ambiente — usada por `executarPreparar` só
 * nesse ramo (TP-0083: com chave, o passo chama `executarSugerir` de
 * verdade e monta sua própria mensagem de conclusão, sem passar por aqui).
 * Mantida com a assinatura/comportamento original da TP-0045 (inclusive a
 * ramificação "com chave", abaixo) porque ainda é exercitada diretamente por
 * teste já existente.
 *
 * - sem `OPENAI_API_KEY`: "sem sugestão" por falta de chave (caso normal).
 * - com `OPENAI_API_KEY`: mensagem legada da TP-0045 (não é mais o caminho
 *   usado pelo pipeline — ver `executarPreparar`).
 */
export function decidirSugerir(ambiente: NodeJS.ProcessEnv = process.env): DecisaoSugerir {
  if (!ambiente.OPENAI_API_KEY) {
    return {
      pular: true,
      mensagem:
        "Passo de sugestão pulado: sem sugestão (OPENAI_API_KEY não definida; " +
        "a CLI `sugerir` ainda não existe neste ponto do projeto).",
    };
  }
  return {
    pular: true,
    mensagem:
      "Passo de sugestão pulado: sem sugestão (OPENAI_API_KEY definida, mas a CLI " +
      "`sugerir` ainda não existe neste ponto do projeto — nada a chamar).",
  };
}

export type OpcoesPreparar = {
  /** Semente determinística para `gerar`/`publicar-dados`. Padrão: `SEMENTE_PADRAO` (20261007). */
  semente?: number;
  /** Overrides do passo 1 (baixar-base); por padrão usa as mesmas constantes de `baixar-base.ts`. */
  baixarBase?: Partial<OpcoesGarantirBaseLocal>;
  /** Diretório dos arquivos gerados (pagamentos.csv/rastreio.csv/gabarito.json). Padrão: `dados/gerado`. */
  dirGerado?: string;
  /** Caminho do event store SQLite. Padrão: `dados/poc_lab.sqlite`. */
  caminhoBanco?: string;
  /** Diretório de saída do `leitura.sql`. Padrão: `dados/publicacao`. */
  diretorioPublicacao?: string;
  /** Caminho do pacote `web` (onde o `wrangler` é invocado). Padrão: `web`. */
  caminhoWeb?: string;
  /** Ambiente usado para decidir/parametrizar o passo de sugestão. Padrão: `process.env`. */
  ambiente?: NodeJS.ProcessEnv;
  /**
   * Provedor de IA injetável para o passo 4 (TP-0083) — usado pelos testes
   * para nunca chamar o provedor OpenAI real contra rede verdadeira. Padrão:
   * `criarProvedorOpenAI()`, dentro de `executarSugerir`.
   */
  provedorSugestao?: ProvedorSugestao;
  /** Overrides adicionais do passo 4, repassados a `executarSugerir`. */
  opcoesSugerir?: OpcoesExecutarSugerir["opcoesSugerir"];
  /** Dependências injetáveis do passo 5 (ver `publicarDados`), para teste sem `wrangler` real. */
  dependenciasPublicar?: Partial<DependenciasPublicarDados>;
};

export type ResumoPreparar = {
  /** Tempo total do pipeline (passo 1 ao 5), em segundos. Só para log — nunca entra em arquivo gerado. */
  tempoSegundos: number;
  /** Retorno de `importar`, reaproveitado sem reformulação (lidas/novas/já existentes/rejeitadas por fonte). */
  resumoImportacao: RelatorioImportacao;
  /** Resultado do passo de sugestão (TP-0083): `pular: true` sem `OPENAI_API_KEY`, `pular: false` quando a porta de IA foi de fato consultada. */
  sugestao: DecisaoSugerir;
  /** Se a base de origem já estava presente localmente (idempotência do passo 1). */
  baseJaExistia: boolean;
};

/**
 * Executa o pipeline completo `preparar` (passos 1 a 5), em sequência
 * estrita (cada `await` espera o anterior). Todas as opções têm um valor
 * padrão igual ao usado pelos CLIs originais; os overrides existem só para
 * permitir testes isolados (ex. apontar para diretórios/bancos temporários,
 * injetar `fetchFn`/`executarWrangler` fake), sem exigir rede nem `wrangler`
 * real.
 */
export async function executarPreparar(opcoes: OpcoesPreparar = {}): Promise<ResumoPreparar> {
  const inicio = performance.now();

  const semente = opcoes.semente ?? SEMENTE_PADRAO;

  // --- passo 1: baixar-base -------------------------------------------------
  const resultadoBase = await garantirBaseLocal({
    url: opcoes.baixarBase?.url ?? URL_BASE,
    hashEsperado: opcoes.baixarBase?.hashEsperado ?? SHA256_ESPERADO,
    dirDestino: opcoes.baixarBase?.dirDestino ?? DIR_DESTINO_PADRAO,
    nomeArquivo: opcoes.baixarBase?.nomeArquivo ?? NOME_ARQUIVO_PADRAO,
    fetchFn: opcoes.baixarBase?.fetchFn,
  });
  console.log(
    resultadoBase.jaExistia
      ? `[1/5] Base já presente em "${resultadoBase.caminho}" com hash correto.`
      : `[1/5] Base baixada e verificada com sucesso em "${resultadoBase.caminho}".`,
  );

  // --- passo 2: gerar --------------------------------------------------------
  const dirGerado = opcoes.dirGerado ?? DIR_GERADO_PADRAO;
  const pedidosVendas = lerBaseDeVendas(resultadoBase.caminho);
  const conteudoGerado = gerarConteudo(pedidosVendas, semente);

  await mkdir(dirGerado, { recursive: true });
  await writeFile(path.join(dirGerado, NOME_PAGAMENTOS_CSV), conteudoGerado.pagamentosCsv, "utf-8");
  await writeFile(path.join(dirGerado, NOME_RASTREIO_CSV), conteudoGerado.rastreioCsv, "utf-8");
  await writeFile(path.join(dirGerado, NOME_GABARITO_JSON), conteudoGerado.gabaritoJson, "utf-8");
  console.log(`[2/5] Dados gerados com semente ${semente} em "${dirGerado}".`);

  // --- passo 3: importar ------------------------------------------------------
  const caminhoBanco = opcoes.caminhoBanco ?? CAMINHO_BANCO_PADRAO;
  const pagamentosCsvLido = await lerArquivoOuVazioAsync(path.join(dirGerado, NOME_PAGAMENTOS_CSV));
  const rastreioCsvLido = await lerArquivoOuVazioAsync(path.join(dirGerado, NOME_RASTREIO_CSV));
  const codigosConhecidos = construirCodigosConhecidos(
    pedidosVendas.map((pedido) => pedido.idPedido),
  );

  const repositorio = criarRepositorio(caminhoBanco);
  const resumoImportacao = importar(repositorio, {
    vendas: pedidosVendas,
    pagamentosCsv: pagamentosCsvLido,
    rastreioCsv: rastreioCsvLido,
    codigosConhecidos,
  });
  // Fecha esta conexão assim que o passo 3 termina — os passos 4
  // (`executarSugerir`) e 5 (`publicarDados`) abrem as suas próprias sobre o
  // mesmo `caminhoBanco`. Sem isso, em Windows o handle aberto trava o
  // `rmSync` do diretório temporário do banco nos testes de integração
  // (visto em TP-0083, `test/integracao/preparar.test.ts`).
  repositorio.db.close();
  console.log(`[3/5] Importação concluída em "${caminhoBanco}".`);

  // --- passo 4: sugerir (porta de IA, TP-0083) --------------------------------
  const ambienteSugerir = opcoes.ambiente ?? process.env;
  const resultadosSugestao = await executarSugerir(caminhoBanco, {
    ambiente: ambienteSugerir,
    provedor: opcoes.provedorSugestao,
    opcoesSugerir: opcoes.opcoesSugerir,
  });
  const decisaoSugerir: DecisaoSugerir = ambienteSugerir.OPENAI_API_KEY
    ? {
        pular: false,
        mensagem: `Sugestão concluída: ${resultadosSugestao.length} pagamento(s) sem identificação avaliado(s).`,
      }
    : decidirSugerir(ambienteSugerir);
  console.log(`[4/5] ${decisaoSugerir.mensagem}`);

  // --- passo 5: publicar-dados -------------------------------------------------
  const diretorioPublicacao = opcoes.diretorioPublicacao ?? DIR_PUBLICACAO_PADRAO;
  const caminhoWeb = opcoes.caminhoWeb ?? CAMINHO_WEB_PADRAO;

  publicarDados(
    { semente, caminhoBanco, diretorioPublicacao, caminhoWeb },
    opcoes.dependenciasPublicar,
  );
  console.log(
    `[5/5] Dados publicados em "${path.join(diretorioPublicacao, NOME_ARQUIVO_LEITURA_SQL)}".`,
  );

  const fim = performance.now();
  const tempoSegundos = (fim - inicio) / 1000;

  // Resumo final — reaproveita diretamente os números de `resumoImportacao`
  // (retorno de `importar`), sem reformular as contagens.
  console.log(`Tempo total: ${tempoSegundos.toFixed(2)}s`);
  console.log("Resumo da importação:");
  console.log(formatarLinhaRelatorio("vendas", resumoImportacao.vendas));
  console.log(formatarLinhaRelatorio("pagamentos", resumoImportacao.pagamentos));
  console.log(formatarLinhaRelatorio("rastreio", resumoImportacao.rastreio));

  return {
    tempoSegundos,
    resumoImportacao,
    sugestao: decisaoSugerir,
    baseJaExistia: resultadoBase.jaExistia,
  };
}

async function main(): Promise<void> {
  try {
    await executarPreparar();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido ao preparar dados.";
    console.error(`Erro: ${mensagem}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
