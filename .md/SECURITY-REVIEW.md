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
