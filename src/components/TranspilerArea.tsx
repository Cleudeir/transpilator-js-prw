import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { debounce } from 'lodash-es'; // Using lodash for debouncing
import { 
  transpileCode, 
  transpileCodeAdvanced, 
  loadExample, 
  TranspilationDirection,
  TranspilationResult,
  TranspilationConfig 
} from '../lib/api';
import StatusIndicator from './StatusIndicator';

const TranspilerArea: React.FC = () => {
  const [jsCode, setJsCode] = useState<string>('');
  const [advplCode, setAdvplCode] = useState<string>("// AdvPL code will appear here after transpilation");
  const [transpilationDirection, setTranspilationDirection] = useState<TranspilationDirection>('jsToAdvpl');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [iterations, setIterations] = useState<number>(0);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [useAdvancedMode, setUseAdvancedMode] = useState<boolean>(false);
  const [transpilationConfig, setTranspilationConfig] = useState<TranspilationConfig>({
    useValidationLoop: true,
    maxIterations: 5,
    optimizeOutput: true,
    preserveComments: true,
    learningEnabled: true,
    correctionThreshold: 0.7,
    timeoutMs: 10000,
  });
  
  // Debounced transpilation function
  const debouncedTranspile = useCallback(
    debounce(async (code: string, direction: TranspilationDirection) => {
      setLoading(true);
      setError(null);
      setWarnings([]);
      
      try {
        let result: TranspilationResult;
        
        if (useAdvancedMode) {
          // Use advanced transpilation with validation loop
          const advancedResult = await transpileCodeAdvanced(code, direction, transpilationConfig);
          result = {
            result: advancedResult.result,
            success: advancedResult.success,
            iterations: advancedResult.iterations.length,
            executionTime: advancedResult.executionTime,
            warnings: advancedResult.iterations.flatMap((iter: any) => 
              iter.verificationResult.warnings.map((w: any) => w.message)
            ),
            errors: advancedResult.success ? [] : advancedResult.iterations.flatMap((iter: any) => 
              iter.verificationResult.errors.map((e: any) => e.message)
            ),
          };
        } else {
          // Use regular transpilation
          result = await transpileCode(code, direction, { 
            useValidationLoop: transpilationConfig.useValidationLoop 
          });
        }
        
        // Handle the result
        if (direction === 'jsToAdvpl') {
          setAdvplCode(result.result);
        } else {
          setJsCode(result.result);
        }
        
        // Update metadata if available
        if (result.iterations !== undefined) setIterations(result.iterations);
        if (result.executionTime !== undefined) setExecutionTime(result.executionTime);
        if (result.warnings) setWarnings(result.warnings);
        if (result.errors && result.errors.length > 0) {
          setError(result.errors.join('\n'));
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
    [useAdvancedMode, transpilationConfig]
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

  const toggleAdvancedMode = () => {
    setUseAdvancedMode(!useAdvancedMode);
    // Retranspile with the new mode
    if (transpilationDirection === 'jsToAdvpl') {
      debouncedTranspile(jsCode, 'jsToAdvpl');
    } else {
      debouncedTranspile(advplCode, 'advplToJs');
    }
  };

  // Update a specific config property
  const updateConfig = (key: keyof TranspilationConfig, value: any) => {
    setTranspilationConfig({
      ...transpilationConfig,
      [key]: value
    });
  };

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex justify-between items-center px-4 bg-gray-800 text-white py-2">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={useAdvancedMode}
              onChange={toggleAdvancedMode}
              className="mr-2"
            />
            Advanced Mode
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={transpilationConfig.useValidationLoop}
              onChange={(e) => updateConfig('useValidationLoop', e.target.checked)}
              className="mr-2"
            />
            Validation Loop
          </label>
          
          {useAdvancedMode && (
            <label className="flex items-center">
              <span className="mr-2">Max Iterations:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={transpilationConfig.maxIterations}
                onChange={(e) => updateConfig('maxIterations', parseInt(e.target.value))}
                className="w-12 bg-gray-700 text-white px-1"
              />
            </label>
          )}
        </div>
        
        <StatusIndicator 
          isLoading={loading} 
          iterations={iterations} 
          time={executionTime} 
        />
      </div>
      
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
          Transpiling... {iterations > 0 && `(Iteration ${iterations})`}
        </div>
      )}
      
      {error && (
        <div className="text-center text-red-600 dark:text-red-400 my-2 max-h-32 overflow-y-auto">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="text-center text-yellow-600 dark:text-yellow-400 my-2 max-h-32 overflow-y-auto">
          <strong>Warnings:</strong>
          <ul className="list-disc list-inside">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="w-full mt-[-1rem]">
        <p className="text-xs text-center text-red-600 dark:text-red-400">
          {useAdvancedMode 
            ? "Advanced transpilation uses AI verification and automatic correction with continuous validation."
            : "Basic transpilation is based on simple text replacement and is highly experimental."
          }
        </p>
      </div>
    </div>
  );
};

export default TranspilerArea;