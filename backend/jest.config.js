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
    // 棘輪門檻：2026-07-31 實測 lines 58.5% / branches 37.4% / functions 61.3% / statements 58.2%
    // 門檻設在實測值下方留緩衝，擋大幅倒退；覆蓋率提升後同步調高
    coverageThreshold: {
        global: {
            lines: 52,
            branches: 32,
            functions: 55,
            statements: 52,
        },
    },
    testEnvironment: 'node',
    verbose: true,
};
