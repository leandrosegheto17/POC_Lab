---
description: Traz todas as tarefas ainda em aberto no projeto, na ordem e com a numeração do .md/TASKPLAN.md (dependências antes dos dependentes), com as colunas Exe/QA/Sec derivadas do estado; a tarefa só sai da lista quando está Aprovada (as três etapas ✔). Somente leitura, não dispara agente, não avança tarefa.
argument-hint: [opcional, sem uso hoje — reservado para filtrar por lote no futuro]
---

# Tarefas em Aberto — Ordem Sugerida de Execução

Este comando é **puramente informativo** — não dispara nenhum agente, não avança
nenhuma tarefa, não pede confirmação e não pausa esperando ação do usuário. Ele
relata as **tarefas ainda em aberto** do projeto inteiro, no nível de tarefa
individual, na **ordem e com a numeração do `.md/TASKPLAN.md`**.

Leia `.claude/EXECUTION-FLOW.md` agora (Comando 4 e "Convenção de IDs"), se ainda
não o tiver em contexto. A 1ª tarefa **elegível** da lista tem de ser a mesma que o
`/executar` pegaria; este comando não inventa uma prioridade própria nem reordena a
fila: o `TASKPLAN.md` já vem com as dependências antes dos dependentes.

## 1. Ler o estado

**Regra de ouro: não leia o `.md/TASK.md`.** Tudo vem do `TASKPLAN.md` e dos
arquivos de `.md/.taskplan/`, como no `/executar`.

1. Se `.md/TASKPLAN.md` não existir, informe que não há plano de execução (rode
   `/organizar`; antes dele, `/planejar` e `/definir`) e pare.
2. Leia o `.md/TASKPLAN.md` inteiro: linha `Resumo:` e a tabela
   `| # | Tarefa | Plano | Título | Lote | Dep | Estado |`. O `#` é a numeração e a
   ordem oficial; `Tarefa` é o ID (`TP-0000`, `RTP-0000`, ou `T-001 (TP-0001)` em
   `TASK.md` antigo); `Plano` = `✔` quando existe `.md/.taskplan/<ID>.md`.
3. Para cada tarefa **não `Aprovada`**, leia **só a linha `Reserva:`** do cabeçalho
   do `.md/.taskplan/<ID>.md` (nunca o arquivo inteiro).
4. Para cada tarefa `Bloqueada`, leia a seção `## Bloqueio` do seu arquivo
   `.taskplan` e, se existir, a entrada `Aberto` correspondente em
   `.md/BLOCKERS.md` (campo `Escala para`).

## 2. Montar a lista

**Tarefa em aberto** = qualquer tarefa cujo Estado não seja `Aprovada`. Ficam fora
da lista as `Aprovada` e as `Dividida` cujas partes estejam todas `Aprovada`; uma
`Dividida` com parte em aberto não aparece (as partes aparecem no lugar dela).

**Aprovações por tarefa** (colunas `Exe`, `QA`, `Sec`), derivadas do Estado:
`✔` aprovada, `…` em andamento, `—` ainda não passou por essa etapa.

| Estado | Exe | QA | Sec |
|---|---|---|---|
| Não executada | — | — | — |
| Em execução | … | — | — |
| Executada (aguarda teste) | ✔ | — | — |
| Em teste | ✔ | … | — |
| Testada (aguarda segurança) | ✔ | ✔ | — |
| Em validação de segurança | ✔ | ✔ | … |
| Bloqueada | — | — | — |

Tarefa `Bloqueada` mostra `—` nas três colunas: o `TASKPLAN.md` não guarda até que
etapa ela chegou; o motivo está no arquivo `.taskplan`.

**Ordem**: exatamente a do `TASKPLAN.md` (coluna `#`). Não reordene nem renumere.

**Classificação** de cada tarefa (mesma regra do `taskplan.py proxima`):

- **Elegível**: Estado `Não executada` (ou em andamento por devolução, sem reserva
  ativa), `Plano ✔`, todas as dependências `Aprovada` (`Dividida` conta só com todas
  as partes `Aprovada`) e sem reserva ativa de outra sessão. Se alguma dependência
  já passou da execução mas ainda não está `Aprovada`, acrescente "(dep. em
  validação)" — convém validá-la antes de executar a dependente.
- **Sem plano**: Estado executável mas `Plano —`. Não é elegível; falta
  `/organizar`.
- **Em execução**: a `Reserva:` está `Em execução`, `Em QA` ou `Em DevSecOps` por
  outra sessão (mostre a etapa e há quanto tempo); se o `atualizado` tem mais de
  2 h, marque "reserva velha — possivelmente abandonada". Não é elegível.
- **Aguardando QA** / **Aguardando Sec**: Estado `Executada (aguarda teste)` /
  `Testada (aguarda segurança)` (ou `Em teste` / `Em validação de segurança`,
  com `…` na coluna). Não é elegível para o Executor.
- **Aguardando dependência**: alguma dependência ainda em aberto (diga qual); se a
  dependência está `Bloqueada`, diga "aguardando `<ID>` (bloqueada)" — o
  `/executar --continuar` pula essa tarefa até o bloqueio ser tratado.
- **Bloqueada**: Estado `Bloqueada`.
- **Do coordenador**: `BK-`/`SPK-` em aberto (Agente `coordenador`): não são do Executor; classifique como
  "do coordenador (com o usuário)" e mostre o que ela destrava (as tarefas que listam o ID na coluna Dep).

**Indeterminadas**: dependência que aponta para tarefa inexistente no `TASKPLAN.md`,
ou ciclo. Não force uma ordem: liste essas tarefas em separado, com o motivo.

Se não houver nenhuma tarefa em aberto, informe que o `TASKPLAN.md` não tem
pendências e pare.

## 3. Apresentar o relatório

1. **Resumo no topo**: total de tarefas em aberto, quantas elegíveis, quantas
   aguardando dependência, quantas aguardando QA, quantas aguardando Sec, quantas
   bloqueadas, quantas sem plano.
2. **Tarefas bloqueadas**: logo após o resumo, uma tabela só com as `Bloqueada`
   (`Tarefa`, `Lote`, `Motivo` — o resumo da seção `## Bloqueio` do arquivo da
   tarefa, `Escala para` da entrada `Aberto` do `BLOCKERS.md`, `Dependentes` — IDs
   que ficam esperando por ela — e o caminho `.md/.taskplan/<ID>.md`). É a lista de
   trabalho para tratar os bloqueios um a um. Sem bloqueadas, omita a tabela.
3. **Bloqueio na frente da fila**: se a 1ª tarefa elegível tem bloqueio `Aberto`
   afetando ela (quem reportou, o quê, "Escala para"), destaque isso aqui.
4. **Lista na ordem do TASKPLAN, obrigatoriamente em formato de TABELA markdown** —
   nunca lista com marcadores, texto corrido ou blocos por tarefa. Uma linha por
   tarefa, com as colunas fixas: `#` (a numeração do `TASKPLAN.md`, sem
   renumerar), `Tarefa` (ID como está no `TASKPLAN.md`), `Agente` (`executor` ou `coordenador`), `Título`, `Lote`, `Exe`,
   `QA`, `Sec`, `Estado` (o do `TASKPLAN.md`) e `Classificação` (elegível / em
   execução / sem plano / aguardando `<dependência>` / aguardando QA / aguardando
   Sec / bloqueada). Critério de aceite fica de fora — está no arquivo da tarefa.
5. **Indeterminadas**, só se houver: também em tabela, com as colunas `Tarefa` e
   `Motivo`.

Ao fim da tabela acrescente uma linha de legenda: `✔` aprovada · `…` em andamento ·
`—` ainda não passou.

Termine a resposta no relatório — não sugira rodar `/executar` ou qualquer outro
comando; a decisão de agir é do usuário.
