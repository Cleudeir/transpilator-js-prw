let tokens;
let pos;
function peek() {
    return tokens[pos];
}
function consume(type) {
    const token = tokens[pos++];
    if (type && token.type !== type)
        throw new Error(`Expected ${type}, got ${token.type}`);
    return token;
}
function parseNumber() {
    const token = consume('NUMBER');
    return { type: 'NumberLiteral', value: token.value };
}
function parseIdentifier() {
    const token = consume('IDENTIFIER');
    return { type: 'Identifier', name: token.value };
}
function parsePrimary() {
    if (peek().type === 'NUMBER')
        return parseNumber();
    if (peek().type === 'IDENTIFIER')
        return parseIdentifier();
    if (peek().type === 'LPAREN') {
        consume('LPAREN');
        const expr = parseExpression();
        consume('RPAREN');
        return expr;
    }
    throw new Error('Unexpected token in primary: ' + peek().type);
}
function parseMultiplicative() {
    let node = parsePrimary();
    while (peek() && (peek().type === 'STAR' || peek().type === 'SLASH')) {
        const op = consume().value;
        const right = parsePrimary();
        node = { type: 'BinaryExpr', operator: op, left: node, right };
    }
    return node;
}
function parseExpression() {
    let node = parseMultiplicative();
    while (peek() && (peek().type === 'PLUS' || peek().type === 'MINUS')) {
        const op = consume().value;
        const right = parseMultiplicative();
        node = { type: 'BinaryExpr', operator: op, left: node, right };
    }
    return node;
}
function parseVarDecl() {
    consume('LET');
    const id = consume('IDENTIFIER').value;
    consume('EQUALS');
    const value = parseExpression();
    consume('SEMICOLON');
    return { type: 'VarDecl', id, value };
}
function parsePrint() {
    consume('PRINT');
    const value = parseExpression();
    consume('SEMICOLON');
    return { type: 'Print', value };
}
function parseStatement() {
    if (peek().type === 'LET')
        return parseVarDecl();
    if (peek().type === 'PRINT')
        return parsePrint();
    throw new Error('Unknown statement: ' + peek().type);
}
export function parse(inputTokens) {
    tokens = inputTokens;
    pos = 0;
    const body = [];
    while (pos < tokens.length) {
        body.push(parseStatement());
    }
    return { type: 'Program', body };
}
