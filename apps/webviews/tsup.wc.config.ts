import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/webcomponents/index.ts'],
  minify: true,
  platform: 'browser',
  format: 'esm',
  outDir: './dist/webcomponents',
});
