# POC_Lab — CTO-REVIEW

Registro de gates e pareceres do chapéu CTO do Gestor. Cada seção traz data, achados e veredito.

---

## Gate 1 — Pré-descoberta (2026-10-07)

**Insumos:** `.md/PLANO-COMERCIAL.md` (escopo aprovado no Loop 0), `.md/DOCUMENTO-DE-VISAO.md` e a orientação do usuário no `/planejar`.

### Objetivo de negócio

Em uma frase: **dar a um avaliador de processo seletivo de Tech Lead evidência verificável, em um repositório e um link online, de duas competências (análise de dados e construção de app com boas práticas) e de boa tomada de decisão de negócio e de arquitetura.**

O domínio (juntar o que três sistemas sabem sobre um pedido) é o veículo da demonstração. O produto em si é a evidência. Por isso a rastreabilidade das decisões entra como requisito de produto, não como documentação opcional.

### Análise comercial

Não se aplica. Por decisão explícita do usuário (2026-10-07), a POC_Lab não tem venda, preço nem break-even. O `PLANO-COMERCIAL.md` contém o escopo aprovado no Loop 0, e não uma análise comercial. Isso não é falha do Loop 0 e não gera ressalva.

### Alinhamento com roadmap

**Reforça.** A POC_Lab não compete com outra iniciativa, porque o único objetivo dela é o processo seletivo. Os 9 itens aprovados mapeiam diretamente as duas competências:
- análise de dados: itens 1, 3, 5 e 6;
- app com boas práticas: itens 2, 4, 8 e 9;
- o item 7 (IA) serve às duas, mas é opcional.

### Plausibilidade de orçamento/prazo

- **Custo zero:** é plausível. Os limites do plano gratuito do Cloudflare, consultados na documentação oficial em 2026-10-07, são:
  - Workers: 100 mil requisições/dia e 10 ms de CPU por requisição;
  - D1: 500 MB por base, 5 milhões de linhas lidas/dia e 100 mil linhas escritas/dia.

  Esses números são sinais, não bloqueios. A base de vendas tem cerca de 609 mil itens, mais do que o limite diário de escrita. Os 10 ms de CPU também não comportam agregação sobre a base bruta a cada requisição. As duas coisas reforçam a hipótese já registrada no Loop 0 de processar localmente e publicar só o resultado. Quem decide é o Coordenador, no SDD.
- **Prazo:** é desconhecido. Este é o principal risco do gate. Nove itens para uma pessoa só é um volume relevante, então o PRD precisa priorizar com uma ordem de corte explícita. Ela está na Seção 5 do `PRD.md`.
- **IA:** o risco de custo é baixo enquanto valerem estas condições: créditos limitados, cache, teto de chamadas, nenhuma chamada disparada por visitante do link público e funcionamento completo sem chave.

### Gap de roster

Nenhum gap que bloqueie. O roster ativo (gestor, coordenador, executor e validador) cobre o projeto. Não há papel dedicado a dados nem a IA/ML. É aceitável, porque:
- a análise de dados aqui é de regras e indicadores determinísticos, não de modelagem estatística;
- a IA é opcional e usada só como sugestão validada por uma regra.

### Ressalvas

1. **R-G1-01:** o prazo até a entrevista é desconhecido.
   - Dono: usuário.
   - Prazo: informar antes do `/definir`, porque o `TASK.md` precisa dele para decidir se o item 7 (IA) e os itens "Should" entram.
2. **R-G1-02:** risco de over-engineering. O que está sendo avaliado é julgamento. Abstrair demais, ou documentar mais do que construir, seria evidência contra o candidato. Por isso, todo registro de decisão deve trazer também o que foi deliberadamente deixado de fora, inclusive os casos de "quando não abstrair".
3. **R-G1-03:** restrição de nomes. Precisa de confirmação do usuário a interpretação de que a base de origem é citada só como dependência técnica com atribuição de licença. Ver I-01 no `PRD-TECNICO.md`.

### Veredito

**Aprovado com ressalvas.** Os chapéus PM e BA estão liberados.

---

## Gate 1 — Atualização (Loop A, rodada 2, 2026-10-07)

**Insumo:** respostas do usuário às premissas P-01, P-03, P-04 e P-05.

### Situação das ressalvas

| Ressalva | Situação |
|---|---|
| R-G1-01 (prazo desconhecido) | **Resolvida.** O prazo é hoje, 2026-10-07. A meta é entregar tudo o que der hoje. A IA (RF-10) continua Could: só entra se sobrar tempo e é a primeira da ordem de corte |
| R-G1-02 (over-engineering) | **Mantida.** Com o prazo de 1 dia, ficou mais importante |
| R-G1-03 (restrição de nomes) | **Resolvida.** O usuário confirmou I-01: a base é citada só no aviso de licença e aparece como "sistema de vendas" na interface e no domínio |

### Nova ressalva

**R-G1-04: prazo de 1 dia.** O prazo é curto para os itens Must.
- O `TASK.md` deve ordenar as tarefas assim: primeiro todos os Must, prontos, testados e publicados. Depois, enquanto houver tempo, os Should e por último o Could, na ordem do `PRD.md` §5.
- O que não entrar hoje vira registro "fora de propósito" no README, com o motivo.
- Se o usuário quiser, pode pedir o parecer ad hoc `capacity-and-timeline-validation` sobre o `TASK.md`.

### Veredito

**Aprovado com ressalvas (mantido).** A ressalva de prazo desconhecido foi resolvida, mas deu lugar a um prazo conhecido e apertado (R-G1-04). O veredito não sobe para "Aprovado".

---

## Guardrails — Aprovação do GUARDRAILS.md (`/definir` §4, 2026-10-07)

**Insumos:** rascunho do `GUARDRAILS.md` (21 regras, Loop C), `PRD.md`, `PRD-TECNICO.md` (RNF-01 agora "custo adicional zero" com o Workers Paid que o usuário já tem) e este `CTO-REVIEW.md`. Não é parecer técnico sobre SDD/TASK, que o usuário já aprovou.

### Achados

- As 21 regras são verificáveis, têm origem rastreável e nenhuma cita os ADRs substituídos (007, 011, 012).
- R-G1-02 (over-engineering) está coberta por G-17; R-G1-03 por G-11; R-G1-04 (ordem de corte) por G-19.
- **G-11 ajustada:** o texto proibia nome de terceiros nos commits sem a exceção de ferramentas técnicas que o RNF-04 prevê. Incluída a exceção (Cloudflare, Hono, Manrope, JetBrains Mono), conforme decisão do usuário, e a citação da base também na documentação de origem dos dados (I-01).
- **G-22 adicionada:** RNF-01 (custo adicional zero) e RNF-05 (rodar sem conta e sem chave) não tinham regra própria. Os limites do Workers Paid já estão confirmados no SDD §3, então o RNF-01 não deixa pendência.

### Ressalvas

1. **R-GR-01: risco de prazo.** Must ≈ 123 h com caminho crítico ≈ 24 h, contra o prazo de 1 dia (R-G1-04). Por decisão do usuário, o plano segue como está; nenhum corte é proposto. G-19 continua valendo: o que não entrar vira "fora de propósito" no README.

### Veredito

**Aprovado com ressalvas.** O `GUARDRAILS.md` está em vigor, com G-11 alterada e G-22 nova, ambas registradas no Log de Alterações.
