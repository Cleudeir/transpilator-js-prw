import { jsToAdvplDictionary, advplToJsDictionary } from './advpl_js_dictionary';

export type TranspilationDirection = 'jsToAdvpl' | 'advplToJs';

/**
 * Performs a very basic token replacement based on the dictionaries.
 * WARNING: This is a rudimentary approach and will fail for complex code.
 * Real transpilation requires parsing (AST) and semantic understanding.
 */
export function simpleTranspile(code: string, direction: TranspilationDirection): string {
  const dictionary = direction === 'jsToAdvpl' ? jsToAdvplDictionary : advplToJsDictionary;
  let transpiledCode = code;

  // Create a regex pattern to match dictionary keys as whole words or symbols
  // Escape special regex characters in keys
  const escapedKeys = Object.keys(dictionary).map(key =>
    key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // Prioritize longer keys first to avoid partial replacements (e.g., !== before !)
  escapedKeys.sort((a, b) => b.length - a.length);

  // Build a regex that matches any of the keys
  // We use word boundaries (\b) for alphanumeric keys and lookarounds for operators/symbols
  // This is still imperfect but better than simple string replace.
  const regex = new RegExp(
    escapedKeys.map(key => {
      // Simple check if key looks like an identifier or keyword
      if (/^[a-zA-Z0-9_.]+$/.test(key.replace(/\\/g, ''))) {
        return `\\b${key}\\b`;
      }
      // Otherwise, treat as potential operator/symbol (less strict boundary)
      // This part is tricky and might need refinement
      return key;
    }).join('|'),
    'g'
  );

  try {
      transpiledCode = transpiledCode.replace(regex, (match) => {
        // Need to handle the case where the matched key in regex might have escaped chars
        const originalKey = match; // In simple cases, match is the key
        // A more robust way would be to map back from escapedKeys to original keys if needed
        return dictionary[originalKey] ?? match; // Use original match if not found (shouldn't happen with this regex)
      });
  } catch (error) {
      console.error("Transpilation regex error:", error);
      return `// Error during transpilation: ${error}`;
  }


  // Basic structural replacements (very fragile)
  if (direction === 'jsToAdvpl') {
    // Replace block scopes (simplistic)
    transpiledCode = transpiledCode.replace(/{\s*\n?/g, '\n'); // Opening brace
    transpiledCode = transpiledCode.replace(/\n?}\s*/g, '\n'); // Closing brace
    // Add End Function/EndIf markers where appropriate (requires smarter logic)

  } else { // advplToJs
    // Add semicolons (very basic)
    transpiledCode = transpiledCode.replace(/\r?\n(?![\s]*(?:}|else|if|for|while))/g, ';\n');
    // Wrap User Function body
    // transpiledCode = transpiledCode.replace(/(function\s+\w+\(.*?\))\s*([^]*?)(\n\s*(?:End Function|EndFunc|EndFun))/gi, '$1 {\n$2\n}\n');
    // Wrap If body
    // transpiledCode = transpiledCode.replace(/(if\s*\(.*?\))\s*([^]*?)(\n\s*(?:EndIf|EndIf))/gi, '$1 {\n$2\n}\n');
    // Wrap loops etc. - Needs proper parsing

  }

  return transpiledCode;
} 