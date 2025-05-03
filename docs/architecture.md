# Arquitetura do Transpilador

O transpilador é dividido em módulos:

- **lexer/**: Responsável pela análise léxica do código de entrada.
- **parser/**: Responsável pela análise sintática e geração da AST.
- **transformer/**: Realiza transformações na AST para adaptar para ADVPL.
- **generator/**: Gera o código ADVPL final a partir da AST transformada.
- **utils/**: Funções utilitárias usadas em todo o projeto.

O ponto de entrada é o `src/index.ts`, que orquestra a leitura dos arquivos, transpilação e escrita dos arquivos de saída. 