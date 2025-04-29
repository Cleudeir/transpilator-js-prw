// Placeholder for ADVPL to JS Transpiler
class ADVPLToJSTranspiler {
    constructor() {
        // Mapeamento aprimorado, incluindo tratamento de parâmetros quando necessário
        this.advplFunctionMap = new Map([
            // Simples Mapeamento Direto
            ['CONOUT', 'console.log'],
            ['MSGINFO', 'alert'], // Mapeamento comum, pode precisar de ajuste dependendo do UI
            ['MSGALERT', 'alert'],
            ['ALLTRIM', '.trim()'], // Como método de string
            ['UPPER', '.toUpperCase()'], // Como método de string
            ['LOWER', '.toLowerCase()'], // Como método de string
            ['STR', 'String'], // Conversão de tipo
            ['VAL', 'parseFloat'], // Conversão de tipo (ou parseInt)
            ['EMPTY', this._handleEmpty], // Requer função helper
            ['LEN', this._handleLen], // Requer função helper para strings/arrays
            ['SECONDS', 'Date.now() / 1000'], // Aproximação
            ['DATE', 'new Date()'], // Objeto Date do JS
            // Funções que precisam de tratamento especial de argumentos
            ['SUBSTR', this._handleSubstr], // 1-based para 0-based
            ['STRTRAN', this._handleStrTran], // Substituição
            ['AT', this._handleAt], // 1-based para 0-based, retorna -1 se não encontrado
            ['AADD', this._handleAAdd], // Adiciona a array
            // ... outros mapeamentos ...
            // ['SECONDS', () => `Math.floor(Date.now() / 1000)`], // Exemplo com função
        ]);

        // Regex para identificar diferentes linhas/estruturas ADVPL
        this.regexPatterns = {
            commentBlockStart: /^\s*\/\*/,
            commentBlockEnd: /\*\/\s*$/,
            commentLine: /^\s*\/\//,
            userFunction: /^\s*USER\s+FUNCTION\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*$/i,
            staticFunction: /^\s*STATIC\s+FUNCTION\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*$/i, // Adicionado STATIC
            function: /^\s*FUNCTION\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*$/i, // Adicionado FUNCTION (sem USER/STATIC)
            returnStmt: /^\s*RETURN\s+(.*)/i,
            localDeclareAssign: /^\s*LOCAL\s+([a-zA-Z0-9_\[\]]+)\s*(?:\[(\d+)\])?\s*:=\s*(.*)/i, // Captura tamanho opcional e valor
            localDeclare: /^\s*LOCAL\s+([a-zA-Z0-9_\[\]]+)\s*(?:\[(\d+)\])?\s*$/i, // Captura tamanho opcional
            assignment: /^\s*([a-zA-Z0-9_\[\].]+)\s*:=\s*(.*)/i, // Inclui acesso a membros/índices
            ifStmt: /^\s*IF\s+(.*)/i,
            elseIfStmt: /^\s*ELSEIF\s+(.*)/i,
            elseStmt: /^\s*ELSE\s*$/i,
            endIfStmt: /^\s*ENDIF\s*$/i,
            forStmt: /^\s*FOR\s+([a-zA-Z0-9_]+)\s*:=\s*(\S+)\s+TO\s+(\S+)(?:\s+STEP\s+(\S+))?\s*$/i,
            nextStmt: /^\s*NEXT\s*(?:[a-zA-Z0-9_]+)?\s*$/i, // Ignora variável opcional no NEXT
            doWhileStmt: /^\s*DO\s+WHILE\s+(.*)/i,
            endDoStmt: /^\s*ENDDO\s*$/i,
            // ... outras estruturas (ex: METHOD, CLASS, etc. - mais complexas)
        };
    }

    // --- Funções Helper para Mapeamento ---

    _handleEmpty(args) {
        // EMPTY(var) -> (!var || var.length === 0) // Verifica null/undefined/string vazia/array vazio
        if (!args) return 'false'; // Se chamado sem argumento (improvável)
        const varName = args.trim();
        // Simplificado: verifica se é "falsy" ou array/string vazia
        return `(!${varName} || (Array.isArray(${varName}) ? ${varName}.length === 0 : String(${varName}).trim().length === 0))`;
    }

    _handleLen(args) {
        // LEN(var) -> var.length
        if (!args) return '0';
        return `${args.trim()}.length`;
    }

     _handleSubstr(args) {
        // SUBSTR(cString, nStart, nLen) -> cString.substring(nStart - 1, nStart - 1 + nLen)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: SUBSTR requires string and start position"';
        const str = parts[0];
        const start = parts[1];
        const len = parts[2]; // nLen é opcional em JS substring se for até o fim
        if (len) {
            // JS substring(start, end) -> end é exclusivo
            // ADVPL SUBSTR(cString, nStart, nLen)
             // Calcula o índice final para JS: (start - 1) + len
            return `${str}.substring(${start} - 1, (${start} - 1) + ${len})`;
        } else {
            // Se nLen não for fornecido, vai até o fim
            return `${str}.substring(${start} - 1)`;
        }
    }

    _handleStrTran(args) {
        // STRTRAN(cString, cSearch, cReplace) -> cString.replaceAll(cSearch, cReplace)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: STRTRAN requires string and search string"';
        const str = parts[0];
        const search = parts[1];
        const replace = parts[2] || '""'; // Default replace é string vazia
        // Usa replaceAll para comportamento similar ao STRTRAN padrão
        return `${str}.replaceAll(${search}, ${replace})`;
    }

     _handleAt(args) {
        // AT(cSearch, cString) -> cString.indexOf(cSearch) // Retorna -1 se não achar, ADVPL retorna 0
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: AT requires search string and target string"';
        const search = parts[0];
        const target = parts[1];
        // JS indexOf é 0-based e retorna -1 se não encontrar.
        // ADVPL AT é 1-based e retorna 0 se não encontrar.
        // Adicionamos 1 ao resultado do indexOf para ajustar.
        return `(${target}.indexOf(${search}) + 1)`;
    }

    _handleAAdd(args) {
        // AADD(aArray, xValue) -> aArray.push(xValue)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: AADD requires array and value"';
        const arr = parts[0];
        const val = parts[1];
        return `${arr}.push(${val})`;
    }


    // Helper para parsear argumentos de funções (simplista)
    _parseArgs(argsString) {
         // Lógica muito básica: divide por vírgula, mas não lida com strings com vírgulas, etc.
         // Uma solução real precisaria de um parser mais inteligente.
        return argsString.split(',').map(arg => arg.trim());
    }

    // Helper para substituir funções ADVPL por JS, incluindo as que precisam de tratamento
    _replaceFunctions(line) {
        let processedLine = line;

        // Itera sobre o mapa de funções
        this.advplFunctionMap.forEach((jsEquivalent, advplFunc) => {
            // Regex para encontrar a função ADVPL seguida por parênteses
            // \b garante que estamos pegando a palavra inteira (evita 'SUBSTRING' em vez de 'SUBSTR')
            // (.*?) captura os argumentos de forma não-gulosa
            const regex = new RegExp(`\\b${advplFunc}\\b\\s*\\((.*?)\\)`, 'gi');

            processedLine = processedLine.replace(regex, (match, args) => {
                if (typeof jsEquivalent === 'function') {
                    // Se o mapeamento for uma função helper, chame-a
                    return jsEquivalent.call(this, args);
                } else if (jsEquivalent.startsWith('.')) {
                     // Se for um método (começa com '.'), aplica ao primeiro argumento
                    const parts = this._parseArgs(args);
                    if (!parts || parts.length === 0) return `${advplFunc}("Error: Missing argument for method")`; // Tratamento básico de erro
                    const object = parts[0];
                    // Reconstroi argumentos se houver mais de um (improvável para métodos simples como trim, toUpper)
                     const methodArgs = parts.slice(1).join(', ');
                    return `${object}${jsEquivalent}${methodArgs ? `(${methodArgs})` : ''}`; // Adiciona parênteses se não for propriedade
                } else {
                    // Mapeamento direto ou função global JS
                    // Reconstrói a chamada com os mesmos argumentos
                    return `${jsEquivalent}(${args})`;
                }
            });
        });
        return processedLine;
    }

    _transpileLine(line) {
        const trimmedLine = line.trim();
        let jsLine = null;

        // Preserva comentários
        if (this.regexPatterns.commentBlockStart.test(trimmedLine) || this.regexPatterns.commentBlockEnd.test(trimmedLine) || this.regexPatterns.commentLine.test(trimmedLine)) {
            return line; // Retorna a linha original do comentário
        }

        // Tenta fazer match com os padrões definidos
        for (const key in this.regexPatterns) {
            const match = trimmedLine.match(this.regexPatterns[key]);
            if (match) {
                switch (key) {
                    case 'userFunction':
                    case 'staticFunction': // Trata STATIC igual a USER por enquanto
                    case 'function':
                        const [, funcName, params] = match;
                        // Converte parâmetros (simplesmente copia por enquanto)
                        const jsParams = params.split(',').map(p => p.trim()).filter(p => p).join(', ');
                        jsLine = `function ${funcName}(${jsParams}) {`;
                        break;
                    case 'returnStmt':
                        const [, returnValue] = match;
                        jsLine = `return ${this._replaceFunctions(returnValue.trim())};`; // Processa funções no valor de retorno
                        break;
                    case 'localDeclareAssign': {
                        let [, varName, , value] = match;
                         // Transpila o valor da direita antes de atribuir
                        value = this._replaceFunctions(value.trim());
                        value = value.replace(/\{/g, '[').replace(/\}/g, ']'); // Converte {} para []
                        jsLine = `let ${varName} = ${value};`;
                        break;
                    }
                     case 'localDeclare': {
                        let [, varName, size] = match;
                         // Declara como null ou array vazio se tamanho for especificado
                        jsLine = `let ${varName} = ${size ? `new Array(${size})` : 'null'};`;
                        break;
                     }
                    case 'assignment': {
                        let [, varName, value] = match;
                         // Transpila o valor da direita antes de atribuir
                        value = this._replaceFunctions(value.trim());
                        value = value.replace(/\{/g, '[').replace(/\}/g, ']'); // Converte {} para []
                        jsLine = `${varName} = ${value};`;
                        break;
                    }
                    case 'ifStmt':
                        const [, conditionIf] = match;
                        jsLine = `if (${this._replaceFunctions(conditionIf.trim())}) {`;
                        break;
                    case 'elseIfStmt':
                        const [, conditionElseIf] = match;
                        jsLine = `} else if (${this._replaceFunctions(conditionElseIf.trim())}) {`;
                        break;
                    case 'elseStmt':
                        jsLine = `} else {`;
                        break;
                    case 'endIfStmt':
                        jsLine = `}`;
                        break;
                    case 'forStmt':
                         const [, iterator, start, end, step] = match;
                         const jsStep = step ? ` += ${this._replaceFunctions(step)}` : '++'; // Usa ++ se step não for definido ou for 1
                         // Assume que start, end e step podem precisar de transpilação de função também
                         const jsStart = this._replaceFunctions(start);
                         const jsEnd = this._replaceFunctions(end);
                         jsLine = `for (let ${iterator} = ${jsStart}; ${iterator} <= ${jsEnd}; ${iterator}${jsStep}) {`; // Note <= para TO
                        break;
                    case 'nextStmt':
                        jsLine = `}`;
                        break;
                    case 'doWhileStmt':
                        const [, conditionWhile] = match;
                        jsLine = `while (${this._replaceFunctions(conditionWhile.trim())}) {`;
                        break;
                    case 'endDoStmt':
                        jsLine = `}`;
                        break;
                    // Adicione outros casos aqui
                }
                // Se encontrou um match e gerou jsLine, para de verificar outros padrões para esta linha
                if (jsLine !== null) break;
            }
        }

        // Se nenhum padrão estrutural foi encontrado, pode ser uma chamada de função solta ou outra expressão
        if (jsLine === null && trimmedLine.length > 0) {
            // Tenta substituir chamadas de função na linha inteira
             jsLine = this._replaceFunctions(trimmedLine);
             // Converte literais de array restantes
             jsLine = jsLine.replace(/\{/g, '[').replace(/\}/g, ']');
             // Adiciona ponto e vírgula se não for uma estrutura de controle incompleta
             if (!/\{$|\}$/.test(jsLine.trim())) { // Não adiciona ; se terminar com { ou }
                jsLine += ';';
             }
        }


        // Mantém a indentação original (aproximadamente)
        const leadingWhitespace = line.match(/^\s*/)[0];
        return jsLine !== null ? leadingWhitespace + jsLine : line; // Retorna linha original se não foi transpilada
    }

    transpile(advplCode) {
        const lines = advplCode.split('\n');
        const jsLines = [];
        let inCommentBlock = false;

        jsLines.push(`// --- Transpiled from ADVPL to JavaScript ---`);

        lines.forEach(line => {
            const trimmedLine = line.trim();

            // Gerencia blocos de comentário /* */
            if (this.regexPatterns.commentBlockStart.test(trimmedLine)) {
                inCommentBlock = true;
                jsLines.push(line); // Preserva linha de início do bloco
                return; // Próxima linha
            }
            if (inCommentBlock) {
                jsLines.push(line); // Preserva linha dentro do bloco
                if (this.regexPatterns.commentBlockEnd.test(trimmedLine)) {
                    inCommentBlock = false;
                }
                return; // Próxima linha
            }

            // Transpila linha a linha
             const transpiled = this._transpileLine(line);
             jsLines.push(transpiled);

        });

        jsLines.push(`// --- End of Transpilation ---`);
        return jsLines.join('\n');
    }
} 