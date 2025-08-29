import baseConfig from '../../eslint.config.mjs';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    ignores: ['out-tsc', 'node_modules'],
    tsconfigRootDir
  },
];
