# Aviso de licença

## Licença do projeto

Este projeto (POC_Lab) é distribuído sob a licença MIT:

```
MIT License

Copyright (c) [ano] [titular dos direitos]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

`[ano]` e `[titular dos direitos]` ficam como placeholder: não há informação
de copyright específica definida para este projeto até o momento.

## Atribuição da base de dados

O gerador de dados sintéticos usa como ponto de partida o esquema e uma
amostra de dados do projeto público
[jpwhite3/northwind-SQLite3](https://github.com/jpwhite3/northwind-SQLite3),
licenciado sob MIT, com o aviso de copyright original preservado. Este é o
único lugar de texto voltado ao leitor (junto da seção "Origem dos dados" do
`README.md`, que não cita o nome) onde esse projeto de origem é identificado;
comentários técnicos e o nome do arquivo (`northwind.db`) aparecem também no
código do pacote `processamento` (gerador, importador e testes de
integração), por necessidade técnica de documentar a fonte real dos dados.

## Licença das fontes

As fontes Manrope e JetBrains Mono, usadas pelo site (em
`web/src/estilos/fontes/`), são licenciadas sob a SIL Open Font License,
versão 1.1. O texto completo de cada licença está disponível em:

- `web/src/estilos/fontes/OFL-Manrope.txt`
- `web/src/estilos/fontes/OFL-JetBrainsMono.txt`
