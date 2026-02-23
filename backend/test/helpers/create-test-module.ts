/**
 * Shared Test Module Utilities
 * 
 * Provides common testing helpers to eliminate repeated guard mocking
 * and module setup boilerplate across spec files.
 * 
 * Usage:
 *   const module = await createTestingModule({
 *     imports: [YourModule],
 *     providers: [YourService],
 *   });
 */

import { TestingModuleBuilder, TestingModule, Test } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';

// Guard classes - import from their actual locations
// eslint-disable-next-line @typescript-eslint/no-var-requires
let CoreJwtGuard: any;
let UnifiedRolesGuard: any;

try {
    CoreJwtGuard = require('../../src/common/guards/core-jwt.guard').CoreJwtGuard;
} catch {
    CoreJwtGuard = class MockCoreJwtGuard {};
}

try {
    UnifiedRolesGuard = require('../../src/common/guards/unified-roles.guard').UnifiedRolesGuard;
} catch {
    UnifiedRolesGuard = class MockUnifiedRolesGuard {};
}

/** Always-pass guard mock */
const mockGuard = { canActivate: () => true };

/** Mock user object for authenticated requests */
export const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
};

/** Mock request object with user attached */
export const mockRequest = {
    user: mockUser,
};

/**
 * Create a NestJS TestingModule with guards automatically mocked.
 * Eliminates repeated `.overrideGuard()` calls across spec files.
 * 
 * @param metadata - Standard NestJS module metadata
 * @param options - Additional options
 * @returns Compiled TestingModule
 */
export async function createTestModule(
    metadata: ModuleMetadata,
    options: {
        /** Skip guard mocking (default: false) */
        skipGuardMocks?: boolean;
        /** Additional builder customization */
        customize?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
    } = {},
): Promise<TestingModule> {
    let builder: TestingModuleBuilder = Test.createTestingModule(metadata);

    // Auto-mock authentication and authorization guards
    if (!options.skipGuardMocks) {
        builder = builder
            .overrideGuard(CoreJwtGuard)
            .useValue(mockGuard)
            .overrideGuard(UnifiedRolesGuard)
            .useValue(mockGuard);
    }

    // Apply custom modifications
    if (options.customize) {
        builder = options.customize(builder);
    }

    return builder.compile();
}

/**
 * Create a mock service factory.
 * Generates an object with all methods from the original service as jest mocks.
 * 
 * @param ServiceClass - The class to mock
 * @returns Object with all prototype methods as jest.fn()
 */
export function createMockService<T>(ServiceClass: new (...args: any[]) => T): Record<string, jest.Mock> {
    const methods = Object.getOwnPropertyNames(ServiceClass.prototype)
        .filter(name => name !== 'constructor');

    const mockService: Record<string, jest.Mock> = {};
    for (const method of methods) {
        mockService[method] = jest.fn();
    }

    return mockService;
}
