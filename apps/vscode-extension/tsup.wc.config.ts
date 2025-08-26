import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['../webviews/src/webcomponents/index.ts'],
  minify: true,
  platform: 'browser',
  format: 'esm',
  outDir: './out/webcomponents',
});
