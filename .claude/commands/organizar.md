---
description: Aciona o agente Executor para quebrar o TASK.md em arquivos individuais na pasta .md/.taskplan — um arquivo TP-0000.md por tarefa, com o plano de execução, o plano de teste e o plano de validação de segurança. Também gera o `.md/TASKPLAN.md` (ordem de execução e estado de cada tarefa). Só planeja, não implementa nada. Por padrão cobre as tarefas em aberto que ainda não têm arquivo; --lote N e --tarefa TP-0000 (ou T-xxx) restringem o alvo. Com --ordenar, só reordena o TASKPLAN.md (fila final: dependências antes dos dependentes, bloqueadas no fim ou depois do seu BK), sem tocar em mais nada. Com --migrar, reorganiza um projeto em andamento do zero: padroniza os IDs (TP/RTP/SPK), converte o BLOCKERS.md em BK, apaga e regera o TASKPLAN.md e todos os arquivos de .md/.taskplan.
argument-hint: [vazio = todas as tarefas em aberto sem arquivo | --lote N | --tarefa TP-0000 (ou T-xxx, em TASK.md antigo) | --ordenar | --migrar]
---

# Comando `/organizar` — Executor, plano por tarefa

Este comando **não implementa nada**: lê o `.md/TASK.md` e, para cada tarefa,
grava um arquivo `.md/.taskplan/TP-0000.md` com três planos que o `/executar` (plano de
execução), o QA (plano de teste) e o DevSecOps (plano de validação de segurança)
poderão consultar depois, sem reler o `TASK.md` inteiro. Também gera o **`.md/TASKPLAN.md`**: a lista de todas as tarefas na ordem de
execução, com o estado de cada uma (Seção 4). Não altera o `TASK.md`, não toca em
código e não dispara `/executar`.

**O usuário é o orquestrador.** O comando termina ao gravar os arquivos e
apresentar o resumo.

Argumento recebido (pode estar vazio): $ARGUMENTS

## 0. Pré-requisitos bloqueantes

1. **Planejamento aprovado**: `.md/TASK.md`, `.md/SDD.md` e `.md/GUARDRAILS.md`
   precisam existir (`.md/UX-SPEC.md` e `.md/API-CONTRACT.yaml` entram quando
   existirem). Se faltar algum dos três primeiros, pare e informe — rode
   `/definir` antes.
2. **Argumento válido**: vazio, `--lote N`, `--tarefa <ID>` (com o valor; aceita `T-001` ou `TP-0001`) ou
   `--ordenar` (modo próprio, Seção 7) ou `--migrar` (modo próprio, Seção 6). Qualquer outra coisa: mostre as opções com um exemplo de cada e **pare**.
3. **TASK.md fora do padrão de IDs** (ex.: `T-001`, `BF-01`, `SP-01`, `RFT-L02-04`): fora do `--migrar`, o
   `taskplan.py` recusa e pede a migração. Se o `TASK.md` tiver IDs fora do padrão `TP-/RTP-/SPK-`, **pare** e
   recomende `/organizar --migrar` (T-nnn legado ainda é aceito pelos demais modos).

## 1. Montar a lista de tarefas-alvo

Leia só a Seção 3 do `TASK.md` (tabelas por lote: `ID | Lote | Título | Chapéu |
Reqs | Aceite | Est | Dep | Par | Arquivos | Testes e diretrizes | Status`) e
liste a pasta `.md/.taskplan/` (crie-a se não existir).

- **Vazio**: toda tarefa cujo Status **não** começa com `Concluída` e que ainda
  **não tem** `.md/.taskplan/TP-0000.md`.
- **`--lote N`**: o mesmo critério, restrito às tarefas do lote `N` (coluna `Lote`,
  `L04` ou `4`; as tarefas de `Refatoração Lote-N` não entram aqui — cobertas pelo
  modo vazio ou por `--tarefa`). Lote inexistente: informe e pare.
- **`--tarefa <ID>`**: só essa tarefa, **mesmo se já `Concluída` ou com arquivo
  existente** (nesse caso o arquivo é refeito). ID inexistente: informe e pare.

Arquivo existente nunca é sobrescrito fora de `--tarefa`: é pulado e contado no
resumo. **Nome do arquivo**: o ID da tarefa no `TASK.md` quando já é `TP-0000` (padrão do
`/definir`); em `TASK.md` antigo com `T-nnn`, `TP-` + o número com 4 dígitos
(`T-001` → `TP-0001`, `T-372` → `TP-0372`), conforme a convenção do
`EXECUTION-FLOW.md` ("Convenção de IDs e da pasta `.md/.taskplan`"). O `TASK.md`
**não é alterado**: as linhas continuam com o ID que têm. Tarefas já criadas com `RTP-`/sufixo de letra
(vindas do `/executar`) já têm o próprio arquivo e são puladas.

Lista vazia: não há planos novos a gerar — **pule as Seções 2 e 3, mas rode a
Seção 4** (o `TASKPLAN.md` é sempre regerado) e então encerre.

## 2. Despachar o Executor

Agrupe as tarefas-alvo por lote. Dispare uma instância de `executor`
(`subagent_type: executor`, `run_in_background: false`) **por lote**, em blocos de
até 4 chamadas paralelas (um bloco termina antes do seguinte começar). Lote com
mais de 15 tarefas-alvo: divida em partes de até 15, para manter cada instância
com contexto curto.

O prompt de cada instância (não repita a definição do agente) traz: os IDs das
tarefas dela, o caminho dos documentos a ler (`TASK.md` Seções 1, 3 e 4 — só as
linhas dessas tarefas e das suas dependências —, `SDD.md`, `GUARDRAILS.md`,
`UX-SPEC.md` e `API-CONTRACT.yaml` quando aplicável) e estas regras:

1. **Só escreve em `.md/.taskplan/`.** Nada de código, nada de edição em `TASK.md`
   ou nos demais artefatos.
2. **Um arquivo por tarefa**, `.md/.taskplan/<ID>.md`, neste formato:

   ```markdown
   # TP-0000 — <título>

   Reserva: Livre
   ID no TASK.md: <TP-0001 (ou T-001, em TASK.md antigo)> · Lote: <lote> · Agente: <executor | coordenador> · Chapéu: <chapéu> · Est: <est> · Dep: <dependências> · Status no TASK.md: <status>
   Reqs: <requisitos> · Aceite: <critério de aceite, copiado do TASK.md>

   ## 1. Plano de execução
   **Reaproveitamento:** <o que já existe no código e esta tarefa deve USAR (módulo,
   função, componente, com caminho); o que esta tarefa precisa e já existe em outro
   lugar só como trecho dentro de outro arquivo — e, nesse caso, o passo de
   EXTRAIR para um módulo comum e fazer os dois usarem; ou "nada a reaproveitar">
   **Camada:** <em qual pacote/camada da subseção "Pacotes, pastas e fronteiras" do
   SDD.md cada arquivo novo entra>
   **Referência visual** (só tarefa de tela/componente): <páginas do mockup que valem
   (`.md/mockup/telas/<tela>--<estado>.html`), seletores/classes do mockup a
   reproduzir, tokens usados, e o comando de comparação
   (`node .claude/scripts/comparar-visual.mjs --tela <id> --base-url <url> --pacote <pacote da interface>`);
   ou "não se aplica">

   <passos ordenados para implementar, arquivos a criar/alterar (a coluna Arquivos
   é o ponto de partida, não o limite), contratos/ADRs/diretrizes que valem aqui,
   ordem TDD, dependências que precisam estar prontas, pontos de atenção e o que
   NÃO fazer (fora de escopo)>

   ## 2. Plano de teste
   <casos de teste que cobrem o critério de aceite, no nível certo (unitário,
   integração, componente, e2e), dados/fixtures, casos de borda e de erro, o que
   a cobertura exigida em "Testes e diretrizes" pede, comando para rodar>

   ## 3. Plano de validação de segurança
   <requisitos de segurança do SDD/GUARDRAILS aplicáveis a esta tarefa
   (autenticação, autorização, isolamento por usuário, validação de entrada,
   dados pessoais/LGPD, segredos, logs/auditoria, dependências), o que verificar
   no diff, ameaças plausíveis e como checá-las (SAST, teste negativo, revisão
   manual). Se a tarefa não toca superfície de segurança, diga isso em uma linha
   e liste só o mínimo (dependências novas, segredos, logs)>
   ```

   As seções `## 4. Resultado da execução`, `## 5. Resultado do QA`, `## 6. Resultado
   do DevSecOps` e `## Bloqueio` **não são escritas aqui**: o `/executar` as acrescenta
   (cada agente grava o seu resultado no arquivo da tarefa).

3. **Específico, não genérico**: cada plano cita arquivos, rotas, tabelas ou
   regras reais desta tarefa. Texto que serviria para qualquer tarefa não vale.
4. **Curto**: cada plano cabe em ~30 linhas; o arquivo não repete o `SDD.md`,
   só aponta (`ADR-0xx`, seção) e traz o que é específico da tarefa.
5. **Dúvida de escopo, lacuna no `SDD.md`/`UX-SPEC.md` ou critério de aceite
   ambíguo**: não invente — grave o arquivo com a seção afetada marcando
   `PENDENTE: <pergunta>` e relate no retorno.
6. **Reaproveitar, nunca espelhar** (`.claude/CONVENCOES-DE-CODIGO.md`, regra 1):
   antes de escrever o plano, procure no código (`Grep`/`Glob`) o que a tarefa vai
   precisar e preencha o bloco **Reaproveitamento**. É proibido escrever no plano
   "espelhar a estrutura de X", "copiar de X" ou "X continua intocado" quando a
   tarefa reaproveita a lógica de X — escreva "extrair o comum de X para `<módulo>`
   e usar nos dois". Preservar o **contrato** de X (forma da resposta, schema) é
   diferente de não poder editar o **arquivo** X: os testes de contrato garantem o
   primeiro, e o segundo não é regra.
7. **Tarefa de tela:** preencha **Referência visual** lendo o `telas.json` e as
   páginas do mockup; o plano de teste (`## 2.`) inclui a comparação visual da tela
   nos estados e tamanhos do aceite, com o limite de pixels.
8. Retorne um relatório de até 10 linhas: IDs gravados, IDs com `PENDENTE` e a
   pergunta de cada um.

## 3. Conferir e encerrar

Depois de cada bloco, confira com `Glob` se o `.md/.taskplan/<ID>.md` de toda tarefa
despachada existe e tem as três seções (`## 1.`, `## 2.`, `## 3.`). Faltou arquivo
ou seção: redespache só essas tarefas, **uma vez**; se faltar de novo, liste-as
como falhas no resumo.

Apresente o resumo: quantas tarefas foram organizadas (por lote), quantas puladas
por já terem arquivo, quantas com `PENDENTE` (com a pergunta de cada uma) e
quantas falharam. Informe que os arquivos estão em `.md/.taskplan/` e **não foram
commitados**. Depois, rode a Seção 4 e feche com a contagem por estado.
**Pare aqui.** Não dispare nenhum outro comando.

## 4. Gerar o `.md/TASKPLAN.md`

**Sempre**, ao final (inclusive quando nenhum plano novo foi gerado), rode:

```
python .claude/scripts/taskplan.py gerar
```

O script lê a Seção 3 do `TASK.md` e a pasta `.md/.taskplan/` e **reconstrói o
`.md/TASKPLAN.md`** — a lista de **todas** as tarefas (concluídas ou não), na
**ordem de execução** (ordem do `TASK.md`, adiantando só o que for preciso para
cada dependência vir antes), com `#`, tarefa (ID do `TASK.md` e o `TP-` equivalente),
se tem plano em `.taskplan`, título, lote, dependências e o **estado**:

| Estado | Quando |
|---|---|
| Não executada | Status `Pendente` |
| Em execução | Status `Em andamento`, ou reserva `Em execução` no arquivo da tarefa |
| Executada (aguarda teste) | `Concluída` ainda sem `QA ✔` (fluxo novo) |
| Em teste | reserva `Em QA` |
| Testada (aguarda segurança) | `Concluída · QA ✔`, sem `Sec ✔` |
| Em validação de segurança | reserva `Em DevSecOps` |
| Aprovada | `QA ✔ · Sec ✔` (100%); tarefas antigas só `Concluída` também |
| Bloqueada / Dividida | Status `Bloqueada…` / `Dividida…` |

Não edite o arquivo à mão e não invente estado: ele é derivado do `TASK.md` (fonte
de verdade do Status) e do cabeçalho `Reserva:` dos arquivos de `.taskplan`. O
`/executar` mantém a linha de cada tarefa atualizada a cada etapa
(`python .claude/scripts/taskplan.py set <ID> "<Estado>"`).

No resumo final, inclua a linha `Resumo:` do `TASKPLAN.md` (contagem por estado).

## 6. Modo `--migrar` — reorganizar um projeto em andamento

Para projetos que já têm `TASK.md` (e talvez `.md/.taskplan/`) fora do padrão. **Recria tudo do zero** e deixa o
projeto 100% organizado. Não mexe em código. O trabalho mecânico é do script; o Executor só planeja o que está
em aberto.

1. **Relatório prévio (dry-run)**: rode `python .claude/scripts/taskplan.py migrar` (sem `--confirmar`). Ele
   recusa se `.md/` tiver alterações não commitadas (**o git é o backup**) ou se houver reserva ativa de outra
   sessão, e imprime: IDs a renomear (TP/RTP/SPK, com exemplos), documentos de `.md/` com referências a reescrever,
   bloqueios do `BLOCKERS.md` que viram `BK`, arquivos de `.taskplan` que serão apagados e as tarefas a planejar.
   Mostre isso ao usuário e peça confirmação (`AskUserQuestion`: migrar / cancelar).
2. **Executar**: com o "sim", rode `... migrar --confirmar`. O script:
   - **padroniza os IDs** no `TASK.md` e em todo `.md` do projeto: `T-nnn` → `TP-nnnn` (mantém o número), IDs
     semânticos (`BF-01`…) → `TP-0001…` na ordem do documento, tarefas de refatoração (grupo `Refatoração…` ou
     `RFT-…`) → `RTP-0001…`, spikes (`S-nn`, `SP-nn`) → `SPK-0001…`. O mapa antigo→novo fica em
     `.md/TASKPLAN-IDS.json`. As tabelas são lidas **pelo nome das colunas** (9, 12 ou mais colunas) e o Status em
     negrito (`**Concluída**`) é entendido;
   - **converte o `BLOCKERS.md` em `BK-0001…`** (um arquivo por bloqueio em `.md/.taskplan/`; o aberto entra na
     coluna Dep das tarefas que afeta; o `BLOCKERS.md` **permanece** como histórico);
   - **apaga e regera** `.md/TASKPLAN.md` e **todos** os arquivos de `.md/.taskplan/`, preservando só as seções
     `## 4./5./6./Bloqueio` gravadas antes pelos agentes;
   - cria **um arquivo por tarefa**: tarefa `Concluída` (aprovada) ou `Dividida` recebe só o cabeçalho e a nota
     "Não precisou de planejamento: tarefa já concluída"; as demais ficam com as seções `1. Plano de execução`,
     `2. Plano de teste` e `3. Plano de validação de segurança` marcadas `PENDENTE: a gerar`.
3. **Planejar o que está em aberto**: para cada tarefa listada como `ABERTA` (arquivo com seções `PENDENTE`),
   dispare o Executor como na Seção 2 (por lote, em blocos de até 4 chamadas paralelas, até 15 tarefas por
   instância), com a diferença de que o arquivo **já existe**: o Executor reescreve **só** as três seções de plano,
   preservando o cabeçalho e as seções `## 4.`… existentes. `BK` e `SPK` em aberto são do **Coordenador** (não do
   Executor) e não recebem plano aqui.
4. **Conferir e fechar**: rode a Seção 3 (toda tarefa aberta com as três seções sem `PENDENTE: a gerar`) e a
   Seção 4 (`gerar`). Apresente o resumo: IDs renomeados, aprovadas sem planejamento, planos gerados, BK criados
   e a linha `Resumo:` do `TASKPLAN.md`. Lembre que **nada foi commitado** e que o projeto passa a usar só
   `TP-/RTP-/SPK-/BK-`. **Pare aqui.**

## 7. Modo `--ordenar` — só reordenar a fila

Para projetos já existentes que só precisam **voltar a um ponto inicial de ordenação**: nada de renomear, nada de
planejar. Serve, por exemplo, depois de editar o `TASK.md` à mão, de resolver bloqueios fora do `/executar` ou de
trazer o `.claude` novo para um projeto que já tem `TASKPLAN.md`. **Não aciona agente.**

1. Rode `python .claude/scripts/taskplan.py ordenar`. O script reconstrói **apenas** o `.md/TASKPLAN.md` (ele é
   derivado do `TASK.md`, do `Reserva:` e dos `BK-`) na **ordem final da fila**, a mesma que o `/executar` segue
   e o `/listar` mostra:
   - dependências antes dos dependentes (ordem do `TASK.md`, adiantando só o necessário);
   - tarefa **bloqueada que nenhuma tarefa em aberto espera** vai para o **fim**, com o seu `BK-` imediatamente
     antes;
   - tarefa **bloqueada da qual outras dependem** fica no lugar, com o `BK-` logo antes dela (BK primeiro,
     bloqueada depois);
   - `BK-`/`SPK-` são do Coordenador: aparecem na fila, mas o `/executar` nunca os entrega ao Executor.
2. **Não altera** o `TASK.md`, os arquivos de `.md/.taskplan/`, os IDs nem o `BLOCKERS.md`, e não cria `BK`.
   Se o `TASK.md` tiver IDs fora do padrão (`BF-01`, `SP-01`…), o script **recusa** e pede `/organizar --migrar`.
   Tarefas `Concluída` sem marcadores (legado) contam como aprovadas, como no `gerar`.
3. Apresente o resumo que o script imprime: quantas posições mudaram, a fila em aberto na ordem, as tarefas sem
   arquivo em `.taskplan` (sugira `/organizar`, sem `--ordenar`) e a **primeira elegível** (a que o `/executar`
   pegará). Lembre que **nada foi commitado**. **Pare aqui.**

## 5. Bloqueio

Se um agente sinalizar bloqueio (relatório próprio ou entrada nova `Aberto` em
`.md/BLOCKERS.md`): **pare**, explique quem reportou, o quê e o campo "Escala
para" — não dispare outro agente automaticamente.
