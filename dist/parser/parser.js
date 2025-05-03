let tokens;
let pos;
function peek(offset = 0) {
    return tokens[pos + offset];
}
function consume(type) {
    const token = tokens[pos++];
    if (!token)
        throw new Error('Unexpected end of input');
    if (type && token.type !== type) {
        throw new Error(`Expected ${type}, got ${token?.type || 'end of input'} at line ${token?.line}, column ${token?.column}`);
    }
    return token;
}
function check(type) {
    return peek()?.type === type;
}
function parseNumber() {
    const token = consume('NUMBER');
    return { type: 'NumberLiteral', value: token.value };
}
function parseString() {
    const token = consume('STRING');
    // Remove quotes from the string
    const value = token.value.slice(1, -1);
    return { type: 'StringLiteral', value };
}
function parseIdentifier() {
    const token = consume('IDENTIFIER');
    return { type: 'Identifier', name: token.value };
}
function parseObjectLiteral() {
    consume('LBRACE');
    const properties = [];
    while (!check('RBRACE')) {
        // Parse key
        let key;
        if (check('IDENTIFIER')) {
            key = consume('IDENTIFIER').value;
        }
        else if (check('STRING')) {
            key = consume('STRING').value.slice(1, -1);
        }
        else {
            throw new Error('Object key must be an identifier or string');
        }
        // Parse colon
        consume('COLON');
        // Parse value
        const value = parseExpression();
        properties.push({ key, value });
        // Handle comma
        if (check('COMMA')) {
            consume('COMMA');
        }
        else {
            break;
        }
    }
    consume('RBRACE');
    return { type: 'ObjectLiteral', properties };
}
function parseArrayLiteral() {
    consume('LBRACKET');
    const elements = [];
    while (!check('RBRACKET')) {
        elements.push(parseExpression());
        if (check('COMMA')) {
            consume('COMMA');
        }
        else {
            break;
        }
    }
    consume('RBRACKET');
    return { type: 'ArrayLiteral', elements };
}
function parseMemberExpression(object) {
    consume('DOT');
    const property = parseIdentifier();
    let expr = {
        type: 'MemberExpr',
        object,
        property,
        computed: false
    };
    if (check('DOT')) {
        return parseMemberExpression(expr);
    }
    return expr;
}
function parseCallExpression(callee) {
    consume('LPAREN');
    const args = [];
    if (!check('RPAREN')) {
        do {
            args.push(parseExpression());
        } while (check('COMMA') && consume('COMMA'));
    }
    consume('RPAREN');
    const callExpr = {
        type: 'CallExpr',
        callee,
        arguments: args
    };
    if (check('DOT')) {
        return parseMemberExpression(callExpr);
    }
    return callExpr;
}
function parsePrimary() {
    if (check('NUMBER'))
        return parseNumber();
    if (check('STRING'))
        return parseString();
    if (check('IDENTIFIER')) {
        const identifier = parseIdentifier();
        if (check('LPAREN')) {
            return parseCallExpression(identifier);
        }
        if (check('DOT')) {
            return parseMemberExpression(identifier);
        }
        return identifier;
    }
    if (check('LPAREN')) {
        consume('LPAREN');
        const expr = parseExpression();
        consume('RPAREN');
        return expr;
    }
    if (check('LBRACE')) {
        return parseObjectLiteral();
    }
    if (check('LBRACKET')) {
        return parseArrayLiteral();
    }
    throw new Error('Unexpected token in primary: ' + (peek()?.type || 'end of input'));
}
function parseMultiplicative() {
    let node = parsePrimary();
    while (peek() && (peek()?.type === 'STAR' || peek()?.type === 'SLASH')) {
        const op = consume().value;
        const right = parsePrimary();
        node = { type: 'BinaryExpr', operator: op, left: node, right };
    }
    return node;
}
function parseAdditive() {
    let node = parseMultiplicative();
    while (peek() && (peek()?.type === 'PLUS' || peek()?.type === 'MINUS')) {
        const op = consume().value;
        const right = parseMultiplicative();
        node = { type: 'BinaryExpr', operator: op, left: node, right };
    }
    return node;
}
function parseComparison() {
    let node = parseAdditive();
    while (peek() && ['LESS', 'GREATER', 'LESS_EQUAL', 'GREATER_EQUAL'].includes(peek().type)) {
        const op = consume().value;
        const right = parseAdditive();
        node = { type: 'BinaryExpr', operator: op, left: node, right };
    }
    return node;
}
function parseEquality() {
    let node = parseComparison();
    while (peek() && ['EQUAL', 'NOT_EQUAL', 'STRICT_EQUAL', 'STRICT_NOT_EQUAL'].includes(peek().type)) {
        const op = consume().value;
        const right = parseComparison();
        node = { type: 'BinaryExpr', operator: op, left: node, right };
    }
    return node;
}
function parseAssignment() {
    const left = parseEquality();
    if (check('EQUALS') || check('PLUS_EQUAL') || check('MINUS_EQUAL') ||
        check('MULTIPLY_EQUAL') || check('DIVIDE_EQUAL')) {
        const operator = consume().value;
        const right = parseAssignment();
        return { type: 'AssignmentExpr', operator, left, right };
    }
    return left;
}
function parseExpression() {
    return parseAssignment();
}
function parseImportDeclaration() {
    consume('IMPORT');
    const specifiers = [];
    if (check('LBRACE')) {
        // Import { a, b as c } from 'source'
        consume('LBRACE');
        do {
            const name = consume('IDENTIFIER').value;
            let local = name;
            if (check('IDENTIFIER') && peek()?.value === 'as') {
                consume('IDENTIFIER'); // consume 'as'
                local = consume('IDENTIFIER').value;
            }
            specifiers.push({ type: 'ImportSpecifier', name, local });
        } while (check('COMMA') && consume('COMMA'));
        consume('RBRACE');
    }
    else if (check('IDENTIFIER')) {
        // Import defaultExport from 'source' or Import * as namespace from 'source'
        const firstIdent = consume('IDENTIFIER').value;
        if (check('COMMA')) {
            // Import defaultExport, { a, b } from 'source'
            specifiers.push({ type: 'ImportDefaultSpecifier', name: firstIdent });
            consume('COMMA');
            consume('LBRACE');
            do {
                const name = consume('IDENTIFIER').value;
                let local = name;
                if (check('IDENTIFIER') && peek()?.value === 'as') {
                    consume('IDENTIFIER'); // consume 'as'
                    local = consume('IDENTIFIER').value;
                }
                specifiers.push({ type: 'ImportSpecifier', name, local });
            } while (check('COMMA') && consume('COMMA'));
            consume('RBRACE');
        }
        else if (check('DOT') && consume('DOT') && check('IDENTIFIER') && peek()?.value === 'as') {
            // Import * as namespace from 'source'
            consume('IDENTIFIER'); // consume 'as'
            const namespace = consume('IDENTIFIER').value;
            specifiers.push({ type: 'ImportNamespaceSpecifier', name: '*', local: namespace });
        }
        else {
            // Import defaultExport from 'source'
            specifiers.push({ type: 'ImportDefaultSpecifier', name: firstIdent });
        }
    }
    consume('FROM');
    const source = consume('STRING').value.slice(1, -1);
    consume('SEMICOLON');
    return { type: 'ImportDecl', source, specifiers };
}
function parseVarDecl() {
    let kind;
    if (check('LET')) {
        consume('LET');
        kind = 'let';
    }
    else if (check('VAR')) {
        consume('VAR');
        kind = 'var';
    }
    else if (check('CONST')) {
        consume('CONST');
        kind = 'const';
    }
    else {
        throw new Error('Expected variable declaration');
    }
    const id = consume('IDENTIFIER').value;
    consume('EQUALS');
    const value = parseExpression();
    consume('SEMICOLON');
    return { type: 'VarDecl', id, value, kind };
}
function parsePrint() {
    consume('PRINT');
    const value = parseExpression();
    consume('SEMICOLON');
    return { type: 'Print', value };
}
function parseConsoleLog() {
    consume('CONSOLE_LOG');
    consume('LPAREN');
    const value = parseExpression();
    consume('RPAREN');
    consume('SEMICOLON');
    return { type: 'ConsoleLog', value };
}
function parseFunctionDecl() {
    consume('FUNCTION');
    const id = consume('IDENTIFIER').value;
    consume('LPAREN');
    const params = [];
    if (!check('RPAREN')) {
        do {
            params.push(consume('IDENTIFIER').value);
        } while (check('COMMA') && consume('COMMA'));
    }
    consume('RPAREN');
    consume('LBRACE');
    const body = [];
    while (!check('RBRACE')) {
        body.push(parseStatement());
    }
    consume('RBRACE');
    return { type: 'FunctionDecl', id, params, body };
}
function parseReturnStmt() {
    consume('RETURN');
    let argument = null;
    if (!check('SEMICOLON')) {
        argument = parseExpression();
    }
    consume('SEMICOLON');
    return { type: 'ReturnStmt', argument };
}
function parseIfStmt() {
    consume('IF');
    consume('LPAREN');
    const test = parseExpression();
    consume('RPAREN');
    consume('LBRACE');
    const consequent = [];
    while (!check('RBRACE')) {
        consequent.push(parseStatement());
    }
    consume('RBRACE');
    let alternate = null;
    if (check('ELSE')) {
        consume('ELSE');
        if (check('IF')) {
            alternate = [parseIfStmt()];
        }
        else {
            consume('LBRACE');
            alternate = [];
            while (!check('RBRACE')) {
                alternate.push(parseStatement());
            }
            consume('RBRACE');
        }
    }
    return { type: 'IfStmt', test, consequent, alternate };
}
function parseExpressionStatement() {
    const expr = parseExpression();
    consume('SEMICOLON');
    return { type: 'ExpressionStmt', expression: expr };
}
function parseComment() {
    if (check('COMMENT_LINE')) {
        const comment = consume('COMMENT_LINE');
        return {
            type: 'CommentLine',
            value: comment.value.slice(2) // Remove // from the start
        };
    }
    else if (check('COMMENT_BLOCK')) {
        const comment = consume('COMMENT_BLOCK');
        return {
            type: 'CommentBlock',
            value: comment.value.slice(2, -2) // Remove /* and */ from start and end
        };
    }
    throw new Error('Expected comment');
}
function parseStatement() {
    try {
        if (check('COMMENT_LINE') || check('COMMENT_BLOCK')) {
            return parseComment();
        }
        if (check('IMPORT'))
            return parseImportDeclaration();
        if (check('LET') || check('VAR') || check('CONST'))
            return parseVarDecl();
        if (check('PRINT'))
            return parsePrint();
        if (check('CONSOLE_LOG'))
            return parseConsoleLog();
        if (check('FUNCTION'))
            return parseFunctionDecl();
        if (check('RETURN'))
            return parseReturnStmt();
        if (check('IF'))
            return parseIfStmt();
        // If no specific statement rule matched, it's an expression statement
        return parseExpressionStatement();
    }
    catch (e) {
        console.error('Error parsing statement at token:', peek());
        if (e.message.includes('Expected')) {
            throw e;
        }
        throw new Error(`Error in statement: ${e.message}`);
    }
}
export function parse(inputTokens) {
    tokens = inputTokens;
    pos = 0;
    try {
        const body = [];
        while (pos < tokens.length) {
            body.push(parseStatement());
        }
        return { type: 'Program', body };
    }
    catch (e) {
        console.error('Parse error at position', pos);
        console.error('Current token:', tokens[pos]);
        console.error('Next few tokens:', tokens.slice(pos, pos + 5));
        throw new Error(`Parser error: ${e.message}`);
    }
}
