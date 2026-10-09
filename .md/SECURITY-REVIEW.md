# SECURITY-REVIEW

## TP-0001 — DevSecOps — 2026-10-08
OK; 0 críticos, 1 não crítico (RTP-0034: `.gitignore` sem `.env.*` e `.dev.vars`); G-01 conferido com git check-ignore, `.env.example` sem valor, sem segredo.

## TP-0004 — DevSecOps — 2026-10-08
OK — integridade por SHA-256 ponta a ponta, escrita atômica, sem segredos, 0 críticos / 0 não críticos.

## TP-0005 — DevSecOps — 2026-10-08
TP-0005 APROVADA em segurança (G-16/G-01/ADR-015 atendidos, cache preso ao SHA-256 com hash revalidado; 0 críticos, 1 não crítico: checkout sem persist-credentials false, RTP-0035).

## TP-0006 — DevSecOps — 2026-10-08
OK — tipos puros, sem import proibido, sem I/O, sem dependência/segredo/dado pessoal; 0 críticos e 0 não críticos.

## TP-0007 — DevSecOps — 2026-10-08
OK; 0 críticos, 0 não críticos; função pura sem I/O, sem dependência nova, determinística (sem Date/random/localeCompare).

## TP-0008 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; função pura sem imports, I/O, log, segredo ou dependência nova (G-02/G-17 ok).

## TP-0009 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 novos não críticos (fronteira 0,01 já em RTP-0019); função pura sem dependência nova, sem node:*, sem I/O.

## TP-0010 — DevSecOps — 2026-10-08
APROVADA em segurança, 0 críticos e 0 não críticos; evidência: revisão de referencia.ts (sem imports, regex sem ReDoS, sem PII, falha segura).

## TP-0011 — DevSecOps — 2026-10-08
APROVADA — função pura sem I/O nem dependência (G-02/G-17 ok); 0 críticos, 1 não crítico (NaN/Infinity passam como válidos, RTP-0036).

## TP-0012 — DevSecOps — 2026-10-08
APROVADA — função pura sem node:*/zod/I/O/logs/segredos, imports só de dominio/ (G-02), 0 achados críticos e 0 não críticos.

## TP-0013 — DevSecOps — 2026-10-08
OK — função pura, imports restritos a dominio/ (G-02), sem log/segredo/dependência nova/dado pessoal; 0 críticos, 0 não críticos.

## TP-0014 — DevSecOps — 2026-10-08
APROVADA — função de domínio pura, imports restritos a dominio/, sem I/O/segredos/gabarito/dependência nova, 0 achados críticos / 0 não críticos.

## TP-0015 — DevSecOps — 2026-10-08
APROVADA — função pura, G-02/G-04 ok, sem segredos/logs/dado pessoal; 0 críticos, 0 não críticos.

## TP-0016 — DevSecOps — 2026-10-08
OK — função pura sem I/O/dependências/segredos/gabarito, sem dado pessoal; 0 críticos / 0 não críticos.

## TP-0017 — DevSecOps — 2026-10-08
APROVADA em segurança — função pura, sem I/O/segredos/logs/deps novas, G-02 e G-04 ok; 0 críticos, 0 não críticos.

## TP-0018 — DevSecOps — 2026-10-08
OK — SQL parametrizado, sem UPDATE/DELETE, sem dependência nova, sem segredo/log/dado pessoal; 0 achados.

## TP-0019 — DevSecOps — 2026-10-08
OK — leitura somente leitura (readOnly), SELECT estatico, sem segredo/dependencia nova/dado pessoal; 0 criticos, 0 nao criticos.

## TP-0020 — DevSecOps — 2026-10-08
APROVADA em segurança; G-11/RNF-04 cumpridos (só Transportadora N), dominio puro, 0 achados.

## TP-0021 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 1 não crítico (S1: erro de sintaxe CSV aborta a importação em vez de `linha_invalida`); csv-parse permitido no SDD §3, sem log nem gravação; RTP-0020.

## TP-0022 — DevSecOps — 2026-10-08
APROVADA, 0 críticos / 1 não crítico (exceção do csv-parse em linha com colunas divergentes aborta importação; já coberto por RTP-0026); sem dado pessoal, sem superfície externa.

## TP-0023 — DevSecOps — 2026-10-08
APROVADA em segurança — 0 críticos, 0 não críticos; PRNG próprio, sem dependências novas, sem Math.random/Date.now, saída em pasta ignorada pelo git, gabarito só escrito.

## TP-0024 — DevSecOps — 2026-10-08
OK em segurança; 0 críticos, 1 não crítico (transportadora com código cru, coberto por RTP-0008); sem nome real, sem Math.random/Date.now, sem dependência nova.

## TP-0025 — DevSecOps — 2026-10-08
APROVADA em segurança, 0 críticos/0 não críticos; gabarito só escrito, domínio intocado, sem Math.random/Date.now e sem dependência nova.

## TP-0026 — DevSecOps — 2026-10-08
OK — função pura sem I/O/dependência/aleatoriedade, gabarito.json nunca lido fora de test/, domínio intacto (ADR-009); 0 críticos, 0 não críticos.

## TP-0027 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; só INSERT ON CONFLICT, SQL parametrizado, transação com rollback, sem dependência nova nem dado bruto novo.

## TP-0028 — DevSecOps — 2026-10-08
OK em segurança — função pura sem I/O, gabarito lido só no teste (em memória, RN-13/G-04), banco :memory:, sem dado pessoal; 0 críticos, 0 não críticos novos (RTP-0030 já cobre o erro do worker).

## TP-0029 — DevSecOps — 2026-10-08
APROVADA em segurança, 0 críticos e 0 não críticos; `.strict()`, limites de paginação, alfabeto fechado do código, erro sem vazamento e zod 4 conferidos.

## TP-0030 — DevSecOps — 2026-10-08
APROVADA em segurança; esquemas v1 sem passthrough/strict (G-08/G-21 ok), enums fechados, sem segredo, dado pessoal ou nome de transportadora; 0 críticos, 0 não críticos.

## TP-0031 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 achados de segurança novos (só RTP-0016 de tipagem de teste já aberta); esquemas sem passthrough, enums e limites fechados, sugestoes validada no site (TP-0085).

## TP-0033 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; função pura (G-02), sem dependência nova, segredo, log, gabarito (G-04) nem nome de transportadora fixo (G-11).

## TP-0034 — DevSecOps — 2026-10-08
APROVADA — domínio puro sem I/O, imports só de dominio/ (G-02), sem segredos/logs/dado pessoal, sem gabarito (G-04) e sem dependência nova; 0 achados.

## TP-0035 — DevSecOps — 2026-10-08
APROVADA em segurança — só SELECT, sem nomes da base, erro de colisão sem dado sensível, sem dependência/segredo; 0 críticos, 0 não críticos.

## TP-0036 — DevSecOps — 2026-10-08
APROVADA — leitura somente, SQL fixo, sem gabarito/log/segredo/dependência nova; 0 críticos, 0 não críticos (transportadora crua na origem já coberta pela RTP-0008).

## TP-0037 — DevSecOps — 2026-10-08
APROVADA; 0 achados de seguranca (sem injecao, sem dado pessoal, G-04/G-11 ok); RTP-0024 do QA segue valida.

## TP-0038 — DevSecOps — 2026-10-08
APROVADA em segurança — 0 críticos, 0 novos não críticos; detalhe de formato_data/pedido_sem_envio sem nome de cliente/transportadora (G-11), SQL parametrizado, gabarito não lido; pendências de teste já em RTP-0030/RTP-0031.

## TP-0039 — DevSecOps — 2026-10-08
APROVADA, 0 críticos / 0 não críticos de segurança (só node:crypto nativo, sem rede/segredo/log; teste de dataCorte já na RTP-0032).

## TP-0040 — DevSecOps — 2026-10-08
APROVADA — escape de aspas sempre aplicado, tabela/colunas fixas (sem injeção), sem BEGIN/COMMIT, sem I/O/segredo/dado pessoal; 0 críticos, 1 não crítico (NaN/Infinity/objeto viram SQL inválido, RTP-0037).

## TP-0041 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos novos (RTP-0010 já cobre o typecheck); wrangler.jsonc sem segredo, dependências dentro da lista G-17, sem CORS, sem node:*/import de src no Worker.

## TP-0042 — DevSecOps — 2026-10-08
APROVADA - erros RFC 9457 genéricos sem vazamento de exceção/SQL, cabeçalhos G-13 em toda resposta (inclusive erros), sem CORS; 0 críticos, 0 não críticos.

## TP-0043 — DevSecOps — 2026-10-08
APROVADA — isolamento em web/test confirmado, sem segredo/dado pessoal/dependência nova; 0 críticos, 0 não críticos.

## TP-0044 — DevSecOps — 2026-10-08
APROVADA, 0 críticos e 1 não crítico (baixa: shell:true no spawn do wrangler com caminho sem aspas, RTP-0038); só --local, sem env/segredo, leitura apenas no event store.

## TP-0045 — DevSecOps — 2026-10-08
OK em segurança — 0 críticos, 1 não crítico (mensagem desatualizada, RTP-0027); chave de IA nunca logada, sem dependência nova nem superfície nova.

## TP-0046 — DevSecOps — 2026-10-08
APROVADA — consulta parametrizada com chave fixa, erros sem detalhe ao cliente, sem dado pessoal/segredo; 0 críticos, 0 não críticos.

## TP-0047 — DevSecOps — 2026-10-08
OK em segurança — G-08 cumprido (bind em todas as consultas), entrada validada por zod strict com limites, erros sem vazamento; 0 críticos, 0 não críticos.

## TP-0048 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 1 não crítico (teste de % e ; já coberto por RTP-0014); consultas todas com bind, regex fecha o alfabeto, 404/500 genéricos, G-21 garantido por parse v1.

## TP-0049 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos novos (chave literal, bind parametrizado, 500 sem detalhe via onError; lacuna de teste já em RTP-0022).

## TP-0050 — DevSecOps — 2026-10-08
TP-0050 segurança APROVADA — chave literal, D1 parametrizado, erro 500 genérico, saída validada por esquema; 0 críticos, 0 não críticos novos (teste de Cache-Control/HEAD já em RTP-0025).

## TP-0051 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; fontes 100% locais (sem URL externa, compatível com CSP 'self'), OFL presente, sem dependência nova.

## TP-0052 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 1 não crítico (RTP-0012 existente); só `codigo` sai do cliente, timer/listener limpos, sem dependência nem log.

## TP-0054 — DevSecOps — 2026-10-08
APROVADA — 0 críticos/0 não críticos; G-12 ok, componentes apresentacionais sem HTML bruto, rede, log ou segredo.

## TP-0055 — DevSecOps — 2026-10-08
OK — casca sem superfície de risco (sem dep nova, sem innerHTML, rel noopener ok, sem segredo/log); 0 críticos, 1 não crítico já coberto pela RTP-0003 (URL placeholder do repositório).

## TP-0056 — DevSecOps — 2026-10-08
APROVADA; 0 críticos/0 não críticos; JSX puro, resposta validada por esquema, erro sem vazamento, sem segredo/dependência nova.

## TP-0057 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos; só JSX, encodeURIComponent, sem API/segredo/dependência/persistência.

## TP-0058 — DevSecOps — 2026-10-08
APROVADA em seguranca - componentes puros sem HTML cru, rede, log, segredo ou dependencia nova; 0 criticos, 0 nao criticos.

## TP-0059 — DevSecOps — 2026-10-08
OK — sem innerHTML, entradas da URL validadas, erros só com texto fixo, sem dado pessoal; 0 críticos e 0 não críticos.

## TP-0060 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos novos (pagina validada por regex + URLSearchParams + zod, sem exposição de erro técnico; a11y já na RTP-0015).

## TP-0061 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos; sem sinks de HTML, sem log/segredo/rede, texto da API só via JSX (G-12).

## TP-0062 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; codigo com encodeURIComponent, render só por JSX, 404/400 com texto fixo sem detalhe técnico, sem dado pessoal.

## TP-0063 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 1 não crítico (link de tipo sem validação contra enumeração, sem risco de injeção; RTP-0017); G-12 ok, sem dado pessoal.

## TP-0064 — DevSecOps — 2026-10-08
APROVADA em segurança — 0 críticos, 0 não críticos; textos da API só via JSX (G-12), links com encodeURIComponent, sem dependência nova.

## TP-0065 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; sem segredo/binding novo, nenhum deploy no CI, `_headers` e cabeçalhos do link publicado conferem, erros RFC 9457 sem vazamento.

## TP-0067 — DevSecOps — 2026-10-08
OK, 0 críticos e 0 não críticos; G-11 e G-01 preservados, sem segredo nem payload de injeção nos exemplos, licenças MIT/OFL presentes; sem RTP.

## TP-0068 — DevSecOps — 2026-10-08
APROVADA — função pura sem I/O/segredo/log/dependência nova, sem dado pessoal; 0 achados.

## TP-0069 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; função pura sem I/O/log/dependência, RN-11 respeitada, sem dado pessoal.

## TP-0070 — DevSecOps — 2026-10-08
APROVADA em segurança — 0 críticos/0 não críticos; blocos novos só agregam valores/datas, sem dado sensível, rota, dependência ou log novo.

## TP-0071 — DevSecOps — 2026-10-08
APROVADA — renderização só por JSX (sem HTML injetado, fetch direto, log ou dependência nova), dados agregados sem dado pessoal; 0 críticos, 0 não críticos.

## TP-0072 — DevSecOps — 2026-10-08
OK — componente de UI sem I/O, sem dependência nova, sem sink perigoso nem dado sensível; 0 críticos, 0 não críticos.

## TP-0073 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos novos; sem nova superfície de rede, sem injeção/XSS, sem dependência nova.

## TP-0074 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos; tipo puro aditivo, G-02/G-15/G-17 respeitados, sem dado pessoal.

## TP-0075 — DevSecOps — 2026-10-08
OK — 0 críticos, 0 não críticos; PRNG determinístico (G-10), campo aditivo sem influência em RN-09/RN-10/vínculo (G-04, ADR-006), gravação parametrizada, sem dependência nova.

## TP-0076 — DevSecOps — 2026-10-08
OK; 0 críticos, 0 não críticos; v1 intocada (G-21), sem passthrough, sem segredo/dependência nova.

## TP-0077 — DevSecOps — 2026-10-08
APROVADA - rota v2 reusa consultas parametrizadas, entrada validada, esquema remove campos extras e só uma rota existe em /api/v2; 0 críticos, 0 não críticos.

## TP-0078 — DevSecOps — 2026-10-08
TP-0078 segurança APROVADA; 0 críticos, 0 não críticos; teste compara v1 por igualdade profunda + esquema, README só com dado sintético, sem segredo/dependência/dado pessoal.

## TP-0079 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; cache_ia aditiva, SQL parametrizado, sem UPDATE/DELETE, sem segredo/dado pessoal.

## TP-0080 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 1 não crítico (RTP-0009 existente); função pura, falha fechada, sem superfície de segurança.

## TP-0081 — DevSecOps — 2026-10-08
APROVADA em segurança — dados mínimos à IA, saída validada contra candidatos e RN-11, sem segredo, rede ou escrita de vínculo; 0 críticos, 0 não críticos.

## TP-0082 — DevSecOps — 2026-10-08
OK; 0 críticos, 1 não crítico (sem timeout no fetch, RTP-0021); chave só de env, URL fixa (sem SSRF), texto como dado e saída restrita a `candidatos.includes`.

## TP-0083 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 1 não crítico (mensagem desatualizada/ordem sem teste, coberto por RTP-0027); evidência: chave só em process.env, nunca logada/gravada, sem chave nada é escrito, sem uso em web/CI.

## TP-0084 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos novos (G-09/G-21/RN-11 confirmados, SQL parametrizado, sem segredo/dependência/dado pessoal; limitação do modelo na chave de cache coberta por RTP-0028).

## TP-0085 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos novos (README coberto por RTP-0033); XSS ok (só JSX + zod safeParse, sem dangerouslySetInnerHTML, link com encodeURIComponent), sem chamada à IA pelo site.

## RTP-0001 — DevSecOps — 2026-10-08
OK; 0 críticos/0 não críticos; diff só em teste de tipagem, src e contratos intactos, sem segredo ou dado sensível.

## RTP-0002 — DevSecOps — 2026-10-08
APROVADA, 0 achados; `!` em referencia.ts e provedor-openai.ts protegidos por checagem/zod, strict e noUncheckedIndexedAccess mantidos, testes não enfraquecidos.

## RTP-0003 — DevSecOps — 2026-10-08
APROVADA; 0 achados; link externo com rel noopener noreferrer, URL fixa em HTTPS, G-11 respeitada (sem nome de empresa).

## RTP-0004 — DevSecOps — 2026-10-08
APROVADA, 0 achados; mudança só de teste (resumo.test.ts), sem src/worker, dependência ou segredo; asserção de Cache-Control adicionada.

## RTP-0005 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos; só JSX, sem innerHTML/eval/console/fetch, sem dependência nova nem segredo.

## RTP-0006 — DevSecOps — 2026-10-08
APROVADA; 0 achados; mudança só no título do describe, sem src, sem dependência nova, sem asserção afrouxada.

## RTP-0007 — DevSecOps — 2026-10-08
APROVADA; 0 achados; só teste alterado, escrita em conexão readOnly provada falhando (G-05), sem src/dependência/dado novo.

## RTP-0008 — DevSecOps — 2026-10-08
RTP-0008 segurança APROVADA; coluna só sai como Transportadora N, sem vazamento de nome cru, determinismo preservado; 0 críticos, 0 RTP novas.

## RTP-0009 — DevSecOps — 2026-10-08
APROVADA; 0 achados; NaN/undefined/Infinity falham fechado, tolerância 0,01 sem brecha, sem I/O/segredo/dependência nova.

## RTP-0010 — DevSecOps — 2026-10-08
APROVADA; sem afrouxar strict, sem dependencia/lockfile novo, sem exposicao de env pelo vite; 0 criticos, 0 nao criticos.

## RTP-0012 — DevSecOps — 2026-10-08
RTP-0012 segurança APROVADA; 5xx fora do RFC 9457 devolve só constante estática, sem corpo/detail/status/código, sem HTML interpretado, timers e listeners limpos, sem dependência nova; 0 achados.

## RTP-0013 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 achados; data só concatenada e comparada, sem URL/HTML/API, sem fetch ou dependência nova.

## RTP-0014 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; mudança só de teste, % e ; rejeitados pela lista de permissão do regex antes de qualquer consulta ao D1.

## RTP-0015 — DevSecOps — 2026-10-08
RTP-0015 segurança OK; anúncio só com números da resposta validada e rótulos fixos, `pagina` da URL validada por regex, sem fetch, dependência nem HTML dinâmico; 0 achados.

## RTP-0016 — DevSecOps — 2026-10-08
APROVADA; 0 críticos e 0 não críticos; mudança só de teste, casos negativos ainda rejeitados pelo esquema, sem src nem dependência nova e sem asserção afrouxada.

## RTP-0018 — DevSecOps — 2026-10-08
APROVADA; 0 críticos/0 não críticos; mudança só em teste (busca.test.tsx), sem src, dependência ou segredo, sem asserção afrouxada.

## RTP-0019 — DevSecOps — 2026-10-08
APROVADA - domínio puro sem I/O, log, segredo ou dependência nova; 0 críticos, 0 não críticos (NaN/Infinity nunca viram quitado; 0,011 segue na RTP-0040).

## RTP-0021 — DevSecOps — 2026-10-08
RTP-0021 APROVADA em segurança — timeout elimina espera pendurada, chave não vaza, URL fixa, erro vira null, timeoutMs inválido falha fechado; 0 achados, sem dependência nova.

## RTP-0022 — DevSecOps — 2026-10-08
APROVADA; 0 críticos/0 não críticos; mudança só de teste, sem src/dependência/segredo e com asserções mais estritas.

## RTP-0024 — DevSecOps — 2026-10-08
OK; 0 críticos, 0 não críticos; só teste (+37 linhas), fixture sintética, sem src/dependência nova, sem asserção afrouxada.

## RTP-0025 — DevSecOps — 2026-10-08
APROVADA, 0 críticos/0 não críticos; mudança só em teste, sem src/dependência/segredo novos e asserções mais estritas.

## RTP-0026 — DevSecOps — 2026-10-08
APROVADA — relax_column_count não deixa linha malformada virar evento (faltantes viram linha_invalida, extras ignorados sem vazar), sem I/O/log/dependência nova; 0 achados críticos.

## RTP-0027 — DevSecOps — 2026-10-08
APROVADA — chave só testada por existência e nunca impressa, sem processo, rede ou dependência nova; 0 achados críticos, 0 não críticos.

## RTP-0028 — DevSecOps — 2026-10-08
OK, 0 críticos e 0 não críticos novos; `conferida`/`motivo` recalculados pela regra de domínio, resposta da IA aceita só se igual a candidato do banco, sem escrita de vínculo, SQL parametrizado, sem segredo e sem dependência nova.

## RTP-0031 — DevSecOps — 2026-10-08
APROVADA — só teste alterado, G-04 e G-11 respeitados, sem src nem dependência nova, sem asserção afrouxada; 0 achados.

## RTP-0032 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 novos não críticos; só teste, fixture sintética, sem src/dependência nova, sem asserção afrouxada, determinismo preservado.

## RTP-0033 — DevSecOps — 2026-10-08
APROVADA, 0 críticos e 0 não críticos; só texto no README, sem segredos (G-01) e sem nomes de terceiros no trecho novo (G-11); o texto sobre IA bate com o ADR-010.

## RTP-0034 — DevSecOps — 2026-10-08
APROVADA com débito baixo; 0 críticos, 1 não crítico (.dev.vars.* não ignorado, RTP-0045); .env.*, .dev.vars ignorados, .env.example rastreado, nenhum segredo rastreado.

## RTP-0036 — DevSecOps — 2026-10-08
RTP-0036 APROVADA em segurança; função pura sem imports/I/O/log/dependência nova, mensagem só com valor numérico; 0 achados.

## RTP-0037 — DevSecOps — 2026-10-08
APROVADA; 0 críticos/0 não críticos; escapa `'`, rejeita não finito e não primitivo sem eco de dado, módulo puro sem arquivo parcial.

## RTP-0038 — DevSecOps — 2026-10-08
RTP-0038 APROVADA em segurança; 0 achados; sem shell, argumentos em array, sempre --local sem credencial/env, falha segura se o bin faltar, conexão fechada em finally.

## TP-0002 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 2 não críticos já cobertos (RTP-0011 react/no-danger em componente customizado; RTP-0039 backlog de lint); proibições G-02/G-03/G-04/G-08/G-12 confirmadas via eslint --stdin.

## TP-0053 — DevSecOps — 2026-10-08
APROVADA — G-12/G-08 cumpridos (sem HTML bruto, sem rede/log/segredo/dependência nova, rodada 2 sem nova superfície); 0 críticos, 0 não críticos; só cuidado informativo com `href` de `EstadoVazio` nas telas.

## TP-0066 — DevSecOps — 2026-10-08
APROVADA — 0 críticos, 0 não críticos; sem segredo (G-01), sem nome de terceiros (G-11), sem dependência nova, e o script `dev` usa `vite dev` sem host exposto (só localhost).

## RTP-0011 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 1 observação baixa (spread literal/createElement contornam o seletor, sem RTP); Foo e div com dangerouslySetInnerHTML falham, div sem prop passa, regra vale em todo .tsx/.jsx, fronteiras intactas.

## RTP-0020 — DevSecOps — 2026-10-08
APROVADA com débito - CSV malformado nunca vira pagamento válido nem aborta, sem any/I-O/dependência nova; 0 críticos, 2 baixos (erro.message do csv-parse expõe trecho do campo em `detalhe`; aspas abertas engolem linhas) -> RTP-0048 a abrir.

## RTP-0039 — DevSecOps — 2026-10-08
APROVADA — sem regressão de segurança em 94 arquivos (eslint.config/lockfile/deps intocados, 0 eslint-disable em src, nada em src/worker lê o arquivo de problemas plantados, sem padrões de risco novos); 0 críticos, 0 novos não críticos (RTP-0046 cobre a regra de fronteira).

## RTP-0041 — DevSecOps — 2026-10-08
APROVADA em segurança; 0 críticos, 0 não críticos; ALTER estático e idempotente, modelo só por parâmetro e fora dos documentos publicados, event store e esquema v1 intactos, sem dependência nova.

## RTP-0042 — DevSecOps — 2026-10-08
APROVADA em segurança; erros.ts não expõe stack/exceção/valor (só nome de campo), sem any/@ts-ignore, testes não enfraquecidos, sem dependência/lockfile; 0 críticos, 0 não críticos novos (1 observação informativa).

## RTP-0043 — DevSecOps — 2026-10-08
APROVADA; 0 achados; só teste alterado, dados sintéticos, sem asserção afrouxada e sem dependência nova.

## RTP-0044 — DevSecOps — 2026-10-08
RTP-0044 APROVADA em seguranca; 0 achados; foco e ref local, sem fetch/HTML dinamico/dependencia nova, params da URL seguem validados.

## RTP-0045 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 1 não crítico informativo (sem RTP); .dev.vars.*, .env.local e .env.production ignorados, .env.example rastreado, nenhum segredo rastreado nem no histórico recente.

## RTP-0047 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; só teste, banco em os.tmpdir() removido, dados sintéticos, SQL fixo, sem dependência nova nem asserção afrouxada.

## RTP-0048 — DevSecOps — 2026-10-08
APROVADA; 0 críticos, 0 não críticos; detalhe de linha_invalida/valor/data só com código e linha (sem erro.message nem valor de campo), linha malformada nunca vira pagamento, sem any/I-O/dependência nova.

## RTP-0023 — DevSecOps — 2026-10-08
APROVADA — ci.yml inalterado pela tarefa, permissões mínimas (contents: read), sem segredos, actions fixadas por SHA; 0 achados.

## RTP-0046 — DevSecOps — 2026-10-08
APROVADA — exceção GERACAO restrita ao nome novo, nome antigo e leitura fora de test/ seguem barrados, sem dependência nem segredo novos; 0 críticos, 0 novos não críticos.

## RTP-0049 — DevSecOps — 2026-10-08
APROVADA — só timeout 60000 ms no teste de lint; sem dependência, segredo nem afrouxamento da regra; 0 achados.

## RTP-0050 — DevSecOps — 2026-10-09
OK - 0 achados; só SELECT/INSERT ON CONFLICT com `?`, sem UPDATE/DELETE (G-05), sem dependência nova; grep confirmou sem concatenação SQL.

## RTP-0051 — DevSecOps — 2026-10-09
OK - 0 achados; leitura do event store só por consultas preparadas constantes do repositório, escritor-sql intocado, sem dependência nova, gabarito fora de publicacao/.

## RTP-0052 — DevSecOps — 2026-10-09
OK; 0 críticos, 0 achados novos; sem SQL por concatenação, gravação em `emTransacao` com rollback testado, sem UPDATE/DELETE; importar.test 3/3.

## RTP-0053 — DevSecOps — 2026-10-09
OK — 0 achados; chave de cache sem credencial, provedor com timeout e sem log, RN-11 mantida, conexão do banco fora do tipo Repositorio e `abrirRepositorioParaTeste` sem importador em produção, sem dependência nova.

## RTP-0054 — DevSecOps — 2026-10-09
OK — 0 achados; config sem segredo/eco, só `--semente` numérica como entrada, SHA-256 e URL fixada mantidos, wrangler sem shell/--remote, eslint sem regra afrouxada.

## RTP-0055 — DevSecOps — 2026-10-09
OK; 0 achados de segurança; sem Math.random/Date.now, sem dado real, gabarito fora do código de importação/publicação (G-04), sem dependência nova.

## RTP-0056 — DevSecOps — 2026-10-09
OK em segurança; 0 achados; v2 derivada da v1 sem afrouxar validação, listas únicas, EsquemaSugestaoIA estrito, nenhum campo interno exposto; vitest contrato+domínio 187 verdes.

## RTP-0057 — DevSecOps — 2026-10-09
OK, 0 achados; código validado por zod antes do D1, SQL só em consultas.ts com bind, cabeçalhos e erros RFC 9457 inalterados nas rotas v1/v2; 42 testes do Worker passando.

## RTP-0058 — DevSecOps — 2026-10-09
OK; 0 achados; sem innerHTML/eval/node:*/segredo em web/src, rótulos da API seguem como texto escapado, sem dependência nova (greps executados).

## RTP-0059 — DevSecOps — 2026-10-09
OK — 0 achados; refatoração sem mudança de comportamento, sem innerHTML novo, link de tipo validado por enumeração e codificado, sem dependência nova.

## RTP-0060 — DevSecOps — 2026-10-09
OK; 0 achados; sem `as unknown as`/eval, texto por JSX, código do pedido com encodeURIComponent, resposta validada por zod, erros com mensagem fixa, sem retry automático, sem dependência nova.

## RTP-0061 — DevSecOps — 2026-10-09
OK; 0 achados de segurança; tipo/pagina validados antes da API, URLSearchParams, links relativos com encodeURIComponent, sem HTML injetado; 14 testes executados passando.

## RTP-0062 — DevSecOps — 2026-10-09
OK; 0 críticos, 1 baixo (RTP-0085, sem limite de tamanho nas strings da sugestão); IA só como texto JSX, link com encodeURIComponent em rota interna, esquema do contrato equivale ao removido.

## RTP-0063 — DevSecOps — 2026-10-09
OK; 0 achados; CSS sem @import/url externa, fontes locais, ícones SVG sem script/evento/innerHTML, IconeBase sem injeção de HTML, sem dependência nova.

## RTP-0064 — DevSecOps — 2026-10-09
OK; 0 achados de segurança; testes de 4xx, cabeçalhos e axe mantidos (15/20/56 antes e depois), sem segredo, sem rede real, sem vazamento de teste para o bundle.

## RTP-0065 — DevSecOps — 2026-10-09
APROVADA em segurança; 0 achados; sem segredo/rede nas fábricas, src não importa apoio, asserções G-04/G-09 preservadas (81 expects, 32 casos antes e depois).

## RTP-0066 — DevSecOps — 2026-10-09
APROVADA — só comentários/nomes de teste + prefixo das REGRA_* mudaram; nenhum comentário de segurança (G-04) apagado, nenhum segredo; 0 achados.

## RTP-0067 — DevSecOps — 2026-10-09
OK — diff só de comentários e 2 nomes de describe (código executável idêntico), nenhum comentário de segurança apagado, correções de comentários conferidas contra o código, sem segredo; 0 achados.

## RTP-0068 — DevSecOps — 2026-10-09
OK — 0 achados de segurança; print-config idêntico (antes/depois) em 4 arquivos sensíveis (publicacao, web/src, web/worker), proibições de gabarito, prepare, dangerouslySetInnerHTML e G-03 preservadas; `eslint/**` em ignores aceito.

## RTP-0069 — DevSecOps — 2026-10-09
APROVADA, 0 críticos e 0 não críticos; execFileSync sem shell com alvo validado, sem segredos, falha/vazio na consulta remota leva à carga (só SELECT), D1 antes do Worker, CI sem publicação/segredos e cache protegido pelo hash; só scripts mudaram no package.json (sem auditoria de dependências); 8 testes ok.

## RTP-0070 — DevSecOps — 2026-10-09
OK; 0 críticos/altos, lacunas médias/baixas já em RTP-0083 e RTP-0084; testes sem segredo, sem rede, sem enfraquecer o existente; texto do GUARDRAILS e leitura ampla do G-17 aguardam o usuário/Gestor.

## RTP-0071 — DevSecOps — 2026-10-09
OK; 0 críticos, 0 não críticos; diff só de comentário, nenhum comentário de segurança removido.

## RTP-0072 — DevSecOps — 2026-10-09
OK; 0 achados; mensagem do passo sugerir não expõe chave/env/dados de pedido e a lógica sem chave (não chama a IA) não mudou; verificação por leitura do diff e grep.

## RTP-0073 — DevSecOps — 2026-10-09
OK; 0 achados; sem Math.random/Date.now (PRNG com semente), sem escrita em disco, sem dado real, gabarito/G-04 intocado.

## RTP-0074 — DevSecOps — 2026-10-09
OK; diff de 1 linha de comentário (só o `*`), sem alteração de código, 0 achados.

## RTP-0075 — DevSecOps — 2026-10-09
OK; 0 achados; só teste, sem segredo/rede, contrato zod intacto; vitest do arquivo 3/3.

## RTP-0076 — DevSecOps — 2026-10-09
OK; 0 achados de segurança, só teste, foco/aria-disabled preservado, sem segredo/rede; RTP-0087 (falha rara) já aberta.

## RTP-0077 — DevSecOps — 2026-10-09
OK; 0 achados; validação do tipo da URL por lista fechada preservada, sem dangerouslySetInnerHTML, ESLint limpo.

## RTP-0078 — DevSecOps — 2026-10-09
OK; 0 achados; diff de 1 linha (espaço de formatação), sem mudança de comportamento nem de superfície de segurança.

## RTP-0079 — DevSecOps — 2026-10-09
OK; diff só de comentário, sem superfície de segurança, 0 achados.

## RTP-0080 — DevSecOps — 2026-10-09
OK; 0 achados de segurança; asserções do Worker preservadas, apoios sem segredo/rede e não importados por web/src nem web/worker; 64 testes dos arquivos tocados passando.

## RTP-0081 — DevSecOps — 2026-10-09
OK; 0 achados; diff só remove imports não usados, sem perda de cobertura de segurança/isolamento.

## RTP-0082 — DevSecOps — 2026-10-09
OK; 0 achados; diff só em comentário/linha em branco, nenhuma regra G-08/G-12/fronteira alterada e nenhum comentário de proibição apagado.

## RTP-0083 — DevSecOps — 2026-10-09
APROVADA; 0 altos/críticos, 1 baixo (RTP-0091); 24 testes passando e sonda de 20 amostras confirma aspas, schema, REPLACE, DO UPDATE e DROP; faltam ALTER TABLE, writable_schema e ';' em string.

## RTP-0084 — DevSecOps — 2026-10-09
OK; 0 críticos/altos, 1 RTP (RTP-0092: g17 não valida especificador de versão, overrides e pacotes novos do workspace); g17 13 e g22 13 passando, lista por pacote bate com os package.json, optional/peer e wrangler extras cobertos.

## RTP-0085 — DevSecOps — 2026-10-09
OK em segurança; 0 críticos/altos, 1 média de disponibilidade (`.parse` em `montarBlocoIa` aborta a publicação com referência de CSV > 600) já coberta pela RTP-0090; limite aplicado antes do documento/D1 e também no site.

## RTP-0087 — DevSecOps — 2026-10-09
OK; 0 achados; diff só de teste, sem segredo/rede/dependência, asserção de foco intacta.

## RTP-0088 — DevSecOps — 2026-10-09
OK; 0 achados; só testes/apoio, asserções de segurança do Worker (400, 404, RFC 9457) intactas, sem segredo/rede e sem importação de apoio por src/worker.

## RTP-0089 — DevSecOps — 2026-10-09
OK; 0 achados; só a mensagem do teste g17 mudou, lógica de detecção intacta (não ficou mais permissiva).

## RTP-0090 — DevSecOps — 2026-10-09
OK; 0 achados novos; safeParse só empilha item válido, sem log do texto bruto, RN-11 antes; texto longo em `exemplos` é risco baixo preexistente, sem RTP.

## RTP-0091 — DevSecOps — 2026-10-09
OK; 0 críticos, 1 baixo (RTP-0093: DO UPDATE do G-05 deixou de acusar aspas desbalanceadas/escapadas por barra); 34 testes G-05 passando, UPDATE/DELETE/REPLACE inalterados.

## RTP-0092 — DevSecOps — 2026-10-09
OK; 0 críticos/altos, 1 RTP (RTP-0094: tags tipo latest e overrides/catalog do pnpm-workspace.yaml fora do G-17); checagem mais estrita que antes e cobre npm:, github:, user/repo, git+, git://, http(s):, file:, link: e overrides; CI com --frozen-lockfile.

## RTP-0093 — DevSecOps — 2026-10-09
OK; 0 críticos/altos, 0 RTP nova (ReDoS segue na RTP-0095, média/baixa: pior caso real no src tem 2 aspas por instrução); regra ficou mais estrita que a anterior.

## RTP-0094 — DevSecOps — 2026-10-09
OK; 0 alto/crítico, 1 baixo já aberto (RTP-0096); G-17 mais estrito, 53 testes passando, sem dependência/lockfile alterados.

## RTP-0095 — DevSecOps — 2026-10-09
OK; 0 críticos, 0 novos não críticos (perda de cobertura já rastreada na RTP-0097, baixa/média); suíte guardrails 101/101, src sem DO UPDATE.

## RTP-0096 — DevSecOps — 2026-10-09
OK; 0 achados; checagem G-17 só mais estrita, g17 65 testes ok com repo real, sem dependência/lockfile novo.

## RTP-0097 — DevSecOps — 2026-10-09
OK; 0 críticos, 0 não críticos; escâner linear mantém as violações da RTP-0093 (aspa ímpar, escapada com `;`, `;` em string) e as demais regras intactas; 102 testes de guardrail verdes.

## RTP-0098 — DevSecOps — 2026-10-09
APROVADA — só comentários mudaram, nenhum valor/binding/rota/flag alterado, G-22 com 13 testes OK, sem segredo em comentário; 0 achados.

## RTP-0099 — DevSecOps — 2026-10-09
APROVADA; 0 achados; teste só lê o event store via consultas, gabarito continua só em test/, guardrails G-04/G-05 verdes.
