import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import wasm from 'vite-plugin-wasm';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import inject from '@rollup/plugin-inject';
import stdLibBrowser from 'node-stdlib-browser';


// Remove conflicting keys from stdLibBrowser to ensure custom shims take precedence
const stdLibBrowserFiltered = { ...stdLibBrowser };
['node:fs', 'fs', 'node:fs/promises', 'fs/promises', 'node:net', 'net'].forEach((k) => {
  if (k in stdLibBrowserFiltered) delete stdLibBrowserFiltered[k];
});

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
    },
  },
  plugins: [
    react(),
    viteCommonjs({
      // Override extensions to handle .mjs files
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
      namedExports: {
        '/src/fs-browser-shim.js': ['statSync', 'createReadStream', 'promises'],
      },
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
      include: ['util', 'buffer', 'stream', 'events', 'path', 'querystring', 'url', 'fs', 'crypto'],
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
    exclude: ['@repo/counter-api', '@midnight-ntwrk/counter-contract', 'node-fetch'],
  },
  resolve: {
    alias: Object.assign(
      {
        // Place custom shims first for highest priority
        'node:fs': '/src/fs-browser-shim.js',
        fs: '/src/fs-browser-shim.js',
        'node:fs/promises': '/src/fs-browser-shim.js',
        'fs/promises': '/src/fs-browser-shim.js',
        'node:net': '/src/net-browser-shim.js',
        net: '/src/net-browser-shim.js',
      },
      stdLibBrowserFiltered,
      {
        // Additional specific aliases
        'node:util': stdLibBrowser.util,
        'node:buffer': stdLibBrowser.buffer,
        'node:stream': stdLibBrowser.stream,
        'node:crypto': stdLibBrowser.crypto,
        'node:path': stdLibBrowser.path,
        // Alias counter-api env to browser version for browser builds
        '@repo/counter-api/src/env': '@repo/counter-api/src/env-browser.ts',
        '@repo/counter-api/dist/env': '@repo/counter-api/src/env-browser.ts',
        '@repo/counter-api/dist/env-node': '@repo/counter-api/src/env-browser.ts',
      },
    ),
  },
  define: {
    'process.env': {},
    global: 'window',
  },
});
