// This file is an environment abstraction module
// It will be aliased to either env-node.ts or env-browser.ts
// based on the build target in tsup.config.ts

// Default implementation detects browser or node environment
export const isNodeEnvironment = typeof process !== 'undefined' && 
  process.versions != null && 
  process.versions.node != null;
export const isBrowserEnvironment = !isNodeEnvironment;

// Filesystem implementations to be replaced by platform-specific versions
export const readFile = async (_path: string): Promise<string> => {
  if (isNodeEnvironment) {
    // Use dynamic import to avoid bundling node modules in browser builds
    const { readFile } = await import('./env-node');
    return readFile(_path);
  }
  // Return empty string for browser
  return Promise.reject(new Error('File system operations are not supported in the browser'));
};

export const writeFile = async (_path: string, _content: string): Promise<void> => {
  if (isNodeEnvironment) {
    const { writeFile } = await import('./env-node');
    return writeFile(_path, _content);
  }
  // Return void for browser
  return Promise.reject(new Error('File system operations are not supported in the browser'));
};

export const fileExists = async (_path: string): Promise<boolean> => {
  if (isNodeEnvironment) {
    const { fileExists } = await import('./env-node');
    return fileExists(_path);
  }
  return false;
};

// File system functions used in the API
export const existsSync = (_path: string): boolean => {
  if (isNodeEnvironment) {
    try {
      // Using require instead of import to avoid bundling
      const fs = require('node:fs');
      return fs.existsSync(_path);
    } catch {
      return false;
    }
  }
  return false;
};

export const mkdir = async (_path: string, options?: { recursive?: boolean }): Promise<void> => {
  if (isNodeEnvironment) {
    const { mkdir } = await import('./env-node');
    await mkdir(_path, options);
    return;
  }
  throw new Error('File system operations are not supported in the browser');
};

// Stream types
export interface ReadStream {
  on(event: string, callback: (...args: any[]) => void): ReadStream;
  close(): void;
}

export interface WriteStream {
  write(chunk: string): boolean;
  on(event: string, callback: (...args: any[]) => void): WriteStream;
  end(): void;
}

// Stream functions
export const createReadStream = (_path: string): ReadStream => {
  if (isNodeEnvironment) {
    try {
      const fs = require('node:fs');
      return fs.createReadStream(_path, 'utf-8');
    } catch {
      // Return fake stream
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
  
  // Fake stream for browser
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
      // Return fake stream
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
  
  // Fake stream for browser
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

// Constants needed by the API
export const constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1
};
