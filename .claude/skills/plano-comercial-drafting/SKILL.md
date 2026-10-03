---
name: plano-comercial-drafting
description: Monta o PLANO-COMERCIAL.md completo nas 7 seções fixas a partir do que as demais skills do Dono produziram, garantindo consistência cruzada (preço = âncora de concorrente, CAC da Seção 3 = CAC do break-even, premissas da Seção 5 espelhadas na 7) e o veredito comercial explícito no topo. Use como passo final de cada rodada do Loop 0, antes de apresentar ao usuário. Do NOT use for produzir o conteúdo de uma seção (cada uma tem sua skill) ou para o PRD.md (isso é prd-drafting, do gestor).
metadata:
  author: dono
  version: '1.0.0'
---

# Plano Comercial Drafting

Você atua como Dono consolidando o `PLANO-COMERCIAL.md` completo — o artefato que
o Gestor consome no Gate 1. As skills anteriores produzem as seções; esta garante
que o documento é um só plano coerente, não sete análises coladas, e que o
veredito comercial está dito com todas as letras logo no topo.

## Quando é Acionada

- Passo final de **cada rodada** do Loop 0 de `/avaliar_ideia` (o artefato é escrito a
  cada rodada, não só na aprovação — PLANNING-FLOW.md), depois que as skills de
  seção rodaram ou foram atualizadas.
- Em atualização pontual (`/planejar --tarefa`), depois que as seções tocadas pela
  demanda foram revisadas.

Do NOT use for:
- Produzir o conteúdo de uma seção — cada uma tem skill própria
  (`value-proposition-and-pricing`, `icp-and-market-sizing`,
  `channel-strategy-mapping`, `competitor-landscape-analysis`,
  `viability-hypothesis-scoring`, `break-even-modeling`,
  `commercial-assumption-logging`).
- Documento de produto — `prd-drafting` é do `gestor`.

## Estrutura Fixa do Documento

```markdown
# PLANO-COMERCIAL.md
> Veredito: [A conta fecha / A conta NÃO fecha / Fecha condicionado a <premissa>]
> — <uma frase de leitura honesta> | Última rodada: AAAA-MM-DD

## 1. Proposta de Valor e Modelo de Venda
## 2. Público-Alvo Comercial
## 3. Canais de Publicação e Distribuição
## 4. Concorrentes e Diferenciação
## 5. Hipótese de Viabilidade
## 6. Break-even
## 7. Premissas e Riscos Comerciais em Aberto
```

## Checklist de Consistência Cruzada

Antes de salvar, verifique — e corrija na skill de origem, não remendando aqui:

1. O preço da Seção 1 usa âncora compatível com os preços pesquisados na Seção 4
   (ou a divergência está justificada por escrito).
2. A disposição a pagar da Seção 2 não contradiz o preço da Seção 1 sem nota.
3. O CAC da Seção 3 é o mesmo usado na conta da Seção 6.
4. O número de vendas do break-even (Seção 6) é plausível frente ao SOM (Seção 2)
   — ou a implausibilidade está refletida no veredito.
5. As premissas críticas da Seção 5 estão espelhadas na Seção 7.
6. O veredito do topo bate com o veredito da Seção 6 e a leitura da Seção 5.

## Workflow

1. Reúna as seções produzidas/atualizadas pelas skills na rodada.
2. Rode o checklist de consistência cruzada; divergência volta para a skill de
   origem antes de consolidar.
3. Escreva/atualize o veredito do topo — nunca omita, nunca suavize.
4. Salve `.md/PLANO-COMERCIAL.md` completo.
5. Prepare o resumo objetivo da rodada para o usuário (modelo de venda e preço,
   ICP, canal principal, concorrentes mapeados, percentual com premissas, número
   do break-even, veredito) — o comando `/planejar` apresenta isso, não o
   documento inteiro.

## Output Esperado

- **Formato**: `PLANO-COMERCIAL.md` completo, 7 seções fixas + veredito no topo.
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] As 7 seções presentes na ordem fixa, sem seção vazia silenciosa (seção sem
      conteúdo declara o porquê e o que falta)
- [ ] Checklist de consistência cruzada passou (ou as pendências estão listadas no
      resumo da rodada)
- [ ] Veredito explícito no topo, coerente com as Seções 5 e 6
- [ ] Checklist "Critérios de Pronto" do `dono.md` verificado antes de apresentar

### MUST DO
- Reescrever o arquivo a cada rodada do loop, não só na aprovação final.
- Corrigir inconsistência na skill/seção de origem — nunca remendar o número só no
  consolidado.

### MUST NOT DO
- Consolidar com veredito omitido ou eufemizado ("desafiador" no lugar de "a conta
  não fecha").
- Reordenar ou renomear as seções — o Gestor consome a estrutura fixa.
