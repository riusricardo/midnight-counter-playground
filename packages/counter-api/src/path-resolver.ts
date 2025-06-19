// A path resolver that works in both CJS and ESM
import path from 'node:path';
import fs from 'node:fs';

// Simple solution using callsite detection without eval or import.meta
export function getDirPath(): string {
  // Define a fallback value if everything fails
  let result = process.cwd();
  
  try {
    // Technique 1: Use __dirname for CJS if available
    if (typeof __dirname === 'string') {
      return __dirname;
    }
  } catch (e) {
    // Not in CJS context
  }
  
  try {
    // Technique 2: Try to find our own file in the stack trace
    // Create an error to get the stack trace
    const err = new Error();
    const stackLines = err.stack?.split('\n') || [];
    
    // Find the line containing path-resolver.ts
    const fileLine = stackLines.find(line => line.includes('path-resolver.ts'));
    if (fileLine) {
      const match = fileLine.match(/\((.*)path-resolver\.ts/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Stack trace approach failed
  }
  
  // Last resort: Return current directory
  return result;
}
