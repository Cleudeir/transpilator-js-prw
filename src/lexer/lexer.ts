export interface Token { 
  type: string; 
  value: string 
}

const tokenSpecs: [RegExp, string | null][] = [
  [/^\s+/, null],
  [/^let\b/, 'LET'],
  [/^print\b/, 'PRINT'],
  [/^[a-zA-Z_][a-zA-Z0-9_]*/, 'IDENTIFIER'],
  [/^\d+/, 'NUMBER'],
  [/^=/, 'EQUALS'],
  [/^\+/, 'PLUS'],
  [/^-/, 'MINUS'],
  [/^\*/, 'STAR'],
  [/^\//, 'SLASH'],
  [/^\(/, 'LPAREN'],
  [/^\)/, 'RPAREN'],
  [/^;/, 'SEMICOLON'],
];

export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  let str = input;
  while (str.length > 0) {
    let matched = false;
    for (const [regex, type] of tokenSpecs) {
      const match = regex.exec(str);
      if (match) {
        matched = true;
        if (type) {
          tokens.push({ type, value: match[0] });
        }
        str = str.slice(match[0].length);
        break;
      }
    }
    if (!matched) throw new Error('Unexpected token: ' + str[0]);
  }
  return tokens;
} 