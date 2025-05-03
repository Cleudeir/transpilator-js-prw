const API_URL = 'http://localhost:3001/api';

export type TranspilationDirection = 'jsToAdvpl' | 'advplToJs';

export interface TranspilationResult {
  result: string;
  success?: boolean;
  iterations?: number;
  executionTime?: number;
  warnings?: string[];
  errors?: string[];
}

export interface TranspilationConfig {
  useValidationLoop?: boolean;
  maxIterations?: number;
  optimizeOutput?: boolean;
  preserveComments?: boolean;
  learningEnabled?: boolean;
  correctionThreshold?: number;
  timeoutMs?: number;
}

export async function transpileCode(
  code: string, 
  direction: TranspilationDirection,
  config?: TranspilationConfig
): Promise<TranspilationResult> {
  const response = await fetch(`${API_URL}/transpile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, direction, config }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to transpile code');
  }
  
  const data = await response.json();
  return data;
}

export async function transpileCodeAdvanced(
  code: string, 
  direction: TranspilationDirection,
  config?: TranspilationConfig
): Promise<any> {
  const response = await fetch(`${API_URL}/transpile/advanced`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, direction, config }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to transpile code');
  }
  
  const data = await response.json();
  return data;
}

export async function loadExample(type: 'js' | 'advpl'): Promise<string> {
  const response = await fetch(`${API_URL}/examples/${type}`);
  
  if (!response.ok) {
    throw new Error('Failed to load example');
  }
  
  const data = await response.json();
  return data.code;
}

export async function getTranspilationStats(): Promise<any> {
  const response = await fetch(`${API_URL}/stats`);
  
  if (!response.ok) {
    throw new Error('Failed to load transpilation statistics');
  }
  
  const data = await response.json();
  return data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    return false;
  }
} 