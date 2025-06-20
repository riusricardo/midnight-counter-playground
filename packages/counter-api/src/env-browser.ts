// Environment-specific implementation for browser environments
export const isNodeEnvironment = false;
export const isBrowserEnvironment = true;

// Empty implementations for filesystem functions
export const readFile = async (): Promise<string> => {
  throw new Error('File system operations are not supported in the browser');
};

export const writeFile = async (): Promise<void> => {
  throw new Error('File system operations are not supported in the browser');
};

export const fileExists = async (): Promise<boolean> => {
  throw new Error('File system operations are not supported in the browser');
};

// Browser-compatible versions of Node.js fs functions
export const existsSync = (): boolean => {
  return false;
};

export const mkdir = async (): Promise<void> => {
  throw new Error('File system operations are not supported in the browser');
};

export interface ReadStream {
  on(event: string, callback: (...args: any[]) => void): ReadStream;
  close(): void;
}

export interface WriteStream {
  write(chunk: string): boolean;
  on(event: string, callback: (...args: any[]) => void): WriteStream;
  end(): void;
}

export const createReadStream = (): ReadStream => {
  const stream = {
    on: (event: string, callback: (...args: any[]) => void): ReadStream => {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    close: (): void => {}
  };
  return stream;
};

export const createWriteStream = (): WriteStream => {
  const stream = {
    write: (): boolean => {
      return false;
    },
    on: (event: string, callback: (...args: any[]) => void): WriteStream => {
      if (event === 'error') {
        callback(new Error('File system operations are not supported in the browser'));
      }
      return stream;
    },
    end: (): void => {}
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

// Storage implementation based on localStorage or memory
export class BrowserStorage {
  private storage: Map<string, string>;

  constructor(private namespace: string) {
    this.storage = new Map<string, string>();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(`${this.namespace}:${key}`);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (e) {
      // Fallback to memory storage if localStorage is not available
      const value = this.storage.get(key);
      return value ? JSON.parse(value) as T : null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      localStorage.setItem(`${this.namespace}:${key}`, serialized);
    } catch (e) {
      // Fallback to memory storage if localStorage is not available
      this.storage.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.namespace}:${key}`);
    } catch (e) {
      // Fallback to memory storage if localStorage is not available
      this.storage.delete(key);
    }
  }
}
