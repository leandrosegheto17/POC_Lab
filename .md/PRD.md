# POC_Lab — PRD

> Status: aprovado pelo usuário (Loop A fechado na rodada 2, 2026-10-07). Prazo: hoje, 2026-10-07. A meta é entregar hoje tudo o que der, na ordem da Seção 5. Gate 1: Aprovado com ressalvas (ver `CTO-REVIEW.md`).

## 1. Problema e Contexto

**Problema do domínio (o que o app resolve).** Três sistemas sabem coisas diferentes sobre o mesmo pedido: vendas, pagamentos e transportadora. Eles não conversam entre si e cada um usa os próprios códigos. Hoje, para saber o estado real de um pedido, é preciso:
- consultar as 3 fontes;
- casar os códigos manualmente;
- decidir sozinho se há problema, como pago duas vezes, pago e não enviado ou entregue atrasado.

Isso é verificável: sem o app, a resposta para "em quantos sistemas eu precisaria olhar?" é sempre 3, e ninguém tem uma lista consolidada de divergências.

**Problema do avaliador (por que a POC existe).** O avaliador do processo seletivo de Tech Lead tem pouco tempo para julgar se o candidato decide bem, tanto em negócio quanto em arquitetura, e se escreve código limpo com bom desenho de sistema. Decisões que não estão registradas não podem ser avaliadas. Funcionalidade sem a justificativa ao lado não mostra julgamento.

## 2. Público-Alvo

- **Primário: avaliador técnico do processo seletivo de Tech Lead.** Ele lê o README, os registros de decisão e o código, roda os testes e abre o link publicado. É o "usuário" do repositório.
- **Secundário (persona do domínio, fictícia): analista de conciliação de pedidos.** Precisa saber, para um pedido, o que aconteceu de fato e quais pedidos têm problema. As telas são desenhadas para ele.
- **Fora do público:** clientes finais, operação real e qualquer usuário que precise de autenticação ou escrita.

## 3. Objetivo de Sucesso

Baseline: o repositório está vazio, então todas as métricas partem de 0.

| # | Métrica | Meta |
|---|---|---|
| M1 | Divergências plantadas detectadas, comparadas com o gabarito gerado junto com os dados | 100% detectadas, 0 falsos positivos sobre os pedidos do gabarito |
| M2 | Fontes consultadas pelo usuário para ver a história completa de um pedido | 1 tela, contra 3 sistemas hoje. A tela indica em quantas fontes o pedido aparece |
| M3 | Decisões relevantes registradas com contexto, alternativas, motivo e o que ficou de fora (lista mínima no `PRD-TECNICO.md`, RF-12) | 100% da lista mínima, cada uma a no máximo 2 cliques do README |
| M4 | As validações do Loop 0 cobertas por teste automatizado verde no CI | 3/3 nas validações dos itens Must: idempotência, ordenação e parcial/duplicado. Auditoria e contrato contam só se os itens Should entrarem |
| M5 | Link público online, com fatura zero, funcionando sem chave de IA | No ar no dia da entrevista, custo R$ 0 |
| M6 | Avaliador roda localmente a partir do README | No máximo 3 comandos, sem conta no Cloudflare e sem chave de IA |
O resultado final (ser aprovado no processo) não é mensurável pelo produto. M1 a M6 são os indicadores que o produto controla.

## 4. Escopo desta Release

**Dentro.** Os 9 itens do Documento de Visão, priorizados na Seção 5. A IA (item 7) é Could: só entra se sobrar tempo hoje.

**Fora, de propósito:**

| Corte | Por quê |
|---|---|
| Microsserviços e mensageria | Um único serviço resolve. Distribuir só adicionaria custo operacional sem ganho na pergunta que o app responde |
| Autenticação | Os dados são fictícios e o acesso é só de leitura. Login não mostra nenhuma competência avaliada aqui |
| Front elaborado | O avaliado é o desenho do sistema e os dados, não o visual. Telas simples e legíveis bastam |
| Tempo real | As fontes chegam em lote (arquivos). Streaming seria uma solução para um problema que não existe |
| Abstração genérica para "qualquer fonte" | São 3 fontes conhecidas, com um adaptador pequeno para cada uma. Generalizar antes de existir a 4ª fonte é o exemplo de "quando não abstrair" |
| NestJS, Postgres, VM | Não são necessários para um único serviço com SQLite e conflitam com o custo zero |
| Escrita ou correção de dados pela interface | O estado é derivado de eventos imutáveis. Correção é uma nova importação |
| IA tomando decisão sozinha | A IA só sugere. Uma regra confere e nada é aplicado automaticamente |

## 5. Requisitos de Alto Nível Priorizados (MoSCoW)

| Prior. | Requisito | Item | Justificativa |
|---|---|---|---|
| Must | Fontes de origem com problemas plantados e gabarito | 1 | Sem os dados não há demonstração. O gabarito torna M1 objetiva |
| Must | Importação idempotente para o modelo comum | 2 | Concentra modelagem de domínio e idempotência, núcleo de "boas práticas" |
| Must | Lista de divergências com motivo | 5 | Responde à pergunta do app e é o núcleo da reconciliação |
| Must | Linha do tempo do pedido, ordenada pelo momento do fato | 4 | Mostra eventos e ordenação, e materializa o "1 tela contra 3 sistemas" |
| Must | Relatório de qualidade dos dados | 3 | Barato e central para a competência de análise de dados |
| Must | Indicadores essenciais: entregas no prazo por transportadora e mês, divergências por tipo | 6 (parte) | É o mínimo de "indicadores" para a competência de dados |
| Must | Testes, CI, README e registros de decisão | 9 | É o que o avaliador lê primeiro (M3, M4, M6) |
| Must | Publicação somente leitura no Cloudflare | 8 | É o link para a entrevista (M5) |
| Should | Indicadores complementares: tempo médio pedido-envio-entrega, valor pago contra devido | 6 (parte) | Enriquece a análise, mas o Must já demonstra a competência |
| Should | Estado do pedido em uma data (auditoria) | validação do Loop 0 | Prova que o estado é derivado de eventos. Custo baixo, depois que a linha do tempo existe |
| Should | Contrato de evento versionado, com v1 e v2 convivendo | validação do Loop 0 | Boa evidência de desenho, mas pode ser explicado no registro de decisão se for cortado |
| Could | IA para pagamentos sem identificação clara | 7 | É opcional por definição. O app precisa funcionar completo sem ela |
| Won't | Tudo o que está na tabela "Fora" da Seção 4 | — | — |

**Prazo: hoje (2026-10-07).** A implementação vai até onde der, nesta ordem:
1. todos os itens Must, prontos, testados e publicados;
2. indicadores complementares (Should);
3. auditoria em data (Should);
4. contrato v2 (Should);
5. IA (Could).

**Ordem de corte**, que é a mesma lista ao contrário: IA → contrato v2 → auditoria em data → indicadores complementares. Os itens Must não são cortados. O que não entrar hoje vira uma entrada "deixado de fora de propósito" no README, com o motivo. Isso também é evidência de decisão.

## 6. Premissas e Riscos de Produto

| ID | Premissa / Risco | Dono | Prazo de validação |
|---|---|---|---|
| P-01 | Prazo até a entrevista. **Resolvida:** o prazo é hoje, 2026-10-07. A IA continua Could e só entra se sobrar tempo | Usuário | Respondida na rodada 2 |
| P-02 | A base de vendas de exemplo pode ser usada e redistribuída | Gestor (BA) | Resolvida no `PRD-TECNICO.md` §6 |
| P-03 | O avaliador valoriza decisão rastreável mais do que quantidade de funcionalidades. **Confirmada** | Usuário | Respondida na rodada 2 |
| P-04 | O repositório será público. **Validada** | Usuário | Respondida na rodada 2 |
| P-05 | A base é citada só no aviso de licença; na interface e no domínio ela é "sistema de vendas". **Confirmada** | Usuário | Respondida na rodada 2 |
| R-05 | Prazo de 1 dia. Mitigação: Must antes de qualquer Should ou Could, publicar cedo, seguir a ordem da Seção 5 e registrar cada corte | Coordenador | No `TASK.md` |
| R-01 | Over-engineering, ou documentação maior que o produto, passa a impressão de mau julgamento. Mitigação: registros de decisão curtos, sempre com o que ficou de fora | Coordenador | No SDD e no TASK |
| R-02 | Dados sintéticos com aparência "viciada" ou regras escritas para passar no gabarito. Mitigação: geração determinística com semente, proporções documentadas e o gabarito nunca é lido pelo app | Coordenador | No SDD |
| R-03 | Link fora do ar ou limite diário estourado no dia da entrevista. Mitigação: execução local documentada (M6) | Coordenador | No SDD |
| R-04 | Créditos de IA acabarem durante a demonstração. Mitigação: cache, teto de chamadas, nenhuma chamada por visitante e funcionamento sem chave | Coordenador | No SDD, se a IA entrar |

## 7. Perguntas em Aberto para o Business Analyst

Respondidas no `PRD-TECNICO.md` §7:
1. O que é "no prazo": data de envio ou de entrega, e contra qual data limite?
2. Como distinguir pagamento duplicado de pagamento em parcelas e de registro repetido?
3. Como os eventos são ordenados quando dois têm o mesmo momento do fato?
4. O que é "valor fora do padrão"?
5. Qual é a data de corte para "pago e não enviado" numa base histórica?
6. A busca da linha do tempo aceita o código de qual sistema?
7. Quais decisões formam a lista mínima de registros (M3)?
