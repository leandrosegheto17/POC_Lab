# ADR-007 — Processar localmente, publicar projeções estáticas

- Status: Superseded by ADR-013
- Data: 2026-10-07

## Contexto
Custo zero no Cloudflare. Plano gratuito (documentação oficial, 2026-10-07): Workers com 100 mil requisições/dia e 10 ms de CPU por requisição; D1 com 100 mil linhas escritas/dia; static assets com requisições gratuitas e ilimitadas, até 20 mil arquivos e 25 MiB por arquivo. A base de vendas tem ~609 mil itens. Preferência do autor: SQLite + Node.

## Alternativas consideradas
1. Worker + D1 com a base bruta, agregando por requisição.
2. Worker + D1 só com o resultado (projeções em tabelas), Worker como API.
3. Processar em Node + SQLite local e publicar as projeções como JSON estáticos (Workers Static Assets, sem script).

## Decisão e motivo
Alternativa 3.
- A 1 estoura escrita diária (~609 mil > 100 mil) e a CPU de 10 ms.
- A 2 cabe, mas fica perto do limite de escrita a cada republicação (~80 mil eventos de linha do tempo) e põe código executando por requisição sem necessidade.
- A 3 tem 0 ms de CPU por requisição, nenhum limite diário relevante, o link não cai por cota e a mesma saída roda localmente sem conta (RNF-05). O Workers não é um Node completo, então o Node e o SQLite ficam onde fazem sentido: no processamento.

## Consequências
- Separação escrita/leitura: o event store é local; o que publica é uma visão materializada.
- Busca só por código exato (índice estático em *shards*); filtros e "estado em uma data" rodam no navegador com o mesmo domínio puro.
- Atualizar o site = reprocessar e republicar.

## O que deliberadamente não foi feito
API HTTP, D1, busca textual livre e qualquer cálculo por requisição na nuvem.
