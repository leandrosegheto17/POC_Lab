# POC_Lab

POC de contratação, sem caráter comercial. A ideia é conciliar pedidos entre três
fontes que, na vida real, quase nunca concordam entre si: um sistema de vendas, um
sistema de pagamentos e um sistema de rastreio/transportadora. A conciliação
aponta automaticamente as divergências entre essas fontes — pagamento duplicado,
pagamento parcial, entrega atrasada, pedido pago e não enviado, pedido enviado e
não pago, entre outras — a partir dos eventos de cada uma.

## Como rodar

Três comandos, nesta ordem:

1. `pnpm install` — instala as dependências do monorepo.
2. `pnpm preparar` — baixa a base de vendas de origem (conferindo o hash),
   gera os dados sintéticos de pagamentos e rastreio com os casos de teste
   plantados, importa tudo para o event store local e publica os dados no
   banco local (D1 local via `wrangler`).
3. `pnpm dev` — sobe o site e a API num único processo local.

Não precisa de conta na Cloudflare nem de chave de API (`OPENAI_API_KEY`) para
rodar localmente.

## Versão publicada

A versão publicada (site + API, ver `web/PUBLICAR.md`) está em
<https://poc-lab.leandrosegheto17.workers.dev>.

## Mapa de decisões

Cada linha é um ADR, em `.md/adr/`. Os substituídos estão marcados.

| ADR | Decisão | Status |
|---|---|---|
| [001](.md/adr/001-escopo-e-ordem-de-corte.md) | Escopo e ordem de corte | Vigente |
| [002](.md/adr/002-identidade-propria-do-pedido.md) | Identidade própria do pedido | Vigente |
| [003](.md/adr/003-eventos-imutaveis-e-estado-derivado.md) | Eventos imutáveis e estado derivado | Vigente |
| [004](.md/adr/004-idempotencia-por-vinculo-unico.md) | Idempotência por vínculo único | Vigente |
| [005](.md/adr/005-um-adaptador-por-fonte.md) | Um adaptador por fonte | Vigente |
| [006](.md/adr/006-versionamento-do-contrato-de-evento.md) | Versionamento do contrato de evento | Vigente |
| [007](.md/adr/007-processar-local-publicar-estatico.md) | Processar local, publicar estático | **Substituído** pelo ADR-013 |
| [008](.md/adr/008-um-unico-servico.md) | Um único serviço | Vigente |
| [009](.md/adr/009-dados-sinteticos-com-semente-e-gabarito.md) | Dados sintéticos com semente e gabarito | Vigente |
| [010](.md/adr/010-ia-como-sugestao-opcional.md) | IA como sugestão opcional | Vigente |
| [011](.md/adr/011-stack-node-sqlite-react.md) | Stack: Node, SQLite, React | **Substituído** pelo ADR-014 |
| [012](.md/adr/012-ci-e-publicacao.md) | CI e publicação | **Substituído** pelo ADR-015 |
| [013](.md/adr/013-processar-local-publicar-no-d1-com-api-de-leitura.md) | Processar local, publicar no D1 com API de leitura | Vigente |
| [014](.md/adr/014-stack-node-sqlite-d1-worker-hono-react.md) | Stack: Node, SQLite, D1, Worker, Hono, React | Vigente |
| [015](.md/adr/015-ci-e-publicacao-d1-worker.md) | CI e publicação (D1 + Worker) | Vigente |
| [016](.md/adr/016-contrato-da-api-de-leitura.md) | Contrato da API de leitura | Vigente |

## Fora de propósito (por agora)

Nenhum item pendente — todos os lotes planejados foram entregues, incluindo as
sugestões da IA (opcionais, ADR-010) para os casos de conciliação sem resolução
automática.

## Origem dos dados

A base de vendas usada pelo gerador de dados sintéticos é uma base pública de
exemplo, com esquema clássico de pedidos, itens e transportadora, sob licença
MIT. A atribuição completa está em `AVISO-DE-LICENCA.md`.

## API

A API de leitura é publicada pelo mesmo Worker que serve o site (ADR-013/014).
Todas as rotas abaixo são `GET` (o `HEAD` correspondente é derivado
automaticamente) e vivem sob o prefixo `/api/v1`.

| Rota | Descrição |
|---|---|
| `GET /api/v1/resumo` | Resumo agregado da conciliação |
| `GET /api/v1/divergencias?tipo=&pagina=&tamanho=` | Lista paginada de divergências, com filtro opcional por `tipo` |
| `GET /api/v1/pedidos/{codigo}/linha-do-tempo` | Linha do tempo de eventos de um pedido específico |
| `GET /api/v1/indicadores` | Indicadores agregados da conciliação |
| `GET /api/v1/qualidade` | Indicadores de qualidade dos dados processados |

Depois de publicado (ver `web/PUBLICAR.md`), o domínio real substitui o
placeholder `<seu-worker>.workers.dev` usado nos exemplos abaixo:

```sh
curl https://<seu-worker>.workers.dev/api/v1/resumo
curl "https://<seu-worker>.workers.dev/api/v1/divergencias?tipo=pagamento_duplicado&pagina=1&tamanho=50"
curl https://<seu-worker>.workers.dev/api/v1/pedidos/ABC123/linha-do-tempo
curl https://<seu-worker>.workers.dev/api/v1/indicadores
curl https://<seu-worker>.workers.dev/api/v1/qualidade
```

Também existe um contrato v2 da linha do tempo, publicado em paralelo à v1
(nunca a substitui): mesma rota, só sob `/api/v2/...`, mostrando
`versao_schema` em cada evento e `meio_pagamento` no evento de pagamento
quando a transação foi registrada nessa versão — a v1 continua exatamente na
mesma forma de sempre, mesmo para esse pagamento.

```sh
curl https://<seu-worker>.workers.dev/api/v2/pedidos/ABC123/linha-do-tempo
```

### Formato de erro

Toda resposta de erro segue a RFC 9457 (`application/problem+json`), com os
campos:

- `type`: identificador do tipo de problema.
- `title`: título curto e legível do erro.
- `status`: código HTTP numérico.
- `detail`: descrição legível do erro.
- `codigo`: um dos 5 valores normalizados — `parametro_invalido`,
  `pedido_nao_encontrado`, `rota_nao_encontrada`, `metodo_nao_permitido`,
  `erro_interno`.
- `erros[]`: presente **somente** quando `status` é 400, com um item
  `{ "campo": ..., "mensagem": ... }` por campo inválido.

Exemplo (`status` 400, parâmetro de consulta inválido):

```json
{
  "type": "https://poc-lab.dev/erros/parametro_invalido",
  "title": "Parâmetro inválido",
  "status": 400,
  "detail": "O parâmetro 'tipo' não corresponde a um valor aceito.",
  "codigo": "parametro_invalido",
  "erros": [
    { "campo": "tipo", "mensagem": "valor fora do conjunto aceito" }
  ]
}
```

Nenhuma resposta de erro expõe pilha de execução, SQL ou qualquer detalhe
técnico interno no corpo.

### Paginação

Rotas de listagem (hoje, só `/api/v1/divergencias`) aceitam `pagina` (padrão
1) e `tamanho` (padrão 50) na query string, e devolvem os metadados abaixo
junto com os dados:

- `pagina`: página atual.
- `tamanho`: itens por página.
- `total`: total de itens, somando todas as páginas.
- `totalPaginas`: total de páginas, calculado a partir de `total`/`tamanho`.

Exemplo de resposta de `GET /api/v1/divergencias?pagina=1&tamanho=2`:

```json
{
  "dados": [
    {
      "pedido": "ABC123",
      "tipo": "pagamento_duplicado",
      "motivo": "...",
      "eventos": []
    },
    {
      "pedido": "DEF456",
      "tipo": "entrega_atrasada",
      "motivo": "...",
      "eventos": []
    }
  ],
  "paginacao": {
    "pagina": 1,
    "tamanho": 2,
    "total": 37,
    "totalPaginas": 19
  }
}
```

### Versão

A API é versionada no caminho. A v1 (`/api/v1/...`) cobre todas as rotas da
tabela acima; a v2 (`/api/v2/...`) já está publicada e disponível hoje, só
para a linha do tempo do pedido (`GET /api/v2/pedidos/{codigo}/linha-do-tempo`,
exemplo de uso acima) — as duas convivem lado a lado, sem data de desligamento
da v1.

### Como desligar a API

A API pública pode ser encerrada de duas formas: removendo a rota `/api/*`
de `run_worker_first` em `web/wrangler.jsonc` e publicando de novo, ou
excluindo o Worker diretamente (`wrangler delete`, via CLI ou pelo painel da
Cloudflare).

### Alerta de uso

Como é uma API pública, o uso tem custo variável conforme o volume de
requisições e de leituras no D1. Configure um alerta de orçamento/uso no
painel da Cloudflare antes de deixar a API publicada por tempo prolongado.
