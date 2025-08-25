import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/preview/webcomponents/index.ts'],
  minify: true,
  platform: 'browser',
  format: 'esm',
  outDir: './out/webcomponents',
});
