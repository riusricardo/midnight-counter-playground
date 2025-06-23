/**
 * Environment Abstraction Layer
 * 
 * PROBLEM:
 * The counter-api needs to work in both Node.js and browser environments, but:
 * - Node.js has full file system access (fs module, streams, etc.)
 * - Browsers don't have file system access and need different implementations
 * - Some APIs need platform-specific implementations (storage, networking, etc.)
 * 
 * SOLUTION:
 * This file provides a unified interface that:
 * 1. **Environment Detection**: Detects Node.js vs browser at runtime
 * 2. **Conditional Imports**: Dynamically imports platform-specific implementations
 * 3. **Fallback Behavior**: Provides safe fallbacks for unsupported operations
 * 4. **Vite Alias Support**: Works with Vite's alias system for browser builds
 * 
 * CONFIGURATION:
 * - Browser builds: Vite aliases this to env-browser.ts (see apps/web/vite.config.ts)
 * - Node.js builds: Uses this file directly, which imports from env-node.ts
 * - This provides seamless platform abstraction without build-time complexity
 * 
 * USAGE:
 * Import from this file everywhere in the codebase:
 * ```typescript
 * import { readFile, writeFile, isNodeEnvironment } from './env.js';
 * ```
 * 
 * The implementation will automatically choose the right platform-specific code.
 */

// Runtime environment detection
// This checks for Node.js-specific globals to determine the environment
export const isNodeEnvironment = typeof process !== 'undefined' && 
  process.versions != null && 
  process.versions.node != null;
export const isBrowserEnvironment = !isNodeEnvironment;

// File System API Abstractions
// These functions provide a unified interface for file operations
// In Node.js: Uses real fs module functions
// In Browser: Throws appropriate errors or provides fallbacks

export const readFile = async (_path: string): Promise<string> => {
  try {
    // Dynamically import Node.js implementation
    const { readFile } = await import('./env-node.js');
    return await readFile(_path);
  } catch (e) {
    throw new Error('File system access is not available in this context');
  }
};

export const writeFile = async (_path: string, _content: string): Promise<void> => {
  try {
    const { writeFile } = await import('./env-node.js');
    return await writeFile(_path, _content);
  } catch (e) {
    throw new Error('File system access is not available in this context');
  }
};

export const fileExists = async (_path: string): Promise<boolean> => {
  if (isNodeEnvironment) {
    const { fileExists } = await import('./env-node.js');
    return fileExists(_path);
  }
  return false;
};

// Synchronous file existence check (Node.js only)
// Browser builds will throw an error if this is called
export const existsSync = (_path: string): boolean => {
  if (isNodeEnvironment) {
    try {
      const fs = require('node:fs');
      return fs.existsSync(_path);
    } catch (e) {
      return false;
    }
  }
  return false; // Browser environment - no files exist
};

// Synchronous file reading (Node.js only)
// Browser builds will throw an error if this is called
export const readFileSync = (_path: string, encoding: BufferEncoding = 'utf8'): string => {
  if (isNodeEnvironment) {
    try {
      const fs = require('node:fs');
      return fs.readFileSync(_path, encoding);
    } catch (e) {
      throw new Error(`Failed to read file: ${_path}`);
    }
  }
  throw new Error('Synchronous file system operations are not supported in the browser');
};

export const mkdir = async (_path: string, options?: { recursive?: boolean }): Promise<void> => {
  if (isNodeEnvironment) {
    const { mkdir } = await import('./env-node.js');
    await mkdir(_path, options);
    return;
  }
  throw new Error('File system operations are not supported in the browser');
};

// Stream Type Definitions
// These types provide compatibility with Node.js streams in a platform-agnostic way
export interface ReadStream {
  on(event: string, callback: (...args: any[]) => void): ReadStream;
  close(): void;
}

export interface WriteStream {
  write(chunk: string): boolean;
  on(event: string, callback: (...args: any[]) => void): WriteStream;
  end(): void;
}

// Stream Factory Functions
// Create file streams with platform-appropriate implementations
// Node.js: Uses real fs streams
// Browser: Returns mock streams that emit errors

export const createReadStream = (_path: string): ReadStream => {
  if (isNodeEnvironment) {
    try {
      const fs = require('node:fs');
      return fs.createReadStream(_path, { encoding: 'utf8' });
    } catch {
      // Return mock stream that signals failure
      const stream: ReadStream = {
        on: function(event: string, callback: (...args: any[]) => void): ReadStream {
          if (event === 'error') {
            callback(new Error('Failed to create read stream'));
          }
          return stream;
        },
        close: function(): void {}
      };
      return stream;
    }
  }
  
  // Mock stream for browser environment
  const stream: ReadStream = {
    on: function(event: string, callback: (...args: any[]) => void): ReadStream {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    close: function(): void {}
  };
  return stream;
};

export const createWriteStream = (_path: string): WriteStream => {
  if (isNodeEnvironment) {
    try {
      const fs = require('node:fs');
      return fs.createWriteStream(_path);
    } catch {
      // Return mock stream that signals failure
      const stream: WriteStream = {
        write: function(): boolean { return false; },
        on: function(event: string, callback: (...args: any[]) => void): WriteStream {
          if (event === 'error') {
            callback(new Error('Failed to create write stream'));
          }
          return stream;
        },
        end: function(): void {}
      };
      return stream;
    }
  }
  
  // Mock stream for browser environment
  const stream: WriteStream = {
    write: function(): boolean { return false; },
    on: function(event: string, callback: (...args: any[]) => void): WriteStream {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    end: function(): void {}
  };
  return stream;
};

// File System Constants
// Node.js fs.constants values for compatibility
export const constants = {
  F_OK: 0, // File exists
  R_OK: 4, // File is readable
  W_OK: 2, // File is writable
  X_OK: 1  // File is executable
};

// Cross-platform path utilities
// These provide path operations that work in both Node.js and browser environments
export const pathUtils = (() => {
  if (isNodeEnvironment) {
    try {
      const path = require('node:path');
      return {
        join: path.join,
        resolve: path.resolve,
        dirname: path.dirname,
        basename: path.basename
      };
    } catch (e) {
      // Fallback to simple implementations
    }
  }
  
  // Browser-compatible path utilities
  return {
    join: (...segments: string[]): string => {
      return segments.filter(Boolean).join('/').replace(/\/+/g, '/');
    },
    
    resolve: (...segments: string[]): string => {
      let result = '';
      for (const segment of segments) {
        if (segment.startsWith('/')) {
          result = segment;
        } else {
          result = result ? `${result}/${segment}` : segment;
        }
      }
      return result.replace(/\/+/g, '/');
    },
    
    dirname: (filepath: string): string => {
      const lastSlash = filepath.lastIndexOf('/');
      return lastSlash === -1 ? '.' : filepath.substring(0, lastSlash) || '/';
    },
    
    basename: (filepath: string): string => {
      const lastSlash = filepath.lastIndexOf('/');
      return lastSlash === -1 ? filepath : filepath.substring(lastSlash + 1);
    }
  };
})();
