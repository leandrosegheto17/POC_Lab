---
name: icp-and-market-sizing
description: Nomeia o público-alvo comercial (ICP) especificamente, estima o tamanho do mercado alcançável (TAM/SAM/SOM simplificado) e a disposição a pagar do segmento — a Seção 2 do PLANO-COMERCIAL.md. Use logo após value-proposition-and-pricing, antes de mapear canais. Do NOT use for definir persona de produto/UX (isso é do gestor/coordenador) ou para escolher canal de aquisição (use channel-strategy-mapping).
metadata:
  author: dono
  version: '1.0.0'
---

# ICP and Market Sizing

Você atua como Dono definindo **pra quem vender**: o perfil de cliente ideal (ICP)
em termos comerciais — quem tem a dor, quem paga, quantos são e quanto topam
pagar. "Todo mundo" não é público-alvo: um mercado que não se consegue nomear é
um mercado que não se consegue alcançar.

## Quando é Acionada

- Logo após `value-proposition-and-pricing`, dentro do Loop 0 de `/avaliar_ideia` — o
  ICP refina (ou derruba) a hipótese de preço recém-formulada.
- Em atualização pontual (`/planejar_tarefa`), quando a demanda mira um público
  novo ou muda o segmento atendido.

Do NOT use for:
- Persona de produto/UX (comportamento de uso, jornada de tela) — isso é jusante,
  do `gestor` (PRD.md) e do `coordenador` (UX-SPEC.md).
- Custo de aquisição por canal — isso é `channel-strategy-mapping`.

## Inputs Esperados

- Seção 1 do `PLANO-COMERCIAL.md` (obrigatório) — a proposta de valor diz qual dor
  o ICP precisa ter.
- Pesquisa via `WebSearch`/`WebFetch` (recomendado) — número de empresas/pessoas do
  segmento, dados públicos de mercado. Sem dado disponível, a estimativa é marcada
  como premissa não verificada.

## Core Framework

1. **ICP nomeado.** Segmento + característica qualificadora + contexto de compra.
   Ex.: "dentistas autônomos com consultório próprio no Brasil que hoje agendam por
   WhatsApp" — não "profissionais de saúde".
2. **Quem sente a dor vs. quem paga.** Nem sempre é a mesma pessoa (B2B: usuário vs.
   comprador). Se divergem, nomeie os dois.
3. **Tamanho do mercado, funil simplificado:**
   - **TAM**: todos que têm a dor (número + fonte).
   - **SAM**: os que o modelo de venda/canal consegue alcançar.
   - **SOM**: fatia realista nos primeiros 1-2 anos (com a premissa que a sustenta).
4. **Disposição a pagar.** O que esse segmento já paga hoje por alternativas
   (concorrente, planilha, funcionário, tempo próprio)? Isso valida ou derruba o
   preço da Seção 1.

## Workflow

1. Derive da proposta de valor o segmento que sente a dor; qualifique-o até virar
   um ICP nomeado.
2. Pesquise o tamanho do segmento (WebSearch) — registre número e fonte, ou marque
   como premissa não verificada.
3. Estime TAM → SAM → SOM, cada corte com a premissa explícita.
4. Levante a disposição a pagar; se contradisser o preço da Seção 1, sinalize a
   revisão (não reescreva a Seção 1 em silêncio).
5. Escreva a Seção 2 do `PLANO-COMERCIAL.md` (Público-Alvo Comercial).

## Output Esperado

- **Formato**: Seção 2 do `PLANO-COMERCIAL.md` — "Público-Alvo Comercial" (ICP
  nomeado, quem paga, TAM/SAM/SOM com fontes/premissas, disposição a pagar).
- **Onde salva**: `.md/PLANO-COMERCIAL.md`.

## Critério de Aceite

- [ ] ICP é um segmento nomeado com qualificador — não "todo mundo" nem categoria
      genérica
- [ ] Quem sente a dor e quem paga estão identificados (e distinguidos, se B2B)
- [ ] TAM/SAM/SOM estimados, cada número com fonte ou marcado como premissa não
      verificada
- [ ] Disposição a pagar levantada e confrontada com o preço da Seção 1

### MUST DO
- Sinalizar explicitamente quando a disposição a pagar contradiz o preço da
  Seção 1 — a revisão do preço é decisão registrada, não ajuste silencioso.
- Registrar toda estimativa sem fonte como premissa em aberto (Seção 7, via
  `commercial-assumption-logging`).

### MUST NOT DO
- Aceitar "todo mundo que usa celular" ou equivalente como ICP.
- Inflar o SOM sem premissa que o sustente — número otimista sem premissa é o
  primeiro lugar onde o plano quebra.
