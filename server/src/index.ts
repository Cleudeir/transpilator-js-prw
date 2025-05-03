import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { simpleTranspile, TranspilationDirection } from './lib/transpiler';
import { complexJsExample, complexAdvplExample, getExampleByName } from './lib/examples';
import { runValidationLoop, ValidationLoopConfig } from './lib/transpiler/validation_loop';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// API Routes
app.post('/api/transpile', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { code, direction, config } = req.body;

    if (!code || !direction) {
      res.status(400).json({ error: 'Missing required parameters: code and direction' });
      return;
    }

    if (direction !== 'jsToAdvpl' && direction !== 'advplToJs') {
      res.status(400).json({ error: 'Invalid direction. Must be jsToAdvpl or advplToJs' });
      return;
    }

    const userConfig: Partial<ValidationLoopConfig> = config || {};
    
    // Determine whether to use the new validation loop or the legacy transpiler
    if (userConfig.useValidationLoop === true) {
      console.log('Using validation loop for transpilation');
      const result = await runValidationLoop(code, direction as TranspilationDirection, userConfig);
      
      // Return detailed results
      res.json({
        result: result.finalCode,
        success: result.success,
        iterations: result.iterations.length,
        executionTime: result.executionTime,
        warnings: result.iterations.flatMap(iter => 
          iter.verificationResult.warnings.map(w => w.message)
        ),
        errors: result.success ? [] : result.iterations.flatMap(iter => 
          iter.verificationResult.errors.map(e => e.message)
        ),
      });
    } else {
      // Use the legacy simple transpiler for backward compatibility
      console.log('Using simple transpiler');
      const result = simpleTranspile(code, direction as TranspilationDirection);
      res.json({ result });
    }
  } catch (error: any) {
    console.error('Transpilation error:', error);
    res.status(500).json({ error: `Transpilation failed: ${error.message}` });
  }
});

// Enhanced endpoint for advanced transpilation with full validation loop
app.post('/api/transpile/advanced', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { code, direction, config } = req.body;

    if (!code || !direction) {
      res.status(400).json({ error: 'Missing required parameters: code and direction' });
      return;
    }

    if (direction !== 'jsToAdvpl' && direction !== 'advplToJs') {
      res.status(400).json({ error: 'Invalid direction. Must be jsToAdvpl or advplToJs' });
      return;
    }

    // Run the validation loop with the provided configuration
    const result = await runValidationLoop(
      code, 
      direction as TranspilationDirection,
      config || {}
    );

    // Return detailed results including all iterations and learning data
    res.json({
      result: result.finalCode,
      success: result.success,
      iterations: result.iterations,
      executionTime: result.executionTime,
      learningData: {
        detectedPatterns: Array.from(result.learningData.detectedPatterns.entries()),
        appliedCorrections: Array.from(result.learningData.appliedCorrections.entries()),
        failurePoints: result.learningData.failurePoints
      }
    });
  } catch (error: any) {
    console.error('Advanced transpilation error:', error);
    res.status(500).json({ error: `Advanced transpilation failed: ${error.message}` });
  }
});

// Get example code
app.get('/api/examples/:type', (req: express.Request, res: express.Response): void => {
  const { type } = req.params;
  const { name } = req.query;

  if (type !== 'js' && type !== 'advpl') {
    res.status(400).json({ error: 'Invalid example type. Must be js or advpl' });
    return;
  }

  try {
    // If a specific example name is provided, load that example
    if (typeof name === 'string' && name.trim() !== '') {
      const exampleCode = getExampleByName(name, type as 'js' | 'advpl');
      res.json({ code: exampleCode });
    } else {
      // Otherwise load the default complex example
      const code = type === 'js' ? complexJsExample : complexAdvplExample;
      res.json({ code });
    }
  } catch (error: any) {
    console.error('Error loading example:', error);
    res.status(500).json({ error: `Failed to load example: ${error.message}` });
  }
});

// Get available examples list
app.get('/api/examples', (req: express.Request, res: express.Response): void => {
  // This endpoint would return a list of available examples
  res.json({
    examples: [
      { id: 'simple', name: 'Simple Array Processing', description: 'Basic array operations and loops' },
      { id: 'user_management', name: 'User Management System', description: 'Class-based system with methods and relationships' }
    ]
  });
});

// Get transpilation statistics
app.get('/api/stats', (req: express.Request, res: express.Response): void => {
  // This would be implemented to return statistics from transpilation runs
  // For now, return placeholder data
  res.json({
    totalTranspilations: 0,
    successRate: 0,
    averageIterations: 0,
    commonIssues: []
  });
});

// Health check
app.get('/api/health', (req: express.Request, res: express.Response): void => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`JS to PRW transpilation system ready`);
}); 