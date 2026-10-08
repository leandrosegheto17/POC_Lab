---
description: Orquestra o ciclo completo sem supervisão (pensado para rodar à noite) — chama o /executar enquanto houver tarefas elegíveis, depois o /testar enquanto houver tarefas para testar, depois o /validar enquanto houver tarefas para validar, e volta ao /executar para uma nova rodada, até as filas acabarem ou ficarem travadas por bloqueios que dependem de você. Sem --continuar faz uma única passada. Repassa --nocontext, --nocommit, --paralelo e --lotes-distintos às etapas. Não dispara /deploy.
argument-hint: [--continuar] [--nocontext] [--nocommit] [--paralelo [N]] [--lotes-distintos] [--rodadas N]
---

# Comando `/desenvolver` — executar → testar → validar, em ciclo

Este comando é o **único** que encadeia os outros três (`/executar`, `/testar`, `/validar` continuam sem
chamar um ao outro). Ele não implementa, testa nem audita nada por conta própria: só decide **qual etapa
rodar agora**, chama o comando daquela etapa e confere, pelo estado das filas, se houve progresso.

Argumento recebido (pode estar vazio): $ARGUMENTS

## 1. Argumentos

- **`--continuar`**: repete passadas (executar → testar → validar) até parar (Seção 3). **Sem ele**, faz uma
  única passada e para.
- **`--nocontext`**: repassado às etapas — sem teto de contexto (indicado para rodar a noite toda). Sem ele,
  vale o teto de 250 mil tokens: ao cruzá-lo o comando **para entre etapas**, grava tudo e devolve o relatório
  (o estado está em disco: basta rodar de novo numa sessão nova e ele continua de onde parou).
- **`--nocommit`**, **`--paralelo [N]`**, **`--lotes-distintos`**: repassados às etapas, com o mesmo
  significado e as mesmas restrições do `/executar` (ver `/comandos`).
- **`--rodadas N`**: teto opcional de passadas (padrão: sem teto; a parada por falta de progresso basta).

Argumento desconhecido: mostre as opções e **pare**. Nunca pergunte nada ao usuário durante o ciclo — ele
não está presente; onde os comandos das etapas perguntariam (ex.: assumir reserva velha, retomar bloqueada),
**pule** a tarefa e registre no relatório final.

## 2. Pré-requisitos

Os mesmos do `/executar` (Seção 0 de `commands/executar.md`): repositório git, `SDD.md`, `UX-SPEC.md`,
`TASK.md`, `GUARDRAILS.md` e `TASKPLAN.md` existindo. Falhou → **pare** com o motivo. A checagem de contexto
(item 0) vale para este comando, salvo `--nocontext`, e é repetida **antes de cada etapa**.

## 3. O ciclo

O estado das filas vem de **uma chamada** barata, que não lê o `TASK.md`:

`python .claude/scripts/taskplan.py fila`

→ `FILA exe=N qa=N sec=N | bloqueadas=… despriorizadas=… bk_spk_abertos=… reservadas=… sem_plano=… | aprovadas=… total=… | estado=<hash>`

(`exe`/`qa`/`sec` = tarefas elegíveis agora para `/executar`, `/testar` e `/validar`; `estado` = impressão
digital de todas as tarefas: se não muda, nada andou.)

**Uma passada**, nesta ordem:

1. Para cada etapa em **`exe` → `qa` → `sec`**:
   1. Rode `fila`. Se a contagem da etapa for **0**, pule a etapa.
   2. Chame o comando da etapa com `--continuar` mais os repasses (ex.: `/executar --continuar --nocontext
      --paralelo 10`), pela ferramenta Skill. **Carregue cada skill uma vez por sessão**: nas rodadas
      seguintes, siga de novo as instruções já carregadas em vez de invocar a Skill outra vez (só invoque
      de novo se o contexto tiver sido compactado e as instruções sumido).
   3. Ao voltar, rode `fila` outra vez. Se a contagem da etapa ainda for > 0 **e** o `estado` não mudou desde
      antes da chamada, a etapa está **travada** (algo impede as tarefas restantes — falha de ambiente,
      reserva alheia, plano ausente…): anote o motivo e passe à próxima etapa. Se a contagem ainda for > 0 mas
      o `estado` mudou, houve progresso: repita 1.2–1.3.
2. Fim da passada: rode `fila`.
   - **Todas as contagens = 0** → filas vazias: **pare** (Seção 4).
   - **`estado` igual ao do início da passada** → sem progresso: **pare**.
   - **Sem `--continuar`** → **pare** depois desta passada.
   - **`--rodadas N` atingido** → **pare**.
   - Caso contrário, comece **nova passada** (a execução volta a ter tarefas elegíveis porque o `/validar`
     aprovou dependências e o `/testar`/`/validar` devolveram achados críticos).

**Entre etapas** mantenha o contexto enxuto: guarde só o resumo de 2–3 linhas que cada etapa devolveu (o
que fechou, devolveu, bloqueou). Não reimprima listas.

**Bloqueios** não interrompem o ciclo: cada etapa já os registra (`BK-`/`SPK-` + tarefa `Bloqueada`) e segue.
O ciclo só termina por filas vazias, falta de progresso, `--rodadas`, teto de contexto ou falha que atinge todas
as tarefas (git quebrado, suíte de testes quebrada de forma geral, ambiente indisponível) — neste último caso
**pare** na hora e diga qual foi.

## 4. Relatório final

Rode `python .claude/scripts/taskplan.py consolidar` e depois `python .claude/scripts/taskplan.py fila
--bloqueios`. Entregue, curto:

- **Por que parou**: filas vazias · sem progresso · `--rodadas` · teto de contexto · falha de ambiente.
- **Balanço**: passadas feitas e, somando as etapas, quantas tarefas foram executadas, aprovadas em QA, aprovadas
  em Sec (`Aprovada`), devolvidas, bloqueadas e quantas RTP foram abertas; `aprovadas` antes → depois.
- **O que depende de você**: os `BK-`/`SPK-` abertos (ID + o que fazer, uma linha cada) e as tarefas
  `Bloqueada` que eles seguram. Trate com `/executar --tarefa BK-nnnn`.
- **Despriorizadas**: quantas (`despriorizadas=`) e quais (`fila --bloqueios` as lista); o ciclo as ignora, mas a versão de distribuição exige todas `Aprovada`.
- **Travado por outro motivo**: etapas marcadas como travadas (com o motivo), reservas (`reservadas`; as com
  mais de 2 h de idade podem ser de uma sessão interrompida — `/executar --tarefa <ID>` oferece assumi-las) e
  tarefas sem plano (rode `/organizar`).
- **Sem commit**: se usou `--nocommit`, lembre que as alterações estão acumuladas na `main` para você commitar.
- **Próximo passo**: `/listar`, e `/deploy` se algum lote ficou todo pronto.

Nunca dispare `/deploy`, `/organizar` nem qualquer outro comando além dos três.
