---
description: Aciona o agente Validador (chapéu DevOps) para provisionar infra/CI-CD (1ª vez), confirmar a validação final dos lotes prontos, rodar a auditoria de segurança de release (ferramentas + teste ativo local, que bloqueia em achado Crítico/Alto) e publicar em staging; repete o teste ativo contra staging e pausa sempre antes de produção. Fecha com um registro do Gestor (Gate 4). Com --auditar, roda só a auditoria de segurança, sem publicar.
argument-hint: [vazio = todos os lotes prontos (tarefas QA ✔ · Sec ✔) ainda não publicados | nome do lote = publica só esse lote | --auditar = só a auditoria de segurança de release, sem publicar]
---

# Comando `/deploy` — Validador (confirmação final + DevOps) + Gestor (Gate 4)

A lógica deste comando está definida em `.claude/EXECUTION-FLOW.md` (Comando 3) —
leia esse arquivo agora, antes de fazer qualquer outra coisa, se ainda não o tiver
em contexto. Ele por sua vez assume o que está declarado em
`.claude/agents/validador.md`, `.claude/agents/gestor.md` e em
`PIPELINE-CONVENTIONS.md`.

**O usuário é o orquestrador.** Este comando publica o que estiver pronto e para —
sempre pausando antes de produção, mesmo com tudo limpo.

Argumento recebido (pode estar vazio): $ARGUMENTS

**`--auditar`**: roda **só** a Seção 2b (auditoria de segurança de release, com o teste
ativo contra a aplicação local) e o resumo dela; não confere lotes, não publica e não
chama o Gestor. Serve para refazer a auditoria depois de corrigir um achado, sem passar
pelo deploy inteiro. Depois da 2b, vá direto ao resumo e **pare**.

## 1. Preparação de infraestrutura (só a primeira vez)

Se `.md/DEPLOY.md` ainda não existir: **anuncie** e **dispare** `validador`
(`subagent_type: validador`) focado no chapéu DevOps:
`infrastructure-as-code-provisioning` + `cicd-pipeline-configuration`, a partir do
`SDD.md`/`GUARDRAILS.md` já aprovados. Isso não depende de nenhum lote — é
preparação de projeto, feita uma vez. Inclui deixar prontas as **ferramentas da
auditoria de segurança** (Seção 2b): `gitleaks`, `semgrep`, `osv-scanner` e a imagem
`zaproxy/zap-stable` — instaladas localmente ou disponíveis via Docker —, e os mesmos
`gitleaks`, auditoria de dependências e `semgrep` como estágios do CI
(`cicd-pipeline-configuration`). O que ficar indisponível é registrado no `DEPLOY.md`.

## 2. Determinar o que vai ser publicado

Antes de olhar os lotes, rode `python .claude/scripts/taskplan.py consolidar` para o `TASK.md`/`TASKPLAN.md`
refletirem os Status que uma rodada de `/executar`, `/testar` ou `/validar` deixou só nos arquivos das tarefas.

O lote nomeado em `$ARGUMENTS`, ou — se vazio — todos os lotes
com todas as tarefas `QA ✔ · Sec ✔` (produzido pelo `/executar`) que ainda não
aparecem como publicados em `.md/DEPLOY.md`.

Se não houver nenhum lote pronto pendente de publicação: informe isso e pare —
rode `/executar` primeiro sobre o(s) lote(s) desejado(s).

## 2a. Revisão de arquitetura em dia (obrigatória)

A validação por tarefa não enxerga o conjunto; o `/revisar` sim. Antes de seguir,
confira que existe uma revisão **mais nova que o último código commitado**:

- `git log -1 --format=%ct -- .md/ARCH-REVIEW.md` (data da última revisão) e
- `git log -1 --format=%ct -- . ":(exclude).md" ":(exclude).claude"` (data do último
  commit de código).

- **Sem `.md/ARCH-REVIEW.md`, ou revisão mais velha que o código**: **pare** e sugira
  `/revisar --pre-deploy`. Não dispare a revisão daqui.
- **Revisão em dia, com achado de severidade Alta cuja `RTP`/`BK` ainda não está
  `Aprovada`/resolvida**: **pare**, liste os achados e sugira `/executar` (ou
  `/executar --tarefa BK-nnnn`).
- **Revisão em dia, só com achados Média/Baixa**: siga. As `RTP` ficam na fila como
  débito; cite-as no resumo do deploy.

## 2b. Auditoria de segurança de release (obrigatória, bloqueante)

O `/validar` revisa o diff de cada tarefa lendo o código. Esta etapa **testa de
verdade** o projeto inteiro antes de publicar: ferramentas, threat model e ataque
contra a aplicação rodando. Skill: **`security-release-audit`** (chapéu DevSecOps).
Regra: cada item precisa de **evidência executada**; ler o código não conta como teste.

1. **Ferramentas (Fase A).** Rode `python .claude/scripts/seguranca.py` (dependências de
   produção, segredos no histórico git inteiro, SAST). Ele grava as saídas brutas e o
   `resumo-ferramentas.md` em `.md/.seguranca/<AAAA-MM-DD>/`.
2. **Aplicação local no ar.** Suba a aplicação localmente (comando de dev/preview do
   projeto, em segundo plano) e anote a URL. Não conseguiu subir: o teste ativo fica
   "NÃO EXECUTADO" (bloqueia — ver item 5).
3. **Dispare `validador`** (`subagent_type: validador`, `run_in_background: false`) no
   chapéu DevSecOps com a skill `security-release-audit`, passando: o caminho do
   `resumo-ferramentas.md`, a URL local, os caminhos de `SDD.md`, `GUARDRAILS.md`,
   `SECURITY-REVIEW.md` e `THREAT-MODEL.md` (se existir). Ele confirma os achados das
   ferramentas, atualiza o `.md/THREAT-MODEL.md`, escreve/atualiza
   `.md/.seguranca/sondas.json` e roda o teste ativo
   (`python .claude/scripts/seguranca.py --dast <URL> --sondas .md/.seguranca/sondas.json`),
   confere o SDD §7 e a configuração, e grava a entrada "Auditoria de release" no topo
   do `SECURITY-REVIEW.md`. Retorno: as linhas `TAREFA | …` e `VEREDITO | …` da skill.
4. Derrube a aplicação local.
5. **Decisão** (pela linha `VEREDITO`):
   - **APROVADA** ou **APROVADA COM DÉBITO**: abra uma `RTP` por linha `TAREFA` Média/Baixa
     (grupo `Refatoração Segurança <AAAA-MM-DD>`, pelo `taskplan.py proximo-id RTP` +
     `nova`, como no `/revisar`, e o `.md/.taskplan/RTP-nnnn.md` no formato do
     `/organizar`) e siga.
   - **REPROVADA** (Crítico/Alto aberto, ou item NÃO EXECUTADO): **pare**. Abra uma tarefa
     corretiva por linha `TAREFA` Crítica/Alta no mesmo grupo (elas passam por `/executar`
     → `/testar` → `/validar` como qualquer tarefa) e liste o que bloqueou. **Não publique.**
     Só o usuário pode aceitar um risco Alto ou um item NÃO EXECUTADO: se ele disser
     explicitamente que aceita, registre no `SECURITY-REVIEW.md` (achado, motivo, prazo,
     "aceito pelo usuário em <data>") e siga. O agente nunca aceita risco sozinho.
6. Commit dos artefatos da auditoria (`SECURITY-REVIEW.md`, `THREAT-MODEL.md`,
   `.md/.seguranca/`, tarefas abertas) com a mensagem `Auditoria de segurança <data>: <veredito>`.

Com `--auditar`: termine aqui com o resumo (veredito, achados por severidade, tarefas
abertas, itens não executados) e **pare**.

## 3. Validação final de confirmação

Para o conjunto de lotes desta chamada: **dispare** `validador` de novo, focado em
confirmar que nada mudou desde o veredito já registrado em `QA-REPORT.md`/
`SECURITY-REVIEW.md` (ou rodar a validação de fato, se alguma tarefa do lote nunca passou pelo
comando `/executar`), e checar integração **entre os lotes** que serão publicados juntos —
regressão cruzada que a validação por lote isolado não cobre.

**Regressão visual** (projeto com interface): na mesma confirmação, rode a comparação
de **todas** as telas do `telas.json`
(`node .claude/scripts/comparar-visual.mjs --base-url <url local> --pacote <pacote da interface>`,
ou com `--iniciar`) e passe o `resumo.md` ao `validador`. Tela fora do limite é achado
bloqueante (a aparência aprovada é critério de aceite). Comparação que não roda também
bloqueia, salvo aceite explícito do usuário.

- **Achado bloqueante nesta confirmação**: **pare**, explique, e informe que a
  correção volta para `/executar` — a tarefa afetada refaz o ciclo completo do
  `/executar` antes de tentar `/deploy` outra vez.

## 4. Deploy em staging

Com a confirmação limpa: **dispare** `validador` (chapéu DevOps:
`deployment-execution`, `observability-setup`,
`non-functional-requirement-validation`) para staging, cobrindo o conjunto de
lotes desta chamada — **sem pausa**.

## 4a. Teste ativo de segurança contra staging (obrigatório antes de produção)

Cabeçalhos, CORS, bindings e segredos reais só existem no ambiente publicado. Com o
staging no ar, **dispare** `validador` (chapéu DevSecOps, skill `security-release-audit`,
**só a Fase C**) com a URL de staging: ele roda
`python .claude/scripts/seguranca.py --dast <URL de staging> --sondas .md/.seguranca/sondas.json`
(mesmas sondas da Seção 2b), confirma as falhas e acrescenta ao `SECURITY-REVIEW.md` a
entrada `## Auditoria de release <data> — staging`.

- **Crítico/Alto ou sonda reprovada que não aconteceu localmente** (diferença de
  configuração do ambiente): **pare antes de produção**, pelas mesmas regras do item 5
  da Seção 2b. O staging fica no ar para inspeção.
- **Limpo**: siga para a Seção 5.

**Nunca** rode as sondas contra produção.

## 5. Deploy em produção

**Tarefas despriorizadas** (`/despriorizar`): staging (a versão de teste) pode sair sem elas, mas a **versão de distribuição
não**. Antes de perguntar sobre produção, rode `python .claude/scripts/taskplan.py fila --bloqueios` e liste as linhas
`DESPRIORIZADA`. Havendo qualquer uma, **não publique em produção**: mostre a lista, diga que cada uma precisa voltar
(`/despriorizar --desfazer <ID>`) e ficar `Aprovada` (`/executar` → `/testar` → `/validar`) antes, e **pare**.

**Pare sempre aqui**, mesmo com tudo limpo. Pergunte explicitamente ao usuário se
quer publicar este conjunto em produção agora. Só com confirmação explícita,
**dispare** `validador` (chapéu DevOps) para produção.

## 6. Fechamento (Gate 4 do Gestor)

Depois de um deploy em produção confirmado: **dispare** `gestor` (registro de
fechamento, Gate 4 — sem poder de veto, só registro) para gravar em
`.md/CTO-REVIEW.md` o resultado: sucesso/rollback/incidente, versão, lotes
incluídos.

## 7. Encerramento

Apresente o `DEPLOY.md` atualizado (o que foi publicado, em qual ambiente, estado
de observabilidade/rollback), o veredito das auditorias de segurança (local e staging,
com as `RTP` de débito abertas e os riscos aceitos pelo usuário, se houver) e, se houve
produção, a confirmação do Gate 4.

## 8. Bloqueio

Se um agente sinalizar bloqueio (relatório próprio ou nova entrada `Aberto` em
`.md/BLOCKERS.md`) em qualquer ponto: **pare**, explique quem reportou, o quê, e o
campo "Escala para" — **não dispare nenhum outro agente automaticamente**. A
decisão de como seguir é do usuário.
