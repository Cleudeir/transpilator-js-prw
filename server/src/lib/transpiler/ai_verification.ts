// AI Verification and Correction Module for ADVPL Transpilation
import { TranspilationResult, TranspilationError, TranspilationWarning, TranspilationDirection } from './index';

// Types for AI verification
export type VerificationResult = {
  isValid: boolean;
  errors: TranspilationError[];
  warnings: TranspilationWarning[];
  suggestions: CodeSuggestion[];
};

export type CodeSuggestion = {
  originalCode: string;
  suggestedCode: string;
  reasoning: string;
  confidence: number; // 0-1
  location?: {
    startLine: number;
    endLine: number;
  };
};

export type CorrectionStrategy = {
  type: 'replacement' | 'insertion' | 'deletion';
  pattern: string | RegExp;
  replacement?: string;
  description: string;
  priority: number; // 0-10, higher is more important
};

// Known patterns for ADVPL good practices and common errors
const ADVPL_PATTERNS: CorrectionStrategy[] = [
  {
    type: 'replacement',
    pattern: /([a-zA-Z0-9]+)\.\s*length/g,
    replacement: 'Len($1)',
    description: 'Replace JavaScript array.length with ADVPL Len(array)',
    priority: 8
  },
  {
    type: 'replacement',
    pattern: /([a-zA-Z0-9]+)\.push\(/g,
    replacement: 'aAdd($1, ',
    description: 'Replace JavaScript array.push() with ADVPL aAdd(array, value)',
    priority: 8
  },
  {
    type: 'replacement',
    pattern: /\btrue\b/g,
    replacement: '.T.',
    description: 'Replace JavaScript true with ADVPL .T.',
    priority: 9
  },
  {
    type: 'replacement',
    pattern: /\bfalse\b/g,
    replacement: '.F.',
    description: 'Replace JavaScript false with ADVPL .F.',
    priority: 9
  },
  {
    type: 'replacement',
    pattern: /\bnull\b/g,
    replacement: 'Nil',
    description: 'Replace JavaScript null with ADVPL Nil',
    priority: 9
  },
  {
    type: 'replacement',
    pattern: /(\w+)\s*===\s*(\w+)/g,
    replacement: '$1 == $2',
    description: 'Replace JavaScript === with ADVPL ==',
    priority: 7
  },
  {
    type: 'replacement',
    pattern: /(\w+)\s*!==\s*(\w+)/g,
    replacement: '$1 != $2',
    description: 'Replace JavaScript !== with ADVPL !=',
    priority: 7
  },
  {
    type: 'replacement',
    pattern: /&&/g,
    replacement: '.And.',
    description: 'Replace JavaScript && with ADVPL .And.',
    priority: 7
  },
  {
    type: 'replacement',
    pattern: /\|\|/g,
    replacement: '.Or.',
    description: 'Replace JavaScript || with ADVPL .Or.',
    priority: 7
  },
  {
    type: 'replacement',
    pattern: /console\.log\(/g,
    replacement: 'ConOut(',
    description: 'Replace JavaScript console.log with ADVPL ConOut',
    priority: 8
  },
  {
    type: 'replacement',
    pattern: /function\s+(\w+)\s*\(/g,
    replacement: 'User Function $1(',
    description: 'Replace JavaScript function declaration with ADVPL User Function',
    priority: 10
  },
  {
    type: 'replacement',
    pattern: /const\s+(\w+)\s*=/g,
    replacement: 'Local $1 :=',
    description: 'Replace JavaScript const with ADVPL Local',
    priority: 9
  },
  {
    type: 'replacement',
    pattern: /let\s+(\w+)\s*=/g,
    replacement: 'Local $1 :=',
    description: 'Replace JavaScript let with ADVPL Local',
    priority: 9
  },
  {
    type: 'replacement',
    pattern: /var\s+(\w+)\s*=/g,
    replacement: 'Local $1 :=',
    description: 'Replace JavaScript var with ADVPL Local',
    priority: 9
  },
  {
    type: 'replacement',
    pattern: /(\w+)\.toUpperCase\(\)/g,
    replacement: 'Upper($1)',
    description: 'Replace JavaScript string.toUpperCase() with ADVPL Upper(string)',
    priority: 8
  },
  {
    type: 'replacement',
    pattern: /(\w+)\.toLowerCase\(\)/g,
    replacement: 'Lower($1)',
    description: 'Replace JavaScript string.toLowerCase() with ADVPL Lower(string)',
    priority: 8
  }
];

/**
 * Main verification function that analyzes PRW code for correctness
 */
export async function verifyPrwCode(code: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  try {
    // Run static analysis on PRW code
    result.errors = result.errors.concat(checkSyntaxErrors(code));
    result.warnings = result.warnings.concat(checkPrwBestPractices(code));

    // If there are syntax errors, mark as invalid
    if (result.errors.length > 0) {
      result.isValid = false;
    }

    // Check for common patterns that need correction
    result.suggestions = findSuggestions(code);

  } catch (error) {
    result.isValid = false;
    result.errors.push({
      message: `Verification error: ${error instanceof Error ? error.message : String(error)}`
    });
  }

  return result;
}

/**
 * Check for syntax errors in PRW code
 */
function checkSyntaxErrors(code: string): TranspilationError[] {
  const errors: TranspilationError[] = [];

  // Check for unclosed structures
  const structures = [
    { open: 'If', close: 'EndIf' },
    { open: 'While', close: 'EndDo' },
    { open: 'For', close: 'Next' },
    { open: 'User Function', close: 'Return' }
  ];

  structures.forEach(({ open, close }) => {
    const openCount = countOccurrences(code, open);
    const closeCount = countOccurrences(code, close);

    if (openCount > closeCount) {
      errors.push({
        message: `Missing ${close} statement. Found ${openCount} ${open} but only ${closeCount} ${close}.`
      });
    } else if (closeCount > openCount) {
      errors.push({
        message: `Extra ${close} statement. Found ${closeCount} ${close} but only ${openCount} ${open}.`
      });
    }
  });

  // Check for invalid variable assignments
  const assignmentRegex = /([a-zA-Z0-9_]+)\s*=[^=]/g;
  let match;
  while ((match = assignmentRegex.exec(code)) !== null) {
    errors.push({
      message: `Invalid assignment operator. In ADVPL, use := instead of = for assignment (found: ${match[0]})`,
      lineNumber: getLineNumber(code, match.index)
    });
  }

  return errors;
}

/**
 * Check for ADVPL best practices
 */
function checkPrwBestPractices(code: string): TranspilationWarning[] {
  const warnings: TranspilationWarning[] = [];

  // Check for variable naming conventions
  const lines = code.split('\n');
  lines.forEach((line, lineIndex) => {
    // Check for Local variables without type prefix
    if (line.includes('Local ')) {
      const localMatch = /Local\s+([a-zA-Z][a-zA-Z0-9_]*)\s*:=/.exec(line);
      if (localMatch && !isValidPrwVarName(localMatch[1])) {
        warnings.push({
          message: `Variable name '${localMatch[1]}' doesn't follow PRW naming conventions. Consider using type prefixes (e.g., 'n' for numbers, 'c' for strings).`,
          lineNumber: lineIndex + 1
        });
      }
    }

    // Check for literal string concatenation without AllTrim
    if (line.includes('" + "') || line.includes('" + c')) {
      warnings.push({
        message: 'String concatenation in PRW often requires AllTrim() to handle spaces correctly.',
        lineNumber: lineIndex + 1
      });
    }
  });

  return warnings;
}

/**
 * Find potential code improvements and corrections
 */
function findSuggestions(code: string): CodeSuggestion[] {
  const suggestions: CodeSuggestion[] = [];
  const lines = code.split('\n');

  // Apply pattern-based suggestions
  ADVPL_PATTERNS.forEach(pattern => {
    let suggestedCode = code;
    if (pattern.type === 'replacement' && pattern.replacement) {
      const regex = pattern.pattern instanceof RegExp ? pattern.pattern : new RegExp(pattern.pattern, 'g');
      if (regex.test(code)) {
        suggestedCode = code.replace(regex, pattern.replacement);
        
        if (suggestedCode !== code) {
          suggestions.push({
            originalCode: code,
            suggestedCode,
            reasoning: pattern.description,
            confidence: pattern.priority / 10 // Convert priority to 0-1 scale
          });
        }
      }
    }
  });

  // Look for obvious JavaScript constructs that need ADVPL equivalents
  const javascriptConstructs = [
    { pattern: /\${.*?}/g, fix: 'Replace template literals with string concatenation' },
    { pattern: /=>/g, fix: 'Replace arrow functions with User Function' },
    { pattern: /\.map\(/g, fix: 'Replace array.map() with explicit loop' },
    { pattern: /\.filter\(/g, fix: 'Replace array.filter() with explicit loop' },
    { pattern: /\.reduce\(/g, fix: 'Replace array.reduce() with explicit loop' },
    { pattern: /\bimport\b/g, fix: 'Replace import statements with #include directives' },
    { pattern: /\basync\b/g, fix: 'Remove async keyword and rewrite as synchronous code' },
    { pattern: /\bawait\b/g, fix: 'Remove await keyword and handle promises differently' }
  ];

  javascriptConstructs.forEach(({ pattern, fix }) => {
    if (pattern.test(code)) {
      suggestions.push({
        originalCode: 'JavaScript construct detected',
        suggestedCode: 'See reasoning',
        reasoning: fix,
        confidence: 0.9
      });
    }
  });

  return suggestions;
}

/**
 * Apply corrections based on verification results
 */
export async function applyCorrections(
  code: string, 
  verificationResult: VerificationResult
): Promise<string> {
  let correctedCode = code;

  // Sort suggestions by confidence level (highest first)
  const sortedSuggestions = verificationResult.suggestions.sort((a, b) => 
    b.confidence - a.confidence
  );

  // Apply high-confidence suggestions automatically
  for (const suggestion of sortedSuggestions) {
    if (suggestion.confidence > 0.7 && suggestion.suggestedCode !== 'See reasoning') {
      correctedCode = suggestion.suggestedCode;
    }
  }

  // Additional post-processing fixes
  correctedCode = applyPostProcessingFixes(correctedCode);

  return correctedCode;
}

/**
 * Apply final fixes that might be needed after all corrections
 */
function applyPostProcessingFixes(code: string): string {
  let result = code;

  // Add proper header if missing
  if (!result.includes('#Include "Protheus.ch"')) {
    result = '#Include "Protheus.ch"\n#Include "TOTVS.ch"\n\n' + result;
  }

  // Fix block endings
  result = result.replace(/\bif\s*\((.*?)\)\s*\{/gi, 'If $1');
  result = result.replace(/\}\s*else\s*\{/gi, 'Else');
  result = result.replace(/\}\s*else\s+if\s*\((.*?)\)\s*\{/gi, 'ElseIf $1');
  result = result.replace(/\}/g, ''); // Remove closing braces

  return result;
}

/**
 * Integrate AI correction into the main transpilation process
 */
export async function aiBasedCorrection(
  result: TranspilationResult,
  direction: TranspilationDirection
): Promise<TranspilationResult> {
  if (!result.success || result.errors.length === 0 || direction !== 'jsToAdvpl') {
    return result;
  }

  try {
    // Only verify and correct PRW code from JS to PRW direction
    const verificationResult = await verifyPrwCode(result.code);
    
    if (!verificationResult.isValid || verificationResult.suggestions.length > 0) {
      const correctedCode = await applyCorrections(result.code, verificationResult);
      
      // Update the transpilation result
      const newResult: TranspilationResult = {
        ...result,
        code: correctedCode,
        warnings: [...result.warnings]
      };
      
      // Add information about applied corrections
      verificationResult.suggestions.forEach(suggestion => {
        if (suggestion.confidence > 0.7) {
          newResult.warnings.push({
            message: `Applied correction: ${suggestion.reasoning}`
          });
        }
      });
      
      return newResult;
    }
  } catch (error) {
    // If AI correction fails, return the original result with a warning
    result.warnings.push({
      message: `AI correction failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  return result;
}

// Utility functions
function countOccurrences(text: string, pattern: string): number {
  const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function getLineNumber(code: string, index: number): number {
  return code.substring(0, index).split('\n').length;
}

function isValidPrwVarName(name: string): boolean {
  // Check for type prefixes in ADVPL
  const prefixes = ['a', 'c', 'n', 'd', 'l', 'o', 'b'];
  if (name.length >= 2) {
    const firstChar = name.charAt(0).toLowerCase();
    return prefixes.includes(firstChar);
  }
  return false;
} 