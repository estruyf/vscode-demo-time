import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    ignores: ['assets', 'out', 'coverage', 'node_modules', 'webviews', "*.js", "*.mjs"],
  },
];
