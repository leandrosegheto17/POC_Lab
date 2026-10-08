/**
 * Adaptador de `pagamentos.csv` (RF-02).
 *
 * Lê o CSV de pagamentos com `csv-parse`, resolve a referência de cada linha
 * contra o conjunto de códigos de pedido conhecidos (RN-09, ver
 * `dominio/referencia.ts`), detecta valor fora do padrão (RN-10, ver
 * `dominio/valores-fora-do-padrao.ts`) e devolve vínculos/eventos/achados em
 * memória — sem gravar no SQLite (isso é responsabilidade de outra camada).
 *
 * `csv-parse` é usado só aqui (`fontes/`), nunca em `dominio/`: o domínio
 * permanece puro e sem dependência de parsing de arquivo.
 */
import { parse } from "csv-parse/sync";
import type { Evento } from "../dominio/evento.js";
import { casarReferencia } from "../dominio/referencia.js";
import { verificarPagamento } from "../dominio/valores-fora-do-padrao.js";
import type { AchadoQualidade, VinculoFonte } from "../dominio/modelo.js";

/**
 * Linha crua do CSV de pagamentos, já convertida para objeto pelas colunas
 * do cabeçalho. Colunas obrigatórias podem vir ausentes/vazias quando a
 * linha é malformada — por isso tudo é opcional aqui; a validação de
 * obrigatoriedade acontece em `processarPagamentos`. `meio_pagamento`
 * (TP-0075) é opcional: quando presente e não vazia, o evento gerado é
 * `PayloadPagamentoV2`; quando ausente/vazia, é `PayloadPagamentoV1` — ver
 * `dominio/evento.ts`.
 */
type LinhaPagamentoCsv = {
  codigo_transacao?: string;
  referencia?: string;
  valor?: string;
  data_pagamento?: string;
  meio_pagamento?: string;
  [coluna: string]: string | undefined;
};

/**
 * Resultado do processamento do CSV de pagamentos: tudo em memória, pronto
 * para ser gravado por uma camada posterior (ex. caso de uso de
 * importação).
 */
export type ResultadoProcessamentoPagamentos = {
  vinculos: VinculoFonte[];
  eventos: Evento[];
  achados: AchadoQualidade[];
};

const REGRA_LINHA_INVALIDA = "RF-02: linha de pagamentos.csv malformada";
const REGRA_REGISTRO_REPETIDO =
  "RF-02: codigo_transacao repetido na importação de pagamentos";
const REGRA_SEM_IDENTIFICACAO =
  "RN-09: referência de pagamento sem casamento único com pedido conhecido";

/**
 * Processa o conteúdo (já em memória, como string) de um `pagamentos.csv` e
 * devolve vínculos, eventos e achados de qualidade.
 *
 * `codigosConhecidos` é o conjunto de códigos de pedido já normalizados
 * (RN-09, sem prefixo `PV-`, sem zeros à esquerda) contra o qual cada
 * referência de pagamento é casada.
 *
 * Nenhuma linha malformada interrompe o processamento das demais (RF-02):
 * cada problema vira um achado e a linha seguinte continua sendo
 * processada normalmente.
 */
export function processarPagamentos(
  conteudoCsv: string,
  codigosConhecidos: Set<string>,
): ResultadoProcessamentoPagamentos {
  const vinculos: VinculoFonte[] = [];
  const eventos: Evento[] = [];
  const achados: AchadoQualidade[] = [];
  const codigosTransacaoVistos = new Set<string>();

  // Numeração real no arquivo (inclui registros descartados por erro de
  // sintaxe): a linha 1 é o cabeçalho.
  let sequencia = 1;
  const linhas = parse(conteudoCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    // Erro de sintaxe CSV (ex. aspas quebradas) descarta só o registro e vira
    // achado `linha_invalida`, sem lançar exceção (RF-02).
    skip_records_with_error: true,
    on_skip: (erro: unknown) => {
      sequencia += 1;
      const numeroLinha = sequencia;
      const motivo = erro instanceof Error ? erro.message : String(erro);
      achados.push({
        tipo: "linha_invalida",
        fonte: "pagamentos",
        referencia: `linha ${numeroLinha}`,
        regra: REGRA_LINHA_INVALIDA,
        detalhe: `linha ${numeroLinha} com erro de sintaxe CSV (${motivo})`,
      });
    },
    on_record: (registro: LinhaPagamentoCsv) => {
      sequencia += 1;
      return { ...registro, __linha: String(sequencia) };
    },
    // Uma linha com menos colunas que o cabeçalho (ex. coluna faltando no
    // final) não deve lançar exceção e abortar o parsing do arquivo inteiro
    // — ela é tratada abaixo como achado `linha_invalida`, preservando RF-02
    // (continuar processando as demais linhas).
    relax_column_count: true,
  }) as LinhaPagamentoCsv[];

  linhas.forEach((linha) => {
    const numeroLinha = Number(linha.__linha);
    const identificadorLinha =
      linha.codigo_transacao?.trim() || `linha ${numeroLinha}`;

    const codigoTransacao = linha.codigo_transacao?.trim();
    const referencia = linha.referencia?.trim();
    const valorBruto = linha.valor?.trim();
    const dataPagamentoBruta = linha.data_pagamento?.trim();
    const meioPagamento = linha.meio_pagamento?.trim();

    if (!codigoTransacao || !referencia || !valorBruto || !dataPagamentoBruta) {
      achados.push({
        tipo: "linha_invalida",
        fonte: "pagamentos",
        referencia: identificadorLinha,
        regra: REGRA_LINHA_INVALIDA,
        detalhe: `campo(s) obrigatório(s) ausente(s) na linha ${numeroLinha} (codigo_transacao, referencia, valor e data_pagamento são obrigatórios)`,
      });
      return;
    }

    const valor = Number(valorBruto);
    if (!Number.isFinite(valor)) {
      achados.push({
        tipo: "linha_invalida",
        fonte: "pagamentos",
        referencia: identificadorLinha,
        regra: REGRA_LINHA_INVALIDA,
        detalhe: `valor "${valorBruto}" não é numérico na linha ${numeroLinha}`,
      });
      return;
    }

    const dataPagamento = new Date(dataPagamentoBruta);
    if (Number.isNaN(dataPagamento.getTime())) {
      achados.push({
        tipo: "linha_invalida",
        fonte: "pagamentos",
        referencia: identificadorLinha,
        regra: REGRA_LINHA_INVALIDA,
        detalhe: `data_pagamento "${dataPagamentoBruta}" não é uma data válida na linha ${numeroLinha}`,
      });
      return;
    }

    if (codigosTransacaoVistos.has(codigoTransacao)) {
      achados.push({
        tipo: "registro_repetido",
        fonte: "pagamentos",
        referencia: codigoTransacao,
        regra: REGRA_REGISTRO_REPETIDO,
        detalhe: `codigo_transacao "${codigoTransacao}" já foi processado nesta importação; linha ${numeroLinha} ignorada para fins de evento/vínculo`,
      });
      return;
    }
    codigosTransacaoVistos.add(codigoTransacao);

    // RN-10: este adaptador isolado só recebe o CSV de pagamentos, sem o
    // valor devido do pedido — por isso só é possível checar aqui a
    // condição "valor <= 0". A checagem completa de RN-10 para pagamentos
    // (">2x valor devido") depende do pedido já resolvido e fica para uma
    // camada posterior (ex. caso de uso de importação/conciliação), que tem
    // os dois lados disponíveis. Passar `Number.POSITIVE_INFINITY` como
    // valorDevido neutraliza a checagem de limite máximo de
    // `verificarPagamento` (nenhum valor finito é maior que 2 * Infinity),
    // isolando só a checagem de "maior que zero" sem reimplementá-la aqui.
    // (Infinity passou a ser rejeitado por `verificarPagamento` (RTP-0036);
    // `Number.MAX_VALUE / 2` mantém o mesmo efeito: limite 2x = MAX_VALUE.)
    const achadoValor = verificarPagamento(valor, Number.MAX_VALUE / 2);
    if (achadoValor) {
      achados.push({
        tipo: "valor_fora_do_padrao",
        fonte: "pagamentos",
        referencia: codigoTransacao,
        regra: achadoValor.regra,
        detalhe: achadoValor.detalhe,
      });
    }

    const evento: Evento = meioPagamento
      ? {
          fonte: "pagamentos",
          codigoEvento: codigoTransacao,
          momentoFato: dataPagamento.toISOString(),
          tipo: "pagamento",
          versao_schema: 2,
          valor,
          referencia_original: referencia,
          meio_pagamento: meioPagamento,
        }
      : {
          fonte: "pagamentos",
          codigoEvento: codigoTransacao,
          momentoFato: dataPagamento.toISOString(),
          tipo: "pagamento",
          versao_schema: 1,
          valor,
          referencia_original: referencia,
        };
    eventos.push(evento);

    const resultadoCasamento = casarReferencia(referencia, codigosConhecidos);
    if ("idPedido" in resultadoCasamento) {
      vinculos.push({
        fonte: "pagamentos",
        codigoExterno: codigoTransacao,
        idPedido: resultadoCasamento.idPedido,
      });
    } else {
      achados.push({
        tipo: "sem_identificacao",
        fonte: "pagamentos",
        referencia: codigoTransacao,
        regra: REGRA_SEM_IDENTIFICACAO,
        detalhe: `referência "${referencia}" não casou com exatamente 1 código de pedido conhecido`,
      });
    }
  });

  return { vinculos, eventos, achados };
}
