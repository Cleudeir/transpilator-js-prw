import { ASTNode } from '../parser/parser.js';
import * as path from 'path';

function genExpr(node: ASTNode): string {
  switch (node.type) {
    case 'NumberLiteral':
      return node.value;
    case 'StringLiteral':
      return `"${node.value}"`;
    case 'Identifier':
      return node.name;
    case 'BinaryExpr':
      return `(${genExpr(node.left)} ${node.operator} ${genExpr(node.right)})`;
    case 'ObjectLiteral': {
      const props = node.properties.map(prop => 
        `"${prop.key}" => ${genExpr(prop.value)}`
      ).join(', ');
      return `{ ${props} }`;
    }
    case 'ArrayLiteral': {
      const elements = node.elements.map(elem => genExpr(elem)).join(', ');
      return `{ ${elements} }`;
    }
    case 'MemberExpr': {
      const object = genExpr(node.object);
      const property = node.property.type === 'Identifier' ? node.property.name : genExpr(node.property);
      return `${object}:${property}`;
    }
    case 'CallExpr': {
      const callee = genExpr(node.callee);
      const args = node.arguments.map(arg => genExpr(arg)).join(', ');
      return `${callee}(${args})`;
    }
    case 'AssignmentExpr': {
      const left = genExpr(node.left);
      const right = genExpr(node.right);
      
      // Map JavaScript assignment operators to AdvPL equivalents
      let operator = ":=";
      switch (node.operator) {
        case '+=': operator = '+='; break;
        case '-=': operator = '-='; break;
        case '*=': operator = '*='; break;
        case '/=': operator = '/='; break;
        default: operator = ':='; break;
      }
      
      return `${left} ${operator} ${right}`;
    }
    default:
      throw new Error('Unknown expression node: ' + node.type);
  }
}

function genStmt(node: ASTNode, indent = ''): string {
  switch (node.type) {
    case 'CommentLine': {
      return `${indent}// ${node.value.trim()}`;
    }
    case 'CommentBlock': {
      // Format multiline comments
      const lines = node.value.split('\n');
      if (lines.length > 1) {
        return `${indent}/*\n${lines.map(line => `${indent} * ${line.trim()}`).join('\n')}\n${indent} */`;
      }
      return `${indent}/* ${node.value.trim()} */`;
    }
    case 'ImportDecl': {
      // Convert import statements to #include directives in AdvPL
      const source = node.source;
      const sourcePath = source.replace('.js', '.ch').replace(/\//g, '\\');
      return `${indent}#include "${sourcePath}"`;
    }
    case 'VarDecl': {
      // In AdvPL, we use Local for local variables
      return `${indent}Local ${node.id} := ${genExpr(node.value)}`;
    }
    case 'Print':
    case 'ConsoleLog': {
      return `${indent}ConOut(${genExpr(node.value)})`;
    }
    case 'FunctionDecl': {
      const params = node.params.join(', ');
      const body = node.body.map(stmt => genStmt(stmt, indent + '    ')).join('\n');
      return `${indent}Function ${node.id}(${params})\n${body}\n${indent}Return\n`;
    }
    case 'ReturnStmt': {
      if (node.argument) {
        return `${indent}Return ${genExpr(node.argument)}`;
      }
      return `${indent}Return`;
    }
    case 'IfStmt': {
      let code = `${indent}If ${genExpr(node.test)}\n`;
      
      // Generate consequent statements
      const consequent = node.consequent.map(stmt => 
        genStmt(stmt, indent + '    ')
      ).join('\n');
      
      code += consequent;
      
      // Generate alternate statements if they exist
      if (node.alternate) {
        code += `\n${indent}Else\n`;
        const alternate = node.alternate.map(stmt => 
          genStmt(stmt, indent + '    ')
        ).join('\n');
        code += alternate;
      }
      
      code += `\n${indent}EndIf`;
      return code;
    }
    case 'ExpressionStmt': {
      if (node.expression.type === 'StringLiteral' && 
          (node.expression.value.startsWith('//') || 
           node.expression.value.startsWith('/*'))) {
        // Handle comments
        return `${indent}// ${node.expression.value.replace(/^\/\/\s*/, '')}`;
      }
      return `${indent}${genExpr(node.expression)}`;
    }
    default:
      if (node.type === 'CallExpr') {
        return `${indent}${genExpr(node)}`;
      }
      throw new Error('Unknown statement node: ' + node.type);
  }
}

export function generate(ast: ASTNode): string {
  if (ast.type !== 'Program') throw new Error('Expected Program node');
  
  // Add the standard AdvPL file header
  let output = `#INCLUDE "Protheus.ch"\n\n`;
  output += `/*/{Protheus.doc} Generated-File\nDescription: Auto-generated AdvPL code\n@type function\n@author Transpiler\n@since ${new Date().toISOString().split('T')[0]}\n*/\n\n`;
  
  // Add function body
  output += ast.body.map(stmt => genStmt(stmt)).join('\n');
  
  return output;
} 