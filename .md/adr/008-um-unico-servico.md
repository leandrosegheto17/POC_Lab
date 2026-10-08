# ADR-008 — Um único serviço (monólito modular)

- Status: Aceito
- Data: 2026-10-07

## Contexto
Há importação, regras, projeções e interface. As fontes chegam em lote e o volume é pequeno.

## Alternativas consideradas
1. Serviços separados (importação, conciliação, consulta) com mensageria.
2. Um único serviço, em 2 pacotes de um pnpm workspace (`processamento` e `web`), com módulos internos e fronteiras verificadas por lint.

## Decisão e motivo
Alternativa 2. Nenhum requisito pede escala, deploy ou time independentes. As fronteiras que importam (domínio puro, adaptadores, armazenamento, publicação) são módulos com regra de dependência checada pelo ESLint (`no-restricted-imports`). O domínio é o único código compartilhado com o `web`.

## Consequências
- Um único `pnpm preparar` monta tudo; um único CI.
- Se um dia precisar separar, as fronteiras já existem como módulos.

## O que deliberadamente não foi feito
Microsserviços, fila, pacote `shared` separado e injeção de dependência por contêiner (dependências passadas por parâmetro bastam).
