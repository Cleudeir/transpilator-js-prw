// Advanced Transpiler for JavaScript to PRW/ADVPL
import * as acorn from 'acorn';
import { jsToAdvplDictionary } from '../advpl_js_dictionary';

// Types for the transpiler
export type TranspilationDirection = 'jsToAdvpl' | 'advplToJs';
export type TranspilationResult = {
  code: string;
  success: boolean;
  errors: TranspilationError[];
  warnings: TranspilationWarning[];
};

export type TranspilationError = {
  message: string;
  lineNumber?: number;
  column?: number;
  snippet?: string;
};

export type TranspilationWarning = {
  message: string;
  lineNumber?: number;
  column?: number;
  snippet?: string;
};

export type TranspilationConfig = {
  maxIterations: number;
  optimizeOutput: boolean;
  preserveComments: boolean;
  targetVersion?: string; // Target PRW version
};

// Default configuration
const DEFAULT_CONFIG: TranspilationConfig = {
  maxIterations: 5,
  optimizeOutput: true,
  preserveComments: true,
};

/**
 * Main transpilation function with verification and correction loop
 */
export async function transpileWithVerification(
  sourceCode: string, 
  direction: TranspilationDirection,
  config: Partial<TranspilationConfig> = {}
): Promise<TranspilationResult> {
  // Merge provided config with defaults
  const fullConfig: TranspilationConfig = { ...DEFAULT_CONFIG, ...config };
  let currentCode = sourceCode;
  let iterations = 0;
  let result: TranspilationResult = {
    code: "",
    success: false,
    errors: [],
    warnings: []
  };

  // Transpilation loop with verification and correction
  while (iterations < fullConfig.maxIterations) {
    try {
      // Perform initial transpilation
      result = await performTranspilation(currentCode, direction, fullConfig);
      
      // If successful with no errors, break the loop
      if (result.success && result.errors.length === 0) {
        break;
      }
      
      // If there are errors, attempt to correct them
      if (result.errors.length > 0) {
        const correctionResult = await correctTranspilationErrors(result, direction, fullConfig);
        
        // If correction failed or didn't change anything, break the loop
        if (!correctionResult.success || correctionResult.code === currentCode) {
          result = correctionResult;
          break;
        }
        
        // Update the code for the next iteration
        currentCode = correctionResult.code;
      }
      
      iterations++;
    } catch (error) {
      result.success = false;
      result.errors.push({
        message: `Transpilation failed: ${error instanceof Error ? error.message : String(error)}`
      });
      break;
    }
  }

  // If we reached max iterations, add a warning
  if (iterations >= fullConfig.maxIterations) {
    result.warnings.push({
      message: `Reached maximum iterations (${fullConfig.maxIterations}) without perfect transpilation.`
    });
  }

  return result;
}

/**
 * Core transpilation function that handles the actual code conversion
 */
async function performTranspilation(
  sourceCode: string,
  direction: TranspilationDirection,
  config: TranspilationConfig
): Promise<TranspilationResult> {
  const result: TranspilationResult = {
    code: "",
    success: false,
    errors: [],
    warnings: []
  };

  try {
    if (direction === 'jsToAdvpl') {
      // Parse JavaScript code into AST
      const ast = acorn.parse(sourceCode, {
        ecmaVersion: 2020,
        sourceType: 'module',
        locations: true
      });
      
      // Transform AST to PRW code
      result.code = transformJsToPrw(ast, config);
      result.success = true;
      
    } else { // advplToJs
      // PRW to JS is more complex, needs a custom parser for PRW
      result.code = transformPrwToJs(sourceCode, config);
      result.success = true;
    }
    
    // Analyze the result for potential issues
    const validationResult = validateTranspiledCode(result.code, direction);
    result.warnings = result.warnings.concat(validationResult.warnings);
    
    // If there are critical errors, mark as unsuccessful
    if (validationResult.errors.length > 0) {
      result.success = false;
      result.errors = validationResult.errors;
    }
    
  } catch (error) {
    result.success = false;
    if (error instanceof SyntaxError) {
      const syntaxError = error as any;
      result.errors.push({
        message: `Syntax error: ${syntaxError.message}`,
        lineNumber: syntaxError.loc?.line,
        column: syntaxError.loc?.column,
        snippet: getCodeSnippet(sourceCode, syntaxError.loc?.line)
      });
    } else {
      result.errors.push({
        message: `Transpilation error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  return result;
}

/**
 * Transform JavaScript AST to PRW code
 */
function transformJsToPrw(ast: any, config: TranspilationConfig): string {
  let output = "";
  
  // Add PRW header
  output += "#Include 'Protheus.ch'\n#Include 'TOTVS.ch'\n\n";
  
  // Process the AST and generate PRW code
  output += processJsAstNode(ast, 0);
  
  return output;
}

/**
 * Process JavaScript AST nodes and convert to PRW code
 */
function processJsAstNode(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  
  switch (node.type) {
    case 'Program':
      return node.body.map((item: any) => processJsAstNode(item, indentLevel)).join('\n');
      
    case 'FunctionDeclaration':
      return processFunctionDeclaration(node, indentLevel);
      
    case 'VariableDeclaration':
      return processVariableDeclaration(node, indentLevel);
      
    case 'ExpressionStatement':
      return `${indent}${processJsAstNode(node.expression, indentLevel)}`;
      
    case 'CallExpression':
      return processCallExpression(node, indentLevel);
      
    case 'IfStatement':
      return processIfStatement(node, indentLevel);
      
    case 'ForStatement':
      return processForLoop(node, indentLevel);
      
    case 'WhileStatement':
      return processWhileLoop(node, indentLevel);
      
    case 'ReturnStatement':
      return `${indent}Return ${node.argument ? processJsAstNode(node.argument, 0) : ''}`;
      
    case 'BinaryExpression':
      return processBinaryExpression(node);
      
    case 'Literal':
      return processLiteral(node);
      
    case 'Identifier':
      return node.name;
      
    case 'ArrayExpression':
      return processArrayExpression(node, indentLevel);
      
    case 'ObjectExpression':
      return processObjectExpression(node, indentLevel);
      
    case 'MemberExpression':
      return processMemberExpression(node);
      
    default:
      return `/* Unsupported node type: ${node.type} */`;
  }
}

/**
 * Process Function Declaration
 */
function processFunctionDeclaration(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  const functionName = node.id.name;
  const params = node.params.map((param: any) => param.name).join(', ');
  
  let output = `${indent}User Function ${functionName}(${params})\n`;
  
  // Add variable declarations at the top (PRW convention)
  const localVars = collectLocalVariables(node.body);
  if (localVars.length > 0) {
    localVars.forEach(varName => {
      output += `${indent}  Local ${varName}\n`;
    });
    output += '\n';
  }
  
  // Process function body
  if (node.body.type === 'BlockStatement') {
    node.body.body.forEach((statement: any) => {
      output += processJsAstNode(statement, indentLevel + 1) + '\n';
    });
  }
  
  output += `${indent}Return Nil\n`;
  return output;
}

/**
 * Process Variable Declaration
 */
function processVariableDeclaration(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  let output = '';
  
  node.declarations.forEach((decl: any) => {
    const varName = decl.id.name;
    const varType = getPrwVarType(decl.init);
    const prefix = varType.prefix;
    
    if (decl.init) {
      output += `${indent}${prefix}${varName} := ${processJsAstNode(decl.init, 0)}\n`;
    } else {
      output += `${indent}${prefix}${varName} := ${varType.defaultValue}\n`;
    }
  });
  
  return output;
}

/**
 * Helper function to determine PRW variable type
 */
function getPrwVarType(initNode: any): { prefix: string, defaultValue: string } {
  if (!initNode) return { prefix: 'Local ', defaultValue: 'Nil' };
  
  switch (initNode.type) {
    case 'Literal':
      if (typeof initNode.value === 'string') return { prefix: 'Local c', defaultValue: '""' };
      if (typeof initNode.value === 'number') return { prefix: 'Local n', defaultValue: '0' };
      if (typeof initNode.value === 'boolean') return { prefix: 'Local l', defaultValue: '.F.' };
      return { prefix: 'Local ', defaultValue: 'Nil' };
      
    case 'ArrayExpression':
      return { prefix: 'Local a', defaultValue: '{}' };
      
    case 'ObjectExpression':
      return { prefix: 'Local o', defaultValue: '{=>}' };
      
    default:
      return { prefix: 'Local ', defaultValue: 'Nil' };
  }
}

/**
 * Process Call Expression (Function calls)
 */
function processCallExpression(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  
  // Special case for console.log
  if (node.callee.type === 'MemberExpression' && 
      node.callee.object.name === 'console' && 
      node.callee.property.name === 'log') {
    
    const args = node.arguments.map((arg: any) => processJsAstNode(arg, 0)).join(' + ');
    return `${indent}ConOut(${args})`;
  }
  
  const callee = processJsAstNode(node.callee, 0);
  const args = node.arguments.map((arg: any) => processJsAstNode(arg, 0)).join(', ');
  
  return `${callee}(${args})`;
}

/**
 * Process If Statement
 */
function processIfStatement(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  
  let output = `${indent}If ${processJsAstNode(node.test, 0)}\n`;
  
  // Process if body
  if (node.consequent.type === 'BlockStatement') {
    node.consequent.body.forEach((statement: any) => {
      output += processJsAstNode(statement, indentLevel + 1) + '\n';
    });
  } else {
    output += processJsAstNode(node.consequent, indentLevel + 1) + '\n';
  }
  
  // Process else if/else
  if (node.alternate) {
    if (node.alternate.type === 'IfStatement') {
      // This is an else if
      output += `${indent}ElseIf ${processJsAstNode(node.alternate.test, 0)}\n`;
      if (node.alternate.consequent.type === 'BlockStatement') {
        node.alternate.consequent.body.forEach((statement: any) => {
          output += processJsAstNode(statement, indentLevel + 1) + '\n';
        });
      } else {
        output += processJsAstNode(node.alternate.consequent, indentLevel + 1) + '\n';
      }
    } else {
      // This is a regular else
      output += `${indent}Else\n`;
      if (node.alternate.type === 'BlockStatement') {
        node.alternate.body.forEach((statement: any) => {
          output += processJsAstNode(statement, indentLevel + 1) + '\n';
        });
      } else {
        output += processJsAstNode(node.alternate, indentLevel + 1) + '\n';
      }
    }
  }
  
  output += `${indent}EndIf`;
  return output;
}

/**
 * Process For Loop
 */
function processForLoop(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  
  // Extract init, test, and update
  const initVar = node.init.declarations[0].id.name;
  const initValue = processJsAstNode(node.init.declarations[0].init, 0);
  const testOp = node.test.operator;
  const testRight = processJsAstNode(node.test.right, 0);
  const updateOp = node.update.operator;
  
  let output = `${indent}For ${initVar} := ${initValue} To `;
  
  // Determine upper bound and step
  if (testOp === '<') {
    output += `${testRight} - 1`;
  } else if (testOp === '<=') {
    output += testRight;
  } else {
    // Complex condition, use While instead
    return processWhileLoop(node, indentLevel);
  }
  
  // Check for step value
  if (updateOp === '++' || updateOp === '+=') {
    output += ` Step 1\n`;
  } else if (updateOp === '--' || updateOp === '-=') {
    output += ` Step -1\n`;
  } else {
    // Complex update, use While instead
    return processWhileLoop(node, indentLevel);
  }
  
  // Process loop body
  if (node.body.type === 'BlockStatement') {
    node.body.body.forEach((statement: any) => {
      output += processJsAstNode(statement, indentLevel + 1) + '\n';
    });
  } else {
    output += processJsAstNode(node.body, indentLevel + 1) + '\n';
  }
  
  output += `${indent}Next`;
  return output;
}

/**
 * Process While Loop
 */
function processWhileLoop(node: any, indentLevel: number): string {
  const indent = "  ".repeat(indentLevel);
  
  let output = `${indent}While ${processJsAstNode(node.test, 0)}\n`;
  
  // Process loop body
  if (node.body.type === 'BlockStatement') {
    node.body.body.forEach((statement: any) => {
      output += processJsAstNode(statement, indentLevel + 1) + '\n';
    });
  } else {
    output += processJsAstNode(node.body, indentLevel + 1) + '\n';
  }
  
  output += `${indent}EndDo`;
  return output;
}

/**
 * Process Binary Expression
 */
function processBinaryExpression(node: any): string {
  const left = processJsAstNode(node.left, 0);
  const right = processJsAstNode(node.right, 0);
  
  // Map JavaScript operators to PRW operators
  const operatorMap: { [key: string]: string } = {
    '===': '==',
    '!==': '!=',
    '==': '==',
    '!=': '!=',
    '<': '<',
    '>': '>',
    '<=': '<=',
    '>=': '>=',
    '+': '+',
    '-': '-',
    '*': '*',
    '/': '/',
    '%': '%',
    '&&': '.And.',
    '||': '.Or.'
  };
  
  const operator = operatorMap[node.operator] || node.operator;
  return `${left} ${operator} ${right}`;
}

/**
 * Process Literal (string, number, boolean, null)
 */
function processLiteral(node: any): string {
  if (typeof node.value === 'string') {
    return `"${node.value}"`;
  } else if (typeof node.value === 'boolean') {
    return node.value ? '.T.' : '.F.';
  } else if (node.value === null) {
    return 'Nil';
  }
  return String(node.value);
}

/**
 * Process Array Expression
 */
function processArrayExpression(node: any, indentLevel: number): string {
  const elements = node.elements.map((element: any) => processJsAstNode(element, indentLevel)).join(', ');
  return `{${elements}}`;
}

/**
 * Process Object Expression
 */
function processObjectExpression(node: any, indentLevel: number): string {
  if (node.properties.length === 0) return '{=>}';
  
  const props = node.properties.map((prop: any) => {
    const key = prop.key.type === 'Identifier' ? prop.key.name : processJsAstNode(prop.key, 0);
    const value = processJsAstNode(prop.value, indentLevel);
    return `"${key}" => ${value}`;
  }).join(', ');
  
  return `{${props}}`;
}

/**
 * Process Member Expression (object property access)
 */
function processMemberExpression(node: any): string {
  const object = processJsAstNode(node.object, 0);
  const property = node.property.type === 'Identifier' ? node.property.name : processJsAstNode(node.property, 0);
  
  // Handle array access
  if (node.computed) {
    return `${object}[${property}]`;
  }
  
  // Handle method calls like array.push, string.toLowerCase, etc.
  const methodMap: { [key: string]: string } = {
    'push': 'aAdd',
    'pop': 'aDel',
    'length': 'Len',
    'toUpperCase': 'Upper',
    'toLowerCase': 'Lower',
    'substring': 'SubStr',
    'includes': 'in array, requires aScan',
    'indexOf': 'aScan'
  };
  
  if (node.property.type === 'Identifier' && methodMap[node.property.name]) {
    // This will be handled in the call expression processor
    return methodMap[node.property.name];
  }
  
  // Default object property access
  return `${object}["${property}"]`;
}

/**
 * Collect local variables used in function body
 */
function collectLocalVariables(node: any): string[] {
  const vars: Set<string> = new Set();
  
  function visit(node: any) {
    if (!node) return;
    
    if (node.type === 'VariableDeclaration') {
      node.declarations.forEach((decl: any) => {
        if (decl.id.type === 'Identifier') {
          vars.add(decl.id.name);
        }
      });
    }
    
    // Recursively visit all properties
    for (const key in node) {
      if (typeof node[key] === 'object' && node[key] !== null) {
        visit(node[key]);
      }
    }
  }
  
  visit(node);
  return Array.from(vars);
}

/**
 * Transform PRW code to JavaScript
 * Basic implementation - would need a PRW parser for a robust solution
 */
function transformPrwToJs(sourceCode: string, config: TranspilationConfig): string {
  // This is a placeholder for PRW to JS transformation
  // A full implementation would need a PRW parser
  
  let output = "";
  const lines = sourceCode.split('\n');
  
  // Process each line with regex replacements
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines and comments
    if (line === '' || line.startsWith('//')) {
      output += line + '\n';
      continue;
    }
    
    // Function declarations
    if (line.startsWith('User Function')) {
      line = line.replace('User Function', 'function');
    }
    
    // Variable declarations
    if (line.startsWith('Local')) {
      line = line.replace('Local ', 'let ').replace(' := ', ' = ');
    }
    if (line.startsWith('Private')) {
      line = line.replace('Private ', 'let ').replace(' := ', ' = ');
    }
    
    // Control structures
    line = line.replace('EndIf', '}');
    line = line.replace('EndDo', '}');
    line = line.replace('Next', '}');
    
    // Operators
    line = line.replace('.And.', '&&');
    line = line.replace('.Or.', '||');
    line = line.replace('.Not.', '!');
    line = line.replace('.T.', 'true');
    line = line.replace('.F.', 'false');
    
    // Function calls
    line = line.replace('ConOut', 'console.log');
    
    // Add the line to output
    output += line + '\n';
  }
  
  return output;
}

/**
 * Validate the transpiled code for potential issues
 */
function validateTranspiledCode(
  code: string, 
  direction: TranspilationDirection
): { errors: TranspilationError[], warnings: TranspilationWarning[] } {
  const errors: TranspilationError[] = [];
  const warnings: TranspilationWarning[] = [];
  
  if (direction === 'jsToAdvpl') {
    // Check for JavaScript constructs that have no direct PRW equivalent
    if (code.includes('async') || code.includes('await')) {
      warnings.push({
        message: 'Async/await constructs have no direct equivalent in PRW.'
      });
    }
    
    // Check for ES6 features
    if (code.includes('=>')) {
      warnings.push({
        message: 'Arrow functions have been transpiled, but PRW uses traditional function syntax.'
      });
    }
    
    // Check for template literals
    if (code.includes('`')) {
      warnings.push({
        message: 'Template literals have no direct equivalent in PRW.'
      });
    }
  }
  
  return { errors, warnings };
}

/**
 * Get a snippet of code around a line for error context
 */
function getCodeSnippet(code: string, lineNumber?: number): string {
  if (!lineNumber) return '';
  
  const lines = code.split('\n');
  const start = Math.max(0, lineNumber - 2);
  const end = Math.min(lines.length, lineNumber + 2);
  
  return lines.slice(start, end).join('\n');
}

/**
 * Attempt to correct errors in transpiled code
 */
async function correctTranspilationErrors(
  result: TranspilationResult,
  direction: TranspilationDirection,
  config: TranspilationConfig
): Promise<TranspilationResult> {
  // This would be implemented with AI-based correction
  // For now, return the original result
  return result;
}

// Legacy simple transpiler implementation for backward compatibility
export function simpleTranspile(code: string, direction: TranspilationDirection): string {
  let result = "";
  
  // Use the dictionary-based approach as a fallback
  const dictionary = direction === 'jsToAdvpl' ? jsToAdvplDictionary : {};
  
  for (const [key, value] of Object.entries(dictionary)) {
    code = code.replace(new RegExp(key, 'g'), value);
  }
  
  result = code;
  return result;
} 