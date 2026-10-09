# Publicar (TP-0065)

Este documento descreve o fluxo de publicação do POC_Lab e as ações que só o
autor pode fazer manualmente (nenhuma é automatizável por código/CI).

## Qual comando usar

Rodando na raiz do repositório:

| O que mudou | Comando |
|---|---|
| Só `web/` (telas, Worker, estilos) | `pnpm publicar:site` |
| `processamento/src` (dados, regras, publicação) | `pnpm publicar:dados` ou `pnpm publicar` |
| `processamento/src` e `web/` | `pnpm publicar` |

Os três chamam `scripts/publicar.mjs`, que roda passos nomeados e para no
primeiro erro, citando o passo que falhou.

- `pnpm publicar:site` — `vite build` e `wrangler deploy`. Não toca no D1.
- `pnpm publicar:dados` — `preparar` (regenera os dados e escreve
  `processamento/dados/publicacao/leitura.sql`), lê o `idPublicacao` do
  `leitura.sql` local, consulta (só leitura) o `idPublicacao` do resumo no D1
  remoto e:
  - se for igual, **não** carrega e avisa "dados já publicados";
  - se for diferente (ou o D1 remoto estiver vazio), roda
    `wrangler d1 execute poc-lab --remote --file …/leitura.sql`.
- `pnpm publicar` — `publicar:dados` e depois `publicar:site`.

A ordem **D1 antes do Worker** é intencional (ADR-015): o código novo do
Worker nunca deve ler as tabelas antigas do D1.

Atenção: a carga do D1 regrava cerca de 175 mil linhas e reabre a janela de
tabela vazia durante a troca. Por isso, correção só de tela não deve recarregar
os dados: use `publicar:site`.

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
   `web/wrangler.jsonc`, no campo `database_id` (dentro de `d1_databases`). O
   `database_id` é um identificador, não um segredo (G-01), mas ainda assim só
   existe depois desta etapa manual — nunca é inventado. Esta etapa já foi
   feita: o `database_id` em `web/wrangler.jsonc` é o valor real devolvido
   pelo `wrangler d1 create poc-lab` do autor.
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
