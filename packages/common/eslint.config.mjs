import baseConfig from '../../eslint.config.mjs';
import { fileURLToPath } from 'url';  
import path from 'path';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    ignores: ['out-tsc', 'node_modules'],
    tsconfigRootDir
  },
];
