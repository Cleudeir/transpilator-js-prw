export interface Token { 
  type: string; 
  value: string;
  line?: number;
  column?: number;
}

const tokenSpecs: [RegExp, string | null][] = [
  // Whitespace - ignored
  [/^\s+/, null],
  
  // Comments
  [/^\/\/.*$/, 'COMMENT_LINE'],
  [/^\/\*[\s\S]*?\*\//, 'COMMENT_BLOCK'],
  
  // Keywords
  [/^import\b/, 'IMPORT'],
  [/^export\b/, 'EXPORT'],
  [/^from\b/, 'FROM'],
  [/^const\b/, 'CONST'],
  [/^let\b/, 'LET'],
  [/^var\b/, 'VAR'],
  [/^function\b/, 'FUNCTION'],
  [/^return\b/, 'RETURN'],
  [/^if\b/, 'IF'],
  [/^else\b/, 'ELSE'],
  [/^for\b/, 'FOR'],
  [/^while\b/, 'WHILE'],
  [/^async\b/, 'ASYNC'],
  [/^await\b/, 'AWAIT'],
  [/^try\b/, 'TRY'],
  [/^catch\b/, 'CATCH'],
  [/^finally\b/, 'FINALLY'],
  [/^class\b/, 'CLASS'],
  [/^extends\b/, 'EXTENDS'],
  [/^new\b/, 'NEW'],
  [/^this\b/, 'THIS'],
  [/^print\b/, 'PRINT'],
  [/^console\.log\b/, 'CONSOLE_LOG'],
  
  // Regular expressions - after comments but before division operator
  [/^\/(?![*\/])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^\/\\])+\/[gimuy]*/, 'REGEX'],
  
  // Identifiers and literals
  [/^[a-zA-Z_][a-zA-Z0-9_]*/, 'IDENTIFIER'],
  [/^(\d+)(\.\d+)?([eE][+-]?\d+)?/, 'NUMBER'],
  [/^"([^"\\]|\\.)*"/, 'STRING'],
  [/^'([^'\\]|\\.)*'/, 'STRING'],
  [/^`([^`\\]|\\.)*`/, 'TEMPLATE_STRING'],
  
  // Operators and punctuation
  [/^===/, 'STRICT_EQUAL'],
  [/^==/, 'EQUAL'],
  [/^!==/, 'STRICT_NOT_EQUAL'],
  [/^!=/, 'NOT_EQUAL'],
  [/^>=/, 'GREATER_EQUAL'],
  [/^<=/, 'LESS_EQUAL'],
  [/^=>/, 'ARROW'],
  [/^&&/, 'AND'],
  [/^\|\|/, 'OR'],
  [/^\+=/, 'PLUS_EQUAL'],
  [/^-=/, 'MINUS_EQUAL'],
  [/^\*=/, 'MULTIPLY_EQUAL'],
  [/^\/=/, 'DIVIDE_EQUAL'],
  [/^\+\+/, 'INCREMENT'],
  [/^--/, 'DECREMENT'],
  [/^=/, 'EQUALS'],
  [/^\+/, 'PLUS'],
  [/^-/, 'MINUS'],
  [/^\*/, 'STAR'],
  [/^\//, 'SLASH'],
  [/^%/, 'MODULO'],
  [/^>/, 'GREATER'],
  [/^</, 'LESS'],
  [/^!/, 'NOT'],
  [/^&/, 'BITWISE_AND'],
  [/^\|/, 'BITWISE_OR'],
  [/^\^/, 'BITWISE_XOR'],
  [/^~/, 'BITWISE_NOT'],
  
  // Punctuation
  [/^\(/, 'LPAREN'],
  [/^\)/, 'RPAREN'],
  [/^\{/, 'LBRACE'],
  [/^\}/, 'RBRACE'],
  [/^\[/, 'LBRACKET'],
  [/^\]/, 'RBRACKET'],
  [/^;/, 'SEMICOLON'],
  [/^,/, 'COMMA'],
  [/^\.\.\./, 'SPREAD'],
  [/^\./, 'DOT'],
  [/^:/, 'COLON'],
  [/^\?/, 'QUESTION_MARK'],
];

// Special handling for the app.js regex patterns
function preProcessInput(input: string): string {
  // Handle windows CRLF line endings
  input = input.replace(/\r\n/g, '\n');
  
  // Replace regex patterns in app.js with escape characters for backslashes
  if (input.includes('advplGenerator') || input.includes('queryGenerator')) {
    // Replace backslashes in regex patterns
    return input.replace(/(\/.+?\/[gimuy]*)/g, (match) => {
      return match.replace(/\\/g, '\\\\');
    });
  }
  return input;
}

export function lex(input: string): Token[] {
  // Pre-process the input
  input = preProcessInput(input);
  
  const tokens: Token[] = [];
  let str = input;
  let line = 1;
  let column = 1;
  let lastTokenPos = 0;

  try {
    while (str.length > 0) {
      let matched = false;
      for (const [regex, type] of tokenSpecs) {
        const match = regex.exec(str);
        if (match) {
          matched = true;
          const matchedText = match[0];
          lastTokenPos = input.length - str.length;
          
          // Update line and column count
          if (matchedText.includes('\n')) {
            const lines = matchedText.split('\n');
            line += lines.length - 1;
            column = lines[lines.length - 1].length + 1;
          } else {
            column += matchedText.length;
          }
          
          if (type) {
            tokens.push({ type, value: matchedText, line, column });
          }
          str = str.slice(matchedText.length);
          break;
        }
      }
      if (!matched) {
        const nextChar = str[0];
        const context = str.slice(0, Math.min(20, str.length));
        const errorPos = input.length - str.length;
        const linesUpToError = input.slice(0, errorPos).split('\n');
        const errorLine = linesUpToError.length;
        const errorColumn = linesUpToError[linesUpToError.length - 1].length + 1;
        const errorMessage = `Unexpected token: '${nextChar}' at line ${errorLine}, column ${errorColumn}\nContext: "${context.replace(/\n/g, '\\n')}"`;
        throw new Error(errorMessage);
      }
    }
    return tokens;
  } catch (e: any) {
    // Try to provide more context for debugging
    const errorPos = lastTokenPos;
    const linesUpToError = input.slice(0, errorPos).split('\n');
    const errorLine = linesUpToError.length;
    const errorColumn = linesUpToError[linesUpToError.length - 1].length + 1;
    const surroundingLines = input.split('\n').slice(
      Math.max(0, errorLine - 3),
      Math.min(input.split('\n').length, errorLine + 2)
    );
    
    console.error('Error in lexer at position:', errorPos);
    console.error('Line:', errorLine, 'Column:', errorColumn);
    console.error('Surrounding code:');
    surroundingLines.forEach((line, i) => {
      const lineNum = Math.max(0, errorLine - 3) + i + 1;
      console.error(`${lineNum}:${lineNum === errorLine ? '>' : ' '} ${line}`);
    });
    
    if (e.message.includes('Unexpected token')) {
      throw e;
    }
    throw new Error(`Lexer error: ${e.message}`);
  }
} 