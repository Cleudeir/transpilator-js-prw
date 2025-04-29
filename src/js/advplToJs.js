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
            // Placeholders for complex/environment-specific functions
            ['PADR', this._handlePadr], // Placeholder for PADR
            ['TAMSX3', (args) => `_tamsx3_placeholder(${args})`], // Placeholder
            ['XFILIAL', (args) => `_xfilial_placeholder(${args})`], // Placeholder
            ['ESTRUT2', (args) => `_estrut2_placeholder(${args})`], // Placeholder
            ['POSICIONE', (args) => `_posicione_placeholder(${args})`], // Placeholder
            ['FIMESTRUT2', (args) => `_fimEstrut2_placeholder(${args})`], // Placeholder
            ['ERRORBLOCK', (args) => `_errorBlock_placeholder(${args})`], // Placeholder
            ['ENCODEUTF8', (args) => `${args}`], // Placeholder (assume UTF8 env)
            ['GETNEXTALIAS', (args) => `_getNextAlias_placeholder(${args})`], // Placeholder
            // Database function placeholders
            ['DBSEEK', this._handleDbFunction],
            ['DBSETORDER', this._handleDbFunction],
            ['DBGOTOP', this._handleDbFunction],
            ['EOF', this._handleDbFunction],
            ['DBSKIP', this._handleDbFunction],
            // Object/JSON handling
            ['JSONOBJECT', this._handleJsonObject],
        ]);

        // Regex para identificar diferentes linhas/estruturas ADVPL
        this.regexPatterns = {
            include: /^#include/i, // Ignore includes
            annotation: /^@/i, // Ignore annotations
            commentBlockStart: /^\s*\/\*/,    // Forward slash doesn't need escaping here
            commentBlockEnd: /\*\/\s*$/,      // Forward slash doesn't need escaping here
            commentLine: /^\s*\/\//,         // Forward slash doesn't need escaping here
            classStart: /^\s*CLASS\s+([a-zA-Z0-9_]+)(?:\s+FROM\s+([a-zA-Z0-9_]+))?/i,
            classEnd: /^\s*ENDCLASS\s*$/i,
            method: /^\s*(?:STATIC|PUBLIC|PRIVATE)?\s*METHOD\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*(?:CLASS\s+([a-zA-Z0-9_]+))?/i,
            userFunction: /^\s*USER\s+FUNCTION\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*$/i,
            staticFunction: /^\s*STATIC\s+FUNCTION\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*$/i,
            function: /^\s*FUNCTION\s+([a-zA-Z0-9_]+)\s*\((.*?)\)\s*$/i,
            returnStmt: /^\s*RETURN(?:\s+(.*))?/i,
            localDeclareAssign: /^\s*(?:LOCAL|PRIVATE)\s+([a-zA-Z0-9_\[\]]+)\s*(?:\d+)?\s*(?:AS\s+[a-zA-Z]+)?\s*:=\s*(.*)/i, // Simplified array size capture, escaped []
            localDeclare: /^\s*(?:LOCAL|PRIVATE)\s+([a-zA-Z0-9_\[\]]+)\s*(?:\d+)?\s*(?:AS\s+[a-zA-Z]+)?\s*$/i,    // Simplified array size capture, escaped []
            memberDeclare: /^\s*(?:PRIVATE|PUBLIC)\s+DATA\s+([a-zA-Z0-9_]+)/i,
            assignment: /^\s*([a-zA-Z0-9_::\\\[\\].]+)\s*:=\s*(.*)/i, // Includes ::, escaped [] and .
            ifStmt: /^\s*IF\s+(.*)/i,
            elseIfStmt: /^\s*ELSEIF\s+(.*)/i,
            elseStmt: /^\s*ELSE\s*$/i,
            endIfStmt: /^\s*ENDIF\s*$/i,
            forStmt: /^\s*FOR\s+([a-zA-Z0-9_]+)\s*:=\s*(\S+)\s+TO\s+(\S+)(?:\s+STEP\s+(\S+))?\s*$/i,
            nextStmt: /^\s*NEXT\s*(?:[a-zA-Z0-9_]+)?\s*$/i,
            doWhileStmt: /^\s*DO\s+WHILE\s+(.*)/i,
            whileStmt: /^\s*WHILE\s+(.*)/i,
            endDoStmt: /^\s*END(?:DO|)\s*$/i,
            // Regex for object method calls like oRest:setKeyHeaderResponse(...)
            objectMethodCall: /(\b[a-zA-Z0-9_]+\b):([a-zA-Z0-9_]+)\s*\(/g, // Escaped (
            // Regex for alias calls like (cAliasTmp)->(DbGoTop()) or (cAliasTmp)->FIELD
            aliasCall: /\(([a-zA-Z0-9_]+)\)->\(?(.*?)\)?/g, // Escaped (
            // Regex for member access ::
            memberAccess: /::([a-zA-Z0-9_]+)/g,
            // Regex for database field access ->
            dbFieldAccess: /->([a-zA-Z0-9_]+)/g,
        };

        this.unsupportedFeatures = []; // Store detected issues
        this.currentIndent = 0;      // Basic indentation tracking
        this.indentString = '    ';   // 4 spaces
        this.inClass = false;        // Track if currently inside a class definition
        this.currentClassName = null;
    }

    // --- Funções Helper para Mapeamento ---

    _handleEmpty(args) {
        // EMPTY(x) checks Nil, "", {}, 0, .F.
        if (!args) return 'true'; // EMPTY() is true
        const varName = this._transpileExpression(args.trim()); // Transpile inner expression first
        // Approximate check for null, undefined, "", 0, false, empty array
        return `(!${varName} || (Array.isArray(${varName}) && ${varName}.length === 0) || String(${varName}).trim() === '')`;
    }

    _handleLen(args) {
        // LEN(var) -> var.length
        if (!args) return '0';
        const expr = this._transpileExpression(args.trim());
        // Basic check: if it looks like an array literal, use length, otherwise assume string/array var
        if (expr.startsWith('[')) {
            return `${expr}.length`;
        }
        // Check if it might be an object (JSON) - length is tricky here, maybe Object.keys().length?
        // For simplicity, assume array or string length property exists.
        return `${expr}.length`;
    }

     _handleSubstr(args) {
        // SUBSTR(cString, nStart, nLen) -> cString.substring(nStart - 1, nStart - 1 + nLen)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: SUBSTR requires string and start position"';
        const str = this._transpileExpression(parts[0]);
        const start = this._transpileExpression(parts[1]);
        const len = parts.length > 2 ? this._transpileExpression(parts[2]) : null; // nLen é opcional em JS substring se for até o fim

        if (len !== null) {
            // JS substring(start, end) -> end é exclusivo
            // ADVPL SUBSTR(cString, nStart, nLen)
             // Calcula o índice final para JS: (start - 1) + len
             // Ensure start and len are treated as numbers for calculation
            return `${str}.substring((${start}) - 1, ((${start}) - 1) + (${len}))`;
        } else {
            // Se nLen não for fornecido, vai até o fim
            return `${str}.substring((${start}) - 1)`;
        }
    }

    _handleStrTran(args) {
        // STRTRAN(cString, cSearch, cReplace) -> cString.replaceAll(cSearch, cReplace)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: STRTRAN requires string and search string"';
        const str = this._transpileExpression(parts[0]);
        const search = this._transpileExpression(parts[1]);
        const replace = parts.length > 2 ? this._transpileExpression(parts[2]) : '""'; // Default replace é string vazia
        // Usa replaceAll para comportamento similar ao STRTRAN padrão
        return `${str}.replaceAll(${search}, ${replace})`;
    }

     _handleAt(args) {
        // AT(cSearch, cString) -> cString.indexOf(cSearch) // Retorna -1 se não achar, ADVPL retorna 0
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: AT requires search string and target string"';
        const search = this._transpileExpression(parts[0]);
        const target = this._transpileExpression(parts[1]);
        // JS indexOf é 0-based e retorna -1 se não encontrar.
        // ADVPL AT é 1-based e retorna 0 se não encontrar.
        // Adicionamos 1 ao resultado do indexOf para ajustar.
        return `(${target}.indexOf(${search}) + 1)`;
    }

    _handleAAdd(args) {
        // AADD(aArray, xValue) -> aArray.push(xValue)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: AADD requires array and value"';
        const arr = this._transpileExpression(parts[0]);
        const val = this._transpileExpression(parts[1]);
        return `${arr}.push(${val})`;
    }

    _handlePadr(args) {
        // PADR(cString, nLen, cChar) -> cString.padEnd(nLen, cChar)
        const parts = this._parseArgs(args);
        if (parts.length < 2) return '"Argument Error: PADR requires string and length"';
        const str = this._transpileExpression(parts[0]);
        const len = this._transpileExpression(parts[1]);
        const char = parts.length > 2 ? this._transpileExpression(parts[2]) : "' '"; // Default pad char is space
        return `${str}.padEnd(${len}, ${char})`;
    }

     _handleJsonObject(args) {
        // JsonObject():New() -> {}
        if (!args || args.toUpperCase() === ':NEW()') {
            return '{}';
        }
        // Handle other potential JsonObject methods if needed, otherwise return placeholder
        return `_jsonObject_placeholder(${this._transpileExpression(args)})`;
    }

     _handleDbFunction(args, funcName) {
        // Placeholder for generic DB functions like DbSeek, DbSetOrder, etc.
        const parts = this._parseArgs(args);
        const transpiledArgs = parts.map(p => this._transpileExpression(p)).join(', ');
        // Simple placeholder convention
        return `_db_${funcName.toLowerCase()}_placeholder(${transpiledArgs})`;
     }


    // Helper para parsear argumentos de funções (simplista)
    // WARNING: This is very basic and will fail on nested calls or strings with commas.
    // A real implementation needs a proper tokenizer/parser.
    _parseArgs(argsString) {
        if (!argsString) return [];
        // Attempt to handle simple cases better, but still fragile
        let level = 0;
        let currentArg = '';
        const args = [];
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            if (char === '(' || char === '{' || char === '[') level++;
            if (char === ')' || char === '}' || char === ']') level--;
            if (char === ',' && level === 0) {
                args.push(currentArg.trim());
                currentArg = '';
            } else {
                currentArg += char;
            }
        }
        args.push(currentArg.trim());
        return args;
    }

    // Helper para substituir funções ADVPL por JS, incluindo as que precisam de tratamento
    _replaceFunctions(line) {
        // First, replace object method calls o:method() -> o.method()
        // Need to be careful not to replace inside strings
        // This simple replace is risky, a parser is better.
        let processedLine = line.replace(this.regexPatterns.objectMethodCall, '$1.$2(');
         // Replace member access ::member -> this.member
        processedLine = processedLine.replace(this.regexPatterns.memberAccess, '.thisRef.$1'); // Use temp marker

        // Replace alias calls (alias)->(method/field) with placeholders
        processedLine = processedLine.replace(this.regexPatterns.aliasCall, (match, alias, member) => {
            // Check if member looks like a function call
             if (member.includes('(') && member.includes(')')) {
                 const funcNameMatch = member.match(/^([a-zA-Z0-9_]+)\s*\\((.*?)\\)/);
                 if (funcNameMatch) {
                     const funcName = funcNameMatch[1];
                     const args = funcNameMatch[2];
                     const transpiledArgs = this._parseArgs(args).map(a => this._transpileExpression(a)).join(', ');
                     // Special handling for known DB functions called via alias
                     const upperFuncName = funcName.toUpperCase();
                     if (['DBSEEK', 'DBSETORDER', 'DBGOTOP', 'EOF', 'DBSKIP'].includes(upperFuncName)) {
                         return `_db_${funcName.toLowerCase()}_placeholder(${alias}, ${transpiledArgs})`;
                     }
                     return `_aliasCall_placeholder(${alias}, '${funcName}', ${transpiledArgs})`;
                 }
             }
             // Assume it's a field access
             return `_aliasField_placeholder(${alias}, '${member}')`;
        });

         // Replace DB field access ->FIELD with placeholders
         processedLine = processedLine.replace(this.regexPatterns.dbFieldAccess, (match, field, offset, str) => {
             // Attempt to find the table alias immediately before '->' more robustly
             const preceding = str.substring(0, offset);
             const aliasMatch = preceding.match(/([a-zA-Z0-9_]+)\s*$/);
             const alias = aliasMatch ? aliasMatch[1] : '_unknownAlias_';
             // Avoid replacing if part of a placeholder already
             if (preceding.includes('_placeholder')) return match;
             return `/*${alias}->${field}*/ _dbField_placeholder('${alias}', '${field}')`; // Keep original as comment
         });


        // Itera sobre o mapa de funções ADVPL
        this.advplFunctionMap.forEach((jsEquivalent, advplFunc) => {
            // Regex para encontrar a função ADVPL seguida por parênteses
            // \b garante que estamos pegando a palavra inteira
            // Needs careful handling of nested parentheses and strings. This regex is basic.
            const regex = new RegExp(`\\b${advplFunc}\\b\\s*\\((.*?)\\)`, 'gi');

             // Use replace with a function to handle nested calls potentially processed earlier
             processedLine = processedLine.replace(regex, (match, argsStr) => {
                 // Avoid replacing if args contains placeholders indicating it was already processed (crude check)
                 if (argsStr.includes('_placeholder')) {
                     return match; // Skip this match, likely part of arguments already handled
                 }

                 // Check nesting level to avoid matching inner functions incorrectly
                 let openParens = 0;
                 for (let i = 0; i < argsStr.length; i++) {
                     if (argsStr[i] === '(') openParens++;
                     if (argsStr[i] === ')') openParens--;
                     if (openParens < 0) break; // Mismatched parens, likely outer function
                 }

                 if (openParens !== 0) {
                      return match; // Skip if parentheses are unbalanced, probably nested call args
                 }


                 if (typeof jsEquivalent === 'function') {
                    // Se o mapeamento for uma função helper, chame-a
                     // Pass the original function name for context if needed (e.g., for DB functions)
                     return jsEquivalent.call(this, argsStr, advplFunc);
                 } else if (jsEquivalent.startsWith('.')) {
                      // Se for um método (começa com '.'), aplica ao primeiro argumento
                     const parts = this._parseArgs(argsStr);
                     if (!parts || parts.length === 0) return `${advplFunc}("Error: Missing argument for method")`;
                     // Transpile the object part and arguments
                     const object = this._transpileExpression(parts[0]);
                     const methodArgs = parts.slice(1).map(arg => this._transpileExpression(arg)).join(', ');
                     // Handle property access (.trim()) vs method call (.toUpperCase())
                     const isProperty = !jsEquivalent.endsWith('()'); // Simple check
                     if (isProperty) {
                          return `${object}${jsEquivalent}`;
                     } else {
                          // Remove trailing () from jsEquivalent map value if present, add parens here
                           const methodName = jsEquivalent.replace(/\(\)$/, '');
                           return `${object}${methodName}(${methodArgs})`;
                     }
                 } else {
                     // Mapeamento direto ou função global JS
                     // Transpile arguments before inserting
                     const parts = this._parseArgs(argsStr);
                     const transpiledArgs = parts.map(arg => this._transpileExpression(arg)).join(', ');
                     return `${jsEquivalent}(${transpiledArgs})`;
                 }
             });
        });
         // Restore 'this.' from '.thisRef.' marker
         processedLine = processedLine.replace(/\.thisRef\./g, 'this.');
        return processedLine;
    }

    _getIndent() {
        return this.indentString.repeat(this.currentIndent);
    }

     // Processes a line, returning transpiled JS or null/original
    _transpileLine(line, lineNumber) {
        const trimmedLine = line.trim();
        let jsLine = null;
        let indentChangeBefore = 0; // How much to change indent *before* printing this line
        let indentChangeAfter = 0;  // How much to change indent *after* printing this line

        // Ignore comments, includes, annotations
        if (!trimmedLine ||
            this.regexPatterns.commentBlockStart.test(trimmedLine) ||
            this.regexPatterns.commentBlockEnd.test(trimmedLine) ||
            this.regexPatterns.commentLine.test(trimmedLine) ||
            this.regexPatterns.include.test(trimmedLine) ||
            this.regexPatterns.annotation.test(trimmedLine)) {
            // Return original comment line or null for ignored lines
            return this.regexPatterns.commentLine.test(trimmedLine) ||
                   this.regexPatterns.commentBlockStart.test(trimmedLine) ||
                   this.regexPatterns.commentBlockEnd.test(trimmedLine)
                   ? line
                   : null;
        }

        // Process structure first (Class, Method, Function, If, For, While...)
        let matchedStructure = false;
        for (const key in this.regexPatterns) {
            // Skip helper regexes not meant for top-level matching
            if (['objectMethodCall', 'aliasCall', 'memberAccess', 'dbFieldAccess'].includes(key)) continue;

            const match = trimmedLine.match(this.regexPatterns[key]);
            if (match) {
                matchedStructure = true;
                switch (key) {
                    case 'classStart':
                        const [, className, inheritedClass] = match;
                        this.inClass = true;
                        this.currentClassName = className;
                        jsLine = `class ${className}${inheritedClass ? ` extends ${inheritedClass}` : ''} {`;
                        // TODO: Handle PRIVATE DATA members - maybe add constructor initialization?
                        indentChangeAfter = 1;
                        break;
                    case 'classEnd':
                        this.inClass = false;
                        this.currentClassName = null;
                        indentChangeBefore = -1;
                        jsLine = `}`;
                        break;
                    case 'method': {
                        const [, methodName, params] = match;
                        const jsParams = this._parseArgs(params).map(p => p.trim()).filter(p => p).join(', ');
                        // Methods in JS classes don't use 'function' keyword
                        // Handle 'new' specifically (constructor)
                        if (methodName.toLowerCase() === 'new') {
                             jsLine = `constructor(${jsParams}) {`;
                        } else {
                             jsLine = `${methodName}(${jsParams}) {`;
                        }
                        indentChangeAfter = 1;
                        break;
                    }
                     case 'userFunction':
                     case 'staticFunction':
                     case 'function': {
                        // Standalone functions outside classes
                        const [, funcName, params] = match;
                        const jsParams = this._parseArgs(params).map(p => p.trim()).filter(p => p).join(', ');
                        jsLine = `function ${funcName}(${jsParams}) {`;
                        indentChangeAfter = 1;
                        break;
                     }
                    case 'returnStmt': {
                         const [, returnValue] = match;
                         // Handle 'Return Self' in constructor
                         if (this.inClass && returnValue && returnValue.trim().toUpperCase() === 'SELF') {
                              // In JS constructor, 'this' is implicitly returned, so often just need the closing brace logic
                              jsLine = `// return Self; (Implicit in JS constructor/methods)`; // Comment it out
                         } else if (returnValue) {
                              jsLine = `return ${this._transpileExpression(returnValue.trim())};`;
                         } else {
                              jsLine = 'return;'; // Handle empty return
                         }
                        // Decrease indent happens *after* the return line conceptually, handled by block end
                         break;
                    }
                    case 'memberDeclare':
                        // Translate PRIVATE DATA cId -> // private data cId; (or handle in constructor)
                        const [, memberName] = match;
                        jsLine = `// DATA ${memberName}; (Initialize in constructor or handle as needed)`;
                        break;
                    case 'localDeclareAssign': {
                        let [, varName, , value] = match;
                        varName = varName.replace(/\[\].*/, ''); // Remove array notation if present
                        jsLine = `let ${varName} = ${this._transpileExpression(value.trim())};`;
                        break;
                    }
                     case 'localDeclare': {
                        let [, varName, size] = match;
                        varName = varName.replace(/\[\].*/, ''); // Remove array notation if present
                         // Declare as null or array empty/sized array
                        jsLine = `let ${varName} = ${size ? `new Array(${size})` : 'null'};`;
                        break;
                     }
                    case 'assignment': {
                        let [, varName, value] = match;
                        // Transpile both sides
                        const transpiledVar = this._transpileExpression(varName.trim());
                        const transpiledValue = this._transpileExpression(value.trim());
                        jsLine = `${transpiledVar} = ${transpiledValue};`;
                        break;
                    }
                    case 'ifStmt':
                        const [, conditionIf] = match;
                        jsLine = `if (${this._transpileExpression(conditionIf.trim())}) {`;
                        indentChangeAfter = 1;
                        break;
                    case 'elseIfStmt':
                        const [, conditionElseIf] = match;
                        indentChangeBefore = -1; // Close previous block
                        jsLine = `} else if (${this._transpileExpression(conditionElseIf.trim())}) {`;
                        indentChangeAfter = 1; // Open new block
                        break;
                    case 'elseStmt':
                        indentChangeBefore = -1; // Close previous block
                        jsLine = `} else {`;
                        indentChangeAfter = 1; // Open new block
                        break;
                    case 'endIfStmt':
                        indentChangeBefore = -1;
                        jsLine = `}`;
                        break;
                    case 'forStmt': {
                        let [, loopVar, start, end, step] = match;
                        step = step ? this._transpileExpression(step.trim()) : '1';
                        start = this._transpileExpression(start.trim());
                        end = this._transpileExpression(end.trim());

                        let comparison = '<=';
                        let increment = `${loopVar}++`;
                         // Basic check for step direction - needs improvement for non-literal step
                         // Try evaluating step if it's a number literal
                         const stepNum = parseFloat(step);
                         if (!isNaN(stepNum) && stepNum < 0) {
                             comparison = '>=';
                             increment = `${loopVar} += ${step}`; // Handles negative step
                         } else if (step !== '1') {
                              // Check if step is potentially negative variable/expression
                             comparison = `(${step} > 0 ? ${loopVar} <= ${end} : ${loopVar} >= ${end})`;
                             increment = `${loopVar} += ${step}`;
                         } else {
                             // Default step = 1
                             comparison = `<=`;
                             increment = `${loopVar}++`;
                         }

                        jsLine = `for (let ${loopVar} = ${start}; ${comparison}; ${increment}) {`;
                        indentChangeAfter = 1;
                        break;
                    }
                    case 'nextStmt':
                        indentChangeBefore = -1;
                        jsLine = `}`;
                        break;
                    case 'doWhileStmt':
                    case 'whileStmt': {
                        const [, condition] = match;
                        jsLine = `while (${this._transpileExpression(condition.trim())}) {`;
                        indentChangeAfter = 1;
                        break;
                    }
                    case 'endDoStmt':
                        indentChangeBefore = -1;
                        jsLine = `}`;
                        break;

                    default:
                        // Should not happen if all patterns are covered
                        matchedStructure = false;
                        break;
                }
                // If a structural element was matched, break from the loop
                if (matchedStructure) break;
            }
        }

        // If no structural match, treat as potential expression/call statement
        if (!matchedStructure && jsLine === null) {
            const transpiledExpression = this._transpileExpression(trimmedLine);
             // Check if it looks like a valid statement (e.g., function call, assignment handled above)
             // Avoid adding lines that are just variable names or literals after transpilation
            if (transpiledExpression.includes('(') || transpiledExpression.includes('=')) { // Basic check
                 jsLine = transpiledExpression.endsWith(';') ? transpiledExpression : transpiledExpression + ';';
            } else {
                // Not a recognized statement, add as comment or log warning
                this.unsupportedFeatures.push(`Line ${lineNumber + 1}: Unrecognized/unhandled statement: '${trimmedLine}' -> '${transpiledExpression}'`);
                jsLine = `// ${trimmedLine}`; // Keep original line as comment
            }
        }


        // Apply indentation changes
        this.currentIndent = Math.max(0, this.currentIndent + indentChangeBefore);

        let indentedJsLine = null;
        if (jsLine !== null) {
            // Add trailing semicolon if needed (basic check)
            const trimmedJsLine = jsLine.trim();
            if (!trimmedJsLine.endsWith(';') &&
                !trimmedJsLine.endsWith('{') &&
                !trimmedJsLine.endsWith('}') &&
                !trimmedJsLine.startsWith('//') &&
                !trimmedJsLine.startsWith('/*'))
                 {
                 jsLine += ';';
            }
            indentedJsLine = this._getIndent() + jsLine;
        }

        // Increase indent for the *next* line if needed
        this.currentIndent += indentChangeAfter;

        return indentedJsLine;
    }


    // Função básica para transpilar expressões (condições, valores, etc.)
    // Needs to be called recursively for complex expressions
    _transpileExpression(expression) {
        let jsExpression = expression.trim();

        // --- Order of operations is important ---

        // 0. Handle specific literals first
        jsExpression = jsExpression.replace(/\{(?!\s*\|)/g, '[').replace(/(?<!\|)\}/g, ']'); // Convert {} to [] (avoid code blocks {|})
        jsExpression = jsExpression.replace(/\.T\./gi, 'true');
        jsExpression = jsExpression.replace(/\.F\./gi, 'false');
        jsExpression = jsExpression.replace(/\bNIL\b/gi, 'null');
        jsExpression = jsExpression.replace(/\bSelf\b/gi, 'this'); // Map Self to this


        // 1. Replace member access ::member -> this.member
        jsExpression = jsExpression.replace(this.regexPatterns.memberAccess, '.thisRef.$1'); // Use temp marker

        // 2. Replace alias calls (alias)->(method/field) with placeholders
        jsExpression = jsExpression.replace(this.regexPatterns.aliasCall, (match, alias, member) => {
             // Check if member looks like a function call
             if (member.includes('(') && member.includes(')')) {
                 const funcNameMatch = member.match(/^([a-zA-Z0-9_]+)\s*\\((.*?)\\)/);
                 if (funcNameMatch) {
                     const funcName = funcNameMatch[1];
                     const args = funcNameMatch[2];
                      // Recursively transpile args here *before* creating the placeholder call
                     const transpiledArgs = this._parseArgs(args).map(a => this._transpileExpression(a)).join(', ');
                     // Special handling for known DB functions called via alias
                      const upperFuncName = funcName.toUpperCase();
                      if (['DBSEEK', 'DBSETORDER', 'DBGOTOP', 'EOF', 'DBSKIP'].includes(upperFuncName)) {
                         // Keep original as comment for clarity
                         return `/*${match}*/ _db_${funcName.toLowerCase()}_placeholder(${alias}, ${transpiledArgs})`;
                      }
                     return `/*${match}*/ _aliasCall_placeholder(${alias}, '${funcName}', ${transpiledArgs})`;
                 }
             }
             // Assume it's a field access
             return `/*${match}*/ _aliasField_placeholder(${alias}, '${member}')`;
        });

        // 3. Replace DB field access ->FIELD with placeholders
        // Ensure this runs *after* alias calls and member access are handled
        jsExpression = jsExpression.replace(this.regexPatterns.dbFieldAccess, (match, field, offset, str) => {
            // Attempt to find the table alias immediately before '->' more robustly
             const preceding = str.substring(0, offset);
             const aliasMatch = preceding.match(/([a-zA-Z0-9_]+)\s*$/);
             const alias = aliasMatch ? aliasMatch[1] : '_unknownAlias_';
             // Avoid replacing if part of a placeholder already
             if (preceding.includes('_placeholder')) return match;
             return `/*${alias}->${field}*/ _dbField_placeholder('${alias}', '${field}')`;
        });


        // 4. Replace object method calls o:method() -> o.method()
        // Make sure the object part is not already a placeholder
        jsExpression = jsExpression.replace(this.regexPatterns.objectMethodCall, (match, object, method) => {
            if (object.includes('_placeholder')) return match; // Avoid double processing
            // Handle specific cases like JsonObject():New() -> {}
            if (object.toUpperCase() === 'JSONOBJECT' && method.toUpperCase() === 'NEW') {
                 return '{}';
            }
             // Handle oBody:ToJson() -> JSON.stringify(oBody)
             if (method.toUpperCase() === 'TOJSON') {
                 return `JSON.stringify(${object})`;
             }
            return `${object}.${method}(`;
        });

        // 5. Replace mapped ADVPL functions (must run after object calls to avoid conflicts)
        jsExpression = this._replaceFunctions(jsExpression); // Call the function replacer


        // 6. Convert logical operators
        jsExpression = jsExpression.replace(/\s+\.AND\.\s+/gi, ' && ');
        jsExpression = jsExpression.replace(/\s+\.OR\.\s+/gi, ' || ');
         // Handle .NOT. carefully with potential parentheses
         jsExpression = jsExpression.replace(/\.NOT\.\s+/gi, '! '); // Place '!' directly before operand
         // Add parentheses around negation if needed (basic heuristic)
         jsExpression = jsExpression.replace(/!\s+([a-zA-Z0-9_.[\]()]+)\s+(===|!==|<=|>=|<|>|&&|\|\|)/g, '!($1) $2');
         jsExpression = jsExpression.replace(/!\s+([a-zA-Z0-9_.[\]()]+)$/g, '!($1)');


        // 7. Convert comparison operators (ensure = becomes ===)
        // Use lookarounds to avoid replacing := or == or similar
         jsExpression = jsExpression.replace(/(?<![:<>!])=(?![:=])/g, ' === '); // Single = -> ===
        jsExpression = jsExpression.replace(/<>/g, ' !== ');
        jsExpression = jsExpression.replace(/!=/g, ' !== ');

         // 8. Convert array/object access o['prop'] -> o['prop'] (should be okay mostly)
         // ADVPL often uses strings for keys, JS does too. Ensure quotes are preserved if used.
         // No explicit change needed here if basic syntax matches, but check transpiled output.

        // 9. Final cleanup: restore 'this.' from marker
        jsExpression = jsExpression.replace(/\.thisRef\./g, 'this.');


        // TODO: Add more rules: Handle arithmetic ops, string concat (+), parentheses precedence, etc.

        return jsExpression;
    }


    transpile(advplCode) {
        this.unsupportedFeatures = []; // Reset errors
        this.currentIndent = 0;      // Reset indent
        this.inClass = false;        // Reset class state
        this.currentClassName = null;
        const lines = advplCode.split('\\n');
        const jsLines = [];
        let isInsideCommentBlock = false;

        for (let i = 0; i < lines.length; i++) {
            let advplLine = lines[i];

             // Handle multi-line comments
             const trimmedLine = advplLine.trim();
             if (this.regexPatterns.commentBlockStart.test(trimmedLine) && !trimmedLine.endsWith('*/')) {
                 isInsideCommentBlock = true;
                 jsLines.push(advplLine); // Keep the start line
                 continue;
             }
             if (isInsideCommentBlock) {
                 jsLines.push(advplLine); // Keep lines inside block
                 if (this.regexPatterns.commentBlockEnd.test(trimmedLine)) {
                     isInsideCommentBlock = false;
                 }
                 continue;
             }

            const jsLine = this._transpileLine(advplLine, i);
            if (jsLine !== null) { // Only add if a line was generated/kept
                jsLines.push(jsLine);
            }
        }

        // --- Check for errors before returning ---
        if (this.unsupportedFeatures.length > 0) {
            console.warn("Transpilation finished with unsupported features:");
            this.unsupportedFeatures.forEach(err => console.warn(err));
            // Optional: Throw error instead of returning potentially incorrect code
            // throw new Error("Unsupported features found: \n" + this.unsupportedFeatures.join('\n'));
        }

        // Basic post-processing: Fix common issues like double semicolons
        let finalCode = jsLines.join('\\n');
        finalCode = finalCode.replace(/;;\s*$/gm, ';'); // Remove double semicolons at line end
        finalCode = finalCode.replace(/(\s*})?;(\s*})/gm, '$1$2'); // Remove semicolon before closing brace


        return finalCode;
    }
}

// Define custom error class (optional but good practice)
class TranspilationError extends Error {
    constructor(message, details = []) {
        super(message);
        this.name = "TranspilationError";
        this.details = details;
    }
} 