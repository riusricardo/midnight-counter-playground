import { defineConfig } from "tsup";
import path from "path";
import fs from "fs";
import alias from 'esbuild-plugin-alias';

// Create shim files before build
const browserShimContent = `// Browser environment shims
globalThis.process = globalThis.process || { env: {} };
globalThis.isNodeEnvironment = false;
globalThis.isBrowserEnvironment = true;`;
fs.writeFileSync(path.resolve(__dirname, 'src/browser-shims.js'), browserShimContent);

const nodeShimContent = `// Node environment shims
globalThis.isNodeEnvironment = true;
globalThis.isBrowserEnvironment = false;`;
fs.writeFileSync(path.resolve(__dirname, 'src/node-shims.js'), nodeShimContent);


// Configure for both node and browser environments
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  outDir: "dist",
  target: "es2020",
  platform: "browser",
  dts: {
    entry: "src/index.ts",
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  esbuildOptions(options) {
    options.conditions = ["browser", "import"];
    options.define = {
      ...options.define,
      'process.env.RUNTIME_ENV': '"browser"',
      global: 'globalThis',
    };
    options.inject = [
      path.resolve(__dirname, 'src/browser-shims.js')
    ];
  },
  esbuildPlugins: [
    alias({
      './env': path.resolve(__dirname, 'src/env-browser.ts'),
      './env.ts': path.resolve(__dirname, 'src/env-browser.ts'),
      './env-node': path.resolve(__dirname, 'src/env-browser.ts'),
    })
  ],
  external: [
    /@midnight-ntwrk\/.*/,
    /^[^./]/ // All node_modules
  ],
  noExternal: ["./src/path-resolver.ts"]
});
