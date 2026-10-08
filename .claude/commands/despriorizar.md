---
description: Marca uma tarefa como Despriorizada — você decidiu que a versão de teste pode sair sem ela, mas a versão de distribuição não. Ela fica com o Status Despriorizada, aparece sempre no fim do /listar e é ignorada por /executar, /testar, /validar e /desenvolver. Com --desfazer, a tarefa volta ao Status que tinha. Não dispara agente e não implementa nada.
argument-hint: <ID> [motivo] | --desfazer <ID>
---

# Comando `/despriorizar`

Argumento recebido: $ARGUMENTS

**Despriorizada** = decisão do usuário de que a versão final do módulo **para teste** pode sair sem a tarefa; a versão
final **de distribuição** não pode. A tarefa continua em aberto, com tudo o que já foi feito preservado.

Este comando é só administrativo: **não dispara agente**, não implementa, não testa e não commita. Quem faz o trabalho é
o script `python .claude/scripts/taskplan.py`.

## 1. Argumentos

- `<ID> [motivo]` (ex.: `/despriorizar TP-0113 depende da VM, fica para a distribuição`): despriorizar. O `motivo` é
  opcional, texto livre (o resto da linha).
- `--desfazer <ID>`: tirar a tarefa de despriorizada.
- Vazio ou ID ausente: mostre estas opções com um exemplo de cada e **pare**.
- Mais de uma tarefa na mesma chamada (`TP-0010 TP-0011 …`): repita o passo 2 para cada ID, em sequência, e junte o resumo.

`BK-` não é tarefa: se o ID for de um bloqueio, explique e sugira despriorizar a tarefa que ele bloqueia (o `BK`/`SPK` que
só essa tarefa espera acompanha-a para o fim da lista sozinho).

## 2. Despriorizar

1. `python .claude/scripts/taskplan.py despriorizar <ID> [--motivo "<motivo>"]`
   O script grava no `TASK.md` o Status `Despriorizada · antes: <Status anterior> · motivo: <motivo>`, regera o
   `TASKPLAN.md` (a tarefa vai para o **fim**) e avisa quais tarefas em aberto dependem dela e, por isso, ficam esperando.
2. Recusas do script, repasse como vieram: tarefa inexistente, já `Aprovada` (nada a despriorizar), `Dividida` (despriorize
   as partes) ou **reservada por uma etapa em andamento** (`OCUPADA`: espere a etapa terminar ou libere a reserva).
3. Resumo curto: ID, estado em que estava, motivo, e a lista de dependentes que ficam esperando (`ATENCAO:`).

## 3. Desfazer

`python .claude/scripts/taskplan.py repriorizar <ID>` restaura o Status que a tarefa tinha (inclusive `Bloqueada (BK-…)`,
`Concluída · aguarda QA` etc.) e a devolve à posição normal da fila. Resumo curto com o Status restaurado.

## 4. Regras que o resto do fluxo segue

- `/listar`: a tarefa aparece **sempre no fim**, como "despriorizada".
- `/executar`, `/testar`, `/validar` e `/desenvolver`: **ignoram** a tarefa (nunca elegível; `--tarefa <ID>` explica e para).
  Tarefa que depende dela espera, como em qualquer dependência aberta.
- `/deploy`: **staging** (versão de teste) pode sair sem ela; **produção/distribuição não** — o `/deploy` recusa enquanto
  houver tarefa despriorizada.

Nunca dispare outro comando.
