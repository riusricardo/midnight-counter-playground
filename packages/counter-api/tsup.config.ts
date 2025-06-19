import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"], // Only output ESM to support import.meta
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
