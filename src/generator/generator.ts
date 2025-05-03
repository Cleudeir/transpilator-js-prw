import { ASTNode } from '../parser/parser.js';

function genExpr(node: ASTNode): string {
  switch (node.type) {
    case 'NumberLiteral':
      return node.value;
    case 'Identifier':
      return node.name;
    case 'BinaryExpr':
      return `(${genExpr(node.left)} ${node.operator} ${genExpr(node.right)})`;
    default:
      throw new Error('Unknown expression node: ' + node.type);
  }
}

export function generate(ast: ASTNode): string {
  if (ast.type !== 'Program') throw new Error('Expected Program node');
  return ast.body
    .map(stmt => {
      switch (stmt.type) {
        case 'VarDecl':
          return `let ${stmt.id} = ${genExpr(stmt.value)};`;
        case 'Print':
          return `console.log(${genExpr(stmt.value)});`;
        default:
          throw new Error('Unknown statement node: ' + stmt.type);
      }
    })
    .join('\n');
} 