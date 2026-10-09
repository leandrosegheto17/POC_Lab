---
name: architecture-health-review
description: Revisa o projeto inteiro (não uma tarefa) contra o SDD.md, o GUARDRAILS.md e .claude/CONVENCOES-DE-CODIGO.md — fronteiras de pacote e camada, duplicação entre módulos, acesso a dados fora do lugar, regra de negócio na tela, tamanho de arquivos, comentários desatualizados ou com ID de tarefa, troca de dados em produção e CI — e transforma cada achado em RTP. Use no comando /revisar, ao fechar um lote e obrigatoriamente antes do /deploy. Do NOT use for validar uma tarefa contra o critério de aceite (isso é acceptance-criteria-validation), auditoria de segurança (isso é das skills de DevSecOps) ou redesenhar a arquitetura (mudança estrutural vira BK/ADR, não RTP).
metadata:
  author: coordenador
  version: '1.0.0'
---

# Architecture Health Review

Você atua como o Coordenador (chapéu Software Architect) olhando o **projeto inteiro**,
não uma tarefa. A validação por tarefa (QA e DevSecOps) confere se cada peça cumpre o
seu critério de aceite; ela não enxerga o que só aparece somando as peças: a mesma
lógica escrita em três módulos, a rota v2 que é cópia da v1, a pasta que virou depósito
de SQL, o arquivo que cresceu 50 linhas por tarefa até chegar a 570. Esta skill existe
para isso.

## Quando é Acionada

- No comando `/revisar`: ao fechar um lote (todas as tarefas `Aprovada`), dentro do
  ciclo do `/desenvolver` e **obrigatoriamente** antes do `/deploy`.
- Sob demanda, quando o usuário pedir uma revisão de arquitetura do projeto.

Do NOT use for:
- Validar uma tarefa contra o critério de aceite — isso é `acceptance-criteria-validation`.
- Auditoria de segurança — isso é das skills do chapéu DevSecOps.
- Redesenhar a arquitetura — se o achado exige mudar uma decisão do SDD.md (não só
  ajustar o código para segui-la), ele vira `BK` com proposta de ADR, não `RTP`.

## Inputs Esperados

- Relatório do `.claude/scripts/saude.py` (obrigatório) — o comando roda o script e
  entrega o arquivo; esta skill interpreta os números, não os recalcula à mão.
- `SDD.md`, Seção 2 (subseção `### Pacotes, pastas e fronteiras`) e Seção 6
  (subseção `### Troca de dados em produção`) (obrigatório).
- `GUARDRAILS.md` (obrigatório).
- `.claude/CONVENCOES-DE-CODIGO.md` (obrigatório).
- Arquivos de CI (`.github/workflows/` ou equivalente) e scripts de publicação.
- Lista de `RTP` já abertas (`python .claude/scripts/taskplan.py fila --bloqueios` e
  `.md/TASKPLAN.md`) — para não abrir a mesma `RTP` duas vezes.

## Core Framework — o checklist

Cada item tem **onde olhar**. O relatório do `saude.py` aponta os candidatos; a
confirmação é sempre lendo o código (um bloco "duplicado" pode ser só um teste de
tabela parecido; um `SELECT` pode estar no único módulo de dados permitido).

| # | Item | Onde olhar | Severidade (ver `finding-severity-classification`) |
|---|---|---|---|
| 1 | **Aplicação depende de outra aplicação inteira** para reaproveitar código (ex.: o site importando o pacote do processamento) | `saude.py` §6a × SDD "Pacotes, pastas e fronteiras" | Média |
| 2 | **Regra de negócio calculada na tela** (tela importando o domínio para recalcular) | `saude.py` §6a (imports da tela para pacote/pasta de domínio) + leitura | Média |
| 3 | **Acesso a dados fora do módulo de dados**, ou conexão exposta no tipo público do repositório | `saude.py` §5 × módulo permitido no SDD; tipo exportado do repositório | Média (Alta se há guardrail) |
| 4 | **Lógica duplicada entre módulos** (inclusive comentário admitindo cópia) | `saude.py` §2 e §4 | Média |
| 5 | **Versão nova que é cópia da anterior** (rota v2, tela parecida) | `saude.py` §2 (blocos grandes entre arquivos irmãos) | Média |
| 6 | **Blocos repetidos dentro do mesmo arquivo** (um por fonte/tipo) | `saude.py` §2 (linhas "dentro do mesmo arquivo") | Baixa |
| 7 | **Ponto de entrada importando ponto de entrada** (CLI→CLI, rota→rota); falta de camada de casos de uso | `saude.py` §6b | Média |
| 8 | **Arquivo acima do limite**; mais de um componente exportado no arquivo; mapa de rótulos repetido em vários arquivos | `saude.py` §1 + leitura | Baixa |
| 9 | **Arquivo de teste gigante**, fixtures copiadas entre testes | `saude.py` §1 (tipo teste); rode o script com `--incluir-testes` para a duplicação | Baixa |
| 10 | **ID de tarefa/lote no código**; comentário narrando o processo | `saude.py` §3 | Baixa |
| 11 | **Comentário desatualizado** (diz algo que o código não faz mais) | Leitura dos cabeçalhos dos arquivos tocados no período; procure frases como "não registrado em", "ainda não", "futuro", "por enquanto" | Baixa |
| 12 | **Conversão forçada** de tipo do contrato em tipo do domínio | `saude.py` §7 | Baixa |
| 13 | **Desempenho básico**: comando SQL preparado a cada chamada; consulta dentro de laço | Leitura do módulo de dados e dos laços que o chamam | Baixa |
| 14 | **Troca de dados em produção** sem atomicidade/volta atrás, ou diferente do que o SDD §6 definiu | Script/DDL de publicação × SDD "Troca de dados em produção" | Média |
| 15 | **CI**: caminho de cache/artefato que não bate com a pasta onde o comando roda; checagens do GUARDRAILS fora do pipeline | Arquivos de workflow × scripts do `package.json` (atenção a `--filter`) | Média |
| 16 | **Publicação em cadeia de `&&`** no `package.json` em vez de script/workflow dedicado | `package.json` da raiz e dos pacotes | Baixa |
| 17 | **Guardrail sem checagem automática** (coluna "Como verificar" só em prosa) | `GUARDRAILS.md` | Baixa |
| 18 | **Regressão visual**: alguma tela saiu do mockup (mudança em componente compartilhado afeta telas que já estavam aprovadas); `tokens.css` do app diferente do mockup; tela sem entrada no `telas.json` | Resultado de `comparar-visual.mjs` sobre **todas** as telas (o comando roda) + `diff` entre `.md/mockup/tokens.css` e o do app | Alta (tela fora do limite) / Média |

## Workflow

1. Leia o relatório do `saude.py` que o comando entregou.
2. Leia as subseções de fronteiras e de troca de dados do `SDD.md`, o `GUARDRAILS.md` e
   `.claude/CONVENCOES-DE-CODIGO.md`.
3. Percorra os 18 itens do checklist. Para cada candidato do relatório, **confirme
   lendo o código** antes de chamar de achado; descarte o falso positivo com uma
   linha dizendo por quê.
4. Agrupe: achados do mesmo tipo na mesma área viram **um** achado (ex.: "comentários
   com ID de tarefa em `web/worker/`", não um por arquivo).
5. Classifique cada achado pela coluna de severidade (e pela tabela de
   `finding-severity-classification`).
6. Separe o que é `RTP` (ajustar o código para seguir o desenho atual) do que é `BK`
   (o desenho do SDD.md precisa mudar — proposta de ADR). Na dúvida, `BK`.
7. Confira a lista de `RTP` já abertas e não duplique: se uma `RTP` aberta já cobre o
   achado, cite-a.
8. Escreva o relatório (Output abaixo) e devolva a lista de `RTP`/`BK` propostas ao
   comando, que as abre pelo `taskplan.py`.

## Output Esperado

- **Formato**: entrada nova em `.md/ARCH-REVIEW.md` (um arquivo, uma entrada por
  revisão, a mais recente no topo):

  ```markdown
  ## Revisão <AAAA-MM-DD> — <escopo: lote X | pré-deploy | sob demanda>

  Números do saude.py: <arquivos acima do limite> · <blocos duplicados> · <IDs de tarefa no código> · <pastas com acesso a dados> · <imports entre aplicações>

  | # | Achado | Item do checklist | Severidade | Onde | Destino |
  |---|---|---|---|---|---|
  | 1 | <o que está errado, em uma linha> | <nº> | Média | `<arquivo:linha>` | RTP-nnnn / BK-nnnn / já coberto por RTP-nnnn |

  Descartados (falso positivo): <lista curta com o motivo>
  Sem achado nos itens: <nºs>
  ```

- **Para cada `RTP` proposta**: título, chapéu, critério de aceite testável (ex.:
  "nenhum `db.prepare` fora de `armazenamento/`; testes existentes passam"), arquivos e
  o achado de origem — o comando cria a linha e o `.md/.taskplan/RTP-nnnn.md`.
- **Onde salva**: `.md/ARCH-REVIEW.md`.

## Critério de Aceite

- [ ] Os 18 itens do checklist foram percorridos; os sem achado estão listados como tal
- [ ] Todo achado foi confirmado lendo o código, não só pelo número do script
- [ ] Todo achado tem severidade e destino (`RTP`, `BK` ou `RTP` já existente)
- [ ] Nenhuma `RTP` duplicada de uma já aberta
- [ ] Mudança de desenho foi para `BK`, não escondida numa `RTP`
- [ ] Entrada gravada em `.md/ARCH-REVIEW.md`

### MUST DO
- Olhar o projeto inteiro, não só o diff do último lote — dívida antiga também conta.
- Confirmar no código cada candidato do relatório antes de chamá-lo de achado.
- Dar a cada achado um destino; observação sem destino não existe.

### MUST NOT DO
- Corrigir código durante a revisão — esta skill só encontra e encaminha.
- Abrir uma `RTP` por linha quando vários achados são do mesmo tipo na mesma área.
- Reabrir decisão do SDD.md por `RTP` — mudança de desenho é `BK` com proposta de ADR.
