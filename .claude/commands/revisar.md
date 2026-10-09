---
description: Revisão de arquitetura do projeto inteiro (não de uma tarefa) — roda o .claude/scripts/saude.py, aciona o Coordenador com a skill architecture-health-review para conferir o código contra o SDD.md, o GUARDRAILS.md e .claude/CONVENCOES-DE-CODIGO.md (fronteiras, duplicação, acesso a dados, regra na tela, tamanho, comentários, troca de dados em produção, CI), grava o resultado em .md/ARCH-REVIEW.md e abre uma RTP por achado (ou BK quando o desenho do SDD precisa mudar). Use ao fechar um lote, dentro do /desenvolver, e obrigatoriamente antes do /deploy. Não corrige código e não chama outro comando.
argument-hint: [vazio = projeto inteiro | --lote N = lote recém-fechado como escopo do grupo de RTP | --pre-deploy] [--nocommit]
---

# Comando `/revisar` — revisão de arquitetura (Coordenador)

As validações por tarefa (`/testar`, `/validar`) conferem cada peça contra o próprio
critério de aceite. Este comando confere **o conjunto**: o que só aparece somando as
peças (a mesma lógica em três módulos, a rota nova que copia a antiga, o arquivo que
cresceu tarefa a tarefa, o SQL espalhado, o comentário que ficou falso). A lógica no
fluxo está em `.claude/EXECUTION-FLOW.md` ("Comando 1b: `/revisar`").

**Não corrige código.** Só encontra, registra e abre tarefas; quem corrige é o
`/executar` pegando as `RTP` na fila normal.

Argumento recebido (pode estar vazio): $ARGUMENTS

**Acionado pelo `/desenvolver`** (sem supervisão): não pergunte nada ao usuário; ao
terminar, devolva só o resumo curto (Seção 4) e **não** sugira próximo comando.

## 0. Pré-requisitos

1. Repositório git, `.md/SDD.md`, `.md/GUARDRAILS.md` e `.md/TASKPLAN.md` existindo.
   Falhou → **pare** com o motivo.
2. Argumento válido: vazio, `--lote N` ou `--pre-deploy`, cada um opcionalmente com
   `--nocommit` (não commita; o usuário commita no fim). Desconhecido → mostre as opções e
   **pare**. Em qualquer modo a revisão olha o **projeto inteiro**; `--lote N` só dá nome
   ao grupo das `RTP`.
3. Checagem de contexto (mesma regra do `executar.md`, Seção 0).
4. Roda direto na árvore principal (não abre worktree): só escreve em `.md/`.

## 1. Medir

1. `python .claude/scripts/taskplan.py consolidar` (o `TASK.md`/`TASKPLAN.md` passam a
   refletir os Status das últimas rodadas).
2. `python .claude/scripts/saude.py --saida .md/.revisao/saude-<AAAA-MM-DD>.md` (mede o
   código, não altera nada). Se o projeto tiver testes muito grandes, rode também com
   `--incluir-testes --saida .md/.revisao/saude-<AAAA-MM-DD>-testes.md`.
2a. **Projeto com interface** (existe `.md/mockup/telas.json`): suba o app e rode a
   comparação visual de **todas** as telas,
   `node .claude/scripts/comparar-visual.mjs --base-url <url> --pacote <pacote da interface> --saida .md/.revisao/visual-<AAAA-MM-DD>`
   (ou com `--iniciar "<comando de dev>"`), e `diff` entre `.md/mockup/tokens.css` e o
   `tokens.css` do app. Passe o `resumo.md` e o resultado do `diff` ao Coordenador
   (item 18 do checklist). Comparação que não roda (Playwright ausente, app não sobe)
   é achado, não motivo para pular.
3. `python .claude/scripts/taskplan.py proximo-id RTP` → anote o primeiro ID livre
   (`RTP-nnnn`).
4. Grupo das `RTP` desta revisão: `--lote N` → `Refatoração Lote-N`; vazio ou
   `--pre-deploy` → `Refatoração Revisão <AAAA-MM-DD>`.

## 2. Revisar (Coordenador)

Dispare `coordenador` (`subagent_type: coordenador`, `run_in_background: false`) com a
skill **`architecture-health-review`**. O prompt traz (sem repetir a definição do
agente nem da skill):

- o caminho do relatório do `saude.py` (e do de testes, se houver) e, com interface, o
  `resumo.md` da comparação visual e o resultado do `diff` de `tokens.css`;
- os caminhos de `SDD.md`, `GUARDRAILS.md`, `.claude/CONVENCOES-DE-CODIGO.md` e
  `.md/ARCH-REVIEW.md` (se já existir, para não repetir achado de revisão anterior ainda
  aberto);
- o primeiro ID livre (`RTP-nnnn`) e o nome do grupo — numere as `RTP` em sequência a
  partir dele;
- estas regras:
  1. Grave a entrada da revisão no topo de `.md/ARCH-REVIEW.md` (formato da skill).
  2. Para cada `RTP`, grave `.md/.taskplan/RTP-nnnn.md` no formato do `/organizar`
     (`Reserva: Livre`, seções `## 1.` com o bloco **Reaproveitamento**, `## 2.` e
     `## 3.`), curto e específico do achado.
  3. **Não** edite `TASK.md`, `TASKPLAN.md`, código nem outros artefatos.
  4. Retorne **só** as linhas abaixo, uma por item, sem texto extra:
     `RTP | <ID> | <título> | <chapéu> | <reqs ou -> | <aceite> | <est> | <arquivos> | <testes>`
     `BK | <o que decidir, em uma linha> | <impacto> | <sugestão>`
     `RESUMO | <n achados> | <n RTP> | <n BK> | <n descartados>`

## 3. Registrar

1. Para cada linha `RTP`: `python .claude/scripts/taskplan.py nova --id <ID> --grupo "<grupo>"
   --titulo "<título>" --chapeu "<chapéu>" --reqs "<reqs>" --aceite "<aceite>" --est "<est>"
   --dep - --par - --arquivos "<arquivos>" --testes "<testes>"`. Se o script responder que o
   ID já existe (outra sessão abriu uma `RTP` no meio), pegue o próximo com `proximo-id
   RTP`, renomeie o arquivo `.md/.taskplan/` correspondente e o ID dentro dele, e tente de
   novo.
2. Para cada linha `BK`: `python .claude/scripts/taskplan.py bloquear - --por "coordenador
   (/revisar)" --escala "usuário" --motivo "<o que decidir>" --impacto "<impacto>" --sugestao
   "<sugestão>"`.
3. `python .claude/scripts/taskplan.py gerar` e, para cada `RTP`, `python
   .claude/scripts/taskplan.py tarefa <ID>` — confira que tem plano com as três seções.
   Faltou: peça ao mesmo `coordenador` (`SendMessage`) para completar, **uma vez**; se
   faltar de novo, liste como falha no resumo.
4. **Commit** (salvo com `--nocommit`): `.md/ARCH-REVIEW.md`,
   `.md/.revisao/`, os arquivos de `RTP`/`BK` e `TASK.md`/`TASKPLAN.md`, com a mensagem
   `Revisão de arquitetura <AAAA-MM-DD>: <n> RTP, <n> BK`.

## 4. Resumo

Curto: números principais do `saude.py` (arquivos acima do limite, blocos duplicados,
IDs de tarefa no código, pastas com acesso a dados), achados por severidade, `RTP`
abertas (ID + título), `BK` abertos (ID + o que decidir) e descartados. Em
`--pre-deploy`: diga se há achado **Alto** aberto — nesse caso o `/deploy` não segue
(ver `deploy.md`, Seção 2a). Termine sugerindo `/executar` (para as `RTP`) ou `/deploy`.

Nunca dispare `/executar`, `/deploy` nem outro comando.
