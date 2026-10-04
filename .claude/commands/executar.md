---
description: Executa tarefas de ponta a ponta, uma por vez, a partir de .md/.taskplan/<ID>.md — o Executor implementa, o QA testa (aprova ou reprova) e o DevSecOps dá o OK de segurança, tudo no mesmo fluxo. Achado crítico volta para a execução; achado não crítico vira nova tarefa de refatoração. Cada agente lê e escreve no arquivo da tarefa (.taskplan). Sem argumento pega a próxima tarefa elegível; --tarefa <ID> executa só essa (ou retoma uma bloqueada); --lote N e --continuar [N] encadeiam as tarefas e, em bloqueio, registram e seguem para a próxima elegível. Não dispara /deploy sozinho.
argument-hint: [vazio = próxima tarefa | --tarefa <ID> | --lote N | --continuar [N]]
---

# Comando `/executar` — Executor → QA → DevSecOps, por tarefa

A lógica deste comando está definida em `.claude/EXECUTION-FLOW.md` (Comando 1) —
leia esse arquivo agora, antes de fazer qualquer outra coisa, se ainda não o tiver
em contexto. Ele por sua vez assume o que está declarado em
`.claude/agents/executor.md`, `.claude/agents/validador.md`,
`.claude/agents/coordenador.md` e em `PIPELINE-CONVENTIONS.md`.

**O usuário é o orquestrador.** Para cada tarefa, o comando faz o ciclo completo —
implementar, testar, auditar segurança — e só então considera a tarefa pronta.
Não existe mais um `/validar` separado: a validação faz parte deste fluxo. O
comando nunca dispara `/deploy`.

Argumento recebido (pode estar vazio): $ARGUMENTS

## 0. Pré-requisitos bloqueantes

0. **Checagem de contexto (antes de tudo)**: rode `/context`. Se o uso da sessão
   passar de ~300 mil tokens, **pare aqui** — não crie/entre em worktree, não
   dispare agente — e devolva um alerta de contexto cheio (uso atual, teto de 300
   mil, sugestão de nova sessão). Repita a checagem antes de **cada tarefa nova**
   quando houver encadeamento (`--lote`, `--continuar`); não interrompa uma
   tarefa já em andamento, mas não comece outra acima do teto.
1. **Repositório git**: se `.git` não existir, pare e avise — o QA e o DevSecOps
   leem o `git diff` da tarefa. Não inicialize o repo sem confirmação.
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
  as dependências resolvidas. `Concluída` com `QA ✔ · Sec ✔`, inexistente, com
  dependência aberta ou **reservada por outra sessão** (informe sessão e desde
  quando; se a reserva tem mais de 2 h sem atualização, pergunte se você quer
  assumi-la): explique e **pare** (não executa as dependências por conta
  própria). **`Bloqueada`**: é a **retomada** de uma tarefa que o usuário já tratou
  — leia a seção `## Bloqueio` do arquivo (e a decisão que o usuário registrou ou
  acabou de dar), limpe o bloqueio e continue da etapa em que parou.
- **`--lote N`** (ex.: `/executar --lote 4`): as tarefas elegíveis do lote `N`, uma
  após a outra, **sem interromper por bloqueio** (modo contínuo, abaixo).
- **`--continuar [N]`**: as tarefas elegíveis em sequência, de todo o `TASK.md`
  (até N tarefas, ou sem limite), **sem interromper por bloqueio** (modo contínuo).

**Modo contínuo (`--lote` e `--continuar`)**: sempre que for possível, o bloqueio
de uma tarefa é **registrado** (Seção 6) e o comando **segue para a próxima tarefa
elegível**, sem parar e sem perguntar. Tarefa que depende de uma bloqueada não é
elegível (dependência não resolvida) e é simplesmente pulada. O usuário trata os
bloqueios depois, um a um, com `/listar` e `/executar --tarefa <ID>`.

Argumento desconhecido, ou `--tarefa`/`--lote` sem valor: mostre as opções com um
exemplo de cada e **pare**.

## 2. Escolher a tarefa

**Regra de ouro: não leia o `.md/TASK.md` nem o `.md/BLOCKERS.md` inteiros.** A fila,
as dependências e o estado de cada tarefa estão no `.md/TASKPLAN.md`; o detalhe de
cada uma, em `.md/.taskplan/<ID>.md`. Tudo é consultado e gravado pelo script
`python .claude/scripts/taskplan.py` (as escritas no `TASK.md` mexem só na linha afetada, dentro do script). Se
o `TASKPLAN.md` não existir, **pare** e sugira `/organizar`.

1. **Próxima tarefa**: rode `python .claude/scripts/taskplan.py proxima [--lote N] [--pular ID,ID]`. O script
   nunca devolve `BK-`/`SPK-` (tarefas do Coordenador, resolvidas com o usuário). Ele devolve a próxima elegível (uma linha: ID, chave `TP-`, estado, lote, título) ou
   `NENHUMA` com o motivo. **Elegível** = tem plano em `.taskplan`; estado Não
   executada ou em andamento por devolução (nunca `Aprovada`, `Bloqueada` ou
   `Dividida`); **dependências resolvidas** (todas `Aprovada`; `Dividida` conta só com
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
2. **Reserve**: `python .claude/scripts/taskplan.py reservar <ID> <token>`. Resposta `OK` — siga. Resposta
   `OCUPADA` — outra sessão tem a tarefa: não toque nela, volte à Seção 2 com
   `--pular <ID>`. (Em `--tarefa` sobre reserva de outra sessão: informe sessão e
   desde quando; se estiver velha — mais de 2 h sem atualização — pergunte se o
   usuário quer assumir e, se sim, `reservar <ID> <token> --assumir`.)
3. **A cada etapa**: `python .claude/scripts/taskplan.py etapa <ID> <token> "Em execução"`, depois `"Em QA"` (3b) e
   `"Em DevSecOps"` (3c). O script atualiza a reserva e o estado no `TASKPLAN.md`
   (Em execução / Em teste / Em validação de segurança).
4. **Status no `TASK.md`**: `python .claude/scripts/taskplan.py status <ID> "<texto>"` — `Em andamento` ao iniciar,
   `Concluída · QA ✔` após o QA, `Concluída · QA ✔ · Sec ✔` ao fechar,
   `Bloqueada (<motivo>)` em bloqueio. Grava só a linha da tarefa e atualiza o
   estado no `TASKPLAN.md` (fechar com os dois marcadores = `Aprovada`).
5. **Ao terminar**: `python .claude/scripts/taskplan.py liberar <ID> Concluída` (fechou), `Bloqueada` (bloqueio) ou
   `Livre` (interrompida/devolvida).
6. **Reserva velha**: sem atualização há mais de **2 horas** é considerada
   possivelmente abandonada. O `/executar` sem `--tarefa` e o modo contínuo **não** a
   tomam sozinhos; o `/listar` a destaca.

O código da tarefa (diff) continua na worktree da sessão.

### Etapas

Cada tarefa percorre as três etapas abaixo, **em ordem**, uma de cada vez. **O
arquivo `.md/.taskplan/<ID>.md` é o canal entre as etapas**: cada agente lê o
arquivo, faz o seu trabalho e **escreve o resultado nele**, numa seção própria
(`## 4. Resultado da execução`, `## 5. Resultado do QA`, `## 6. Resultado do
DevSecOps`). Em reexecução, acrescente uma nova rodada (`### Rodada 2`…) dentro
da seção — nunca apague o histórico. O `TASK.md` só recebe o Status (pelo script,
Seção 3-0). Marque `Em andamento` ao iniciar.

### 3a. Execução (Executor)

Dispare `executor` (`subagent_type: executor`, `run_in_background: false`). Prompt:
o ID da tarefa e o caminho de `.md/.taskplan/<ID>.md` — o Executor segue a seção
"1. Plano de execução", escreve os testes da seção "2. Plano de teste" (TDD), sem
sair do escopo da tarefa, e **grava no arquivo, em `## 4. Resultado da execução`**:
o que foi feito, arquivos alterados, comandos de teste rodados e o resultado, e
qualquer dúvida/risco. Em reexecução, o prompt inclui os achados críticos a corrigir
(das seções 5 ou 6 da rodada anterior).

Ao voltar, confira o canário de contexto. `subagent_tokens` > ~300 mil tokens, ou
desvio grande de escopo/estimativa sinalizado pelo Executor: a tarefa está grande
demais — **divida-a** (Seção 5b) em vez de bloquear, e siga com a primeira parte.
Lacuna/inconsistência no `SDD.md`/`UX-SPEC.md`: **bloqueio crítico** (Seção 6).
Fora isso, siga para o QA.

### 3b. QA (chapéu QA do Validador)

Dispare `validador` (`subagent_type: validador`, `run_in_background: false`) focado
no chapéu QA, **só nesta tarefa**: skills `acceptance-criteria-validation`,
`non-functional-validation`, `bug-documentation` e `qa-report-drafting`
(`cross-platform-integration-testing` quando a tarefa tocar mais de uma
plataforma). Ele **lê o `.md/.taskplan/<ID>.md`** (plano de teste e resultado da
execução) e o `git diff` da tarefa, executa o plano de teste, valida o critério de
aceite sem reinterpretá-lo e **escreve o resultado em `## 5. Resultado do QA`**
(veredito, o que foi testado, evidências, achados com severidade), além de uma
entrada resumida em `.md/QA-REPORT.md`. Resultados:

- **Aprovada**: grave `QA ✔` no Status (`Concluída · QA ✔`) e siga para a 3c.
- **Achado crítico** (compromete o critério de aceite central, exige mudança de
  escopo/arquitetura, ou quebra algo de que outra tarefa depende): a tarefa
  **volta para a execução** — Status `Em andamento`, achados na seção 5 — e o
  ciclo reinicia na 3a.
- **Achado não crítico** (ajuste pontual de baixo esforço que não compromete o
  critério de aceite): **não volta** — a tarefa segue aprovada (`QA ✔`) e o
  `validador` abre uma **nova tarefa de refatoração** `RTP-0000` (Seção 5a: linha
  no `TASK.md` + arquivo em `.md/.taskplan/`). Siga para a 3c.

### 3c. DevSecOps (chapéu DevSecOps do Validador)

Só depois do `QA ✔`. Dispare `validador` focado no chapéu DevSecOps, só nesta
tarefa: skills de auditoria de segurança (`static-security-analysis`,
`security-requirement-validation`, `sensitive-data-exposure-check`,
`compliance-validation` quando houver dado pessoal, `security-report-drafting`).
Ele **lê o `.md/.taskplan/<ID>.md`** (plano de segurança, resultado da execução e do
QA) e o `git diff`, executa o plano de validação de segurança e **escreve o
resultado em `## 6. Resultado do DevSecOps`** (veredito, o que foi verificado,
achados com severidade), além de uma entrada resumida em `.md/SECURITY-REVIEW.md`.
Resultados:

- **OK de segurança** (sem achado alto/crítico, compliance obrigatório atendido):
  grave `Sec ✔` (`Concluída · QA ✔ · Sec ✔`). A tarefa está pronta.
- **Achado crítico** (severidade alta/crítica, ou compliance obrigatório não
  atendido): a tarefa **volta para a execução** — Status `Em andamento`, achados na
  seção 6 — e o ciclo reinicia na 3a (com novo QA depois).
- **Achado não crítico** (baixa/média, débito): a tarefa segue com `Sec ✔` e o
  `validador` abre uma **nova tarefa de refatoração** `RTP-0000` (Seção 5a: linha
  no `TASK.md` + arquivo em `.md/.taskplan/`).

### 3d. Limite de devoluções

No máximo **2 devoluções** por tarefa (somando QA e DevSecOps) voltando para a
execução. Na 3ª, é **bloqueio crítico** (Seção 6), com o resumo do que falhou em
cada volta. Não insista por conta própria.

## 4. Fim da tarefa

Com `QA ✔ · Sec ✔`: resumo curto — tarefa, o que foi feito, veredito de QA e de
DevSecOps, tarefas de refatoração criadas (se houver). Depois, conforme o modo:

- **Vazio / `--tarefa`**: **pare aqui.**
- **`--lote N` / `--continuar [N]`**: volte à Seção 2 para a próxima tarefa
  elegível (rodando `/context` de novo, item 0 da Seção 0), até esvaziar a fila,
  atingir o teto N ou não restar elegível.

**Resumo final do modo contínuo**: quantas tarefas fecharam com `QA ✔ · Sec ✔`,
quantas ficaram **bloqueadas** (ID + motivo em uma linha cada), quantas foram
puladas por depender de bloqueada ou por não ter plano, quantas tarefas de
refatoração e divisões foram abertas, e se algum lote ficou todo pronto para
`/deploy`. Termine sugerindo `/listar` para tratar os bloqueios um a um
(`/executar --tarefa <ID>` retoma cada uma). Nunca dispare `/deploy`.

## 5. Abertura de nova tarefa (refatoração e divisão)

Convenção de IDs e de pasta em `EXECUTION-FLOW.md` ("Convenção de IDs e da pasta
`.md/.taskplan`"): o `TASK.md` fica **sempre atualizado**; a `.md/.taskplan/` guarda
o detalhamento de cada tarefa. Toda tarefa nova só existe quando **as duas coisas**
estão feitas — linha no `TASK.md` **e** arquivo em `.md/.taskplan/` com as três
seções (plano de execução, de teste e de validação de segurança).

### 5a. Refatoração (achado não crítico) — `RTP-0000`

O próprio `validador` que achou o problema:

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
