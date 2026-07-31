/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    // 提供測試專用的 JWT_SECRET（程式碼已移除硬編碼 fallback，改為 fail-fast）
    setupFiles: ['<rootDir>/test/jest-setup.ts'],
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    collectCoverageFrom: [
        '**/*.(t|j)s',
        '!**/*.spec.ts',
        '!**/*.e2e-spec.ts',
        '!**/node_modules/**',
        '!**/dist/**',
    ],
    coverageDirectory: '../coverage',
    coverageThresholds: {
        global: {
            lines: 15,
            branches: 10,
            functions: 10,
            statements: 15,
        },
    },
    testEnvironment: 'node',
    verbose: true,
};
