# ADR-013 — Processar localmente, publicar no D1 e servir por uma API de leitura no Worker

- Status: Aceito
- Data: 2026-10-07
- Supersede: ADR-007

## Contexto
Histórico: o ADR-007 decidiu publicar as projeções como JSON estáticos (Workers Static Assets, sem script, sem D1) porque o plano era o **gratuito**: 10 ms de CPU por requisição, 100 mil requisições/dia no Worker e 100 mil linhas escritas/dia no D1. Uma republicação do modelo comum (~150 mil linhas) não caberia num dia, e a API ficaria perto das cotas.

O que mudou: em 2026-10-07, ao reabrir o Loop B, o usuário informou que já tem o **Workers Paid** e pediu algo mais robusto: o resultado no D1 e uma API REST somente leitura no Worker. RNF-01 passou a ser "custo adicional zero além do plano pago que o usuário já tem". A ingestão continua proibida na nuvem.

Limites do Workers Paid e do D1 pago, confirmados na documentação oficial do Cloudflare em 2026-10-07:
- Workers: sem limite diário de requisições; 10 milhões de requisições/mês incluídas (excedente US$ 0,30/milhão); 30 milhões de ms de CPU/mês incluídos; CPU por requisição padrão de 30 s (máx. 5 min); 128 MB de memória; 100 mil arquivos de static assets por versão, 25 MiB por arquivo; requisição servida só por asset não é cobrada.
- D1: 10 GB por base; 1.000 consultas por invocação; 25 bilhões de linhas lidas/mês e 50 milhões de linhas escritas/mês incluídas (excedente US$ 0,001/milhão lidas e US$ 1,00/milhão escritas); 5 GB de armazenamento incluídos; instrução SQL até 100 KB; 100 parâmetros por consulta; linha até 2 MB; consulta até 30 s; importação por `d1 execute --file` até 5 GB. Linhas lidas = linhas varridas (por isso as consultas usam índice).

## Alternativas consideradas
1. Manter o ADR-007 (JSON estáticos, sem script).
2. Worker + D1 com a base bruta (~609 mil itens de venda) e agregação por requisição.
3. Processar em Node + SQLite local (como antes) e publicar no D1 **só o resultado**: modelo comum já vinculado (pedidos, vínculos, eventos) e visões de leitura (divergências, achados, indicadores, resumo); um Worker em TypeScript expõe uma API REST somente leitura e serve o site como static assets.

## Decisão e motivo
Alternativa 3.
- Cabe com folga no plano pago: ~150 mil linhas por republicação (~200 mil linhas escritas contando índices) contra 50 milhões/mês incluídas, ou seja, ~250 republicações/mês sem custo extra; base estimada em dezenas de MB contra 10 GB; cada requisição faz 1 ou 2 consultas por índice (limite: 1.000).
- A 2 foi descartada mesmo podendo caber agora: os itens brutos só servem para calcular o valor devido (RN-01), que já sai pronto do processamento; agregar por requisição contraria RNF-07 e não acrescenta nada à avaliação.
- A 1 foi descartada por pedido do usuário: a API dá um contrato explícito (validado, paginado, com erros padronizados e versão), que demonstra System Design melhor do que arquivos *shard*.
- O que não muda: importação, regras e IA continuam no Node local com `node:sqlite`. O event store local é o modelo de escrita; o D1 é uma projeção descartável, reconstruída a cada publicação. O Worker não é um Node completo e não precisa ser: só lê.

## Consequências
- Separação escrita/leitura mantida e mais explícita: escrita = event store local (SQLite); leitura = D1 + Worker.
- A publicação gera um arquivo SQL determinístico (`DROP`/`CREATE`/`INSERT` em lotes ≤ 100 KB por instrução, sem `BEGIN`/`COMMIT`) e o carrega com `wrangler d1 execute --file` (`--local` no desenvolvimento, `--remote` na publicação).
- Busca continua por código exato, agora resolvida pela API (tabela `vinculo_codigo` indexada); o cliente não carrega mais índice.
- Filtro e paginação das divergências passam para a API; "estado em uma data" (RF-06) continua no navegador, com o mesmo domínio puro, sobre os eventos que a API devolve.
- Roda localmente sem conta no Cloudflare (RNF-05): D1 local via `wrangler`/Miniflare.
- Republicar tem uma janela de segundos em que a API pode responder erro (tabelas recriadas); o site trata como erro com "Tentar de novo".
- Custo passa a depender de requisições à API (as do site estático continuam gratuitas). Risco de uso abusivo acima de 10 milhões/mês registrado no SDD §6.
- ADR-008 continua válido: o Worker é o lado de leitura do mesmo serviço, publicado junto com o site, não um serviço independente.
- ADR-010 continua válido: a nuvem não chama a IA; o Worker não tem chave nem binding de IA, e nenhuma rota dispara sugestão.

## O que deliberadamente não foi feito
Importação ou upload na nuvem, endpoints de escrita, autenticação, filas, Durable Objects, réplicas de leitura do D1, cache de borda programado, publicação dos itens brutos de venda e troca "azul/verde" de tabelas na republicação.
