const API_URL = 'http://localhost:3001/api';

export type TranspilationDirection = 'jsToAdvpl' | 'advplToJs';

export interface TranspilationResult {
  result: string;
}

export async function transpileCode(code: string, direction: TranspilationDirection): Promise<string> {
  const response = await fetch(`${API_URL}/transpile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, direction }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to transpile code');
  }
  
  const data = await response.json();
  return data.result;
}

export async function loadExample(type: 'js' | 'advpl'): Promise<string> {
  const response = await fetch(`${API_URL}/examples/${type}`);
  
  if (!response.ok) {
    throw new Error('Failed to load example');
  }
  
  const data = await response.json();
  return data.code;
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