import { defineConfig } from "tsup";

// Let's simplify without plugins
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"], // ESM and CJS formats
  outDir: "dist",
  target: "es2020", // Target modern JavaScript
  platform: "node", // Node.js platform
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Make all dependencies external
  external: [
    /@midnight-ntwrk\/.*/,
    /node:.*/,
    /^[^./]/ // All node_modules
  ],
  // Use noExternal to inline path-resolver module
  noExternal: ["./src/path-resolver.ts"]
});
