
import baseConfig from '../../eslint.config.mjs';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
import path from 'path';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default [
  ...baseConfig,
  {
    ignores: ['out-tsc', 'node_modules', 'dist', 'vite.config.ts'],
  },
  ...tseslint.config(
    {
      ignores: ['dist'],
    },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2020,
        globals: globals.browser,
        parserOptions: {
          tsconfigRootDir,
          project: ['./tsconfig.app.json'],
        },
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
      },
    }
  ),
];
