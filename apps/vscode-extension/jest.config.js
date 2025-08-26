module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    '^@demotime/common$': '<rootDir>/../../packages/common/src/index.ts',
    '^rehype-raw$': '<rootDir>/__mocks__/rehype.js',
    '^rehype-react$': '<rootDir>/__mocks__/rehype.js',
    '^remark-frontmatter$': '<rootDir>/__mocks__/rehype.js',
    '^remark-gfm$': '<rootDir>/__mocks__/rehype.js',
    '^remark-parse$': '<rootDir>/__mocks__/rehype.js',
    '^remark-rehype$': '<rootDir>/__mocks__/rehype.js',
    '^vfile-matter$': '<rootDir>/__mocks__/rehype.js',
    '^unified$': '<rootDir>/__mocks__/rehype.js',
    '^unist-util-visit$': '<rootDir>/__mocks__/rehype.js',
  },
};
