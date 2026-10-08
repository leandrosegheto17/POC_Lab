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
