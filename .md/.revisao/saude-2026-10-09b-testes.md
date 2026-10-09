# Saúde estrutural do código

Raiz: `C:/Leandro/Projetos/POC_Lab` · 293 arquivo(s) de código/estilo · 32917 linhas.

## 1. Tamanho de arquivos

Limites: código 300 · componente de tela 200 · teste 400 · estilo 300 linhas.

| Tipo | Acima do limite |
|---|---|
| código | 0 |
| componente | 0 |
| teste | 0 |
| estilo | 0 |


## 2. Blocos duplicados

Janela: 8 linhas normalizadas (sem vazias, comentários, imports e pontuação solta). Escopo: código e testes.

23 bloco(s), 190 linhas normalizadas repetidas; 14 dentro do mesmo arquivo.

| Linhas | Arquivo A | Arquivo B |
|---|---|---|
| 12 | `processamento/test/publicacao/escritor-sql.test.ts:194-207` | `processamento/test/publicacao/escritor-sql.test.ts:226-239` |
| 9 | `processamento/test/cli/baixar-base.test.ts:48-56` | `processamento/test/cli/baixar-base.test.ts:87-95` |
| 9 | `eslint.config.js:90-98` | `eslint.config.js:118-126` |
| 8 | `web/test/worker/contrato-v1-v2.test.ts:272-281` | `web/test/worker/linha-do-tempo-v2.test.ts:99-109` |
| 8 | `web/test/worker/contrato-v1-v2.test.ts:95-103` | `web/test/worker/contrato-v1-v2.test.ts:124-132` |
| 8 | `web/test/pedido.test.tsx:167-175` | `web/test/pedido.test.tsx:194-202` |
| 8 | `web/test/faixa-resumo.test.tsx:102-113` | `web/test/faixa-resumo.test.tsx:120-131` |
| 8 | `web/test/divergencias-paginacao.test.tsx:158-170` | `web/test/divergencias-paginacao.test.tsx:204-216` |
| 8 | `web/test/divergencias-paginacao.test.tsx:51-63` | `web/test/divergencias-paginacao.test.tsx:204-216` |
| 8 | `web/test/divergencias-paginacao.test.tsx:51-63` | `web/test/divergencias-paginacao.test.tsx:158-170` |
| 8 | `web/test/divergencias-estados.test.tsx:49-59` | `web/test/divergencias-paginacao-bordas.test.tsx:214-224` |
| 8 | `processamento/test/publicacao/qualidade.test.ts:68-78` | `processamento/test/publicacao/qualidade.test.ts:92-102` |
| 8 | `processamento/test/publicacao/qualidade.test.ts:18-25` | `web/test/worker/qualidade.test.ts:33-40` |
| 8 | `processamento/test/integracao/gerador-plantio-pagamentos.test.ts:85-96` | `processamento/test/integracao/gerador-plantio-rastreio.test.ts:132-143` |
| 8 | `processamento/test/dominio/fora-de-ordem.test.ts:94-102` | `processamento/test/dominio/fora-de-ordem.test.ts:165-173` |

… e mais 8 bloco(s).

## 3. IDs de tarefa/lote no código

0 menção(ões) em 0 arquivo(s).


## 4. Comentários que admitem cópia

35 ocorrência(s).

| Local | Trecho |
|---|---|
| `processamento/src/dominio/divergencias/duplicado.ts:14` | * duplicado): o código do evento (identifica a transação) e o valor pago. |
| `processamento/src/dominio/divergencias/duplicado.ts:20` | * RN-03 — pagamento duplicado. |
| `processamento/src/dominio/divergencias/duplicado.ts:22` | * `pagamentos` já chega deduplicado por `codigoEvento` (idempotência é |
| `processamento/src/dominio/divergencias/duplicado.ts:29` | * devido, retorna um achado `duplicado` citando os valores envolvidos. |
| `processamento/src/dominio/divergencias/index.ts:11` | * `duplicado`, `parcial`, `pago_nao_enviado`/`enviado_nao_pago`, |
| `processamento/src/dominio/divergencias/index.ts:18` | * Função pura: só compõe as 4 funções já existentes em `duplicado.ts`, |
| `processamento/src/dominio/totais.ts:23` | * pedido duplicado, ela espera a divergência já enriquecida com `idPedido` |
| `processamento/src/dominio/totais.ts:81` | *     `duplicado`, arredondado só no fim da soma. |
| `processamento/src/gerador/plantar-pagamentos.ts:150` | // Duplicado (RN-03): troca a(s) linha(s) original(is) por 2 transações de |
| `processamento/src/gerador/plantar-rastreio.ts:68` | * `situacaoPagamento` (ex. "enviado_nao_pago"/"duplicado"/"parcial") E um |
| `processamento/src/importacao/importar.ts:272` | * `repositorio` dá tudo "já existente" e nenhuma linha duplicada. |
| `processamento/src/publicacao/documentos.ts:212` | // o sufixo "Total"): mapeamento 1:1 de nome de campo, mesma lógica de |
| `processamento/src/publicacao/escritor-sql.ts:80` | * - `string` → entre aspas simples, com cada aspas simples duplicada |
| `processamento/test/integracao/importar.test.ts:233` | // Nenhum id_pedido duplicado foi criado para o mesmo código de vendas. |
| `processamento/test/publicacao/divergencias.test.ts:148` | // Duplicado + pago_nao_enviado não coexistem (duplicado implica excedente, |
| `processamento/test/publicacao/escritor-sql.test.ts:106` | // Nenhuma linha se perde nem é duplicada ao longo das instruções quebradas. |
| `web/src/componentes/EtiquetaEstado.tsx:12` | // ("duplicado", "fora de ordem", "no prazo", "atrasada", "Aceita", |
| `web/src/componentes/LinhaDoTempo.tsx:47` | /** `codigoEvento` dos pagamentos a marcar como "duplicado" (já sem o |
| `web/src/componentes/indicador/BlocoDivergenciasPorTipo.tsx:9` | * `linha.rotulo` já chega como o literal do tipo (ex. `"duplicado"`): o |
| `web/src/componentes/pedido/DetalheLinhaDoTempo.tsx:11` | * Pagamentos a marcar como "duplicado" na linha do tempo. Só quando a API já |
| `web/src/componentes/pedido/DetalheLinhaDoTempo.tsx:12` | * apontou a divergência `duplicado` para o pedido; a regra é a mesma do |
| `web/src/componentes/pedido/DetalheLinhaDoTempo.tsx:13` | * processamento (`detectarDuplicado`, RN-03), rodando no navegador sobre os |
| `web/src/estilos/tokens.css:129` | --etq-duplicado-texto: #ffa69b; |
| `web/src/estilos/tokens.css:130` | --etq-duplicado-fundo: #2a1414; |
| `web/src/estilos/tokens.css:131` | --etq-duplicado-borda: #5c2626; |
| `web/src/estilos/tokens.css:161` | --etq-erro-texto: var(--etq-duplicado-texto); |
| `web/src/estilos/tokens.css:162` | --etq-erro-fundo: var(--etq-duplicado-fundo); |
| `web/src/estilos/tokens.css:163` | --etq-erro-borda: var(--etq-duplicado-borda); |
| `web/test/apoio/paginacao.ts:4` | * evitando ambiguidade com os botões duplicados em `.paginacao-compacta` |
| `web/test/apoio/pedido-simulado.tsx:13` | // ambiguidade de texto duplicado nos testes (cabeçalho e linha do |

## 5. Acesso a dados (SQL/prepare/query fora de testes)

Compare com o módulo único de acesso a dados definido na subseção "Pacotes, pastas e fronteiras" do SDD.md: toda pasta além dele é achado.

| Pasta | Arquivos | Ocorrências |
|---|---|---|
| `processamento/src/armazenamento` | 2 | 34 |
| `web/worker` | 1 | 12 |
| `processamento/src/fontes` | 1 | 4 |
| `processamento/src/publicacao` | 1 | 1 |
| `scripts` | 1 | 1 |

## 6. Dependências

### 6a. Entre pacotes do monorepo

Pacotes encontrados: `processamento` (processamento), `web` (web).

Confira cada linha contra a subseção "Pacotes, pastas e fronteiras" do SDD.md. Aplicação importando o pacote de outra aplicação é sinal de pacote compartilhado faltando.

| De | Para | Pasta importada | Arquivos que importam |
|---|---|---|---|
| `web` | `processamento` | `processamento/src/contrato` | 34 |
| `web` | `processamento` | `processamento/src/dominio` | 5 |
| `web` | `processamento` | `processamento/src/dominio/divergencias` | 1 |

### 6b. Ponto de entrada importando ponto de entrada

Pastas consideradas de entrada: cli, comandos, commands, controllers, handlers, pages, paginas, rotas, routes, screens, telas.

Nenhum caso.


## 7. Conversões forçadas (`as unknown as`, fora de testes)

9 ocorrência(s).

`processamento/src/armazenamento/consultas.ts:98`, `processamento/src/armazenamento/consultas.ts:108`, `processamento/src/armazenamento/consultas.ts:119`, `processamento/src/armazenamento/consultas.ts:139`, `processamento/src/armazenamento/consultas.ts:157`, `processamento/src/armazenamento/consultas.ts:180`, `processamento/src/armazenamento/repositorio.ts:89`, `processamento/src/fontes/leitura-vendas.ts:122`, `processamento/src/fontes/leitura-vendas.ts:128`
