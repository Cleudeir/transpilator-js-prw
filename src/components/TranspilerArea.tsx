import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash-es'; // Using lodash for debouncing
import { transpileCode, loadExample, TranspilationDirection } from '../lib/api';

const TranspilerArea: React.FC = () => {
  const [jsCode, setJsCode] = useState<string>('');
  const [advplCode, setAdvplCode] = useState<string>("// AdvPL code will appear here after transpilation");
  const [transpilationDirection, setTranspilationDirection] = useState<TranspilationDirection>('jsToAdvpl');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced transpilation function
  const debouncedTranspile = useCallback(
    debounce(async (code: string, direction: TranspilationDirection) => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await transpileCode(code, direction);
        if (direction === 'jsToAdvpl') {
          setAdvplCode(result);
        } else {
          setJsCode(result);
        }
      } catch (error: any) {
        setError(error.message || 'An error occurred during transpilation');
        const errorMessage = `// Transpilation Error: ${error.message}`;
        if (direction === 'jsToAdvpl') {
          setAdvplCode(errorMessage);
        } else {
          setJsCode(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    // Fetch initial JS example from backend
    const fetchInitialExample = async () => {
      setLoading(true);
      try {
        const code = await loadExample('js');
        setJsCode(code);
        debouncedTranspile(code, 'jsToAdvpl');
      } catch (error: any) {
        setError(error.message || 'Failed to load initial example');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialExample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJsChange = (value: string | undefined) => {
    const code = value || '';
    setJsCode(code);
    setTranspilationDirection('jsToAdvpl');
    debouncedTranspile(code, 'jsToAdvpl');
  };

  const handleAdvplChange = (value: string | undefined) => {
    const code = value || '';
    setAdvplCode(code);
    setTranspilationDirection('advplToJs');
    debouncedTranspile(code, 'advplToJs');
  };

  const handleLoadExample = async (type: 'js' | 'advpl') => {
    try {
      setLoading(true);
      setError(null);
      
      const code = await loadExample(type);
      
      if (type === 'js') {
        setJsCode(code);
        debouncedTranspile(code, 'jsToAdvpl');
      } else {
        setAdvplCode(code);
        debouncedTranspile(code, 'advplToJs');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load example');
      console.error('Error loading example:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col w-full gap-4">
      <main className="flex flex-row w-full">
        <div className="w-1/2 m-4">
          <div className="flex justify-between items-center m-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              JavaScript Input
            </h2>
            <button
              onClick={() => handleLoadExample('js')}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
              title="Load Complex JS Example"
              disabled={loading}
            >
              Load JS Example
            </button>
          </div>
          <Editor
            height="75vh"
            language="javascript"
            theme="vs-dark"
            value={jsCode}
            onChange={handleJsChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        <div className="w-1/2 m-4">
          <div className="flex justify-between items-center m-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              AdvPL Output / Input
            </h2>
            <button
              onClick={() => handleLoadExample('advpl')}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded shadow"
              title="Load Complex AdvPL Example"
              disabled={loading}
            >
              Load AdvPL Example
            </button>
          </div>
          <Editor
            height="75vh"
            language="plaintext"
            theme="vs-dark"
            value={advplCode}
            onChange={handleAdvplChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              readOnly: false,
            }}
          />
        </div>
      </main>

      {loading && (
        <div className="text-center text-gray-600 dark:text-gray-400">
          Transpiling...
        </div>
      )}
      
      {error && (
        <div className="text-center text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      )}

      <div className="w-full mt-[-1rem]">
        <p className="text-xs text-center text-red-600 dark:text-red-400">
          Note: Transpilation is based on simple text replacement and is highly
          experimental. Complex structures, scope, and language nuances are not
          fully handled.
        </p>
      </div>
    </div>
  );
};

export default TranspilerArea; 