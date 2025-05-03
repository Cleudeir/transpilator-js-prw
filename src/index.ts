import * as fs from 'fs';
import * as path from 'path';
import { lex } from './lexer/lexer.js';
import { parse } from './parser/parser.js';
import { generate } from './generator/generator.js';

// Function to transpile JS to PRW
function transpile(jsCode: string): string {
    try {
        // Tokenize the input JS code
        const tokens = lex(jsCode);
        // Parse tokens into AST
        const ast = parse(tokens);
        // Generate AdvPL code from AST
        return generate(ast);
    } catch (error: any) {
        console.error('Error in transpilation:', error);
        return `// Error in transpilation: ${error.message}`;
    }
}

function readInputFiles(inputDir: string): string[] {
    return fs.readdirSync(inputDir).filter(file => file.includes('.js'));
}

function transpileFile(filePath: string, outputDir: string) {
    try {
        const fileName = path.basename(filePath, '.js');
        const outputFilePath = path.join(outputDir, `${fileName}.prw`);
        console.log(`Processing ${filePath} -> ${outputFilePath}`);
        const jsCode = fs.readFileSync(filePath, 'utf-8');
        const prwCode = transpile(jsCode);
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