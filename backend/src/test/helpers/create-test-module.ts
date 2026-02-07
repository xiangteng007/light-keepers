import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { ModuleMetadata } from '@nestjs/common';
import { CoreJwtGuard } from '../../modules/shared/guards/core-jwt.guard';
import { UnifiedRolesGuard } from '../../modules/shared/guards/unified-roles.guard';

/**
 * Shared test module factory — automatically overrides auth guards.
 * Usage:
 *   const module = await createTestModule({
 *     controllers: [MyController],
 *     providers: [{ provide: MyService, useValue: mockService }],
 *   }).compile();
 */
export function createTestModule(
    metadata: ModuleMetadata,
): TestingModuleBuilder {
    return Test.createTestingModule(metadata)
        .overrideGuard(CoreJwtGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(UnifiedRolesGuard)
        .useValue({ canActivate: () => true });
}
