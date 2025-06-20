import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  target: 'es2020',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  bundle: false,
});
