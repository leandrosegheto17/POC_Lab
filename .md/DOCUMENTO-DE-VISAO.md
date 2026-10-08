# POC_Lab — Documento de Visão

## Visão

A POC_Lab é um app web que junta, numa tela só, o que três sistemas sabem sobre o mesmo pedido: vendas, pagamentos e transportadora. Os sistemas não conversam entre si e cada um usa os próprios códigos.

O app responde a uma pergunta: **o que está acontecendo de fato com este pedido, e em quantos sistemas eu precisaria olhar para saber?**

## Objetivo

A POC_Lab é uma prova de conceito para um processo seletivo de Tech Lead. Ela deve mostrar duas competências:

1. **Análise de dados**: qualidade dos dados, reconciliação entre fontes e indicadores.
2. **Construção de um app com boas práticas de desenvolvimento**: modelagem de domínio, contrato versionado, idempotência, testes, CI e decisões documentadas.

## O que vamos construir

### 1. Os dados de origem
- Sistema de vendas: uma base pública de exemplo em SQLite.
- Sistema de pagamentos: um arquivo CSV gerado por script a partir dos pedidos do sistema de vendas.
- Sistema da transportadora: um arquivo CSV de rastreio, gerado do mesmo jeito.
- Nos dois arquivos gerados entram problemas de propósito: pagamento duplicado, pagamento em duas parcelas, pedido pago e não enviado, pedido enviado e não pago, entrega atrasada e eventos de rastreio fora de ordem.

### 2. A importação
- Um comando que lê as três fontes e grava tudo num formato comum.
- Importar o mesmo arquivo duas vezes não duplica nada.

### 3. Relatório de qualidade dos dados
- Mostra o que está errado ou inconsistente na base: datas em dois formatos, pedidos sem envio, valores fora do padrão.

### 4. Linha do tempo do pedido
- Você busca um pedido e vê tudo o que aconteceu com ele, em ordem: venda, pagamentos, coleta, transporte e entrega.

### 5. Lista de divergências
- Os pedidos com problema e o motivo de cada um, por exemplo "pago e não enviado" ou "pago duas vezes".

### 6. Painel de indicadores
- Percentual de entregas no prazo, por transportadora e por mês.
- Tempo médio entre o pedido, o envio e a entrega.
- Valor pago contra valor devido.
- Quantidade de divergências por tipo.

### 7. IA para pagamentos sem identificação clara (opcional)
- Quando o pagamento chega só com um texto vago, a IA sugere a que pedido ele pertence e uma regra confere se faz sentido.
- Usa poucos créditos da OpenAI e o app funciona normalmente sem ela.

### 8. Publicação
- O app fica online no Cloudflare, sem custo, com um link para mostrar na entrevista.

### 9. Qualidade do código
- Testes automáticos, CI no GitHub e um README em português com o que foi feito e o que ficou de fora de propósito.

## Restrições

- Custo zero.
- Tudo em português.
- Um único serviço, em TypeScript/Node com SQLite.

## Fora do escopo

Microsserviços, mensageria, autenticação, front elaborado, tempo real e abstrações genéricas para "qualquer fonte".
