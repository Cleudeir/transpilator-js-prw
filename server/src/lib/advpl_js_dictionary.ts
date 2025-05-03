// src/lib/advpl_js_dictionary.ts

export const jsToAdvplDictionary: { [key: string]: string } = {
  // Keywords
  'let': 'Local',
  'const': 'Local', // AdvPL doesn't have constants in the same way, often Local is used
  'function': 'User Function', // Basic function definition
  'return': 'Return',
  'if': 'If',
  'else': 'Else',
  'for': 'For',
  'while': 'While',
  'true': '.T.',
  'false': '.F.',
  'null': 'Nil',
  'console.log': 'ConOut', // Basic console output

  // Operators (Simplified - regex might be needed for robust replacement)
  '===': '==',
  '!==': '!=',
  ' && ': ' .And. ',
  ' || ': ' .Or. ',
  '!': ' .Not. ', // Context-dependent

  // Basic Array Methods (Conceptual mapping)
  '.push(': 'aAdd(', // Needs array name as first arg
  '.length': 'Len(', // Needs wrapping: Len(array)
};

export const advplToJsDictionary: { [key: string]: string } = {
  // Keywords
  'Local': 'let',
  'User Function': 'function',
  'End Function': '', // Often maps to closing brace }
  'Return': 'return',
  'If': 'if',
  'Else': 'else',
  'EndIf': '', // Often maps to closing brace }
  'For': 'for',
  'To': ';', // Part of for loop conversion
  'Step': ';', // Part of for loop conversion
  'Next': '', // Often maps to closing brace }
  'While': 'while',
  'EndDo': '', // Often maps to closing brace }
  '.T.': 'true',
  '.F.': 'false',
  'NIL': 'null', // Case-insensitive common usage
  'Nil': 'null',
  'ConOut': 'console.log',

  // Operators (Simplified)
  '==': '===',
  '!=': '!==',
  ' <> ': ' !== ',
  ' .And. ': ' && ',
  ' .Or. ': ' || ',
  ' .Not. ': '!',

  // Basic Functions/Methods (Conceptual mapping)
  'aAdd': '.push', // Needs transformation: array.push(value)
  'Len': '.length', // Needs transformation: array.length
  'Upper': '.toUpperCase', // Needs transformation: string.toUpperCase()
  'Lower': '.toLowerCase', // Needs transformation: string.toLowerCase()
  'SubStr': '.substring', // Needs transformation: string.substring(start, length)
  'Str': 'String', // Needs transformation: String(value)
  'Val': 'parseFloat', // Or parseInt depending on context
  // 'Empty': ... // Complex mapping: Needs context check (e.g., `value === '' || value === null || value === undefined`)
};

// Note: This is a VERY simplified dictionary. Real transpilation needs context,
// syntax parsing (AST), and handling of language nuances. 