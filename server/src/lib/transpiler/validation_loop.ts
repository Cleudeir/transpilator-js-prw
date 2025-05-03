// Validation Loop Management for JavaScript to PRW Transpilation
import { 
  TranspilationResult, 
  TranspilationDirection, 
  TranspilationConfig,
  transpileWithVerification
} from './index';
import { verifyPrwCode, applyCorrections, VerificationResult } from './ai_verification';

// Types for validation loop
export type ValidationLoopResult = {
  finalCode: string;
  iterations: TranspilationIteration[];
  success: boolean;
  executionTime: number;
  learningData: LearningData;
};

export type TranspilationIteration = {
  index: number;
  inputCode: string;
  outputCode: string;
  verificationResult: VerificationResult;
  corrections: string[];
  success: boolean;
};

export type LearningData = {
  detectedPatterns: Map<string, number>;
  appliedCorrections: Map<string, number>;
  failurePoints: string[];
};

// Interface for loop configuration
export interface ValidationLoopConfig extends TranspilationConfig {
  maxIterations: number;
  learningEnabled: boolean;
  correctionThreshold: number; // 0-1, minimum confidence to apply corrections
  timeoutMs: number; // Maximum execution time in milliseconds
  useValidationLoop?: boolean; // Whether to use the validation loop or legacy transpiler
}

// Default loop configuration
const DEFAULT_LOOP_CONFIG: ValidationLoopConfig = {
  maxIterations: 5,
  optimizeOutput: true,
  preserveComments: true,
  learningEnabled: true,
  correctionThreshold: 0.7,
  timeoutMs: 10000,
  useValidationLoop: true,
};

/**
 * Main validation loop function that handles the transpilation, 
 * verification, and correction process in a continuous loop
 */
export async function runValidationLoop(
  sourceCode: string,
  direction: TranspilationDirection,
  config: Partial<ValidationLoopConfig> = {}
): Promise<ValidationLoopResult> {
  // Merge provided config with defaults
  const fullConfig: ValidationLoopConfig = { ...DEFAULT_LOOP_CONFIG, ...config };
  
  const startTime = Date.now();
  const iterations: TranspilationIteration[] = [];
  const learningData: LearningData = {
    detectedPatterns: new Map<string, number>(),
    appliedCorrections: new Map<string, number>(),
    failurePoints: []
  };

  let currentCode = sourceCode;
  let success = false;
  let loopCount = 0;

  // Start the validation loop
  while (loopCount < fullConfig.maxIterations) {
    try {
      // Check for timeout
      if (Date.now() - startTime > fullConfig.timeoutMs) {
        learningData.failurePoints.push('Validation loop timeout');
        break;
      }

      // Step 1: Transpile the code
      const transpilationResult = await transpileWithVerification(
        currentCode, 
        direction,
        fullConfig
      );

      // Step 2: Verify the transpiled code
      const verificationResult = await verifyPrwCode(transpilationResult.code);
      
      // Record patterns detected in this iteration
      verificationResult.suggestions.forEach(suggestion => {
        const currentCount = learningData.detectedPatterns.get(suggestion.reasoning) || 0;
        learningData.detectedPatterns.set(suggestion.reasoning, currentCount + 1);
      });

      // Step 3: Apply corrections if needed
      const corrections: string[] = [];
      let correctedCode = transpilationResult.code;
      
      if (!verificationResult.isValid || verificationResult.suggestions.length > 0) {
        // Apply corrections
        correctedCode = await applyCorrections(transpilationResult.code, verificationResult);
        
        // Record applied corrections
        verificationResult.suggestions
          .filter(s => s.confidence >= fullConfig.correctionThreshold)
          .forEach(suggestion => {
            corrections.push(suggestion.reasoning);
            const currentCount = learningData.appliedCorrections.get(suggestion.reasoning) || 0;
            learningData.appliedCorrections.set(suggestion.reasoning, currentCount + 1);
          });
      }

      // Create iteration record
      const iteration: TranspilationIteration = {
        index: loopCount,
        inputCode: currentCode,
        outputCode: correctedCode,
        verificationResult,
        corrections,
        success: verificationResult.isValid && verificationResult.errors.length === 0
      };
      
      iterations.push(iteration);

      // If verification is successful, break the loop
      if (verificationResult.isValid && verificationResult.errors.length === 0) {
        success = true;
        break;
      }

      // If code didn't change after corrections, or we have fatal errors
      // that can't be fixed automatically, break the loop
      if (correctedCode === currentCode || hasFatalErrors(verificationResult)) {
        if (correctedCode === currentCode) {
          learningData.failurePoints.push('No changes after correction');
        } else {
          learningData.failurePoints.push('Fatal error: ' + verificationResult.errors.map(e => e.message).join(', '));
        }
        break;
      }

      // Update current code for next iteration
      currentCode = correctedCode;
      loopCount++;

    } catch (error) {
      // Record error as failure point
      learningData.failurePoints.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
      break;
    }
  }

  // If we hit max iterations without success
  if (loopCount >= fullConfig.maxIterations && !success) {
    learningData.failurePoints.push('Maximum iterations reached without validation success');
  }

  // If learning is enabled, update the correction patterns based on this run
  if (fullConfig.learningEnabled) {
    updateLearningData(learningData);
  }

  return {
    finalCode: iterations.length > 0 ? iterations[iterations.length - 1].outputCode : sourceCode,
    iterations,
    success,
    executionTime: Date.now() - startTime,
    learningData
  };
}

/**
 * Check if the verification result contains fatal errors that can't be
 * fixed automatically
 */
function hasFatalErrors(result: VerificationResult): boolean {
  // Define patterns of errors that are considered "fatal"
  const fatalErrorPatterns = [
    /syntax error/i,
    /undefined function/i,
    /invalid token/i,
    /cannot parse/i
  ];

  return result.errors.some(error => 
    fatalErrorPatterns.some(pattern => pattern.test(error.message))
  );
}

/**
 * Update the learning data store with new information from this run
 */
function updateLearningData(data: LearningData): void {
  // This would connect to a persistent storage for learning data
  // Such as a database or file-based storage
  // For now, we'll just log the learning data
  console.log('Learning data from transpilation run:');
  
  console.log('Detected patterns:');
  data.detectedPatterns.forEach((count, pattern) => {
    console.log(`- ${pattern}: ${count} occurrences`);
  });
  
  console.log('Applied corrections:');
  data.appliedCorrections.forEach((count, correction) => {
    console.log(`- ${correction}: ${count} applications`);
  });
  
  console.log('Failure points:');
  data.failurePoints.forEach(point => {
    console.log(`- ${point}`);
  });
}

/**
 * Get statistics about the validation loop performance
 */
export function getValidationStats(results: ValidationLoopResult[]): any {
  // Calculate statistics across multiple validation runs
  const stats = {
    totalRuns: results.length,
    successfulRuns: results.filter(r => r.success).length,
    averageIterations: 0,
    averageExecutionTime: 0,
    mostCommonPatterns: [] as { pattern: string, count: number }[],
    mostCommonCorrections: [] as { correction: string, count: number }[],
    mostCommonFailures: [] as { failure: string, count: number }[]
  };

  // Calculate averages
  stats.averageIterations = results.reduce((sum, r) => sum + r.iterations.length, 0) / results.length;
  stats.averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

  // Aggregate patterns
  const patternCounts = new Map<string, number>();
  const correctionCounts = new Map<string, number>();
  const failureCounts = new Map<string, number>();
  
  results.forEach(result => {
    // Count patterns
    result.learningData.detectedPatterns.forEach((count, pattern) => {
      const currentCount = patternCounts.get(pattern) || 0;
      patternCounts.set(pattern, currentCount + count);
    });
    
    // Count corrections
    result.learningData.appliedCorrections.forEach((count, correction) => {
      const currentCount = correctionCounts.get(correction) || 0;
      correctionCounts.set(correction, currentCount + count);
    });
    
    // Count failures
    result.learningData.failurePoints.forEach(failure => {
      const currentCount = failureCounts.get(failure) || 0;
      failureCounts.set(failure, currentCount + 1);
    });
  });

  // Convert to arrays and sort
  stats.mostCommonPatterns = Array.from(patternCounts.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count);

  stats.mostCommonCorrections = Array.from(correctionCounts.entries())
    .map(([correction, count]) => ({ correction, count }))
    .sort((a, b) => b.count - a.count);

  stats.mostCommonFailures = Array.from(failureCounts.entries())
    .map(([failure, count]) => ({ failure, count }))
    .sort((a, b) => b.count - a.count);

  return stats;
} 