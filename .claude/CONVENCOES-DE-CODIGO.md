# CONVENCOES-DE-CODIGO.md

Regras de código que valem em **todo projeto** deste ambiente, para qualquer chapéu do
Executor (Backend, Frontend, Mobile). Este é o único lugar onde elas estão escritas: o
`executor.md`, a `implementation-guideline-drafting`, o QA (`acceptance-criteria-validation`,
`finding-severity-classification`) e a revisão de arquitetura (`architecture-health-review`,
comando `/revisar`) **apontam para cá** em vez de repetir o texto.

**Precedência.** Estas regras ficam **por cima** da skill `coding-guidelines` (que é de
terceiros e não é editada). Onde a `coding-guidelines` diz "mexa só no necessário" ou "não
refatore o que não está quebrado", vale a exceção da regra 1 abaixo: código duplicado
**está** quebrado. As diretrizes específicas do projeto (Seção 1 do `TASK.md`) e o
`GUARDRAILS.md` ficam por cima destas.

**Por que existem.** Saíram da revisão de arquitetura do POC_Lab (2026-10-08), onde tarefas
pequenas e paralelas, cada uma aprovada isoladamente, somaram: lógica copiada entre módulos,
uma rota v2 que era cópia da v1, regra de negócio rodando no navegador, SQL espalhado fora do
repositório, arquivos de 400-570 linhas e 228 menções a IDs de tarefa nos comentários.

---

## 1. Reaproveitar, nunca copiar

- **Regra do segundo uso.** Se a tarefa precisa de uma lógica que já existe em outro módulo
  (uma consulta, um cálculo, uma montagem de resposta, uma lista de rótulos), **extraia** essa
  lógica para um lugar comum **na própria tarefa** e faça os dois pontos usarem a mesma
  função. Copiar mais de ~10 linhas de outro arquivo é proibido.
- **Extração grande demais para o escopo?** Não copie "por enquanto": registre um `BK` (ou
  peça a divisão da tarefa) antes. Comentário do tipo "mesma lógica de X, duplicada aqui"
  nunca é aceitável.
- **Dentro do mesmo arquivo** vale o mesmo: três blocos quase iguais (um por fonte, um por
  tipo, um por versão) viram uma função chamada três vezes. Manter as chamadas explícitas e
  nomeadas é diferente de repetir o corpo.
- **Contrato ≠ arquivo.** "A v1 não pode mudar" protege o comportamento observável (forma da
  resposta, schema). Refatorar o arquivo da v1 para extrair o que a v2 também usa é
  permitido, e é o caminho esperado, desde que os testes de contrato da v1 continuem passando.

## 2. Fronteiras de pacote e de camada

- Siga a subseção `### Pacotes, pastas e fronteiras` da Seção 2 do `SDD.md`. Arquivo novo
  entra no pacote/camada que ela define.
- **Acesso a dados só no módulo de dados.** Nenhum `prepare`/`query`/SQL cru fora dele; quem
  precisa de dado chama uma função de consulta desse módulo. O módulo **não expõe** a
  conexão (`db`) no seu tipo público (no máximo para testes, por um caminho separado).
- **Ponto de entrada não importa ponto de entrada.** CLI não importa outra CLI, rota não
  importa outra rota. O que é comum vai para a camada de casos de uso (`aplicacao/` ou
  equivalente). Caminhos e constantes de configuração moram num módulo de configuração, não
  dentro de uma CLI.
- **A tela não recalcula regra de negócio.** Ela mostra o que a API entrega. Se precisa de um
  cálculo que a API não entrega, isso é lacuna: sinalize ao Coordenador (endpoint ou campo
  novo), não importe o domínio para calcular no navegador.
- **Sem `as unknown as`** para converter um tipo do contrato num tipo do domínio. Se a
  conversão é necessária, escreva um adaptador tipado e testado.

## 3. Tamanho e responsabilidade

- **Arquivo de código acima de ~300 linhas** (ou componente de tela acima de ~200) é sinal
  para dividir. Passar disso exige justificativa em `## 4` do taskplan.
- **Um componente exportado por arquivo** de tela. Quatro blocos de indicador diferentes são
  quatro arquivos numa pasta, não um arquivo de 570 linhas.
- **Página fina:** a página lê parâmetros, chama o gancho de dados e compõe componentes.
  Rótulos, conversões de URL e formatações vão para módulos próprios.
- **Rótulos e listas de tipos do domínio** (nome amigável de cada tipo, ordem de exibição)
  ficam num único módulo, derivado do enum do contrato. Nunca a mesma lista em dois arquivos.
- **Arquivo de teste acima de ~400 linhas** é sinal para dividir por comportamento; dados de
  teste repetidos viram fábricas em `test/apoio/` (ou equivalente).

## 4. Comentários

- **Nunca** citar ID de tarefa, lote ou rodada no código (`TP-0048`, `RTP-0041`, `Lote 9`).
  Rastreabilidade mora no commit (`TP-0048: …`), no taskplan e no `TASK.md`.
- **Nunca** narrar o processo ("outra etapa do orquestrador registra esta rota", "não editar
  este arquivo nesta tarefa"). Comentário descreve o código como ele é agora.
- O comentário explica **por quê** (decisão, restrição, armadilha), não **o quê** (o código já
  diz). Um cabeçalho de módulo curto é bem-vindo; um ensaio de 50 linhas não.
- **Quem muda o comportamento atualiza ou apaga o comentário que ficou falso**, no mesmo
  diff. Comentário desatualizado é defeito, não detalhe.
- Citar regra de negócio ou ADR (`RN-08`, `ADR-004`) é permitido quando explica o porquê:
  essas referências são estáveis, IDs de tarefa não.

## 5. Desempenho básico

- Comando SQL preparado **uma vez** (na criação do repositório), não a cada chamada dentro de
  um laço.
- Sem consulta dentro de laço (N+1) quando um `JOIN`/`IN` resolve.

## 6. Configuração, CI e publicação

- Caminho usado pelo CI (cache, artefato) é relativo à pasta onde o comando **realmente
  roda**. Em monorepo, `pnpm --filter <pacote> run …` roda dentro do pacote, não na raiz.
- Publicação/deploy é um script dedicado (ou workflow), não uma cadeia de `&&` dentro do
  `package.json`.

---

## Como cada papel usa este arquivo

| Papel | Uso |
|---|---|
| Coordenador (`implementation-guideline-drafting`) | A Seção 1 do `TASK.md` referencia este arquivo como camada base e só acrescenta o que é específico do projeto (limites diferentes, nomes de pastas). |
| Executor | Segue as regras ao implementar; confere a lista "Antes de devolver" do `executor.md`. |
| Validador (QA) | Violação de qualquer regra daqui é **achado não crítico** → abre `RTP` (ver `finding-severity-classification`). Nunca "sem severidade". |
| Coordenador (`/revisar`) | `architecture-health-review` mede o projeto inteiro contra este arquivo e abre `RTP` para o que escapou da validação por tarefa. |
