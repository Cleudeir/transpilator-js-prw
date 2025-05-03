import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { simpleTranspile, TranspilationDirection } from '../lib/transpiler';
import { debounce } from 'lodash-es'; // Using lodash for debouncing

// Example complex code snippets
const complexJsExample = `
function processUserData(users) {
  const activeUsers = [];
  const nameLengths = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.isActive === true && user.age > 18) {
      let fullName = user.firstName + ' ' + user.lastName;
      console.log('Processing user: ' + fullName);
      activeUsers.push(fullName.toUpperCase());
      nameLengths.push(fullName.length);
    } else if (user.age <= 18) {
      console.log('Skipping minor user: ' + user.firstName);
    }
  }

  let totalLength = 0;
  let idx = 0;
  while(idx < nameLengths.length) {
    totalLength += nameLengths[idx];
    idx++;
  }
  const averageLength = nameLengths.length > 0 ? totalLength / nameLengths.length : 0;

  console.log("Active users:", activeUsers);
  console.log("Average name length:", averageLength);

  return { activeCount: activeUsers.length, avgLength: averageLength };
}

const sampleUsers = [
  { firstName: 'John', lastName: 'Doe', age: 30, isActive: true },
  { firstName: 'Jane', lastName: 'Smith', age: 17, isActive: true },
  { firstName: 'Peter', lastName: 'Jones', age: 45, isActive: false },
  { firstName: 'Mary', lastName: 'Brown', age: 25, isActive: true },
];

processUserData(sampleUsers);
`;

const complexAdvplExample = `
#Include "Protheus.ch"

// Exemplo de função ADVPL simulando processamento de dados
User Function ProcessUserData(aUsers)
  Local aActiveUsers := {}
  Local aNameLengths := {}
  Local cFullName := ""
  Local nTotalLength := 0
  Local nAverageLength := 0
  Local nIdx := 0
  Local oUser
  Local lIsActive := .F.
  Local nAge := 0

  For nIdx := 1 To Len(aUsers)
    oUser := aUsers[nIdx] // AdvPL usually uses objects or arrays for structures

    // Assuming oUser is an array: [1]=isActive, [2]=Age, [3]=FirstName, [4]=LastName
    lIsActive := oUser[1]
    nAge := oUser[2]

    If lIsActive == .T. .And. nAge > 18
      cFullName := AllTrim(oUser[3]) + " " + AllTrim(oUser[4])
      ConOut("Processando usuario: " + cFullName)
      aAdd(aActiveUsers, Upper(cFullName))
      aAdd(aNameLengths, Len(cFullName))
    ElseIf nAge <= 18
       ConOut("Pulando usuario menor: " + AllTrim(oUser[3]))
    EndIf
  Next nIdx

  nIdx := 1
  While nIdx <= Len(aNameLengths)
    nTotalLength += aNameLengths[nIdx]
    nIdx++
  EndDo

  If Len(aNameLengths) > 0
     nAverageLength := nTotalLength / Len(aNameLengths)
  Else
     nAverageLength := 0
  EndIf

  ConOut("Usuarios ativos: " + Implode(",", aActiveUsers)) // Implode requires custom function or adaptation
  ConOut("Tamanho medio nome: " + Str(nAverageLength))

  Return { "activeCount" => Len(aActiveUsers), "avgLength" => nAverageLength } // Returning an object/map

// Exemplo de chamada (estrutura de dados simplificada)
Local aSampleUsers := {
  { .T., 30, "John",  "Doe"   },
  { .T., 17, "Jane",  "Smith" },
  { .F., 45, "Peter", "Jones" },
  { .T., 25, "Mary",  "Brown" }
}

ProcessUserData(aSampleUsers)

Return Nil
`;

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