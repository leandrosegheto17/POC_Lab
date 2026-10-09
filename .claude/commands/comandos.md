---
description: Mostra, numa única tabela, todos os comandos do fluxo (listar, despriorizar, avaliar_ideia, planejar, definir, organizar, executar, testar, validar, desenvolver, revisar, deploy, limpar) e os complementos (argumentos/flags) de cada um, na ordem do fluxo. Somente leitura — não lê o projeto, não dispara agente, não avança nada.
argument-hint: [sem argumentos]
---

# Catálogo de comandos

Argumento recebido (ignorado): $ARGUMENTS

Este comando é **puramente informativo**: não leia o `TASKPLAN.md`, não rode o `taskplan.py`, não leia o
`EXECUTION-FLOW.md` e não dispare agente. Responda **só** com a tabela abaixo (uma única tabela, nesta
ordem exata) e, logo depois, as duas linhas finais. Nada mais.

| Comando | O que faz | Complementos (argumentos) |
|---|---|---|
| `/listar` | Mostra as tarefas em aberto, na ordem da fila do TASKPLAN (somente leitura) | *(vazio)* tarefas em aberto |
| `/avaliar_ideia` | Dono avalia a viabilidade comercial da ideia e produz o PLANO-COMERCIAL.md (loop até você aprovar) | `<ideia>` ideia em texto livre<br>*(vazio)* retoma/revisa o PLANO-COMERCIAL.md existente |
| `/planejar` | Gestor: Gate 1 + PRD.md + PRD-TECNICO.md (loop até você aprovar) | `<ideia inicial>`<br>`--tarefa <demanda>` ciclo pontual completo de uma demanda (Dono → Gestor → Coordenador → Executor → Validador, sem deploy) |
| `/definir` | Coordenador: SDD + ADRs + UX-SPEC (Loop B) e TASK.md (Loop C) | *(vazio)* continua o loop aberto ou parte do PRD-TECNICO aprovado<br>`<texto>` ajuste pontual sobre um artefato já aprovado |
| `/organizar` | Executor quebra o TASK.md em `.md/.taskplan/<ID>.md` (planos de execução, teste e segurança) e gera o TASKPLAN.md | *(vazio)* todas as tarefas em aberto sem arquivo<br>`--lote N`<br>`--tarefa <ID>`<br>`--ordenar` só reordena a fila<br>`--migrar` padroniza IDs e refaz os arquivos de um projeto em andamento |
| `/despriorizar` | Marca uma tarefa como **Despriorizada**: a versão de teste pode sair sem ela, a de distribuição não. Vai para o fim do `/listar` e é ignorada por `/executar`, `/testar`, `/validar` e `/desenvolver` | `<ID> [motivo]` despriorizar<br>`--desfazer <ID>` volta ao estado que a tarefa tinha |
| `/executar` | **Etapa 1** — só o Executor implementa as tarefas elegíveis | *(vazio)* próxima tarefa<br>`--tarefa <ID>` só essa (retoma bloqueada; `BK-`/`SPK-` vão para o Coordenador; usa worktree)<br>`--lote N`<br>`--continuar [N]` fila em sequência, direto na `main`<br>`--nocontext` sem teto de contexto<br>`--nocommit` não commita (você commita no fim)<br>`--paralelo [N]` até N agentes juntos (2–20; sem N = 5)<br>`--lotes-distintos` no máx. uma tarefa por lote |
| `/testar` | **Etapa 2** — QA testa as tarefas já executadas | mesmos complementos do `/executar` (`--tarefa` não aceita `BK-`/`SPK-`) |
| `/validar` | **Etapa 3** — DevSecOps valida a segurança das tarefas já testadas | mesmos complementos do `/executar` (`--tarefa` não aceita `BK-`/`SPK-`) |
| `/desenvolver` | Orquestra executar → testar → validar em ciclo, sem supervisão (para rodar à noite), até as filas acabarem ou travarem em bloqueios seus; ao esvaziar, roda o `/revisar` e executa as RTP que ele abrir | *(vazio)* uma única passada<br>`--continuar` repete passadas até acabar/travar<br>`--nocontext` sem teto de contexto<br>`--nocommit` · `--paralelo [N]` · `--lotes-distintos` repassados às etapas<br>`--rodadas N` teto de passadas |
| `/revisar` | Coordenador revisa a arquitetura do **projeto inteiro** (fronteiras, duplicação, acesso a dados, tamanho, comentários, troca de dados, CI) com o `saude.py`; grava `.md/ARCH-REVIEW.md` e abre RTP/BK. Obrigatório antes do `/deploy` | *(vazio)* projeto inteiro<br>`--lote N` nomeia o grupo das RTP pelo lote recém-fechado<br>`--pre-deploy` revisão antes de publicar<br>`--nocommit` não commita |
| `/deploy` | Validador: exige `/revisar` em dia, roda a **auditoria de segurança de release** (ferramentas + teste ativo local; Crítico/Alto bloqueia), publica em staging, repete o teste ativo em staging; sempre pausa antes de produção | *(vazio)* todos os lotes prontos ainda não publicados<br>`<nome do lote>` só esse lote<br>`--auditar` só a auditoria de segurança, sem publicar |
| `/limpar` | Commita o pendente na `main`, remove worktrees/branches integradas, limpa Docker órfão e faz o push | *(vazio)* executa a limpeza<br>`--dry-run` só relata, sem alterar nada |
| `/comandos` | Esta tabela | *(sem argumentos)* |

- **Ordem típica**: `/avaliar_ideia` → `/planejar` → `/definir` → `/organizar` → `/executar` → `/testar` →
  `/validar` (ou `/desenvolver` para os três em ciclo) → `/revisar` → `/deploy`; `/listar` a qualquer momento; `/limpar` ao terminar.
- **Combinações**: `--nocontext` e `--nocommit` só com `--continuar` · `--paralelo` só com `--lote` ou
  `--continuar` · `--lotes-distintos` só com `--paralelo`. No `/desenvolver`, `--nocontext`/`--nocommit` valem sem `--continuar`. `/executar`, `/testar` e `/validar` nunca chamam um
  ao outro (só o `/desenvolver` os encadeia).
