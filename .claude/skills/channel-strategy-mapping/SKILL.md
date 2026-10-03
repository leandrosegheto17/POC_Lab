---
name: channel-strategy-mapping
description: Lista os canais concretos de publicação/distribuição/aquisição (lojas de app, marketplaces, SEO, redes sociais, venda direta, parcerias), elege o canal principal com justificativa e estima o custo de aquisição por canal — a Seção 3 do PLANO-COMERCIAL.md. Use depois de icp-and-market-sizing, antes da análise de concorrentes fechar. Do NOT use for estratégia de deploy/infra (isso é do validador) ou para plano de lançamento de produto (isso é do gestor, no roadmap).
metadata:
  author: dono
  version: '1.0.0'
---

# Channel Strategy Mapping

Você atua como Dono definindo **onde publicar e como o cliente chega**: os canais
pelos quais o ICP descobre, avalia e compra. Um plano sem canal principal
justificado é uma lista de desejos — e o custo de aquisição por canal é insumo
direto da conta de break-even.

## Quando é Acionada

- Depois de `icp-and-market-sizing`, dentro do Loop 0 de `/avaliar_ideia` — o canal é
  derivado de onde o ICP já está, não do gosto do stakeholder.
- Em atualização pontual (`/planejar --tarefa`), quando a demanda abre um canal novo
  (ex.: publicar numa loja de app, marketplace novo).

Do NOT use for:
- Publicação técnica (deploy, hosting, CI/CD) — isso é o `validador` (chapéu
  DevOps).
- Sequência de lançamento/roadmap de releases — isso é o `gestor`.

## Inputs Esperados

- Seções 1-2 do `PLANO-COMERCIAL.md` (obrigatório) — modelo de venda e ICP
  determinam quais canais fazem sentido.
- Pesquisa via `WebSearch`/`WebFetch` (recomendado) — taxas de lojas/marketplaces,
  benchmarks de CAC do segmento. Sem dado, estimativa vira premissa não verificada.

## Core Framework

1. **Inventário de canais.** Para o ICP definido, onde ele já está? Lojas de app
   (App Store/Play Store), marketplaces, busca orgânica (SEO), redes sociais/
   conteúdo, anúncio pago, venda direta/outbound, parcerias/indicação, comunidades.
2. **Canal principal.** Um só, justificado por: presença real do ICP nele, custo de
   entrada e capacidade de operar o canal com os recursos disponíveis. Os demais
   são secundários ou descartados com motivo.
3. **Custo de aquisição (CAC) por canal.** Mesmo grosseiro: taxa da loja/
   marketplace, custo por clique/lead do segmento, custo de tempo em canal
   orgânico. Cada número com fonte ou marcado como premissa.
4. **Fricção do canal.** O que o canal exige para entrar (revisão de loja, comissão,
   volume mínimo, prazo de aprovação) — vira custo ou risco na Seção 7.

## Workflow

1. Liste os canais onde o ICP da Seção 2 comprovadamente está.
2. Avalie cada um (presença do ICP, custo de entrada, capacidade de operar) e eleja
   o principal — registre por que os demais perderam.
3. Estime o CAC por canal relevante, com fonte ou premissa declarada.
4. Registre fricções/taxas de cada canal escolhido.
5. Escreva a Seção 3 do `PLANO-COMERCIAL.md` (Canais de Publicação e Distribuição).

## Output Esperado

- **Formato**: Seção 3 do `PLANO-COMERCIAL.md` — "Canais de Publicação e
  Distribuição" (inventário, canal principal justificado, CAC por canal, fricções).
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] Canais listados são concretos e nomeados (não "redes sociais" genérico —
      qual rede, por quê)
- [ ] Existe UM canal principal com justificativa em três eixos (presença do ICP,
      custo, capacidade de operar)
- [ ] CAC estimado por canal relevante, cada número com fonte ou premissa declarada
- [ ] Taxas e fricções de entrada dos canais escolhidos registradas

### MUST DO
- Alimentar o CAC do canal principal na conta de `break-even-modeling` — os dois
  números têm que bater.
- Registrar como premissa (Seção 7) toda suposição de presença do ICP num canal
  sem evidência.

### MUST NOT DO
- Escolher canal por familiaridade do stakeholder ("vamos de Instagram porque eu
  uso") sem confrontar com onde o ICP está.
- Listar cinco canais "principais" — sem foco não há conta de aquisição que feche.
