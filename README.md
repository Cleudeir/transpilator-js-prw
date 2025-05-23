# Transpilador JS PRW

A minimal toy transpiler from a simple language (PRW) to JavaScript.

## Features
- Variable declarations (`let`)
- Arithmetic expressions (`+`, `-`, `*`, `/`)
- Print statements (`print`)

## Example Input (`src/input/example.prw`)
```
let x = 2 + 3 * 4;
let y = x - 5;
print y;
```

## Usage

1. **Install dependencies**
   ```sh
   npm install
   ```
2. **Build TypeScript**
   ```sh
   npm run build
   ```
3. **Run the transpiler**
   ```sh
   npm start
   ```
   This will read `src/input/example.prw` and write the output JavaScript to `src/output/example.js`.

## Output Example (`src/output/example.js`)
```
let x = (2 + (3 * 4));
let y = (x - 5);
console.log(y);
```

## Estrutura do Projeto

- `src/` - Código-fonte do transpilador
- `src/input/` - Coloque aqui os arquivos `.js` a serem transpilados
- `src/output/` - Arquivos `.prw` gerados
- `tests/` - Testes automatizados
- `docs/` - Documentação
- `bin/` - Scripts executáveis

## Como usar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Compile o projeto:
   ```bash
   npm run build
   ```
3. Coloque seus arquivos `.js` em `src/input/`.
4. Execute o transpilador:
   ```bash
   npm start
   ```
5. Os arquivos `.prw` serão gerados em `src/output/`. 