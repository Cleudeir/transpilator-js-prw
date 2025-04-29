// --- Transpiler Classes --- 

// Custom Error for Transpilation Issues
class TranspilationError extends Error {
    constructor(message, unsupportedFeatures = []) {
        super(message);
        this.name = "TranspilationError";
        this.unsupportedFeatures = unsupportedFeatures; // Array of strings describing issues
    }
}

// JS to ADVPL Transpiler
class JSToADVPLTranspiler {
    constructor() {
        this.currentIndent = 0;
        this.indentString = '    '; // 4 spaces
        this.sourceMap = new Map();
        this.functionMap = new Map([
            ['console.log', 'ConOut'],
            ['Math.floor', 'Int'],
            ['Math.ceil', 'Ceiling'],
            ['Math.round', 'Round'],
            ['Math.random', 'Randomize'],
            ['parseInt', 'Val'],
            ['parseFloat', 'Val'],
            ['toString', 'cValToChar'],
            ['toUpperCase', 'Upper'],
            ['toLowerCase', 'Lower'],
            ['trim', 'AllTrim'],
            ['slice', 'SubStr'], // Note: SubStr params are 1-based index, length
            ['split', 'StrTokArr'], // Note: ADVPL StrTokArr needs delimiter
            ['join', 'ArrayToString'], // Note: ADVPL ArrayToString needs delimiter
            ['includes', 'aScan'] // Note: aScan returns index (0 if not found), not boolean
        ]);
        this.blockClosers = []; // Stack to track block types (if, for, function)
        this.unsupportedFeatures = []; // Store detected issues
    }
    
    reset() {
        this.currentIndent = 0;
        this.sourceMap.clear();
        this.blockClosers = [];
        this.unsupportedFeatures = []; // Reset issues on new transpile
    }

    transpile(jsCode) {
        this.reset();
        try {
            const lines = jsCode.split('\n');
            const advplLines = [];
            
            // Simple pre-pass to guess block types (improves End statement generation)
            this.prePassBlockDetection(lines);
            
            this.buildSourceMap(lines); // Build source map (can be enhanced)
            
            let blockIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                // Skip empty lines and comments
                if (trimmedLine === '' || trimmedLine.startsWith('//')) {
                    advplLines.push(this.getIndent() + (trimmedLine.startsWith('//') ? '// ' + trimmedLine.substring(2) : ''));
                    continue;
                }

                // Process the line, passing the detected block type if available
                const detectedBlock = this.blockClosers[blockIndex];
                const advplLine = this.processLine(line, i, detectedBlock);
                if (advplLine !== null) { // Allow null to skip adding a line (e.g., just '{')
                    advplLines.push(advplLine);
                }

                 // Increment block index if we processed a block-related line
                 if (trimmedLine.endsWith('{') || trimmedLine === '}') {
                     blockIndex++;
                 }
            }
            
            // --- Check for errors before returning ---
            if (this.unsupportedFeatures.length > 0) {
                throw new TranspilationError("Unsupported features found in JavaScript code.", this.unsupportedFeatures);
            }
            
            return advplLines.join('\n');
        } catch (error) {
             // Re-throw our custom error, or wrap other errors
             if (error instanceof TranspilationError) {
                 throw error; 
             } else {
                console.error("Unexpected Transpilation Error:", error);
                // Wrap unexpected errors for consistent handling upstream
                throw new TranspilationError(`Internal transpiler error: ${error.message}`, [ `Internal Error: ${error.message}`]);
             }
        }
    }
    
    prePassBlockDetection(lines) {
        const blockStack = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('function')) blockStack.push('Function');
            else if (trimmedLine.startsWith('if')) blockStack.push('If');
            else if (trimmedLine.startsWith('else if')) blockStack.push('ElseIf'); // Handled as part of If
            // Match 'else {' even if preceded by '}'
            else if (trimmedLine.includes('else {')) blockStack.push('Else'); // Handled as part of If 
            else if (trimmedLine.startsWith('for')) blockStack.push('For');
            // Add other block types like while, switch if needed
            
            if (trimmedLine === '}' && blockStack.length > 0) {
                 this.blockClosers.push(blockStack.pop());
            } else if (trimmedLine.endsWith('{')) {
                 // Store null for opening braces to keep indices aligned
                 this.blockClosers.push(null);
            }
        }
        // Reverse because we process lines top-down but matched closers bottom-up
        // This is a simplification; a proper AST parser would be better.
        // console.log("Detected blocks:", this.blockClosers); 
    }

    buildSourceMap(lines) {
        // Basic source map build (can be significantly improved)
        let currentFunction = null;
        for (const line of lines) {
            const trimmedLine = line.trim();
            const funcMatch = trimmedLine.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
            if (funcMatch) {
                currentFunction = funcMatch[1];
                this.sourceMap.set(currentFunction, { type: 'function', params: [] });
                // Basic param extraction
                const paramsMatch = trimmedLine.match(/\((.*?)\)/);
                if (paramsMatch && paramsMatch[1]) {
                    this.sourceMap.get(currentFunction).params = paramsMatch[1].split(',').map(p => p.trim());
                }
            }
            const varMatch = trimmedLine.match(/(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
            if (varMatch) {
                this.sourceMap.set(varMatch[1], { type: 'variable', scope: currentFunction || 'global' });
            }
            if (trimmedLine === '}' && currentFunction) {
                 // Simplistic scope exit
                 currentFunction = null;
            }
        }
       // console.log("Source Map:", this.sourceMap);
    }

    getIndent() {
        return this.indentString.repeat(this.currentIndent);
    }

    processLine(line, lineNumber, blockType) {
        let indentAdjustment = 0;
        const trimmedLine = line.trim();
        let advplLine = '';

        // Handle block endings first
        if (trimmedLine === '}') {
            this.currentIndent--;
            indentAdjustment = -1;
            const block = blockType; // Get the block type from pre-pass
            if (block === 'Function') {
                advplLine = 'Return // Implicit Return Nil if none specified'; // Basic function end
            } else if (block === 'If' || block === 'ElseIf' || block === 'Else') {
                 // Check if the *next* non-empty line is else/elseif
                // This requires lookahead or better parsing, skip for now.
                advplLine = 'EndIf'; 
            } else if (block === 'For') {
                advplLine = 'Next'; // ADVPL uses Next for For loops
            } else {
                advplLine = 'End // Unknown block type';
            }
             return this.indentString.repeat(Math.max(0, this.currentIndent)) + advplLine; // Return immediately after End
        }
        
        const currentIndentStr = this.getIndent();
        
        // --- Statement Transpilation --- 
        if (trimmedLine.match(/^(var|let|const)\s+/)) {
            advplLine = this.transpileVariableDeclaration(trimmedLine);
        } else if (trimmedLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\.[a-zA-Z_$][a-zA-Z0-9_$]*\s*=[^=]/) || // obj.prop = ... Removed () from char class
                   trimmedLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\[.*\]\s*=[^=]/) || // arr[idx] = ... 
                   trimmedLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=[^=]/)) { // var = ...
            advplLine = this.transpileAssignment(trimmedLine);
        } else if (trimmedLine.match(/^function\s+/)) {
            advplLine = this.transpileFunctionDeclaration(trimmedLine);
        } else if (trimmedLine.startsWith('if')) { // Catches if and else if
            advplLine = this.transpileIfStatement(trimmedLine);
        // Match 'else {' even if preceded by '}' (common formatting)
        } else if (trimmedLine.includes('else {')) { 
            // Extract potential preceding '}'
            const elsePart = trimmedLine.substring(trimmedLine.indexOf('else'));
            if (elsePart.trim() === 'else {') { // Ensure it's just 'else {' potentially after '}'
                 advplLine = 'Else';
                 // We need to handle the closing '}' from the previous if block here
                 // This logic is complex; a simple approach for now:
                 // Assume the '}' handling before this adjusted the indent correctly.
            } else {
                 // If it's more complex than just 'else {' after '}', mark as unsupported
                 this.unsupportedFeatures.push(`Line ${lineNumber + 1}: Complex 'else' structure not supported: '${trimmedLine}'`);
                 advplLine = null;
            }
        } else if (trimmedLine.startsWith('for')) {
            advplLine = this.transpileForLoop(trimmedLine);
        } else if (trimmedLine.startsWith('while')) {
             // Mark 'while' as unsupported
             this.unsupportedFeatures.push(`Line ${lineNumber + 1}: 'while' loops are not supported.`);
             advplLine = null; // Don't generate output for this line
        } else if (trimmedLine.match(/^[a-zA-Z_$][a-zA-Z0-9_$.]*s*(.*);?$/)) { // Includes console.log, Math.xxx(), myFunc()
            advplLine = this.transpileFunctionCall(trimmedLine);
        } else if (trimmedLine.startsWith('return')) {
            advplLine = this.transpileReturnStatement(trimmedLine);
        } else if (trimmedLine === '{') { 
            // Opening brace often doesn't translate directly, handled by indent increase
            advplLine = null; // Don't add a line for just '{'
        } else if (trimmedLine !== '') { // Don't mark empty lines as errors
            // Mark unrecognized lines as unsupported
            this.unsupportedFeatures.push(`Line ${lineNumber + 1}: Unrecognized syntax: '${trimmedLine}'`);
            advplLine = null; // Don't generate output
        }

        // Apply indent if a line was generated
        if(advplLine !== null) {
             advplLine = currentIndentStr + advplLine;
        }
       
        // Handle block beginnings after processing the line content
        // Avoid indenting for object/array literals
        if (trimmedLine.endsWith('{' ) && !trimmedLine.match(/[:=]\s*{/) && !trimmedLine.match(/\(\s*{/)) { // Fixed: Escaped parenthesis in second match
             this.currentIndent++;
        }
        
        return advplLine;
    }
    
    // --- Transpilation Helper Functions --- 

    transpileExpression(expression) {
        expression = expression.trim();

        // 1. String literals - Keep as is
        // Handled implicitly as other replacements won't match inside strings

        // 2. Operators (Order matters slightly)
        expression = expression.replace(/===/g, '=='); // Strict equality -> Normal equality
        expression = expression.replace(/!==/g, '!='); // Strict inequality -> Normal inequality
        expression = expression.replace(/&&/g, '.AND.');
        expression = expression.replace(/\|\|/g, '.OR.');
        expression = expression.replace(/!([^=])/g, '.NOT. $1'); // Logical NOT
        // Arithmetic operators (+, -, *, /) are generally the same
        // TODO: Handle modulo %, exponentiation **

        // 3. Boolean literals
        expression = expression.replace(/\btrue\b/g, '.T.');
        expression = expression.replace(/\bfalse\b/g, '.F.');

        // 4. Null/Undefined -> Nil
        expression = expression.replace(/\bnull\b|\bundefined\b/g, 'Nil');

        // 5. Function calls (including methods)
        // Match function calls like func(..), obj.method(...), maybe obj[method](...)
        expression = expression.replace(/([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\(/g, (match, funcName) => {
            // Check if it's a mapped function
            if (this.functionMap.has(funcName)) {
                // Special handling for specific functions if necessary
                 if (funcName === 'console.log') {
                    // Arguments are handled within transpileFunctionCall
                    return this.functionMap.get(funcName) + '(';
                 } else if (funcName === 'slice') {
                     // Example: Need to potentially adjust args for SubStr
                     // This is complex without parsing args properly.
                      return this.functionMap.get(funcName) + '('; 
                 }
                return this.functionMap.get(funcName) + '(';
            }
            // Assume it's a user function or standard ADVPL func otherwise
            return match; 
        });

        // 6. Array literals -> ADVPL array literals {}
        // This is basic, doesn't handle nested or complex expressions inside
        if (expression.startsWith('[') && expression.endsWith(']')) {
             const items = expression.substring(1, expression.length - 1)
                                 .split(',')
                                 .map(item => this.transpileExpression(item.trim()))
                                 .join(', ');
             return `{${items}}`;
        }
        
        // 7. Object literals -> ADVPL doesn't have direct equivalent (maybe Hash/JSON)
        if (expression.startsWith('{') && expression.endsWith('}')) {
            return `/* Object Literal Not Directly Transpilable: ${expression} */`;
        }

        // TODO: Handle member access obj.prop, obj["prop"], obj[var]
        
        return expression;
    }

    transpileVariableDeclaration(line) {
        const match = line.match(/(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(=\s*(.*))?;?/);
        if (match) {
            const varName = match[2];
            const value = match[4]; // Can be undefined if no initializer
            
            // ADVPL uses LOCAL for function-scoped variables.
            // Global scope requires different handling (PRIVATE/PUBLIC) - assuming LOCAL for now.
            if (value !== undefined) {
                return `Local ${varName} := ${this.transpileExpression(value)}`;
            } else {
                // ADVPL variables are Nil by default if not initialized
                return `Local ${varName}`; 
            }
        } 
        return `// ? ${line}`;
    }

    transpileAssignment(line) {
        const match = line.match(/([^=\s]+)\s*=\s*(.*);?/);
        if (match) {
            const target = match[1]; // Could be variable, obj.prop, array[idx]
            const value = match[2];
            // Basic transpilation of target and value - needs refinement for obj/array access
            return `${this.transpileExpression(target)} := ${this.transpileExpression(value)}`;
        }
        return `// ? ${line}`;
    }

    transpileFunctionDeclaration(line) {
        const match = line.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*?)\)\s*{?/);
        if (match) {
            const functionName = match[1];
            const params = match[2].split(',').map(p => p.trim()).filter(p => p);
            // ADVPL parameters are typically declared inside the function body or implicitly typed
            const advplParams = params.join(', '); 
            // Could add PARAM declarations here if desired: params.map(p => `PARAM ${p}`).join('\n')
            return `User Function ${functionName}(${advplParams})`;
        }
        return `// ? ${line}`;
    }

    transpileFunctionCall(line) {
        const trimmedLine = line.trim().replace(/;$/, '');
        const match = trimmedLine.match(/([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\((.*)\)/);
        if (!match) return `// ? ${line}`; // Return early if no match
        
        let functionName = match[1];
        let argsString = match[2];

        // Transpile arguments individually
        const args = argsString ? argsString.split(',').map(arg => this.transpileExpression(arg.trim())) : [];

        // Special handling for console.log -> ConOut
        if (functionName === 'console.log') {
            // ConOut usually takes strings. Concatenate args if multiple.
            const conOutArgs = args.map(arg => {
                // If arg isn't already a string literal, try converting
                if (!arg.startsWith('"') || !arg.endsWith('"')) {
                    return `cValToChar(${arg})`;
                }
                return arg;
            }).join(' + " " + '); // Add spaces between args
            return `ConOut(${conOutArgs || '""'})`; // Handle no args
        }
        
        // Handle other mapped functions
        if (this.functionMap.has(functionName)) {
             functionName = this.functionMap.get(functionName);
             // Add specific argument adjustments if needed for mapped functions here
             // e.g., slice(start, end) vs SubStr(start, length)
        }
        
        return `${functionName}(${args.join(', ')})`;
    }
    
    transpileIfStatement(line) {
        const match = line.match(/(else\s+if|if)\s*\((.*)\)\s*{?/);
        if (match) {
            const type = match[1];
            const condition = this.transpileExpression(match[2]);
            if (type === 'if') {
                return `If ${condition}`;
            } else { // else if
                return `ElseIf ${condition}`;
            }
        }
        return `// ? ${line}`; // Indicate failure to parse
    }
    
     transpileForLoop(line) {
        // Basic: for (var i = 0; i < N; i++)
        const basicMatch = line.match(/for\s*\(\s*(?:var|let|const)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);\s*\1\s*(<|<=)\s*([^;]+);\s*\1(\+\+|--|\+=\s*1|-\=\s*1)\s*\)\s*{?/);
        if (basicMatch) {
            const iterator = basicMatch[1];
            const start = this.transpileExpression(basicMatch[2]);
            const operator = basicMatch[3];
            let limit = this.transpileExpression(basicMatch[4]);
            const increment = basicMatch[5];

            let step = '1';
            if (increment === '--' || increment.startsWith('-=')) {
                step = '-1';
            } // Assuming ++ or += 1 otherwise
            
            // Adjust limit for ADVPL's inclusive loop
            if (operator === '<') {
                // Attempt to subtract 1 numerically if possible
                const numLimit = parseFloat(limit);
                if (!isNaN(numLimit)) {
                    limit = (numLimit - 1).toString();
                } else {
                    limit = `${limit} - 1`; // Fallback to expression
                }
            }
            // <= doesn't need adjustment

            return `For ${iterator} := ${start} To ${limit} Step ${step}`;
        }
        // Handle other for loops (e.g., for...of, for...in) - Not supported yet
        return `// For loop structure not fully supported: ${line}`;
    }
    
    transpileReturnStatement(line) {
        const match = line.match(/return(?:\s+(.*))?;?/);
        if (match) {
            const value = match[1]; // Can be undefined
            // ADVPL functions return Nil by default if Return is empty
            return `Return${value ? ' ' + this.transpileExpression(value) : ''}`; // Concatenate correctly
        }
        return `// ? ${line}`; // Indicate failure to parse
    }
} 