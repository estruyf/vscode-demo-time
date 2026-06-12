import { defineConfig } from 'tsup';

const shouldGenerateSourceMaps = process.env.DEMOTIME_BETA_SOURCEMAPS === 'true';

export default defineConfig({
  entry: ['../webviews/src/webcomponents/index.ts'],
  minify: true,
  platform: 'browser',
  format: 'esm',
  outDir: './out/webcomponents',
  sourcemap: shouldGenerateSourceMaps,
});
