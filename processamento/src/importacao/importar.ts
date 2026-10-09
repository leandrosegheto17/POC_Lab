/**
 * Caso de uso `importar`.
 *
 * Orquestra os 3 adaptadores de fonte (`processarVendas`, `processarPagamentos`,
 * `processarRastreio`) e grava o resultado no event store via `Repositorio`.
 * Este módulo é explícito para as 3 fontes: não existe (e não deve
 * existir) uma interface/registro genérico de "fonte" — cada chamada aos
 * adaptadores é direta e nomeada.
 *
 * ## Identidade de pedido (`PED-nnnnnn`) e convergência entre fontes
 *
 * Os adaptadores de fonte devolvem vínculos cujo campo `idPedido` tem
 * significado diferente por fonte:
 * - `vendas`: `idPedido` é o próprio código bruto do pedido na base de
 *   vendas (ex. `"10248"`) — a identidade **canônica** entre fontes.
 * - `rastreio`: `idPedido` é o `pedido_venda` da linha do CSV, ou seja, já é
 *   o código bruto de vendas (a chave cruzada), não um código próprio de
 *   rastreio.
 * - `pagamentos`: `idPedido` (quando a referência casa) é o código bruto de
 *   vendas resolvido por `casarReferencia` (RN-09) — de novo, a chave
 *   cruzada, não um código próprio de pagamentos.
 *
 * Ou seja: as 3 fontes, quando têm um vínculo, sempre o expressam em termos
 * do código bruto de vendas. Esse código bruto de vendas é a chave usada
 * para achar ou criar o `id_pedido` interno (`PED-nnnnnn`):
 *
 * - O par `(fonte: "vendas", codigo_externo: <código bruto de vendas>)` na
 *   tabela `vinculo_fonte` É o índice de identidade: se já existe, o
 *   `id_pedido` associado é reaproveitado; se não existe, um novo
 *   `PED-nnnnnn` é criado (próximo número sequencial) e esse vínculo
 *   `vendas` é inserido.
 * - Isso vale **independente de qual fonte dispara a resolução**: se um
 *   evento de rastreio ou pagamento chega citando um código de vendas que
 *   ainda não tem `id_pedido`, este módulo cria o `id_pedido` e o vínculo
 *   `vendas` correspondente **antecipadamente** (mesmo a venda em si ainda
 *   não tendo sido importada). Quando a venda for importada depois (nesta
 *   chamada ou em uma chamada futura sobre o mesmo repositório), ela
 *   encontra o vínculo `vendas` já existente e reaproveita o mesmo
 *   `id_pedido` — convergindo as 3 fontes no mesmo pedido.
 * - Cada fonte também grava seu próprio vínculo em `vinculo_fonte` com o seu
 *   próprio `codigo_externo` (o `codigo_rastreio` para rastreio, o
 *   `codigo_transacao` para pagamentos, o próprio código de vendas para
 *   vendas) apontando para o `id_pedido` resolvido.
 *
 * ## Ordem de atribuição de `PED-nnnnnn`
 *
 * Dentro de uma mesma chamada a `importar`, a ordem em que novos
 * `PED-nnnnnn` são cunhados é: vendas primeiro (por código bruto crescente),
 * depois rastreio, depois pagamentos (ambos por ordem de linha/lista). Um
 * número de pedido já cunhado (nesta chamada ou em chamada anterior sobre o
 * mesmo repositório) nunca é reatribuído — o contador sempre continua do
 * maior `PED-nnnnnn` já existente na tabela `pedido`.
 *
 * ## Transação
 *
 * Toda a gravação de uma chamada a `importar` roda dentro de uma única
 * transação (`Repositorio.emTransacao`: `ROLLBACK` em caso de erro). Nenhum `UPDATE`/`DELETE` é emitido em nenhum ponto
 * deste módulo: só `INSERT` (via as funções de `inserirX` do repositório, que
 * já usam `ON CONFLICT DO NOTHING`) e `SELECT` (para resolver identidade).
 */
import { processarVendas } from "../fontes/vendas.js";
import { processarPagamentos, type ResultadoProcessamentoPagamentos } from "../fontes/pagamentos.js";
import { processarRastreio, type ResultadoProcessamentoRastreio } from "../fontes/rastreio.js";
import type { PedidoVendas } from "../fontes/leitura-vendas.js";
import type { Evento } from "../dominio/evento.js";
import type { AchadoQualidade, Fonte } from "../dominio/modelo.js";
import type { Repositorio } from "../armazenamento/repositorio.js";

/** Contagens de uma fonte no relatório final de uma chamada a `importar`. */
export type RelatorioFonte = {
  /** Total de linhas/pedidos processados desta fonte nesta chamada. */
  lidas: number;
  /** Vínculos desta fonte inseridos como linha nova (`{ nova: true }`). */
  novas: number;
  /** Vínculos desta fonte que já existiam (`{ nova: false }`). */
  jaExistentes: number;
  /**
   * Linhas que geraram achado e não produziram vínculo/evento válido
   * (ex.: linha malformada, código repetido na mesma importação).
   */
  rejeitadas: number;
};

export type RelatorioImportacao = {
  vendas: RelatorioFonte;
  pagamentos: RelatorioFonte;
  rastreio: RelatorioFonte;
};

export type DadosParaImportar = {
  /** Pedidos de vendas já lidos por `lerBaseDeVendas` (pode ser lista vazia). */
  vendas: PedidoVendas[];
  /** Conteúdo de `pagamentos.csv`; string vazia = nenhum dado de pagamentos nesta chamada. */
  pagamentosCsv: string;
  /** Conteúdo de `rastreio.csv`; string vazia = nenhum dado de rastreio nesta chamada (gerador ainda não existe). */
  rastreioCsv: string;
  /**
   * Códigos de pedido de vendas conhecidos, já normalizados (RN-09: sem
   * prefixo `PV-`, sem zeros à esquerda), usados por `processarPagamentos`
   * para casar a referência de cada pagamento.
   */
  codigosConhecidos: Set<string>;
};

/** Tipos de achado que representam rejeição total da linha (nenhum evento válido produzido). */
const TIPOS_ACHADO_DE_REJEICAO = new Set(["linha_invalida", "registro_repetido"]);

function contarRejeitadas(achados: { tipo: string }[]): number {
  return achados.filter((achado) => TIPOS_ACHADO_DE_REJEICAO.has(achado.tipo)).length;
}

/** Contador mutável do próximo número de `PED-nnnnnn` a cunhar nesta chamada. */
type ContadorPedido = { atual: number };

function formatarIdPedido(numero: number): string {
  return `PED-${String(numero).padStart(6, "0")}`;
}

/**
 * Resolve o `id_pedido` interno correspondente a um código bruto de vendas
 * (a chave cruzada entre fontes, ver cabeçalho deste módulo).
 *
 * Consulta o vínculo `(fonte: "vendas", codigo_externo: codigoVenda)`: se já
 * existe, reaproveita o `id_pedido` associado (`nova: false`); se não
 * existe, cunha o próximo `PED-nnnnnn` disponível, insere o pedido e o
 * vínculo `vendas` correspondente (`nova: true`) — isso vale tanto quando é
 * a própria fonte vendas chamando quanto quando é rastreio/pagamentos
 * resolvendo uma identidade ainda não vista.
 */
function resolverOuCriarIdPedido(
  repositorio: Repositorio,
  contador: ContadorPedido,
  codigoVenda: string,
): { idPedido: string; nova: boolean } {
  const existente = repositorio.obterIdPedidoPorVinculo("vendas", codigoVenda);
  if (existente !== undefined) {
    return { idPedido: existente, nova: false };
  }

  contador.atual += 1;
  const idPedido = formatarIdPedido(contador.atual);
  repositorio.inserirPedido(idPedido);
  repositorio.inserirVinculoFonte("vendas", codigoVenda, idPedido);
  return { idPedido, nova: true };
}

/**
 * Serializa o payload de um evento para a coluna `dados` do event store:
 * o envelope comum (`fonte`, `codigoEvento`, `momentoFato`, `ordemChegada`)
 * já tem coluna própria — `dados` guarda o restante (`tipo`, `versao_schema`
 * e os campos específicos do payload).
 */
function serializarDados(evento: Evento): string {
  const chavesDoEnvelope = new Set(["fonte", "codigoEvento", "momentoFato", "ordemChegada"]);
  const payload = Object.fromEntries(
    Object.entries(evento).filter(([chave]) => !chavesDoEnvelope.has(chave)),
  );
  return JSON.stringify(payload);
}

/**
 * `vinculos[i]` e `eventos[i]` sempre andam juntos (invariante dos adaptadores);
 * se faltar o evento, a invariante foi quebrada e é melhor falhar alto.
 */
function eventoDoIndice(eventos: Evento[], indice: number): Evento {
  const evento = eventos[indice];
  if (evento === undefined) {
    throw new Error(`Evento ausente para o vínculo de índice ${String(indice)} (invariante dos adaptadores quebrada).`);
  }
  return evento;
}

function compararCodigoVendasCrescente(a: string, b: string): number {
  const numeroA = Number(a);
  const numeroB = Number(b);
  if (Number.isFinite(numeroA) && Number.isFinite(numeroB)) {
    return numeroA - numeroB;
  }
  return a.localeCompare(b);
}

/** Grava o evento de uma fonte; `ordemChegada` só existe nas fontes que a informam. */
function gravarEventoDaFonte(
  repositorio: Repositorio,
  fonte: Fonte,
  evento: Evento,
  idPedido: string | null,
): void {
  repositorio.inserirEvento({
    fonte,
    codigoEvento: evento.codigoEvento,
    idPedido,
    tipo: evento.tipo,
    momentoFato: evento.momentoFato,
    ordemChegada: evento.ordemChegada ?? null,
    versaoSchema: evento.versao_schema,
    dados: serializarDados(evento),
  });
}

function gravarAchados(repositorio: Repositorio, achados: AchadoQualidade[]): void {
  for (const achado of achados) {
    repositorio.inserirAchadoQualidade(achado);
  }
}

/** Contagem de vínculos novos e já existentes de uma fonte. */
type Contagem = { novas: number; jaExistentes: number };

function contar(contagem: Contagem, nova: boolean): void {
  if (nova) {
    contagem.novas += 1;
  } else {
    contagem.jaExistentes += 1;
  }
}

function importarVendas(
  repositorio: Repositorio,
  contador: ContadorPedido,
  vendas: PedidoVendas[],
): RelatorioFonte {
  const resultado = processarVendas(vendas);
  const contagem: Contagem = { novas: 0, jaExistentes: 0 };

  // `vinculos[i]` e `eventos[i]` andam juntos; os pares são ordenados por
  // código de vendas crescente para a atribuição de `PED-nnnnnn` não depender
  // da ordem da lista recebida.
  const paresOrdenados = resultado.vinculos
    .map((vinculo, indice) => ({ vinculo, evento: eventoDoIndice(resultado.eventos, indice) }))
    .sort((a, b) => compararCodigoVendasCrescente(a.vinculo.codigoExterno, b.vinculo.codigoExterno));

  for (const { vinculo, evento } of paresOrdenados) {
    const { idPedido, nova } = resolverOuCriarIdPedido(repositorio, contador, vinculo.codigoExterno);
    contar(contagem, nova);
    gravarEventoDaFonte(repositorio, "vendas", evento, idPedido);
  }
  gravarAchados(repositorio, resultado.achados);

  return { lidas: vendas.length, ...contagem, rejeitadas: vendas.length - resultado.eventos.length };
}

function importarRastreio(
  repositorio: Repositorio,
  contador: ContadorPedido,
  rastreioCsv: string,
): RelatorioFonte {
  const resultado: ResultadoProcessamentoRastreio =
    rastreioCsv.trim() === ""
      ? { vinculos: [], eventos: [], achados: [] }
      : processarRastreio(rastreioCsv);
  const contagem: Contagem = { novas: 0, jaExistentes: 0 };

  // `vinculos[i]` e `eventos[i]` andam juntos (um par por linha válida do CSV).
  resultado.vinculos.forEach((vinculo, indice) => {
    const evento = eventoDoIndice(resultado.eventos, indice);
    // `vinculo.idPedido` é o código bruto de vendas (`pedido_venda`), não um `PED-nnnnnn`.
    const { idPedido } = resolverOuCriarIdPedido(repositorio, contador, vinculo.idPedido);
    contar(contagem, repositorio.inserirVinculoFonte("rastreio", vinculo.codigoExterno, idPedido).nova);
    gravarEventoDaFonte(repositorio, "rastreio", evento, idPedido);
  });
  gravarAchados(repositorio, resultado.achados);

  const rejeitadas = contarRejeitadas(resultado.achados);
  return { lidas: resultado.eventos.length + rejeitadas, ...contagem, rejeitadas };
}

function importarPagamentos(
  repositorio: Repositorio,
  contador: ContadorPedido,
  pagamentosCsv: string,
  codigosConhecidos: Set<string>,
): RelatorioFonte {
  const resultado: ResultadoProcessamentoPagamentos =
    pagamentosCsv.trim() === ""
      ? { vinculos: [], eventos: [], achados: [] }
      : processarPagamentos(pagamentosCsv, codigosConhecidos);
  const contagem: Contagem = { novas: 0, jaExistentes: 0 };

  // Nem todo pagamento tem vínculo (RN-09: referência sem identificação
  // única); o casamento é por `codigo_transacao`, não por índice.
  const codigoVendaPorTransacao = new Map(
    resultado.vinculos.map((vinculo): [string, string] => [vinculo.codigoExterno, vinculo.idPedido]),
  );

  for (const evento of resultado.eventos) {
    const codigoVenda = codigoVendaPorTransacao.get(evento.codigoEvento);
    let idPedido: string | null = null;
    if (codigoVenda !== undefined) {
      idPedido = resolverOuCriarIdPedido(repositorio, contador, codigoVenda).idPedido;
      contar(contagem, repositorio.inserirVinculoFonte("pagamentos", evento.codigoEvento, idPedido).nova);
    }
    gravarEventoDaFonte(repositorio, "pagamentos", evento, idPedido);
  }
  gravarAchados(repositorio, resultado.achados);

  const rejeitadas = contarRejeitadas(resultado.achados);
  return { lidas: resultado.eventos.length + rejeitadas, ...contagem, rejeitadas };
}

/**
 * Importa vendas, rastreio e pagamentos para o `repositorio` numa única
 * transação, convergindo a identidade de pedido entre as 3 fontes (ver
 * cabeçalho do módulo).
 *
 * Idempotente: repetir a chamada com os mesmos `dados` sobre o mesmo
 * `repositorio` dá tudo "já existente" e nenhuma linha duplicada.
 */
export function importar(
  repositorio: Repositorio,
  dados: DadosParaImportar,
): RelatorioImportacao {
  return repositorio.emTransacao(() => {
    const contador: ContadorPedido = { atual: repositorio.obterMaiorNumeroPedido() };
    const vendas = importarVendas(repositorio, contador, dados.vendas);
    const rastreio = importarRastreio(repositorio, contador, dados.rastreioCsv);
    const pagamentos = importarPagamentos(
      repositorio,
      contador,
      dados.pagamentosCsv,
      dados.codigosConhecidos,
    );
    return { vendas, pagamentos, rastreio };
  });
}
