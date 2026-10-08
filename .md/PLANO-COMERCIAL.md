# POC_Lab — Escopo aprovado (Loop 0)

> **Veredito:** não se aplica análise comercial. A POC_Lab é uma prova de conceito para um processo seletivo de Tech Lead, sem venda, sem preço e sem break-even. Decisão do usuário em 2026-10-07: a POC vale o tempo, cabe no prazo e terá custo zero.
>
> Este arquivo substitui o plano comercial como entrada do `/planejar` (Gate 1).

## Objetivo

Mostrar duas competências:

1. Análise de dados: qualidade dos dados, reconciliação entre fontes e indicadores.
2. Construção de um app com boas práticas de desenvolvimento: modelagem de domínio, contrato versionado, idempotência, testes, CI e decisões documentadas.

Pergunta que o app responde: "o que está acontecendo de fato com este pedido, e em quantos sistemas eu precisaria olhar para saber?"

## O que vamos construir (aprovado)

A POC_Lab é um app web que junta, numa tela só, o que três sistemas sabem sobre o mesmo pedido: vendas, pagamentos e transportadora. Os sistemas não conversam entre si e cada um usa os próprios códigos.

1. **Os dados de origem**
   - Sistema de vendas: uma base pública de exemplo em SQLite, somente leitura. A origem e a licença estão no aviso de licença do repositório.
   - Sistema de pagamentos: `pagamentos.csv`, gerado por script a partir dos pedidos do sistema de vendas.
   - Sistema da transportadora: `rastreio.csv`, gerado da mesma forma.
   - Problemas plantados de propósito nos CSVs: pagamento duplicado, pagamento em duas parcelas, pago e não enviado, enviado e não pago, entrega atrasada, eventos de rastreio fora de ordem e referência de pagamento ambígua (só texto).
2. **A importação**: um comando lê as três fontes e grava tudo num formato comum. Importar o mesmo arquivo duas vezes não duplica nada.
3. **Relatório de qualidade dos dados**: mostra o que está errado ou inconsistente na base, como datas em dois formatos, pedidos sem envio e valores fora do padrão.
4. **Linha do tempo do pedido**: busca de um pedido mostrando, em ordem, venda, pagamentos, coleta, transporte e entrega, ordenados pelo momento do fato e não pela ordem de chegada.
5. **Lista de divergências**: os pedidos com problema e o motivo de cada um.
6. **Painel de indicadores**:
   - percentual de entregas no prazo, por transportadora e por mês;
   - tempo médio entre pedido, envio e entrega;
   - valor pago contra valor devido;
   - quantidade de divergências por tipo.
7. **IA para pagamentos sem identificação clara (opcional)**: quando o pagamento chega só com um texto vago, a IA sugere a que pedido ele pertence e uma regra confere se faz sentido. Usa poucos créditos da OpenAI, com cache e limite de chamadas. O app funciona normalmente sem a chave.
8. **Publicação**: o app fica online no Cloudflare, sem custo, com um link para mostrar na entrevista.
9. **Qualidade do código**: testes automáticos, CI no GitHub e README em português com o que foi feito e o que ficou de fora de propósito.

## Dados verificados da base (do documento original)

- Tabelas: Orders (16.282 pedidos), "Order Details" (609.283 itens), Customers (93), Shippers (3) e Products.
- 21 pedidos sem ShippedDate; 3.755 enviados depois do RequiredDate.
- Valor do pedido = soma de UnitPrice × Quantity × (1 − Discount) em "Order Details".
- OrderDate em dois formatos: 830 pedidos no formato curto (AAAA-MM-DD) e 15.452 no formato longo (com hora).

## Modelo comum (do documento original)

- **pedido**: identidade estável no modelo comum (não é o OrderID do ERP).
- **vinculo_fonte**: liga o pedido a cada ID externo (fonte + ID externo), com chave única. Garante a idempotência.
- **evento**: fato imutável (tipo, momento do fato, fonte, versão do schema, dados). O estado do pedido é derivado dos eventos, nunca editado.
- **divergencia**: resultado das regras, com motivo e os eventos que a sustentam.
- Cada fonte entra por um adaptador pequeno, que não vaza o formato original para o resto do sistema.
- O contrato do evento é versionado, com v1 e v2 convivendo.

## Como validar (do documento original)

- Idempotência: importar duas vezes resulta no mesmo estado e na mesma contagem de eventos.
- Ordenação: o estado final não depende da ordem de chegada dos eventos.
- Parcial e duplicado: o saldo bate com o valor derivado de "Order Details".
- Auditoria: dado um pedido e uma data, reconstruir o estado naquele momento.
- Contrato: um consumidor da v1 continua funcionando depois da v2.

## Restrições e preferências

- Nome do projeto: apenas "POC_Lab". Não citar nomes de empresa ou de produto de terceiros em nenhum lugar do projeto.
- Tudo em português.
- Custo zero.
- Stack: TypeScript/Node e SQLite. Ideia em aberto para o `/planejar`: usar o Cloudflare D1 (que é SQLite) e Workers, com processamento pesado local e publicação só do resultado. Confirmar os limites do plano gratuito.
- Projeto de referência para padrões de código, testes, CI e integração com IA: projeto de referência do autor. NestJS, Postgres, VM e infra-apps não entram.
- Fora do escopo: microsserviços, mensageria, autenticação, front elaborado, tempo real e abstrações genéricas para "qualquer fonte".

## Em aberto

- Prazo até a entrevista. Ele define se o item 7 (IA) entra.
