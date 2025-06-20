import * as fsAsync from 'node:fs/promises';
import * as fs from 'node:fs';

// Environment-specific implementation for Node.js environments
export const isNodeEnvironment = true;
export const isBrowserEnvironment = false;

// Filesystem implementations for Node.js
export const readFile = async (path: string): Promise<string> => {
  return fsAsync.readFile(path, 'utf-8');
};

export const writeFile = async (path: string, content: string): Promise<void> => {
  return fsAsync.writeFile(path, content, 'utf-8');
};

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await fsAsync.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

// Re-export Node.js fs functions that are used in the API
export const { existsSync, createReadStream, createWriteStream, constants } = fs;
export const { mkdir } = fsAsync;

// Define types to match the browser implementation
export interface ReadStream extends fs.ReadStream {}
export interface WriteStream extends fs.WriteStream {}

// Node.js storage implementation
export class NodeStorage {
  constructor(private namespace: string) {}

  async get<T>(key: string): Promise<T | null> {
    // Implement if needed
    return null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Implement if needed
  }

  async delete(key: string): Promise<void> {
    // Implement if needed
  }
}
