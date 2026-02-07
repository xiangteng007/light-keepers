/** @type {import('jest').Config} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
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
