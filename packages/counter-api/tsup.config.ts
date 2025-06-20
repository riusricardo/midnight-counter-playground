import { defineConfig } from "tsup";
import path from "path";
import fs from "fs";

// Create shim files before build
const nodeShimContent = `// Node environment shims
globalThis.isNodeEnvironment = true;
globalThis.isBrowserEnvironment = false;`;
fs.writeFileSync(path.resolve(__dirname, 'src/node-shims.js'), nodeShimContent);

const browserShimContent = `// Browser environment shims
globalThis.process = globalThis.process || { env: {} };
globalThis.isNodeEnvironment = false;
globalThis.isBrowserEnvironment = true;`;
fs.writeFileSync(path.resolve(__dirname, 'src/browser-shims.js'), browserShimContent);

// Create individual module files to support the reference structure
export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'api': 'src/api.ts',
    'api-ui': 'src/api-ui.ts',
    'config': 'src/config.ts',
    'common-types': 'src/common-types.ts',
    'env': 'src/env.ts',
    'env-node': 'src/env-node.ts',
    'env-browser': 'src/env-browser.ts',
    'path-resolver': 'src/path-resolver.ts',
    'path-cjs': 'src/path-cjs.ts',
    'path-esm': 'src/path-esm.ts',
  },
  format: ["cjs", "esm"],
  outDir: "dist",
  target: "es2020",
  platform: "neutral",
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  bundle: false,
  esbuildOptions(options) {
    options.conditions = ['node', 'require'];
    options.define = {
      ...options.define,
      'process.env.RUNTIME_ENV': '"node"',
      'global': 'globalThis'
    };
    options.inject = [
      path.resolve(__dirname, 'src/node-shims.js')
    ];
  }
});
