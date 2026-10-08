---
description: Etapa 3 do fluxo — aciona o agente Validador no chapéu DevSecOps para validar a segurança das tarefas já testadas (estado Testada/aguarda segurança), em sequência, contra o plano de validação de segurança de .md/.taskplan/<ID>.md; grava o resultado no arquivo da tarefa. Dá o OK (Sec ✔ = tarefa Aprovada), devolve ao /executar em achado crítico ou abre RTP em achado não crítico. Não implementa nem testa e não chama outro comando. Sem argumento pega a próxima tarefa elegível; --tarefa <ID> valida só essa; --lote N e --continuar [N] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos] encadeiam as tarefas. Durante a rodada só o arquivo de cada tarefa é escrito; TASK.md e TASKPLAN.md são consolidados no fim. Não dispara /deploy sozinho.
argument-hint: [vazio = próxima tarefa | --tarefa <ID> | --lote N | --continuar [N] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos]]
---

# Comando `/validar` — etapa 3: DevSecOps

A lógica do fluxo está em `.claude/EXECUTION-FLOW.md` (Comando 1) e a mecânica
comum em `.claude/commands/executar.md` — **leia o `executar.md` agora** se ainda não o
tiver em contexto (e o `testar.md`, de onde vem o limite de devoluções). Este comando é o
`/executar` com **a etapa trocada**: tudo o que está lá sobre modos e flags (`--tarefa`, `--lote`,
`--continuar`, `--nocontext`, `--nocommit`, `--paralelo`), checagem de contexto, `taskplan.py`
(`iniciar`/`concluir`/`consolidar`), reserva por sessão, onde o código roda (worktree em `--tarefa`,
`main` em `--continuar`), rodada paralela (Seção 3e: até 20 tarefas ao mesmo tempo), bloqueio
(Seção 6) e abertura de tarefa nova (Seção 5) vale **igual aqui**, com as diferenças abaixo.
Agente: `validador` no chapéu DevSecOps (`.claude/agents/validador.md`). **Nunca chama
`/executar` nem `/testar`.**

Argumento recebido (pode estar vazio): $ARGUMENTS

**Acionado pelo `/desenvolver`** (orquestrador sem supervisão): não pare para perguntar nada ao usuário — onde o
comando perguntaria (assumir reserva velha, retomar bloqueada, argumento ambíguo), **pule a tarefa** e registre
no resumo; ao terminar, devolva só o resumo curto (o que fechou, devolveu e bloqueou) e **não** sugira próximo
comando: o controle volta ao `/desenvolver`.

## Diferenças em relação ao `/executar`

- **Pré-requisito**: a tarefa tem de ter `QA ✔` (seção 5 aprovada) e diff recuperável
  (`python .claude/scripts/taskplan.py diff <ID>`). Sem isso, pare e sugira `/testar --tarefa <ID>`.
- **Fila**: `python .claude/scripts/taskplan.py proxima --etapa sec [--lote N] [--pular ID,ID]` (com
  `--paralelo N`: `--n N`, e `--lotes-distintos` quando pedido). Elegível = estado `Testada (aguarda segurança)` ou
  `Em validação de segurança` (retomada), com plano, sem reserva de outra sessão. **Dependências não
  são checadas**; `BK-`/`SPK-` nunca.
- **`--tarefa <ID>`**: tarefa fora desses estados (ainda sem `QA ✔`, já `Aprovada`,
  `Bloqueada`…) — explique o estado e o comando certo, e **pare**. Worktree:
  `execucao/validar-<ID>`, criada a partir da `main`.
- **Início e fim**: `iniciar <ID> <token> --etapa "Em DevSecOps"` e, no fim, `concluir <ID> <token>
  sec-ok` (ou `devolvida`). Nada de `TASK.md`/`TASKPLAN.md` na rodada; `consolidar` ao encerrar a chamada.

**Despriorizada** (`/despriorizar`) é ignorada: não entra na fila (`proxima`), e `--tarefa <ID>` sobre ela explica e **para**. O estado anterior é preservado e volta com `/despriorizar --desfazer`.

## Ciclo da tarefa

1. **Contexto, `iniciar`** como no `executar.md` (Seções 0 e 3-0), com `--etapa "Em DevSecOps"`.
2. **Dispare `validador`** (`subagent_type: validador`, `run_in_background: false`) focado no
   chapéu DevSecOps, **só nesta tarefa**: skills `static-security-analysis`,
   `security-requirement-validation`, `sensitive-data-exposure-check`, `compliance-validation`
   (quando houver dado pessoal) e `security-report-drafting`. Ele **lê o
   `.md/.taskplan/<ID>.md`** (plano de validação de segurança, resultado da execução e do QA) e o
   diff da tarefa (`python .claude/scripts/taskplan.py diff <ID>`; com arquivo compartilhado, leia-o junto
   com a lista de `## 4`), executa o plano e **escreve o resultado em `## 6. Resultado do DevSecOps`**
   (veredito, o que foi verificado, achados com severidade; `### Rodada n` em revalidação), e, como última
   linha da seção, `Resumo para o relatório: <uma linha>` (o `consolidar` monta a entrada de
   `.md/SECURITY-REVIEW.md`; **o agente não edita esse arquivo**). **Não altera código da tarefa e não grava status.** Peça o
   **retorno em até 4 linhas** (OK/DEVOLVIDA/BLOQUEIO, achados em contagem) e **não releia a seção 6**.
3. **Resultado** (`concluir`):
   - **OK de segurança** (sem achado alto/crítico, compliance obrigatório atendido):
     `concluir <ID> <token> sec-ok` — `Concluída · QA ✔ · Sec ✔`; a tarefa fica **`Aprovada`** e libera
     as dependentes (que o `/executar` passa a enxergar como elegíveis).
   - **Achado crítico** (severidade alta/crítica, ou compliance obrigatório não atendido):
     `concluir <ID> <token> devolvida --motivo "<resumo>"` — Status `Em andamento`, achados em
     `## Achados` (e na seção 6). O próximo `/executar` a pega e, depois, ela passa de novo por
     `/testar` e `/validar`. O script conta a devolução, somada às do `/testar` (limite de 2; na 3ª ele
     responde `LIMITE` e é bloqueio crítico — `testar.md`, Seção 3d).
   - **Achado não crítico** (baixa/média, débito): `sec-ok` e o `validador` abre uma
     **`RTP-0000`** (`executar.md`, Seção 5a), conferida com `taskplan.py tarefa <RTP>`.
4. **Commit** (padrão): o que a validação produziu (seção 6, RTP) com a mensagem
   `<ID>: segurança aprovada|devolvida`, pelas regras de onde o código roda. Com `--nocommit`, não commite.

## Fim

Rode `taskplan.py consolidar` (também monta a entrada de `SECURITY-REVIEW.md` a partir da linha `Resumo para o relatório:`). Resumo curto por tarefa: veredito, achados, RTP criadas, estado agora.
No modo contínuo, o resumo final traz: aprovadas (`Sec ✔`), devolvidas ao `/executar` (ID + motivo),
bloqueadas, RTP abertas, puladas e **se algum lote ficou todo pronto para `/deploy`**. Termine sugerindo
`/executar` (se houve devolução ou há novas elegíveis) ou `/deploy`. Nunca dispare `/deploy`.
