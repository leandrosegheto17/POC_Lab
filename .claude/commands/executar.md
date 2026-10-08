---
description: Etapa 1 do fluxo — aciona só o agente Executor para implementar as tarefas elegíveis (estado Não executada ou devolvida), em sequência, a partir de .md/.taskplan/<ID>.md, e grava o resultado no próprio arquivo e no TASKPLAN. Não testa nem valida segurança (isso é /testar e /validar) e não chama outro comando. Sem argumento pega a próxima tarefa elegível; --tarefa <ID> executa só essa (ou retoma uma bloqueada; BK-/SPK- vão para o Coordenador); --lote N e --continuar [N] [--nocontext] [--nocommit] [--paralelo [N]] encadeiam as tarefas e, em bloqueio, registram e seguem para a próxima elegível. Durante a rodada só o arquivo de cada tarefa é escrito; TASK.md e TASKPLAN.md são consolidados uma vez no fim. Não dispara /deploy sozinho.
argument-hint: [vazio = próxima tarefa | --tarefa <ID, inclusive BK-/SPK- do Coordenador> | --lote N | --continuar [N] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos]]
---

# Comando `/executar` — etapa 1: Executor

A lógica deste comando está definida em `.claude/EXECUTION-FLOW.md` (Comando 1) —
leia esse arquivo agora, antes de fazer qualquer outra coisa, se ainda não o tiver
em contexto. Ele por sua vez assume o que está declarado em
`.claude/agents/executor.md`, `.claude/agents/coordenador.md` e em
`PIPELINE-CONVENTIONS.md`.

**O usuário é o orquestrador.** O fluxo tem três comandos independentes:
`/executar` (este, agente `executor`), `/testar` (chapéu QA) e `/validar` (chapéu
DevSecOps). Cada um só trabalha a **sua** etapa, lê e escreve no
`.md/.taskplan/<ID>.md` e no `TASKPLAN.md`, e **nunca chama o outro**: ao fechar a
etapa a tarefa fica `Executada (aguarda teste)` e o usuário roda `/testar`. O comando
nunca dispara `/deploy`. **Paralelismo**: um agente por vez, salvo `--paralelo [N]`
(Seção 1; até 20 agentes ao mesmo tempo).

Argumento recebido (pode estar vazio): $ARGUMENTS

**Acionado pelo `/desenvolver`** (orquestrador sem supervisão): não pare para perguntar nada ao usuário — onde o
comando perguntaria (assumir reserva velha, retomar bloqueada, argumento ambíguo), **pule a tarefa** e registre
no resumo; ao terminar, devolva só o resumo curto (o que fechou, devolveu e bloqueou) e **não** sugira próximo
comando: o controle volta ao `/desenvolver`.

## 0. Pré-requisitos bloqueantes

0. **Checagem de contexto (antes de tudo)**: rode `/context`. Se o uso da sessão
   passar de ~250 mil tokens, **pare aqui** — não crie/entre em worktree (só `--tarefa` cria; `--continuar` usa a `main`), não
   dispare agente — e devolva um alerta de contexto cheio (uso atual, teto de 250
   mil, sugestão de nova sessão). **Exceção — `--continuar --nocontext`**: pule esta
   checagem por inteiro (nem na primeira tarefa, nem entre as tarefas): a fila roda
   sem limite de contexto da sessão; não rode `/context`. Repita a checagem antes de **cada tarefa nova**
   quando houver encadeamento (`--lote`, `--continuar`); não interrompa uma
   tarefa já em andamento, mas não comece outra acima do teto.
1. **Repositório git**: se `.git` não existir, pare e avise — o `/testar` e o `/validar`
   leem os commits da tarefa. Não inicialize o repo sem confirmação.
2. **Planejamento aprovado**: `SDD.md`, `UX-SPEC.md`, `TASK.md`, `GUARDRAILS.md` e
   `TASKPLAN.md` precisam existir (confira só a existência, sem abrir — `/definir` e
   `/organizar`). Se não, pare. **Este comando não lê o `TASK.md` inteiro**: ele
   trabalha pelo `TASKPLAN.md`, pelos arquivos de `.md/.taskplan/` e pelo script
   `taskplan.py` (Seção 2).
3. **Planos da tarefa**: a tarefa só é executada se existir
   `.md/.taskplan/<ID>.md` (gerado por `/organizar`) com as três seções (plano de
   execução, plano de teste, plano de validação de segurança). Sem o arquivo,
   **pare** e sugira `/organizar` (com `--tarefa TP-0000` para só essa); nunca
   improvise os planos. Uma seção marcada `PENDENTE:` também para: a pergunta
   é do usuário.

## 1. Modo de execução

Interprete `$ARGUMENTS`:

- **Vazio**: uma única tarefa — a próxima elegível (Seção 2). Bloqueio crítico
  **interrompe** e sinaliza (Seção 6).
- **`--tarefa <ID>`** (ex.: `/executar --tarefa TP-0001`, `T-001` (TASK.md antigo), `RTP-0003` ou
  `TP-0001a`): só essa tarefa; bloqueio crítico interrompe e sinaliza. Tem de ter
  as dependências resolvidas. Já executada (estado Executada/Em teste/Testada/Em validação/
  Aprovada — o próximo passo é `/testar` ou `/validar`), inexistente, com
  dependência aberta ou **reservada por outra sessão** (informe sessão e desde
  quando; se a reserva tem mais de 2 h sem atualização, pergunte se você quer
  assumi-la): explique e **pare** (não executa as dependências por conta
  própria). **`BK-nnnn` / `SPK-nnnn`**: tarefa do **Coordenador com o usuário** — siga a **Seção 7** (sem
  Executor). **`Bloqueada`**: é a **retomada** de uma tarefa que o usuário já tratou
  — leia a seção `## Bloqueio` do arquivo (e a decisão que o usuário registrou ou
  acabou de dar), limpe o bloqueio e continue da etapa em que parou.
- **`--lote N`** (ex.: `/executar --lote 4`): as tarefas elegíveis do lote `N`, uma
  após a outra, **sem interromper por bloqueio** (modo contínuo, abaixo).
- **`--continuar [N]`**: as tarefas elegíveis em sequência, de todo o `TASK.md`
  (até N tarefas, ou sem limite), **sem interromper por bloqueio** (modo contínuo).
  Respeita o teto de 250 mil tokens de contexto (Seção 0, item 0).
  - **`--continuar [N] --nocontext`**: igual, mas **sem validar o limite de
    contexto** (a checagem do item 0 da Seção 0 é pulada). `--nocontext` só vale
    junto com `--continuar`; sozinho ou com outro modo, mostre as opções e **pare**.
  - **`--nocommit`** (só com `--continuar`): **não commita** a cada tarefa; as alterações vão
    se acumulando na `main` e **você** faz o commit e o push no fim. O diff de cada tarefa fica
    registrado por **snapshot** (Seção 3-0). Com `--tarefa` (worktree) ou sem `--continuar`,
    mostre as opções e **pare**.
  - **`--paralelo [N]`** (só com `--lote` ou `--continuar`; N de 2 a 20, sem N = 5; ausente = 1):
    aciona até N Executores ao mesmo tempo, cada um com uma tarefa elegível diferente (Seção 3e).
    N > 20 é recusado: mostre as opções e **pare**.
  - **`--lotes-distintos`** (só com `--paralelo`): limita a rodada a **no máximo uma tarefa por lote**, o que
    reduz a chance de duas tarefas editarem o mesmo arquivo (modo mais conservador; a rodada fica menor).

**Modo contínuo (`--lote` e `--continuar`)**: sempre que for possível, o bloqueio
de uma tarefa é **registrado** (Seção 6) e o comando **segue para a próxima tarefa
elegível**, sem parar e sem perguntar. Tarefa que depende de uma bloqueada não é
elegível (dependência não resolvida) e é simplesmente pulada. O usuário trata os
bloqueios depois, um a um, com `/listar` e `/executar --tarefa <ID>`.

O que vale aqui para `--tarefa`, `--lote`, `--continuar` e `--nocontext` vale
**igual** no `/testar` e no `/validar`.

Argumento desconhecido, ou `--tarefa`/`--lote` sem valor: mostre as opções com um
exemplo de cada e **pare**.

**Fim de toda chamada** (inclusive quando ela para por bloqueio, teto ou erro): rode
`python .claude/scripts/taskplan.py consolidar` — é o que grava os Status no `TASK.md` e regera o
`TASKPLAN.md` (durante a rodada eles não são tocados).

## 2. Escolher a tarefa

**Regra de ouro: não leia o `.md/TASK.md` nem o `.md/BLOCKERS.md` inteiros.** A fila,
as dependências e o estado de cada tarefa estão no `.md/TASKPLAN.md`; o detalhe de
cada uma, em `.md/.taskplan/<ID>.md`. Tudo é consultado e gravado pelo script
`python .claude/scripts/taskplan.py` (as escritas no `TASK.md` mexem só na linha afetada, dentro do script). Se
o `TASKPLAN.md` não existir, **pare** e sugira `/organizar`.

1. **Próxima tarefa**: rode `python .claude/scripts/taskplan.py proxima --etapa exe [--lote N] [--pular ID,ID]`
   (com `--paralelo N`: `--n N`, e `--lotes-distintos` quando a flag foi pedida).
   O script lê o estado vivo dos arquivos de `.taskplan` por cima do `TASKPLAN.md`. O script
   nunca devolve `BK-`/`SPK-` (tarefas do Coordenador, resolvidas com o usuário). Ele devolve a próxima elegível (uma linha: ID, chave `TP-`, estado, lote, título) ou
   `NENHUMA` com o motivo. **Despriorizada** (`/despriorizar`) nunca é elegível nem é entregue: o `proxima` a ignora e `reservar`/`iniciar` recusam (exit 4); `--tarefa <ID>` sobre ela: explique e **pare** (`/despriorizar --desfazer <ID>` a traz de volta). Uma tarefa que depende de despriorizada espera (dependência aberta). **Elegível** = tem plano em `.taskplan`; estado Não
   executada ou Em execução/devolvida pelo QA ou pela segurança (nunca já executada,
   `Aprovada`, `Bloqueada` ou `Dividida`); **dependências resolvidas** (todas `Aprovada`; `Dividida` conta só com
   todas as partes `Aprovada`; `Bloqueada` não resolve); e **sem reserva ativa de
   outra sessão**. A ordem é a do `TASKPLAN.md` (a do `TASK.md`, com dependências
   antes). `T-001` e `TP-0001` são a mesma tarefa.
2. Em `--tarefa <ID>`, use `python .claude/scripts/taskplan.py tarefa <ID>` (estado, dependências, plano,
   reserva) em vez de procurar no `TASK.md`.
3. **A fila é a ordem do `TASKPLAN.md`, a mesma do `/listar`**: o `proxima` devolve a primeira elegível dela. O
   bloqueio de uma tarefa é o estado `Bloqueada` + um `BK-nnnn` (ou `SPK-nnnn`) em aberto na Dep dela (arquivo
   `.md/.taskplan/BK-nnnn.md`). O `BLOCKERS.md` **continua sendo escrito** a cada bloqueio — o comando
   `taskplan.py bloquear` (Seção 6) grava a entrada nele **e** abre o BK/SPK; nunca decida elegibilidade por ele.
   O `TASKPLAN.md` se reordena sozinho a cada bloqueio/desbloqueio (bloqueada que ninguém espera vai para o
   fim da fila; a que tem dependentes fica no lugar, com o BK logo antes), então a primeira elegível é sempre a
   que **pode rodar agora** e o `--continuar` não para numa tarefa travada.
4. Nenhuma elegível (`NENHUMA`): informe o motivo que o script deu (sem plano →
   `/organizar`; só restam bloqueadas ou dependentes de bloqueadas; dependência
   aberta; reservadas; tudo pronto) e encerre (no modo contínuo, com o resumo da
   Seção 4).

## 3. Ciclo da tarefa

### 3-0. Reservar a tarefa (antes de qualquer agente)

O comando pode estar rodando em **outras sessões ao mesmo tempo**; a reserva evita
que duas peguem a mesma tarefa. Ela fica na linha `Reserva:` do cabeçalho de
`.md/.taskplan/<ID>.md`, **sempre no arquivo da árvore principal do repositório**
(não de uma worktree) — o script já usa a raiz do projeto. O script faz a reserva
com trava atômica (sem risco de duas sessões gravarem ao mesmo tempo).

1. **Token da sessão**: gere um uma vez por chamada (ex.: `date +%s` + número
   aleatório) e reaproveite em toda tarefa desta chamada.
2. **Iniciar**: `python .claude/scripts/taskplan.py iniciar <ID> <token> [--snap]` — reserva (trava atômica),
   marca a etapa e grava o Status local `Em andamento`, tudo numa chamada. `OK`/`INICIADA` — siga.
   `OCUPADA` (exit 2) — outra sessão tem a tarefa: não toque nela, volte à Seção 2 com `--pular <ID>`.
   (Em `--tarefa` sobre reserva de outra sessão: informe sessão e desde quando; se estiver velha — mais de
   2 h sem atualização — pergunte se o usuário quer assumir e, se sim, acrescente `--assumir`.)
   `--snap` (só com `--nocommit`) tira o snapshot "antes" da árvore.
   `/testar` e `/validar` usam `--etapa "Em QA"` / `"Em DevSecOps"`.
3. **Concluir**: `python .claude/scripts/taskplan.py concluir <ID> <token> executada [--snap]` — grava o Status
   local `Concluída · aguarda QA`, libera a reserva e (com `--snap`) completa o snapshot `antes..depois`. Em
   bloqueio use `bloquear` (Seção 6); interrompida: `liberar <ID> Livre`. (`qa-ok`/`sec-ok`/`devolvida` são do
   `/testar` e do `/validar`.)
4. **Nada de `TASK.md`/`TASKPLAN.md` durante a rodada**: o Status vive na linha `Status-local:` do
   arquivo da tarefa, e `proxima`/`tarefa` o leem por cima do `TASKPLAN.md`. O `consolidar` (fim da
   chamada) grava tudo no `TASK.md` e regera o `TASKPLAN.md`. (`QA ✔` e `Sec ✔` só pelo `/testar` e
   `/validar`.)
5. **Reserva velha**: sem atualização há mais de **2 horas** é considerada
   possivelmente abandonada. O `/executar` sem `--tarefa` e o modo contínuo **não** a
   tomam sozinhos; o `/listar` a destaca.

**Onde o código roda** (ver "Isolamento por worktree" no `EXECUTION-FLOW.md`):

- **`--tarefa <ID>`**: **sempre numa worktree separada** (nome `execucao/executar-<ID>`, criada
  em `.claude/worktrees`). O encerramento limpo integra à `main` e remove a worktree, e o
  bloqueio a deixa como está (Seção 6).
- **`--continuar [N]`**: **direto na `main`**, sem criar worktree. Por padrão, a cada tarefa executada
  commite na `main` o código dela (só os arquivos listados em `## 4`) antes de seguir para a próxima.
  **Com `--nocommit`**: não commite nada — as alterações se acumulam e o usuário commita no fim; a `main`
  pode (e vai) estar suja, então não há checagem de árvore limpa, e o diff de cada tarefa é o snapshot
  (`taskplan.py diff <ID>`). Bloqueio: não commite o código parcial e registre o estado no `## Bloqueio`.
- Vazio e `--lote N`: seguem a regra geral (worktree da sessão).
- **Commit da tarefa** (sem `--nocommit`): a mensagem **começa pelo ID** (`TP-0001: <resumo>`), para o
  `/testar` e o `/validar` localizarem o diff — `python .claude/scripts/taskplan.py diff <ID>` usa o
  snapshot quando existe e, senão, os commits que começam pelo ID. Registre os hashes em `## 4`.

### Etapa

O **arquivo `.md/.taskplan/<ID>.md` é o canal entre os comandos**: o Executor lê o
arquivo, faz o trabalho e **escreve o resultado nele**, em `## 4. Resultado da
execução` (o `/testar` escreve a seção 5 e o `/validar` a 6). Em reexecução
(tarefa devolvida), acrescente `### Rodada 2`… dentro da seção — nunca apague o
histórico. O `TASK.md` só recebe o Status (pelo script, Seção 3-0). Marque `Em
andamento` ao iniciar.

### 3a. Execução (Executor)

Dispare `executor` (`subagent_type: executor`, `run_in_background: false`). Prompt:
o ID da tarefa e o caminho de `.md/.taskplan/<ID>.md` — o Executor segue a seção
"1. Plano de execução", escreve os testes da seção "2. Plano de teste" (TDD) e roda **só os testes
dessa tarefa**, sem sair do escopo, e **grava no arquivo, em `## 4. Resultado da execução`**:
o que foi feito, arquivos alterados, comandos de teste rodados e o resultado, e
qualquer dúvida/risco. Inclua no prompt a seção "Modo de trabalho no `/executar`" do `executor.md`
(leitura mínima, testes do escopo, só `Edit` sobre arquivos existentes, não gravar status) e peça o
**retorno em até 4 linhas** (OK/BLOQUEIO, nº de arquivos, testes, risco) — **não releia a seção 4**
depois: confie no retorno e no `concluir`. Em reexecução, o prompt inclui os achados críticos a corrigir
(das seções 5 ou 6 da rodada anterior).

Ao voltar, confira o canário de contexto. `subagent_tokens` > ~300 mil tokens, ou
desvio grande de escopo/estimativa sinalizado pelo Executor: a tarefa está grande
demais — **divida-a** (Seção 5b) em vez de bloquear, e siga com a primeira parte.
Lacuna/inconsistência no `SDD.md`/`UX-SPEC.md`: **bloqueio crítico** (Seção 6).
Fora isso, a etapa fechou: `concluir <ID> <token> executada [--snap]` (Status local + reserva), e commite
(regra acima, salvo `--nocommit`).
**Tarefa devolvida** (veio do `/testar` ou do `/validar` com `Em andamento`): o prompt inclui os
achados críticos da seção 5 ou 6 da rodada anterior; o limite de **2 devoluções** somadas é
controlado por quem devolve (ver `/testar`, Seção 3d) — na 3ª, a tarefa chega aqui como bloqueio.

### 3e. Rodada paralela (`--paralelo N`, só `--lote`/`--continuar`)

Em vez de uma tarefa por vez, a rodada pega até N (2 a 20):

1. `proxima --etapa exe --n N [--lotes-distintos] [--lote L]` — até N tarefas elegíveis (dependências já resolvidas);
   com `--lotes-distintos`, **no máximo uma por lote**.
2. Para cada uma: `iniciar` (Seção 3-0). `OCUPADA` — descarte e peça a próxima com `--pular`.
3. Dispare os N `executor` **na mesma mensagem** (rodam ao mesmo tempo) e espere todos.
4. Para cada retorno: `concluir ... executada` (ou `bloquear`, Seção 6; divisão, Seção 5b). Depois, **em
   sequência**, o commit de cada tarefa **só com os arquivos listados na sua `## 4`** — sem `--nocommit`.
5. Repita (com a checagem de contexto, salvo `--nocontext`) até esvaziar a fila ou atingir o teto.

Limites conhecidos: tarefas de lotes diferentes **não garantem** arquivos diferentes (e do mesmo lote, menos ainda). Se duas tarefas tocarem o mesmo
arquivo, o commit/snapshot de uma pode levar a edição da outra e o `diff` do `/testar` e do `/validar` mistura
as duas — o Executor registra em `## 4` os arquivos compartilhados, e o QA deve tratá-los como tal. O
orquestrador não tenta resolver isso: se a suíte do `/testar` mostrar interferência, rode sem `--paralelo`.

## 4. Fim da tarefa

Ao encerrar a chamada (depois da última tarefa), rode `taskplan.py consolidar`. Resumo curto — tarefa, o que foi feito, arquivos e commit (ou "sem commit"), estado agora
(`Executada (aguarda teste)`). **Não chame `/testar`**: o usuário decide. Depois, conforme o modo:

- **Vazio / `--tarefa`**: **pare aqui.**
- **`--lote N` / `--continuar [N]`**: volte à Seção 2 para a próxima tarefa
  elegível (rodando `/context` de novo, item 0 da Seção 0 — exceto com `--nocontext`), até
  esvaziar a fila, atingir o teto N ou não restar elegível.

**Resumo final do modo contínuo**: **os `BK`/`SPK` em aberto que esperam você** (ID + o que fazer, em uma linha
cada; o modo contínuo nunca os executa), quantas tarefas foram executadas (aguardam `/testar`),
quantas ficaram **bloqueadas** (ID + motivo em uma linha cada), quantas foram
puladas por depender de bloqueada ou por não ter plano, e quantas divisões foram abertas.
Termine sugerindo `/testar` (e `/listar` para tratar os bloqueios um a um;
`/executar --tarefa <ID>` retoma cada uma). Nunca dispare `/deploy`.

## 5. Abertura de nova tarefa (refatoração e divisão)

Convenção de IDs e de pasta em `EXECUTION-FLOW.md` ("Convenção de IDs e da pasta
`.md/.taskplan`"): o `TASK.md` fica **sempre atualizado**; a `.md/.taskplan/` guarda
o detalhamento de cada tarefa. Toda tarefa nova só existe quando **as duas coisas**
estão feitas — linha no `TASK.md` **e** arquivo em `.md/.taskplan/` com as três
seções (plano de execução, de teste e de validação de segurança).

### 5a. Refatoração (achado não crítico) — `RTP-0000`

Aberta pelo `/testar` ou pelo `/validar` (o próprio `validador` que achou o problema; este
arquivo só descreve o procedimento, que os dois comandos usam):

1. **Ajusta o `TASK.md` pelo script** (sem ler o arquivo):
   `python .claude/scripts/taskplan.py proximo-id RTP` devolve o próximo `RTP-nnnn`; depois
   `python .claude/scripts/taskplan.py nova --id RTP-nnnn --grupo "Refatoração Lote-X" --titulo ... --chapeu ... --reqs ... --aceite ... --est ... --dep <tarefa de origem> --par ... --arquivos ... --testes ...`
   (X = lote da tarefa de origem; o script cria o grupo se não existir, grava a
   linha com Status `Pendente` e usa o nome do grupo como `Lote`). O `--aceite` é
   testável e a descrição cita a entrada do `QA-REPORT.md`/`SECURITY-REVIEW.md`
   que a originou. Sem redecompor nada além do achado (uso restrito das skills de
   decomposição, ver `validador.md`).
2. **Cria `.md/.taskplan/RTP-nnnn.md`**, no formato do `/organizar` (com
   `Reserva: Livre`), curto e específico do achado.

### 5b. Divisão de tarefa grande — `TP-0000a`, `TP-0000b`…

Quando a tarefa em execução é grande demais (Seção 3a), o `executor` (que tem o
plano em mãos) propõe a divisão em 2 a 4 partes, cada uma coerente (~1 dia-pessoa,
sem misturar tela/endpoint/regra/SQL) e com o próprio critério de aceite:

1. **Ajusta o `TASK.md` pelo script**: para cada parte,
   `python .claude/scripts/taskplan.py nova --id TP-0001a --apos <original ou parte anterior> --grupo ... --lote <lote da original> ...`
   (IDs com sufixo de letra — `TP-0001a`, `TP-0001b`; nova divisão de uma parte
   acrescenta outra letra: `TP-0001aa` —, `--dep` entre as partes quando houver
   ordem); `python .claude/scripts/taskplan.py status <original> "Dividida (→ TP-0001a, TP-0001b)"`; e
   `python .claude/scripts/taskplan.py deps-substituir <original> TP-0001a,TP-0001b` para quem dependia da
   original passar a depender das partes.
2. **Cria um arquivo por parte** em `.md/.taskplan/` (`TP-0001a.md`…, com
   `Reserva: Livre`), com as três seções recortadas do plano original; o arquivo
   da original é mantido com a nota da divisão. O trabalho já feito no diff entra
   na parte correspondente.
3. Não conta como devolução (Seção 3d). Divisão que exija redesenho do `SDD.md`/
   decomposição real do Coordenador: **pare** (Seção 6).

### Conferência

Depois de abrir tarefas novas (5a ou 5b), rode `python .claude/scripts/taskplan.py gerar`: o `TASKPLAN.md` passa a
incluir as novas linhas na ordem certa (e a original fica `Dividida`). Confira
com `python .claude/scripts/taskplan.py tarefa <ID>` que cada tarefa nova aparece e tem plano (`plano` ≠
`SEM PLANO`) com as três seções. Faltou algo: redespache só para completar; se
faltar de novo, pare e avise o usuário. A tarefa de origem de uma refatoração não
é reaberta; a nova só entra na fila (Seção 2) depois da conferência.

## 6. Bloqueio crítico

**Bloqueio crítico** = o que impede a tarefa de avançar sem decisão ou ajuste fora
do escopo dela: lacuna/inconsistência no `SDD.md`/`UX-SPEC.md`/`TASK.md`, 3ª
devolução (Seção 3d), divisão que exija redesenho, dúvida de produto/escopo,
dependência externa indisponível, `BK-` em aberto na Dep da tarefa. (Achado
crítico que ainda cabe nas 2 devoluções **não** é bloqueio: é o ciclo normal.)

Ao detectar um bloqueio crítico, em qualquer etapa:

1. **Escreva no `.md/.taskplan/<ID>.md`**, na seção `## Bloqueio`: quem reportou
   (Executor/QA/DevSecOps), etapa em que parou, o quê, o que já foi feito (estado do
   código/worktree) e o que é necessário para destravar.
2. **Abra o bloqueio com um único comando**:
   `python .claude/scripts/taskplan.py bloquear <ID> --por "<Executor|QA|DevSecOps>" --escala "<quem decide>" --motivo "<o que precisa ser feito, em uma linha>" [--impacto "..."] [--sugestao "..."]`
   (para uma **dúvida técnica a investigar**, acrescente `--tipo spk --pergunta "<o que responder>" --timebox "1 d"`).
   O script **(a) acrescenta a entrada `Em aberto` ao `.md/BLOCKERS.md`** (sem você ler o arquivo), **(b) cria o
   `BK-nnnn` (ou `SPK-nnnn`)** em `.md/.taskplan/` com a descrição do que fazer — tarefa do **Coordenador** com o
   usuário —, **(c)** põe o BK/SPK na Dep da tarefa, grava `Bloqueada (BK-nnnn: …)` só na linha dela no `TASK.md`,
   libera a reserva e **(d) reordena o `TASKPLAN.md`** na hora. Não use `status`/`liberar` à mão para isso.
3. **Sinalize ao usuário** — no resumo: ID da tarefa, `BK-nnnn`, motivo, "Escala para" e o caminho do arquivo.

Depois:

- **Vazio / `--tarefa`**: **pare** o comando e não dispare nenhum outro agente.
- **`--lote` / `--continuar`**: **não pare** — volte à Seção 2 e pegue a próxima
  elegível; a tarefa bloqueada e as que dependem dela ficam de fora. Só interrompem
  o modo contínuo as condições que impedem **qualquer** tarefa de rodar: contexto
  acima do teto (Seção 0, item 0), repositório git ausente/corrompido, falha de
  ambiente que atinge todas as tarefas (ex.: suíte de testes quebrada de forma
  geral). Nesses casos pare, diga o motivo e liste o que já foi feito e o que ficou
  bloqueado.

Para retomar uma tarefa bloqueada: o usuário (com o Coordenador) trata o `BK`, registra a decisão e roda
`python .claude/scripts/taskplan.py desbloquear BK-nnnn "<resolução>"` — o BK fecha (e a entrada do
`BLOCKERS.md` vira `Resolvido`), a tarefa volta à fila
(Status `Pendente (desbloqueada: …)`) e o `TASKPLAN.md` se reordena. Depois basta `/executar` (ela entra na
ordem) ou `/executar --tarefa <ID>`.

## 7. `BK` e `SPK` — tarefas do Coordenador (`/executar --tarefa BK-nnnn` ou `SPK-nnnn`)

`BK-` (bloqueio) e `SPK-` (spike) estão na fila do `TASKPLAN.md` com `Agente: coordenador`. **Só `--tarefa <ID>` as
executa** (o modo vazio, `--lote` e `--continuar` nunca as pegam). **Quem executa é o Coordenador, junto com o
usuário**: um loop de conversa, **sem Executor, sem QA e sem DevSecOps**.

1. **Conferir**: `python .claude/scripts/taskplan.py tarefa <ID>`. Pare se já estiver `Aprovada`, com dependência
   aberta (SPK vindo do `/definir`) ou reservada por outra sessão (mesma regra da Seção 1). Reserve como numa
   tarefa normal (Seção 3-0; o arquivo `BK-`/`SPK-` já existe em `.md/.taskplan/`). Se o spike exigir código de prova,
   use a worktree da sessão (Seção 0/EXECUTION-FLOW); decisão e documentação ficam em `.md/`.
2. **Rodada inicial (dispatch novo)**: dispare `coordenador` (`subagent_type: coordenador`,
   `run_in_background: false`). O prompt aponta: o arquivo `.md/.taskplan/<ID>.md` (descrição do que fazer, quem
   reportou, `Escalado para`, `Afeta:`), a entrada correspondente do `.md/BLOCKERS.md` (campo `Origem:`), os
   arquivos `.taskplan` das tarefas afetadas, e o `SDD.md`, `UX-SPEC.md`, `GUARDRAILS.md` e `PRD-TECNICO.md` só no
   trecho relevante. Pedido:
   - **`BK`**: entender o bloqueio, apresentar **2-3 alternativas com prós/contras e a recomendação**, o que é
     decisão do usuário e o que o Coordenador resolve sozinho (ajuste de `SDD`/`UX-SPEC`/`TASK`/ADR novo);
   - **`SPK`**: transformar a pergunta em plano de investigação (critério de saída, time-box, o que o agente
     consegue levantar por leitura ou protótipo e o que depende do usuário/ambiente) e **executar o que for
     possível**, trazendo evidência.
   Se `Escalado para` for `usuário`, o Coordenador **não decide**: prepara as opções; a decisão é sua.
3. **Pause e converse**: apresente o retorno (resumo objetivo, alternativas, recomendação, perguntas) e as opções
   **resolvido / ajustar / deixar em aberto**. Rodadas seguintes: `SendMessage` para a **mesma instância** com a sua
   resposta, sem teto, até você dizer que está resolvido. "Descartar e recomeçar" → dispatch novo.
4. **Fechamento (você aprovou a resolução)**: o Coordenador grava o resultado onde ele pertence (ADR novo, ajuste
   em `SDD.md`/`UX-SPEC.md`/`TASK.md`/`GUARDRAILS.md`, ou nota do spike) e acrescenta ao `.md/.taskplan/<ID>.md` a
   seção `## Resolução` (decisão, motivo, o que mudou, evidência do spike, tarefas afetadas que precisam de ajuste
   de plano). Depois o comando roda
   `python .claude/scripts/taskplan.py desbloquear <ID> "<resolução em uma linha>"`: fecha o `BK`/`SPK`, marca a
   entrada do `BLOCKERS.md` como `Resolvido` e devolve as tarefas bloqueadas à fila (`Pendente`), com o
   `TASKPLAN.md` reordenado. O próprio `desbloquear` já encerra a reserva do `BK`/`SPK`. Se a resolução mudar o plano de uma
   tarefa afetada, avise para rodar `/organizar --tarefa <ID>`.
5. **Sem fechar agora**: registre em `## Andamento` do arquivo o que já foi decidido e o que falta, libere a reserva
   (`liberar <ID> Livre`) e **pare**; o `BK`/`SPK` continua aberto e uma nova chamada retoma lendo o arquivo.
6. **Resumo curto** ao fim: ID, resolução (ou o que falta), tarefas que voltaram à fila e a primeira elegível
   agora (`taskplan.py proxima`). **Pare.** Nunca dispare `/deploy` nem outro agente sozinho.
