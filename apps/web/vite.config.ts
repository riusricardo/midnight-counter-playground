import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import wasm from 'vite-plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import inject from '@rollup/plugin-inject';
import stdLibBrowser from 'node-stdlib-browser';
import path from 'path';
const __dirname = new URL('.', import.meta.url).pathname;

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: './.vite',
  build: {
    target: 'esnext',
    minify: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      plugins: [
        inject({
          util: ['util', '*'],
          stream: ['stream-browserify', '*'],
          Buffer: ['buffer', 'Buffer'],
          process: 'process',
        }),
      ],
      external: ['@midnight-ntwrk/midnight-js-node-zk-config-provider'],
    },
  },
  plugins: [
    react(),
    viteCommonjs({
      include: ['@repo/counter-api/**'],
    }),
    wasm(),
    nodePolyfills({
      // Whether to polyfill specific Node.js globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill Node.js builtins
      protocolImports: true,
      include: ['util', 'buffer', 'stream', 'events', 'path', 'querystring', 'url', 'fs', 'crypto', 'os'],
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
    include: ['@repo/counter-api'],
    exclude: ['@midnight-ntwrk/counter-contract', 'node-fetch'],
  },
  resolve: {
    alias: {
      ...stdLibBrowser,
      // Additional specific aliases
      'node:util': stdLibBrowser.util,
      'node:buffer': stdLibBrowser.buffer,
      'node:stream': stdLibBrowser.stream,
      'node:fs': stdLibBrowser.fs,
      'node:crypto': stdLibBrowser.crypto,
      'node:path': stdLibBrowser.path,

      // Environment Abstraction Layer Aliases
      //
      // These aliases ensure that browser builds use browser-compatible implementations
      // instead of Node.js-specific code. The env-browser.ts file provides safe fallbacks
      // for file system operations and other Node.js APIs.
      //
      // See: packages/counter-api/src/env-browser.ts for implementation details
      '@repo/counter-api/src/env': '@repo/counter-api/src/env-browser.ts',
      '@repo/counter-api/dist/env': '@repo/counter-api/src/env-browser.ts',
      '@repo/counter-api/dist/env-node': '@repo/counter-api/src/env-browser.ts',
      // fs/promises is intentionally not polyfilled for browser

      // WebSocket Shim Configuration for Browser Builds
      //
      // PROBLEM: @midnight-ntwrk/midnight-js-indexer-public-data-provider imports isomorphic-ws
      // as a namespace and tries to access ws.WebSocket, but isomorphic-ws/browser.js only
      // provides a default export. This causes build warnings about missing named exports.
      //
      // SOLUTION: Replace both import paths with our custom shim that provides both named
      // and default WebSocket exports using the browser's native WebSocket implementation.
      //
      // The shim is located at: packages/counter-api/src/ws-shim.js
      'isomorphic-ws': path.resolve(__dirname, '../../packages/counter-api/src/ws-shim.js'),
      'isomorphic-ws/browser.js': path.resolve(__dirname, '../../packages/counter-api/src/ws-shim.js'),
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
});
