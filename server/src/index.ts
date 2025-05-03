import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { simpleTranspile, TranspilationDirection } from './lib/transpiler';
import { complexJsExample, complexAdvplExample } from './lib/examples';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.post('/api/transpile', (req: express.Request, res: express.Response): void => {
  try {
    const { code, direction } = req.body;

    if (!code || !direction) {
      res.status(400).json({ error: 'Missing required parameters: code and direction' });
      return;
    }

    if (direction !== 'jsToAdvpl' && direction !== 'advplToJs') {
      res.status(400).json({ error: 'Invalid direction. Must be jsToAdvpl or advplToJs' });
      return;
    }

    const result = simpleTranspile(code, direction as TranspilationDirection);
    res.json({ result });
  } catch (error: any) {
    console.error('Transpilation error:', error);
    res.status(500).json({ error: `Transpilation failed: ${error.message}` });
  }
});

// Get example code
app.get('/api/examples/:type', (req: express.Request, res: express.Response): void => {
  const { type } = req.params;

  if (type === 'js') {
    res.json({ code: complexJsExample });
  } else if (type === 'advpl') {
    res.json({ code: complexAdvplExample });
  } else {
    res.status(400).json({ error: 'Invalid example type. Must be js or advpl' });
  }
});

// Health check
app.get('/api/health', (req: express.Request, res: express.Response): void => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 