# Publicar (TP-0065)

Este documento descreve o fluxo de publicação do POC_Lab e as ações que só o
autor pode fazer manualmente (nenhuma é automatizável por código/CI).

## O que `pnpm publicar` faz

Rodando na raiz do repositório:

```
pnpm publicar
```

executa, nesta ordem fixa:

1. `preparar` (pacote `processamento`, TP-0045) — regenera os dados de
   demonstração e escreve `dados/publicacao/leitura.sql`.
2. `vite build` (pacote `web`) — gera os assets estáticos em `web/dist/client`.
3. `wrangler d1 execute poc-lab --remote --file ../dados/publicacao/leitura.sql`
   (rodando no contexto do pacote `web`, onde vive `wrangler.jsonc`) — carrega
   o SQL de leitura no banco D1 **remoto**.
4. `wrangler deploy` (idem, contexto do pacote `web`) — publica o Worker +
   assets estáticos no Cloudflare.

A ordem **D1 antes do Worker** é intencional (ADR-015): o código novo do
Worker nunca deve ler as tabelas antigas do D1. Se um dos passos falhar, os
seguintes não rodam (encadeamento com `&&`).

Isto é um script **manual**, disparado pelo autor na própria máquina — nenhum
passo de CI dispara `pnpm publicar` (G-16/ADR-015).

## Ações únicas do autor (antes do primeiro `pnpm publicar` real)

Nenhuma destas três ações é automatizável por código; são feitas uma única
vez, manualmente, pelo autor:

1. **`wrangler login`** — autentica a CLI do Wrangler com a conta Cloudflare
   do autor via navegador. A sessão fica guardada localmente pelo próprio
   `wrangler`; nenhum token é escrito em arquivo do repositório.
2. **`wrangler d1 create poc-lab`** — cria o banco D1 remoto, uma única vez.
   O comando devolve um `database_id` real; copie esse valor para
   `web/wrangler.jsonc`, substituindo o placeholder `"local-dev-placeholder"`
   no campo `database_id` (dentro de `d1_databases`). O `database_id` é um
   identificador, não um segredo (G-01), mas ainda assim só existe depois
   desta etapa manual — nunca é inventado.
3. **Configurar um alerta de uso/orçamento no painel do Cloudflare** —
   lembrete de custo (SDD §7, "Custo como risco de disponibilidade"), para
   notificar o autor caso o uso do D1/Workers saia do esperado para uma POC.

Nenhum segredo, token ou credencial do Cloudflare deve ser commitado neste
repositório, em `wrangler.jsonc`, em `package.json` ou em qualquer script.

## Conferência manual pós-deploy (critério de aceite da TP-0065)

Depois de um `pnpm publicar` real (ação do autor, fora do alcance deste
agente), a conferência fim a fim é manual:

- `curl` nas 5 rotas v1 (`resumo`, `divergencias`,
  `pedidos/{codigo}/linha-do-tempo`, `indicadores`, `qualidade`) e confirmar
  `200` com os cabeçalhos de segurança esperados (TP-0042/G-13).
- `curl` numa rota inexistente sob `/api/` e confirmar `404`
  (`rota_nao_encontrada`, RFC 9457).
- `curl` com método não-GET numa rota existente e confirmar `405` com
  `Allow: GET, HEAD`.
- Abrir as telas T1–T4 no link publicado e confirmar que carregam.
- Colar o link publicado no `README.md` (feito por outra tarefa, não aqui).

## `_headers` dos assets estáticos

`web/public/_headers` define os cabeçalhos de segurança aplicados pelo
Cloudflare aos ASSETS estáticos (HTML/JS/CSS servidos diretamente, fora das
rotas `/api/*`):

```
/*
  Content-Security-Policy: default-src 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
```

As respostas do Worker (rotas `/api/*`) já têm os mesmos cabeçalhos de
segurança aplicados em código (TP-0042) — `_headers` cobre apenas o que o
Worker não intercepta.
