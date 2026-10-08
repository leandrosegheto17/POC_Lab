import { parse } from "csv-parse/sync";
import type { Evento } from "../dominio/evento.js";
import type { AchadoQualidade, VinculoFonte } from "../dominio/modelo.js";

/**
 * Tipos de evento de rastreio reconhecidos em `rastreio.csv`.
 */
const TIPOS_VALIDOS = new Set(["coleta", "transporte", "entrega"]);

/**
 * Linha crua lida do CSV de rastreio, antes de qualquer validação.
 */
type LinhaRastreioCsv = {
  codigo_evento?: string;
  codigo_rastreio?: string;
  pedido_venda?: string;
  tipo?: string;
  momento_fato?: string;
  transportadora?: string;
};

/**
 * Resultado do processamento de `rastreio.csv`: vínculos com o pedido,
 * eventos de domínio e achados de qualidade de dados — tudo em memória,
 * sem gravação em banco.
 */
export type ResultadoProcessamentoRastreio = {
  vinculos: VinculoFonte[];
  eventos: Evento[];
  achados: AchadoQualidade[];
};

/**
 * Verifica se uma string representa uma data/hora válida em formato ISO.
 */
function dataIsoValida(valor: string | undefined): boolean {
  if (!valor) {
    return false;
  }
  const data = new Date(valor);
  return !Number.isNaN(data.getTime());
}

/**
 * Processa o conteúdo de `rastreio.csv` e devolve vínculos, eventos e
 * achados de qualidade de dados correspondentes.
 *
 * Convenção de `ordemChegada`: cada evento recebe como `ordemChegada` o
 * índice físico da linha no CSV, começando em 0 para a primeira linha de
 * dados (a linha de cabeçalho não é contada). A ordem das linhas no
 * arquivo é a ordem de chegada — não há reordenação.
 *
 * Linhas malformadas (campo faltando, `tipo` fora do enum, data inválida)
 * geram achado `linha_invalida` e são ignoradas (sem lançar erro); o
 * processamento continua com as linhas seguintes.
 *
 * `codigo_evento` repetido dentro da mesma importação gera achado
 * `registro_repetido`; apenas a primeira ocorrência gera vínculo/evento.
 */
export function processarRastreio(
  conteudoCsv: string,
): ResultadoProcessamentoRastreio {
  const linhas: LinhaRastreioCsv[] = parse(conteudoCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const vinculos: VinculoFonte[] = [];
  const eventos: Evento[] = [];
  const achados: AchadoQualidade[] = [];
  const codigosEventoVistos = new Set<string>();

  linhas.forEach((linha, ordemChegada) => {
    const {
      codigo_evento: codigoEvento,
      codigo_rastreio: codigoRastreio,
      pedido_venda: pedidoVenda,
      tipo,
      momento_fato: momentoFato,
      transportadora,
    } = linha;

    const referencia =
      codigoEvento ?? codigoRastreio ?? `linha-${ordemChegada}`;

    if (
      !codigoEvento ||
      !codigoRastreio ||
      !pedidoVenda ||
      !tipo ||
      !momentoFato ||
      !transportadora
    ) {
      achados.push({
        tipo: "linha_invalida",
        fonte: "rastreio",
        referencia,
        regra: "campos_obrigatorios",
        detalhe: `Linha ${ordemChegada} de rastreio.csv com campo obrigatório faltando.`,
      });
      return;
    }

    if (!TIPOS_VALIDOS.has(tipo)) {
      achados.push({
        tipo: "linha_invalida",
        fonte: "rastreio",
        referencia,
        regra: "tipo_valido",
        detalhe: `Tipo '${tipo}' fora do enum esperado (coleta, transporte, entrega) na linha ${ordemChegada}.`,
      });
      return;
    }

    if (!dataIsoValida(momentoFato)) {
      achados.push({
        tipo: "linha_invalida",
        fonte: "rastreio",
        referencia,
        regra: "momento_fato_iso",
        detalhe: `momento_fato '${momentoFato}' não é uma data ISO válida na linha ${ordemChegada}.`,
      });
      return;
    }

    if (codigosEventoVistos.has(codigoEvento)) {
      achados.push({
        tipo: "registro_repetido",
        fonte: "rastreio",
        referencia: codigoEvento,
        regra: "codigo_evento_unico",
        detalhe: `codigo_evento '${codigoEvento}' já havia sido processado nesta importação; ocorrência na linha ${ordemChegada} ignorada.`,
      });
      return;
    }
    codigosEventoVistos.add(codigoEvento);

    vinculos.push({
      fonte: "rastreio",
      codigoExterno: codigoRastreio,
      idPedido: pedidoVenda,
    });

    const base = {
      fonte: "rastreio" as const,
      codigoEvento,
      momentoFato,
      ordemChegada,
      versao_schema: 1 as const,
      transportadora,
      codigo_rastreio: codigoRastreio,
    };

    if (tipo === "coleta") {
      eventos.push({ ...base, tipo: "coleta" });
    } else if (tipo === "transporte") {
      eventos.push({ ...base, tipo: "transporte" });
    } else {
      eventos.push({ ...base, tipo: "entrega" });
    }
  });

  return { vinculos, eventos, achados };
}
