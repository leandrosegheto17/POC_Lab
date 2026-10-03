# EXECUTION-FLOW.md

Sequência lógica da **fase de execução** — parte de onde o planejamento termina
(`SDD.md`/`UX-SPEC.md`/`TASK.md` aprovados pelo usuário + `GUARDRAILS.md` aprovado
pelo Gestor, ver `PLANNING-FLOW.md`) e vai até o deploy em produção, fechando o
ciclo de volta ao Gestor.

Este documento cobre a lógica dos **comandos** da fase de execução —
`/executar` (Executor implementa, QA testa e DevSecOps audita, tarefa a tarefa, no
mesmo fluxo) e `/deploy` (Validador publica) — e do comando somente-leitura
`/listar` (todas as tarefas em aberto, em ordem sugerida de execução). Antes
deles, `/organizar` (Executor) quebra o `TASK.md` em `.md/.taskplan/<ID>.md`. Nenhum
deles dispara o próximo automaticamente: **o usuário é o orquestrador**, decide
quando rodar cada um. Este documento não redefine os agentes consolidados
(`.claude/agents/gestor.md`, `coordenador.md`, `executor.md`, `validador.md`) nem
a convenção de artefatos (`PIPELINE-CONVENTIONS.md`) — só ordena o que cada um já
declara, em nível de comando.

> Modelo anterior (12 agentes, um único `/executar` que fazia implementação + QA +
> DevSecOps + DevOps encadeados por lote) descontinuado — ver nota no topo de
> `PIPELINE-CONVENTIONS.md`. Os agentes `backend`, `frontend`, `mobile`, `qa`,
> `devsecops`, `devops`, `tech-lead` continuam existindo como arquivos, mas não são
> mais acionados por este fluxo.

**Pré-requisito bloqueante**: este projeto precisa ser um repositório git antes de
`/executar` rodar de verdade — a validação por tarefa (QA e DevSecOps, ver Comando 1)
depende de `git diff`.

**Isolamento por worktree (obrigatório, primeiro passo da Seção 0 de cada
comando)**: cada chamada de um comando de execução (`/executar`,
`/deploy`) roda numa worktree git dedicada à
sessão, nunca direto na árvore principal — isso evita que duas sessões rodando
comandos de execução ao mesmo tempo pisem uma na outra (edição concorrente de
`TASK.md`, `BLOCKERS.md`, código).

1. Garanta/entre numa worktree dedicada a esta sessão (skill
   `superpowers:using-git-worktrees` ou tool `EnterWorktree`) antes de ler ou
   escrever qualquer artefato — nome sugerido: `execucao/<comando>-<lote-ou-
   tarefa>`. Se esta sessão já estiver numa worktree aberta para o mesmo
   lote/tarefa (chamada anterior ainda em andamento), reaproveite-a — não crie
   outra.
2. Todo agente disparado dentro da chamada (`executor`, `validador`) herda essa
   mesma worktree — nunca disperse instâncias paralelas da mesma rodada em
   worktrees diferentes (ver "Unidade de trabalho: o lote" abaixo — todas as
   tarefas de um lote precisam ver o mesmo `git diff`).
3. **Encerramento limpo** (fim da tarefa/encadeamento, ou publicação, sem
   bloqueio pendente): antes de apresentar o resumo final, integre a worktree de
   volta ao branch principal (merge/rebase), remova a worktree (`ExitWorktree`
   ou equivalente) e **apague a branch local já integrada** com `git branch -d
   <branch>` (da árvore principal, depois de remover a worktree — remover a
   worktree não apaga a branch; use `-d`, nunca `-D`, e se o `-d` recusar pare e
   avise). Vale para qualquer branch de fluxo (`execucao/*`, `fix/*`,
   `worktree-*`). Esse merge é o que torna `TASK.md`/`BLOCKERS.md`/
   `DEPLOY.md` atualizados visíveis para `/listar` e para a
   próxima chamada de qualquer comando — inclusive de outra sessão.
4. **Encerramento por bloqueio** (tarefa `Bloqueada`, achado crítico, etc.):
   **não integre** a worktree — deixe-a como está para inspeção, e informe o
   caminho dela no resumo de bloqueio (Seção "Bloqueio e escalonamento" abaixo).
5. `/listar` é somente-leitura e não escreve nada — podem
   ler direto da árvore principal, sem precisar de worktree própria.

---

## Checagem de contexto (Comando 1 — antes de tudo)

Escopo: só `/executar` (inclusive em modo `--continuar`)
— não se aplica a `/deploy` nem `/listar`.

Antes de qualquer outro passo — antes até do pré-requisito bloqueante e do
isolamento por worktree da seção anterior —, rode `/context` para medir o uso
atual da sessão.

- **Contexto > 300 mil tokens**: **não inicie a execução**. Pare aqui, sem
  criar/entrar em worktree, sem ler `TASK.md` além do necessário para montar o
  alerta, e sem disparar qualquer agente. Devolva ao usuário um alerta de
  contexto cheio: uso atual (em mil tokens), o teto de 300 mil, e a sugestão de
  iniciar uma nova sessão/conversa antes de rodar o comando de novo.
- **Contexto <= 300 mil tokens**: siga normalmente para os pré-requisitos
  bloqueantes e o isolamento por worktree.
- **`/executar --lote` / `--continuar`**: a checagem não vale só para a primeira
  chamada — repita-a antes de iniciar CADA tarefa nova da cadeia. Se o teto for
  cruzado no meio, não interrompa à força uma tarefa em andamento, mas não comece
  outra acima do teto — pare com o mesmo alerta, informando quantas tarefas já
  fecharam nesta chamada.

---

## Convenção de IDs e da pasta `.md/.taskplan`

- **`TASK.md` é a fonte de verdade e fica sempre atualizado**: status, dependências,
  tarefas novas e tarefas divididas são gravados nele. **`.md/.taskplan/`** guarda
  só o **detalhamento de cada tarefa** (plano de execução, plano de teste, plano
  de validação de segurança) para que os agentes leiam o arquivo da tarefa em vez
  de ler o `TASK.md` inteiro. Um não substitui o outro.
- **Um arquivo por tarefa**: `.md/.taskplan/<ID>.md`.
- **`TP-0000`** — tarefas iniciais. **O `/definir` já grava o `TASK.md` com esse
  ID** (`TP-` + 4 dígitos sequenciais: `TP-0001`, `TP-0002`…), na coluna ID e nas
  dependências; o `/organizar` usa o mesmo número no nome do arquivo em
  `.taskplan`. `TASK.md` **já produzidos** com `T-nnn` (padrão antigo) **não são
  migrados**: `T-001` continua `T-001` lá e vale `TP-0001` na chave comum
  (`T-372` → `TP-0372`); `T-001` e `TP-0001` são a mesma tarefa, e todo comando
  aceita qualquer uma das formas.
- **`SPK-0000`** (spike) e **`BK-0000`** (bloqueio) — também são tarefas, com arquivo em `.md/.taskplan/` e
  linha no `TASKPLAN.md`, mas do **Coordenador** (resolvidas com o usuário, sem QA nem DevSecOps; coluna
  Agente do `TASKPLAN.md`). O `SPK` nasce no `/definir` e as tarefas que dependem dele o citam na coluna Dep.
  O `BK` é aberto por quem encontra o bloqueio (em geral o Executor) e a tarefa bloqueada passa a depender
  dele; o `taskplan.py proxima` nunca entrega `BK`/`SPK` ao Executor. **`/organizar --migrar`** padroniza um
  projeto antigo (T-nnn, IDs semânticos, `BLOCKERS.md`) para esse padrão.
- **`RTP-0000`** — **toda** tarefa de refatoração nova (achado simples/débito do
  QA ou do DevSecOps, criada pelo `/executar`, pelo `/planejar --tarefa` ou pelo
  Validador no fechamento de lote). Contador próprio e sequencial: próximo número
  livre entre as linhas do `TASK.md` e os arquivos de `.taskplan`
  (`taskplan.py proximo-id RTP`). Entram no `TASK.md`, no grupo
  `Refatoração Lote-X`, com esse ID — nunca `T-nnn` nem `TP-nnnn`.
- **Reserva por sessão (várias sessões ao mesmo tempo)**: o cabeçalho de cada
  `.md/.taskplan/<ID>.md` tem uma linha `Reserva:`. Valores: `Livre` (ou ausente) ·
  `Em execução | Em QA | Em DevSecOps — sessão <token> — desde <data-hora> —
  atualizado <data-hora>` · `Bloqueada` · `Concluída`. Quem pega a tarefa grava a
  reserva **antes** de disparar qualquer agente, confirma relendo o arquivo (se o
  token gravado não for o seu, outra sessão chegou primeiro: desista e pegue a
  próxima) e atualiza `Etapa`/`atualizado` a cada etapa. Uma segunda sessão do
  `/executar` **pula** toda tarefa reservada e pega a seguinte elegível. A reserva
  vive na árvore principal (`.md/.taskplan/`, ver `executar.md`, Seção 3), nunca na
  cópia de uma worktree, para as outras sessões a enxergarem na hora.
- **O `/executar` não lê o `TASK.md`** (grande e caro em tokens): fila, dependências
  e estado vêm do `.md/TASKPLAN.md`, o detalhe vem de `.md/.taskplan/<ID>.md`, e
  toda consulta/escrita passa por `.claude/scripts/taskplan.py` (`proxima`,
  `reservar`, `etapa`, `status`, `nova`, `deps-substituir`…), que altera só a linha
  afetada do `TASK.md`. Quem lê o `TASK.md` inteiro é o `/organizar`.
- **`.md/TASKPLAN.md`**: gerado pelo `/organizar` (`python .claude/scripts/taskplan.py
  gerar`) com **todas** as tarefas na ordem de execução e o estado de cada uma —
  Não executada · Em execução · Executada (aguarda teste) · Em teste · Testada
  (aguarda segurança) · Em validação de segurança · Aprovada (100%) — mais Bloqueada
  e Dividida. É uma **visão derivada** (do Status do `TASK.md` e da `Reserva:` do
  arquivo da tarefa); o `/executar` troca o estado da linha a cada etapa
  (`taskplan.py set`) e regera o arquivo ao abrir tarefas novas.
- **Divisão**: tarefa que precisa ser quebrada durante a execução vira
  `TP-0000a`, `TP-0000b`… (ou `RTP-0000a`…): mantém prefixo e número e acrescenta
  uma letra. Dividir de novo uma parte acrescenta outra letra (`TP-0000aa`,
  `TP-0000ab`). A original fica no `TASK.md` com Status `Dividida (→ TP-0000a,
  TP-0000b)` e seu arquivo é mantido, com a nota da divisão; conta como resolvida
  só quando **todas** as partes tiverem `QA ✔ · Sec ✔`. Dependentes dela passam a
  depender das partes.

---

## Unidade de trabalho: a tarefa (e o lote como agrupador)

A unidade de execução e de validação é a **tarefa**, uma por vez, com seus planos
em `.md/.taskplan/<ID>.md`. O **lote** (coluna `Lote` do `TASK.md`, atribuído pelo
Coordenador em `/definir`) continua como agrupador: serve a `--lote N` e define o
que o `/deploy` publica — um lote está pronto quando todas as suas tarefas têm
`QA ✔ · Sec ✔`. O `/deploy` processa um lote específico ou o conjunto de lotes
prontos ainda não publicados — ver Comando 2.

---

## Comando 1: `/executar` — Executor → QA → DevSecOps, uma tarefa por vez

| Dispara quando | Agente(s) | Ação | Pausa obrigatória |
|---|---|---|---|
| Usuário roda `/executar` (vazio = próxima tarefa elegível; `--tarefa <ID>`; `--lote N`; `--continuar [N]` = tarefas em sequência) | `executor` → `validador` chapéu QA → `validador` chapéu DevSecOps, nessa ordem, **por tarefa** | Cada agente lê o `.md/.taskplan/<ID>.md` e escreve nele o seu resultado; o QA executa o plano de teste, o DevSecOps o plano de segurança | **Bloqueio crítico**: interrompe e sinaliza (modos vazio/`--tarefa`); em `--lote`/`--continuar` é registrado e o comando segue para a próxima elegível. Fim da tarefa (modos vazio/`--tarefa`) |

Detalhe operacional completo em `.claude/commands/executar.md`; aqui ficam as
regras do fluxo.

- **Fonte e canal da tarefa**: `.md/.taskplan/<ID>.md`, com as seções "1. Plano de
  execução", "2. Plano de teste" e "3. Plano de validação de segurança". Sem o
  arquivo (ou com seção `PENDENTE:`) a tarefa não roda — `/organizar` gera os
  arquivos. O arquivo também é o **canal entre as etapas**: o Executor grava o
  resultado em "4. Resultado da execução"; o QA lê o arquivo, testa e grava em "5.
  Resultado do QA"; o DevSecOps lê o arquivo, valida e grava em "6. Resultado do
  DevSecOps"; reexecuções acrescentam `### Rodada n` (nada é apagado); um bloqueio
  vai para a seção `## Bloqueio`. O `TASK.md` recebe só o Status.
- **Uma tarefa por vez**, sem paralelismo: o ciclo Executor → QA → DevSecOps fecha
  a tarefa antes de pegar a próxima. A marcação de paralelismo (Seção 4 do
  `TASK.md`) segue servindo só para ordenar dependências.
- **Status por tarefa**: `Pendente` → `Em andamento` → `Concluída · QA ✔` →
  `Concluída · QA ✔ · Sec ✔`. A tarefa só conta como pronta (e só libera as
  dependentes) com os dois marcadores.
- **Achado crítico** (QA: compromete o critério de aceite central, exige mudança de
  escopo/arquitetura ou quebra outra tarefa; DevSecOps: severidade alta/crítica ou
  compliance obrigatório não atendido): a tarefa volta para `Em andamento`, os
  achados ficam na seção do QA/DevSecOps do arquivo e o ciclo reinicia na execução
  (com novo QA e novo DevSecOps depois). Limite de **2 devoluções** somadas; a 3ª
  é bloqueio crítico.
- **Bloqueio crítico** (lacuna no SDD/UX-SPEC/TASK, 3ª devolução, dúvida de
  produto/escopo, `BLOCKERS.md` `Aberto`…): o agente escreve a seção `## Bloqueio`
  do arquivo da tarefa, o `TASK.md` fica `Bloqueada (<motivo>)`, a entrada vai para
  `BLOCKERS.md` e o usuário é sinalizado. Em `/executar` vazio/`--tarefa` o comando
  para; em **`--lote`/`--continuar` o bloqueio é só registrado e o comando segue
  para a próxima tarefa elegível** (tarefa `Bloqueada` não resolve dependência, então
  as dependentes são puladas). Ao final, o usuário roda `/listar`, vê as bloqueadas
  e trata uma a uma; `/executar --tarefa <ID>` retoma cada uma. Só interrompem o
  modo contínuo as falhas que atingem **todas** as tarefas (contexto acima do teto,
  git ausente/corrompido, ambiente quebrado).
- **Reserva por sessão (várias sessões ao mesmo tempo)**: o cabeçalho de cada
  `.md/.taskplan/<ID>.md` tem uma linha `Reserva:`. Valores: `Livre` (ou ausente) ·
  `Em execução | Em QA | Em DevSecOps — sessão <token> — desde <data-hora> —
  atualizado <data-hora>` · `Bloqueada` · `Concluída`. Quem pega a tarefa grava a
  reserva **antes** de disparar qualquer agente, confirma relendo o arquivo (se o
  token gravado não for o seu, outra sessão chegou primeiro: desista e pegue a
  próxima) e atualiza `Etapa`/`atualizado` a cada etapa. Uma segunda sessão do
  `/executar` **pula** toda tarefa reservada e pega a seguinte elegível. A reserva
  vive na árvore principal (`.md/.taskplan/`, ver `executar.md`, Seção 3), nunca na
  cópia de uma worktree, para as outras sessões a enxergarem na hora.
- **Divisão**: tarefa que precisa ser quebrada durante a execução vira
  `TP-0000a`, `TP-0000b`… (ou `RTP-0000a`…): mantém prefixo e número e acrescenta
  uma letra. Dividir de novo uma parte acrescenta outra letra (`TP-0000aa`,
  `TP-0000ab`). A original fica no `TASK.md` com Status `Dividida (→ TP-0000a,
  TP-0000b)` e seu arquivo é mantido, com a nota da divisão; conta como resolvida
  só quando **todas** as partes tiverem `QA ✔ · Sec ✔`. Dependentes dela passam a
  depender das partes.

---

## Unidade de trabalho: a tarefa (e o lote como agrupador)

A unidade de execução e de validação é a **tarefa**, uma por vez, com seus planos
em `.md/.taskplan/<ID>.md`. O **lote** (coluna `Lote` do `TASK.md`, atribuído pelo
Coordenador em `/definir`) continua como agrupador: serve a `--lote N` e define o
que o `/deploy` publica — um lote está pronto quando todas as suas tarefas têm
`QA ✔ · Sec ✔`. O `/deploy` processa um lote específico ou o conjunto de lotes
prontos ainda não publicados — ver Comando 2.

---

## Comando 1: `/executar` — Executor → QA → DevSecOps, uma tarefa por vez

| Dispara quando | Agente(s) | Ação | Pausa obrigatória |
|---|---|---|---|
| Usuário roda `/executar` (vazio = próxima tarefa elegível; `--tarefa <ID>`; `--lote N`; `--continuar [N]` = tarefas em sequência) | `executor` → `validador` chapéu QA → `validador` chapéu DevSecOps, nessa ordem, **por tarefa** | Cada agente lê o `.md/.taskplan/<ID>.md` e escreve nele o seu resultado; o QA executa o plano de teste, o DevSecOps o plano de segurança | **Bloqueio crítico**: interrompe e sinaliza (modos vazio/`--tarefa`); em `--lote`/`--continuar` é registrado e o comando segue para a próxima elegível. Fim da tarefa (modos vazio/`--tarefa`) |

Detalhe operacional completo em `.claude/commands/executar.md`; aqui ficam as
regras do fluxo.

- **Fonte e canal da tarefa**: `.md/.taskplan/<ID>.md`, com as seções "1. Plano de
  execução", "2. Plano de teste" e "3. Plano de validação de segurança". Sem o
  arquivo (ou com seção `PENDENTE:`) a tarefa não roda — `/organizar` gera os
  arquivos. O arquivo também é o **canal entre as etapas**: o Executor grava o
  resultado em "4. Resultado da execução"; o QA lê o arquivo, testa e grava em "5.
  Resultado do QA"; o DevSecOps lê o arquivo, valida e grava em "6. Resultado do
  DevSecOps"; reexecuções acrescentam `### Rodada n` (nada é apagado); um bloqueio
  vai para a seção `## Bloqueio`. O `TASK.md` recebe só o Status.
- **Uma tarefa por vez**, sem paralelismo: o ciclo Executor → QA → DevSecOps fecha
  a tarefa antes de pegar a próxima. A marcação de paralelismo (Seção 4 do
  `TASK.md`) segue servindo só para ordenar dependências.
- **Status por tarefa**: `Pendente` → `Em andamento` → `Concluída · QA ✔` →
  `Concluída · QA ✔ · Sec ✔`. A tarefa só conta como pronta (e só libera as
  dependentes) com os dois marcadores.
- **Achado crítico** (QA: compromete o critério de aceite central, exige mudança de
  escopo/arquitetura ou quebra outra tarefa; DevSecOps: severidade alta/crítica ou
  compliance obrigatório não atendido): a tarefa volta para `Em andamento`, os
  achados vão para a seção `## Achados` do `.md/.taskplan/<ID>.md` e o ciclo reinicia
  na execução (com novo QA e novo DevSecOps depois). Limite de **2 devoluções**
  somadas; na 3ª a tarefa fica `Bloqueada` e o usuário decide.
- **Divisão**: tarefa grande demais (desvio de escopo/estimativa, canário de contexto
  do Executor) é **quebrada** em `TP-0000a`, `TP-0000b`… — `TASK.md` atualizado e
  arquivo em `.taskplan` para cada parte —, em vez de bloquear; ver convenção acima.
- **Achado não crítico**: a tarefa segue aprovada naquela etapa e o `validador`
  abre uma **nova tarefa em `Refatoração Lote-X`** (ID `RTP-0000`): ajusta o
  `TASK.md` (linha completa + dependências) **e** cria o `.md/.taskplan/RTP-0000.md`
  com os três planos. Só vale com as duas coisas feitas (o orquestrador confere);
  a tarefa de origem não é reaberta.
- **Veredito**: QA em `.md/QA-REPORT.md`, DevSecOps em `.md/SECURITY-REVIEW.md`, uma
  entrada por tarefa.
- **Lote pronto** = todas as suas tarefas com `QA ✔ · Sec ✔` (nenhuma
  `Bloqueada`); é o que o `/deploy` publica. Não existe mais checagem estrutural
  de lote nem status `Validado`: o fechamento é consequência das tarefas.
- **Encadeamento**: `--lote N` e `--continuar [N]` repetem o ciclo tarefa a tarefa,
  repetindo a checagem de contexto antes de cada tarefa nova, sem parar em
  bloqueio (ver acima).
- **Nunca** dispara `/deploy`.

**Infra em paralelo (oportunista)**: se `.md/DEPLOY.md` ainda não existir e o
`SDD.md` já estiver aprovado, este é um bom momento para disparar em paralelo o
mesmo dispatch de preparação de infraestrutura do chapéu DevOps (Comando 2, Seção
1) — sem esperar a primeira chamada de `/deploy`. Não pausa nem bloqueia o
`/executar`.

---

## Comando 2: `/deploy` — Validador (QA + DevSecOps de confirmação → DevOps)

| Dispara quando | Agente | Ação | Pausa obrigatória |
|---|---|---|---|
| Usuário roda `/deploy` | `validador` (confirmação final + chapéu DevOps) | Provisiona infra/CI-CD (1ª vez), confirma validação, publica | Sempre antes de produção; achado bloqueante na confirmação final |

### 1. Preparação de infraestrutura (normalmente já feita antes da primeira chamada)

Se `.md/DEPLOY.md` ainda não existir (nenhum deploy anterior): dispare `validador`
(chapéu DevOps: `infrastructure-as-code-provisioning`,
`cicd-pipeline-configuration`) a partir do `SDD.md`/`GUARDRAILS.md` já aprovados.
Isso não depende de nenhum lote específico — é preparação de projeto.

`validador.md` já declara que o chapéu DevOps prepara infra/CI-CD "em paralelo à
implementação", assim que o `SDD.md` é aprovado pelo usuário — não precisa esperar
o primeiro `/deploy`. Na prática, o orquestrador pode (e deve, quando fizer
sentido) disparar esse mesmo dispatch de forma proativa durante uma sessão longa
de `/executar --continuar`, assim que o `SDD.md` for aprovado (ver Comando 1) — puramente oportunista, não bloqueia nem pausa nada. Esta Seção 1
continua existindo como rede de segurança: se por algum motivo isso não aconteceu
antes, `/deploy` garante a preparação na primeira chamada, do jeito que já
funcionava.

### 2. Determinar o que vai ser publicado

1. Lote-alvo: o nomeado em `$ARGUMENTS`, ou — se vazio — **todos** os lotes com
   todas as tarefas `QA ✔ · Sec ✔` (Comando 1) que ainda não aparecem como
   publicados em `.md/DEPLOY.md`.
2. Se não houver nenhum lote pronto pendente de publicação, informe isso ao
   usuário e pare — rode `/executar` primeiro.

### 3. Validação final (chapéu QA + DevSecOps, de confirmação)

Para cada lote a publicar: dispare `validador` (chapéus QA + DevSecOps) de novo,
desta vez focado em **confirmar que nada mudou** desde o veredito registrado em
`QA-REPORT.md`/`SECURITY-REVIEW.md` e em checar integração **entre lotes** que vão
ser publicados juntos (regressão cruzada que uma validação por lote isolado não
cobre). Se o lote já foi validado recentemente e nada mudou, esta etapa pode ser
mais leve (confirmação), mas nunca é pulada.

- **Achado bloqueante nesta confirmação**: **pare**, explique, informe que a
  correção volta para `/executar` (a tarefa afetada refaz o ciclo completo antes
  de tentar `/deploy` outra vez).

### 4. Deploy em staging

Com a validação final limpa: dispare `validador` (chapéu DevOps:
`deployment-execution`, `observability-setup`,
`non-functional-requirement-validation`) para staging, para o conjunto de lotes
desta chamada — **sem pausa**.

### 5. Deploy em produção

**Pare sempre aqui**, mesmo com tudo limpo, e peça confirmação explícita do
usuário antes de disparar `validador` (chapéu DevOps) para produção. Isso vale
para o conjunto publicado nesta chamada de `/deploy` — não é condicional a haver
problema.

### 6. Fechamento (Gate 4 do Gestor)

Após deploy em produção confirmado: dispare `gestor` (registro de fechamento,
Gate 4, sem poder de veto) para registrar em `.md/CTO-REVIEW.md` o resultado —
sucesso, versão, lotes incluídos. Apresente o `deploy-report-drafting`
(`.md/DEPLOY.md`) atualizado e a confirmação do Gate 4.

---

## Comando 3: `/listar` — somente leitura

Traz **todas as tarefas ainda em aberto** do projeto, numa **ordem sugerida de
execução**. A 1ª posição é a primeira tarefa elegível, a que `/executar --tarefa` pegaria
se fosse apontada.

1. **Fonte: `.md/TASKPLAN.md`** (sem ler o `TASK.md`; se não existir, sugere
   `/organizar`). Em aberto = toda tarefa cujo Estado não é `Aprovada`. `Exe`/`QA`/
   `Sec` são derivados do Estado (ex.: `Executada (aguarda teste)` = ✔ — —;
   `Testada (aguarda segurança)` = ✔ ✔ —; `Em teste` = ✔ … —). Inclui as
   `RTP-0000` (`Refatoração Lote-X`).
2. **Ordem e numeração são as do `TASKPLAN.md`** (coluna `#` e ID como lá,
   `TP-0000`/`RTP-0000`); o comando não reordena nem renumera. As dependências já
   vêm antes dos dependentes.
3. Classifique cada uma: elegível (mesma regra do `taskplan.py proxima`), sem
   plano, em execução, aguardando dependência, aguardando QA/Sec ou bloqueada.
   Dependência inexistente ou ciclo vai para "Indeterminadas", sem forçar ordem.
4. Apresente: resumo de contagens, destaque de bloqueio `Aberto` que afete a 1ª
   tarefa elegível, a lista **sempre em formato de tabela markdown** (colunas: #,
   tarefa, título, lote, Exe, QA, Sec, estado, classificação — nunca lista com
   marcadores ou texto corrido) e as indeterminadas, se houver (também em
   tabela).

Não dispara nenhum agente, não avança tarefa, não sugere próximo comando.

---

## Bloqueio e escalonamento (comum a todos os comandos)

Sempre que um agente sinalizar bloqueio (relatório próprio ou nova entrada
`Aberto` em `.md/BLOCKERS.md`):

1. **Pare** e explique ao usuário: quem reportou, o que está bloqueado, e para
   qual agente foi escalado (campo "Escala para" do agente que reportou).
2. **Não dispare o agente de destino automaticamente** — o usuário decide o
   próximo passo (rodar `/executar`/`/definir`/`/planejar` de novo sobre
   o ponto afetado, pedir um parecer ad hoc ao Gestor, ou ajustar manualmente).
3. Quando o usuário indicar que quer resolver, rode o comando correspondente —
   nunca decida a resolução por conta própria.

## Reset de contexto entre lotes/comandos

Ao final de cada comando (fim de tarefa no `/executar`, publicação no `/deploy`), monte um **resumo compacto** a partir do que já existe
nos artefatos — não crie arquivo novo. Esse resumo é o contexto que carrega para a
próxima chamada do mesmo ou de outro comando; não recarregue o histórico detalhado
de dispatches, revisões e fix-loops já fechados — releia os artefatos em disco
quando precisar de detalhe específico do passado.
