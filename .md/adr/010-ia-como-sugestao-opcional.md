# ADR-010 — IA como sugestão opcional, conferida por regra

- Status: Aceito (implementação condicionada ao prazo: é o primeiro item da ordem de corte)
- Data: 2026-10-07

## Contexto
Alguns pagamentos chegam com referência em texto livre e não casam deterministicamente (RN-09). A IA pode sugerir o pedido, mas não é fonte de verdade, tem créditos limitados e o app precisa funcionar sem ela.

## Alternativas consideradas
1. IA vincula o pagamento automaticamente.
2. IA chamada pela interface pública, sob demanda.
3. IA chamada só no processamento local, atrás de uma porta (`ProvedorSugestao`), com cache, teto de chamadas e conferência por regra (RN-11); resultado publicado à parte.

## Decisão e motivo
Alternativa 3. A regra decide o que é "conferida"; nada entra nos indicadores oficiais. Sem chave ou com teto atingido, o pagamento fica "sem sugestão" e tudo segue. Visitante nunca dispara chamada, porque a nuvem só serve arquivos. Testes usam provedor falso, sem rede.

## Consequências
- Chamada via `fetch` ao endpoint da OpenAI; modelo e teto por variável de ambiente (`OPENAI_MODELO`, `IA_TETO_CHAMADAS`, padrão 20).
- Cache por SHA-256 de texto + candidatos ordenados + modelo, em SQLite.
- A IA só pode escolher entre candidatos enviados; a resposta é validada por esquema.

## O que deliberadamente não foi feito
Vínculo automático, chamada por requisição pública, SDK oficial e ajuste de prompt avançado. Se cortada por prazo, o README registra o porquê e a porta continua documentada.
