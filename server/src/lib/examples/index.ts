import fs from 'fs';
import path from 'path';

// Load example files
const userManagementJs = fs.readFileSync(path.join(__dirname, 'js/user_management.js'), 'utf8');
const userManagementPrw = fs.readFileSync(path.join(__dirname, 'prw/user_management.prw'), 'utf8');

// Simple examples for quick testing
export const simpleJsExample = `
function processArray(items) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i] > 10) {
      results.push(items[i] * 2);
    }
  }
  return results;
}

const numbers = [5, 12, 8, 20, 3, 15];
const filtered = processArray(numbers);
console.log("Processed items:", filtered);
`;

export const simplePrwExample = `
#Include "Protheus.ch"

User Function ProcessArray(aItems)
  Local aResults := {}
  Local nI := 0
  
  For nI := 1 To Len(aItems)
    If aItems[nI] > 10
      aAdd(aResults, aItems[nI] * 2)
    EndIf
  Next nI
  
  Return aResults

// Example usage
Local aNumbers := {5, 12, 8, 20, 3, 15}
Local aFiltered := ProcessArray(aNumbers)
ConOut("Processed items:", aFiltered)

Return Nil
`;

// Complex examples for real-world use cases
export const complexJsExample = userManagementJs;

export const complexAdvplExample = userManagementPrw;

// Export additional examples by type
export function getExampleByName(name: string, type: 'js' | 'advpl'): string {
  switch (name) {
    case 'user_management':
      return type === 'js' ? userManagementJs : userManagementPrw;
    default:
      return type === 'js' ? simpleJsExample : simplePrwExample;
  }
} 