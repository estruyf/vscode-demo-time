module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^p-limit$': '<rootDir>/../../apps/vscode-extension/__mocks__/p-limit.js',
    '^yocto-queue$': '<rootDir>/../../apps/vscode-extension/__mocks__/yocto-queue.js',
  },
};
