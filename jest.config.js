module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(rehype-pretty-code|rehype-raw|rehype|remark|hast-util-from-string|hastscript|shiki|unist-util-visit|unified|bail|is-plain-obj|trough|vfile.*|unist-.*|mdast-util-.*|micromark.*|ccount|decode-named-character-reference|character-entities|pretty-bytes|@sindresorhus/slugify|string-width|strip-ansi|ansi-regex|vscode-oniguruma|vscode-textmate|tarts)/)',
  ],
  moduleNameMapper: {
    // If shiki or other modules have issues with Jest's module resolution for wasm or other assets
    // you might need to map them to a stub or a correct path.
    // Example for wasm:
    // '\\.wasm$': 'identity-obj-proxy',
  }
};
