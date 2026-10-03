---
description: Limpeza do projeto — commita o que está pendente na main, confere se todas as worktrees/branches (local e nuvem) estão integradas, remove as que não têm mais uso, limpa recursos órfãos do Docker do projeto e faz o push da main. Nunca descarta trabalho não integrado.
argument-hint: [--dry-run — só relata o que faria, sem alterar nada]
---

# Limpeza do Projeto

Deixa o ambiente limpo: nada de worktree, branch, container ou arquivo sobrando que
não será mais usado. **Regra de ouro: apagar só o que está comprovadamente integrado
ou comprovadamente descartável. Na dúvida, não apague — relate e pergunte.**

Com `--dry-run`, execute apenas os passos de leitura (1, 2, 3 e 5 em modo relatório),
liste cada ação que *seria* feita e termine sem alterar nada.

Este comando roda da **árvore principal** do repositório (`git rev-parse --show-toplevel`
igual ao diretório atual, branch `main`). Se a sessão estiver dentro de uma worktree,
pare e peça para rodar da árvore principal.

**Nome do projeto** (`<projeto>`): o `name:` do `docker-compose.yml`/`compose.yml`, se
houver; senão o nome do diretório raiz em minúsculas. É a chave que identifica o que é
"deste projeto" no Docker (passo 4). Não dispara nenhum agente: é feito direto, com `git`, `gh` e `docker`.

## 1. Commit na `main`

1. `git status --short` e `git branch --show-current` (precisa ser `main`; senão pare).
2. Classifique cada item pendente — leia antes de decidir:
   - **Entregável do projeto** (ADR, relatório de QA/Security, TASK.md, código,
     testes, docs): vai para o commit.
   - **Rascunho/descartável** (arquivo temporário, saída de script, JSON truncado,
     lixo de encoding, nunca referenciado em nenhum artefato): não commite; apague
     **depois de olhar o conteúdo** e liste o que apagou no relatório final.
   - **Sem certeza**: não commite nem apague; pergunte ao usuário (`AskUserQuestion`).
   - **Segredo** (`.env`, chaves, `*serviceAccount*.json`): nunca commite; avise.
3. Commite em commits temáticos (um por assunto), mensagem em português no estilo
   do histórico (`git log --oneline -10`), terminando com a linha de atribuição
   vigente. Nunca `--no-verify`, nunca `--amend`. Se um hook falhar, corrija a causa.
4. Não rode a suíte de testes aqui; o comando é de limpeza, não de validação.

## 2. Conferir integração — worktrees e branches, local e nuvem

Somente leitura. Rode:

```
git fetch --prune origin
git worktree list --porcelain
git branch -vv
git branch -r
```

Considere também diretórios soltos: `.claude/worktrees/*`, `.worktrees/*` e irmãos
`../<NomeDoDiretorio>-wt-*` que **não** apareçam em `git worktree list` (sobras de worktree já
removida) — são candidatos a remoção se estiverem vazios ou sem nada versionável.

Para **cada** worktree/branch local diferente de `main`, e para cada branch remota
diferente de `origin/main`, determine:

| Pergunta | Como verificar |
|---|---|
| Integrado na `main`? | `git log main..<branch> --oneline` vazio (nenhum commit fora da main); confirme também com `git branch --merged main` |
| Worktree com alterações? | `git -C <worktree> status --short` não vazio = **suja** |
| Worktree com stash/arquivos ignorados valiosos? | `git -C <worktree> stash list`; liste ignorados que não sejam `node_modules/`, `dist/`, `build/`, `coverage/` |
| Remota integrada? | `git log origin/main..origin/<branch> --oneline` vazio (após o push do passo 5) |

Classifique cada uma:

- **Descartável**: integrada **e** limpa (sem alterações, sem stash) → será removida.
- **Salvável**: integrada, mas **suja** → leia o diff. Se o conteúdo é entregável
  (ex.: relatórios de validação escritos na worktree e nunca commitados), traga-o
  para a `main` e commite (volte ao passo 1) **antes** de remover; se é lixo, descarte
  citando o que era. Na dúvida, pergunte.
- **Em uso / não integrada**: tem commits fora da `main`, ou está em
  execução (reserva ativa em `TASK.md`/fila, processo aberto nela) → **não toque**.
  Relate branch, commits à frente e o último commit. Nunca use `git branch -D`,
  `git worktree remove --force` em worktree com trabalho não integrado, nem
  `git push --force`.

Apresente a tabela da classificação ao usuário antes de apagar qualquer coisa
(no `--dry-run`, é a saída final).

## 3. Remover o que não está mais em uso

Somente o que foi classificado **Descartável** (ou **Salvável** já resolvido):

1. `git worktree remove <caminho>` (sem `--force`; só use `--force` depois de ter
   salvo na `main` o conteúdo de uma worktree *salvável*).
2. `git branch -d <branch>` — sempre `-d`. Se o `-d` recusar, **pare esse item** e
   relate: significa que a integração não é a que parecia.
3. `git worktree prune`.
4. Apague diretórios soltos vazios/sobras de worktree já desregistrada
   (`rmdir`; se não estiver vazio, só `node_modules` ignorado, remova; qualquer outra
   coisa, pergunte).
5. As branches **remotas** integradas só são apagadas depois do push (passo 5).

## 4. Docker — só o que é deste projeto

O Docker desta máquina é **compartilhado com outros projetos** (dezenas de containers
de terceiros, alguns em execução). Por isso é **proibido**: `docker system prune`,
`docker container prune`, `docker volume prune`, `docker image prune -a`,
`docker builder prune -a`, parar ou remover container em execução, e qualquer coisa
que não seja comprovadamente deste projeto. Se o `docker` não responder em ~30 s
(`timeout 30 docker info`), pule este passo e informe.

Identifique recursos do projeto por **rótulo ou prefixo**, sempre listando antes de apagar:

- Compose do projeto (rótulo `com.docker.compose.project=<projeto>`);
- Containers/volumes/redes cujo nome começa por um prefixo que o **próprio projeto**
  usa para containers de validação/verificação (procure em `.md/`, `.claude/` e
  `docs/`; ex.: no DoseCerta, `dc-` e `probe-fila-`). Se o projeto não documenta
  prefixo nenhum, use **só** o rótulo do compose — nunca adivinhe um prefixo.

Então, em ordem:

1. Containers do projeto **parados** (`exited`/`dead`/`created`):
   `docker ps -a --filter status=exited --filter status=dead --filter status=created --filter label=com.docker.compose.project=<projeto>`
   e os com o prefixo de validação do projeto (se houver) → `docker rm`. Container do projeto ainda **em
   execução** e não é o ambiente local que o usuário subiu de propósito → relate e
   pergunte; nunca pare por conta própria.
2. Redes do projeto sem container conectado → `docker network rm`.
3. Volumes do projeto sem container usando (`docker volume ls --filter dangling=true`
   cruzado com o rótulo/prefixo): contêm dados locais de banco. **Liste e pergunte**
   antes de remover (`AskUserQuestion`), exceto volumes de validação (prefixo do projeto), que são
   descartáveis.
4. Imagens **sem tag e sem uso** (`docker image prune` — só *dangling*, sem `-a`) e
   imagens do projeto (`<projeto>*` ou prefixo de validação) sem container associado → `docker rmi`.
   Imagens de terceiros ficam.
5. Cache de build: `docker builder prune --filter until=168h` (somente mais antigo
   que 7 dias; nunca `-a`).

Registre no relatório quanto espaço foi liberado (`docker system df` antes/depois).

## 5. Push da `main`

1. Garanta árvore limpa (`git status --short` vazio, exceto o que o usuário mandou
   manter) e `git fetch origin`.
2. Se `origin/main` tem commits que a `main` local não tem, **não force**: rode
   `git pull --rebase origin main`, resolva só conflito trivial; conflito real →
   pare e relate.
3. `git push origin main` (nunca `--force`, nunca `--no-verify`). Confirme com
   `git status -sb` que não há mais "ahead".
4. Com o push feito, branches remotas (`origin/<branch>`) já integradas na
   `origin/main` e sem worktree viva → `git push origin --delete <branch>`. As não
   integradas ficam e são relatadas.
5. `git fetch --prune origin` por último, para refletir o estado final.

Se o push falhar (permissão, hook remoto, rede), relate o erro literal e **não**
tente contornar.

## 6. Relatório final

Curto e verificável, com o estado **medido ao fim** (não o planejado):

- Commits criados (hash + assunto) e o que foi descartado como rascunho.
- Tabela worktrees/branches: removida / mantida (motivo) / salva na main.
- Branches remotas: apagadas / mantidas (motivo).
- Docker: o que foi removido e espaço liberado; o que ficou por ser de terceiros
  ou por aguardar decisão.
- Estado final: saída de `git worktree list`, `git branch -a` e `git status -sb`.
- Pendências que dependem do usuário (itens "em uso", volumes a decidir, etc.).

Se algum passo foi pulado ou falhou, diga qual e por quê — nunca declare o
ambiente "limpo" sem ter conferido a saída dos comandos finais.
