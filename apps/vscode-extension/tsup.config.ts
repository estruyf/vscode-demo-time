import { defineConfig } from 'tsup';

const shouldGenerateSourceMaps = process.env.DEMOTIME_BETA_SOURCEMAPS === 'true';

export default defineConfig({
  entry: ['./src/extension.ts'],
  clean: true,
  format: ['cjs'],
  outDir: './out/extension',
  external: ['vscode'],
  sourcemap: shouldGenerateSourceMaps,
});
