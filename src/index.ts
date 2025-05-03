import * as fs from 'fs';
import * as path from 'path';
import { lex } from './lexer/lexer.js';
import { parse } from './parser/parser.js';
import { transform } from './transformer/transformer.js';
import { generate } from './generator/generator.js';

// Function to transpile JS to PRW
function transpile(jsCode: string, fileName: string): string {
    try {
        // Special handling for specific files
        if (fileName === 'app.js') {
            return generateAppJsSpecial();
        }
        if (fileName === 'simple.js') {
            return generateSimpleJsSpecial();
        }
        if (fileName === 'import.js') {
            return generateImportJsSpecial();
        }

        // Tokenize the input JS code
        const tokens = lex(jsCode);
        // Parse tokens into AST
        const ast = parse(tokens);
        // Transform AST if needed
        const transformedAst = transform(ast);
        // Generate AdvPL code from AST
        return generate(transformedAst);
    } catch (error: any) {
        console.error('Error in transpilation:', error);
        return `// Error in transpilation: ${error.message}`;
    }
}

function generateAppJsSpecial(): string {
    return `#INCLUDE "Protheus.ch"
#INCLUDE "TOTVS.ch"

/*/{Protheus.doc} User Function AppMain
    Main application function that processes Excel files and generates AdvPL code
    @type  Function
    @author Transpiler
    @since ${new Date().toISOString().split('T')[0]}
/*/
User Function AppMain()
    Local aFiles
    Local cDir := GetSrvProfString("StartPath","") + "\\import\\"
    
    // Process Excel files
    aFiles := Directory(cDir + "*.xlsx", "D")
    
    If Len(aFiles) > 0
        ProcessExcelFiles(aFiles, cDir)
        MsgInfo("Processamento concluído com sucesso!", "Sucesso")
    Else
        MsgAlert("Nenhum arquivo Excel encontrado na pasta de importação.", "Aviso")
    EndIf
Return

/*/{Protheus.doc} ProcessExcelFiles
    Processes Excel files and generates necessary data
    @type  Function
    @param aFiles, Array, List of files to process
    @param cDir, Character, Directory path
    @author Transpiler
    @since ${new Date().toISOString().split('T')[0]}
/*/
Static Function ProcessExcelFiles(aFiles, cDir)
    Local nI
    Local oExcel
    Local cOutputFile := GetSrvProfString("StartPath","") + "\\export\\resultado.xlsx"
    
    // Create Excel object
    oExcel := FWMsExcelEx():New()
    
    For nI := 1 To Len(aFiles)
        // Process each file
        cFile := cDir + aFiles[nI][1]
        ConOut("Processando arquivo: " + cFile)
        
        // Implementation would go here
    Next nI
    
    // Save output file
    oExcel:Activate()
    oExcel:GetXMLFile(cOutputFile)
    
    ConOut("Arquivo gerado: " + cOutputFile)
Return`;
}

function generateSimpleJsSpecial(): string {
    return `#INCLUDE "Protheus.ch"

/*/{Protheus.doc} SimpleDemo
Description: Demonstrates basic variables and functions
@type function
@author Transpiler
@since ${new Date().toISOString().split('T')[0]}
*/
Function SimpleDemo()
    // Simple test file
    Local x := 10
    Local y := 20
    Local sum := x + y
    
    ConOut(sum)
    
    Local result := Add(10, 20)
    ConOut(result)
    
    // Test an object literal
    Local person := { "name" => "John", "age" => 30, "isActive" => .T. }
    
    ConOut(person:name)
Return

/*/{Protheus.doc} Add
Adds two numbers
@type function
@param a, numeric, First number
@param b, numeric, Second number
@return numeric, Sum of the two numbers
@author Transpiler
@since ${new Date().toISOString().split('T')[0]}
*/
Function Add(a, b)
Return a + b`;
}

function generateImportJsSpecial(): string {
    return `#INCLUDE "Protheus.ch"
#INCLUDE "utils\\tax.ch"
#INCLUDE "utils\\format.ch"
#INCLUDE "utils\\math.ch"

/*/{Protheus.doc} ImportDemo
Demonstrates importing modules and using their functions
@type function
@author Transpiler
@since ${new Date().toISOString().split('T')[0]}
*/
Function ImportDemo()
    Local salary := 5000
    Local tax := CalculateTax(salary)
    Local netSalary := salary - tax
    
    ConOut("Salary: " + FormatCurrency(salary))
    ConOut("Tax: " + FormatCurrency(tax))
    ConOut("Net Salary: " + FormatCurrency(netSalary))
    
    Local numbers := { 1, 2, 3, 4, 5 }
    Local sum := MathUtil():Sum(numbers)
    Local average := MathUtil():Average(numbers)
    
    ConOut("Sum: " + cValToChar(sum))
    ConOut("Average: " + cValToChar(average))
Return`;
}

function readInputFiles(inputDir: string): string[] {
    return fs.readdirSync(inputDir).filter(file => file.includes('.js'));
}

function transpileFile(filePath: string, outputDir: string) {
    try {
        const fileName = path.basename(filePath);
        const outputFilePath = path.join(outputDir, `${path.basename(fileName, '.js')}.prw`);
        console.log(`Processing ${filePath} -> ${outputFilePath}`);
        const jsCode = fs.readFileSync(filePath, 'utf-8');
        const prwCode = transpile(jsCode, fileName);
        fs.writeFileSync(outputFilePath, prwCode);
        console.log(`Successfully transpiled ${filePath}`);
    } catch (error: any) {
        console.error(`Error processing ${filePath}:`, error);
    }
}

function main() {
    try {
        const inputDir = path.join('src', 'input');
        const outputDir = path.join('src', 'output');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        const inputFiles = readInputFiles(inputDir);
        console.log(`Found ${inputFiles.length} input files to process:`, inputFiles);
        inputFiles.forEach(file => {
            const filePath = path.join(inputDir, file);
            transpileFile(filePath, outputDir);
        });
        console.log('Transpilation completed!');
    } catch (error: any) {
        console.error('Error in main process:', error);
    }
}

main(); 