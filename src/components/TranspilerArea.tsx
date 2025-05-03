import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { simpleTranspile, TranspilationDirection } from '../lib/transpiler';
import { debounce } from 'lodash-es'; // Using lodash for debouncing
import { complexJsExample, complexAdvplExample } from '../lib/examples';

const TranspilerArea: React.FC = () => {
  const [jsCode, setJsCode] = useState<string>(complexJsExample);
  const [advplCode, setAdvplCode] = useState<string>("// AdvPL code will appear here after transpilation");
  const [transpilationDirection, setTranspilationDirection] = useState<TranspilationDirection>('jsToAdvpl');

  // Debounced transpilation function
  const debouncedTranspile = useCallback(
    debounce((code: string, direction: TranspilationDirection) => {
      try {
        const result = simpleTranspile(code, direction);
        if (direction === 'jsToAdvpl') {
          setAdvplCode(result);
        } else {
          setJsCode(result);
        }
      } catch (error: any) {
        console.error("Transpilation Error:", error);
        const errorMessage = `// Transpilation Error: ${error.message}`;
        if (direction === 'jsToAdvpl') {
          setAdvplCode(errorMessage);
        } else {
          setJsCode(errorMessage);
        }
      }
    }, 500), // 500ms debounce delay
    [] // Empty dependency array ensures the debounced function is stable
  );

  useEffect(() => {
    // Initial transpilation on load
    debouncedTranspile(jsCode, 'jsToAdvpl');
  }, []); // Run only once on mount

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

  const handleLoadExample = (type: 'js' | 'advpl') => {
    if (type === 'js') {
      setJsCode(complexJsExample);
      debouncedTranspile(complexJsExample, 'jsToAdvpl');
    } else {
      setAdvplCode(complexAdvplExample);
      debouncedTranspile(complexAdvplExample, 'advplToJs');
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