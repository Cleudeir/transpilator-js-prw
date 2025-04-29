// --- DOM Interaction --- 

document.addEventListener('DOMContentLoaded', () => {
    // Instantiate transpilers from separate files
    const jsToAdvplTranspiler = new JSToADVPLTranspiler();
    const advplToJsTranspiler = new ADVPLToJSTranspiler();

    // Get DOM elements (using updated IDs)
    const leftCodeTextArea = document.getElementById('leftCode');
    const rightCodeTextArea = document.getElementById('rightCode');
    const transpileBtn = document.getElementById('transpileBtn');
    const directionRadios = document.querySelectorAll('input[name=\"direction\"]');
    const leftTitle = document.getElementById('leftTitle');
    const rightTitle = document.getElementById('rightTitle');

    // --- Sample Code Strings ---
    const sampleAdvplCode = `#INCLUDE \"TOTVS.CH\"\n\n` +
                         `// Exemplo de função ADVPL\n` +
                         `User Function MeuExemplo(cParam1, nParam2)\n` +
                         `    Local cTexto := \"\"\n` +
                         `    Local nContador := 0\n` +
                         `    Local aDados := {}\n\n` +
                         `    // Condicional\n` +
                         `    If ValType(cParam1) == \"C\" .AND. !Empty(cParam1)\n` +
                         `        cTexto := Upper(cParam1) + \" Processado.\"\n` +
                         `    Else\n` +
                         `        cTexto := \"Parametro 1 invalido.\"\n` +
                         `        ALERT(cTexto)\n` +
                         `        Return .F. // Retorna Falso\n` +
                         `    EndIf\n\n` +
                         `    // Loop For\n` +
                         `    For nContador := 1 To nParam2 Step 1\n` +
                         `        // Manipulação de Array\n` +
                         `        aAdd(aDados, \"Item \" + cValToChar(nContador))\n` +
                         `    Next nContador\n\n` +
                         `    // Exibindo resultados\n` +
                         `    ConOut(\"Texto Processado: \" + cTexto)\n` +
                         `    ConOut(\"Itens no Array:\")\n` +
                         `    AEval(aDados, {|x| ConOut(\"- \" + x)})\n\n` +
                         `    Return aDados // Retorna o array\n` ;

     const sampleJsCode = `// Example JavaScript Function\n` +
                          `function greetUser(name) {\n` +
                          `  const message = \"Hello, \" + name + \"!\";\n` +
                          `  console.log(message);\n` +
                          `  \n` +
                          `  // Array and loop example\n` +
                          `  let numbers = [];\n` +
                          `  for (let i = 1; i <= 5; i++) {\n` +
                          `    numbers.push(i * 10);\n` +
                          `  }\n` +
                          `  console.log(\"Generated numbers:\", numbers);\n` +
                          `  \n` +
                          `  // Conditional example\n` +
                          `  if (name.length > 5) {\n` +
                          `    console.log(\"The name has more than 5 characters.\");\n` +
                          `    return true;\n` +
                          `  } else {\n` +
                          `    console.log(\"The name has 5 or fewer characters.\");\n` +
                          `    return false;\n` +
                          `  }\n` +
                          `}\n\n` +
                          `// Calling the function\n` +
                          `let user = \"World\";\n` +
                          `let longName = greetUser(user);\n` +
                          `console.log(\"Is the name long?\", longName);\n`;

    // Function to update UI based on selected direction
    function updateUIForDirection() {
        const selectedDirection = document.querySelector('input[name="direction"]:checked').value;
        
        if (selectedDirection === 'jsToAdvpl') {
            leftTitle.textContent = 'JavaScript Code (Input)';
            leftTitle.className = 'text-2xl font-semibold text-blue-700 mb-4'; // Blue for JS
            leftCodeTextArea.readOnly = false;
            leftCodeTextArea.placeholder = 'Enter JavaScript code here...';
            leftCodeTextArea.classList.remove('bg-gray-100', 'focus:ring-green-500');
            leftCodeTextArea.classList.add('bg-gray-50', 'focus:ring-blue-500');

            rightTitle.textContent = 'ADVPL Code (Output)';
            rightTitle.className = 'text-2xl font-semibold text-green-700 mb-4'; // Green for ADVPL
            rightCodeTextArea.readOnly = true;
            rightCodeTextArea.placeholder = 'Transpiled ADVPL code will appear here...';
            rightCodeTextArea.classList.add('bg-gray-100');
            rightCodeTextArea.classList.remove('bg-gray-50', 'focus:ring-blue-500', 'focus:ring-green-500');
            
            // Load JS Example when JS -> ADVPL is selected
            leftCodeTextArea.value = sampleJsCode;

        } else { // advplToJs
            leftTitle.textContent = 'ADVPL Code (Input)';
            leftTitle.className = 'text-2xl font-semibold text-green-700 mb-4'; // Green for ADVPL
            leftCodeTextArea.readOnly = false;
            leftCodeTextArea.placeholder = 'Enter ADVPL code here...';
            leftCodeTextArea.classList.remove('bg-gray-100', 'focus:ring-blue-500');
            leftCodeTextArea.classList.add('bg-gray-50', 'focus:ring-green-500'); // Focus ring green

            rightTitle.textContent = 'JavaScript Code (Output)';
            rightTitle.className = 'text-2xl font-semibold text-blue-700 mb-4'; // Blue for JS
            rightCodeTextArea.readOnly = true;
            rightCodeTextArea.placeholder = 'Transpiled JavaScript code will appear here...';
            rightCodeTextArea.classList.add('bg-gray-100');
            rightCodeTextArea.classList.remove('bg-gray-50', 'focus:ring-blue-500', 'focus:ring-green-500');
            
            // Load ADVPL Example when ADVPL -> JS is selected
            leftCodeTextArea.value = sampleAdvplCode;
        }
        // Clear output on direction change
        rightCodeTextArea.value = '';
        // Optional: Clear input on direction change? 
        // leftCodeTextArea.value = ''; 
    }

    // Initial check for required elements
    if (!leftCodeTextArea || !rightCodeTextArea || !transpileBtn || directionRadios.length === 0 || !leftTitle || !rightTitle) {
        console.error('Required DOM elements not found. Check IDs: leftCode, rightCode, transpileBtn, direction radios, leftTitle, rightTitle.');
        return; // Stop execution if elements are missing
    }

    // Initial UI setup
    updateUIForDirection();

    // Add event listeners
    directionRadios.forEach(radio => {
        radio.addEventListener('change', updateUIForDirection);
    });

    transpileBtn.addEventListener('click', () => {
        const selectedDirection = document.querySelector('input[name="direction"]:checked').value;
        const inputCode = leftCodeTextArea.value;
        let outputCode = '';

        // Clear previous errors/output
        rightCodeTextArea.value = ''; 
        rightCodeTextArea.classList.remove('text-red-600'); // Remove error styling if present

        try {
            let transpiler = null;
            if (selectedDirection === 'jsToAdvpl') {
                transpiler = jsToAdvplTranspiler;
            } else { // advplToJs
                transpiler = advplToJsTranspiler;
            }
            
            // Perform transpilation
            outputCode = transpiler.transpile(inputCode);
            
            // Display successful output
            rightCodeTextArea.value = outputCode;

        } catch (error) {
            console.error("Transpilation failed:", error);
            
            let errorMessage = `// --- Transpilation Error ---`;

            // Check if it's our custom error
            if (error.name === "TranspilationError" && error.unsupportedFeatures && error.unsupportedFeatures.length > 0) {
                errorMessage += `\n// ${error.message}`; 
                errorMessage += `\n// \n// Unsupported Features Found:`;
                error.unsupportedFeatures.forEach(feature => {
                    errorMessage += `\n// - ${feature}`;
                });
            } else {
                // Generic error message for unexpected issues
                errorMessage += `\n// An unexpected error occurred: ${error.message}`;
            }
             errorMessage += `\n// --- Please check the input code. ---`;

            // Display the formatted error in the output area
            rightCodeTextArea.value = errorMessage;
            rightCodeTextArea.classList.add('text-red-600'); // Add styling for errors
        }
    });

    // Remove event listeners for the example buttons
    // loadAdvplExampleBtn.addEventListener('click', () => { ... }); // Removed
    // loadJsExampleBtn.addEventListener('click', () => { ... }); // Removed

}); 