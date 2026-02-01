/**
 * Unified Resources Module
 * 
 * Consolidates all resource management capabilities:
 * - Resource Matching (捐贈媒合)
 * - Resource Optimization (資源配置優化)
 * 
 * This facade module re-exports from specialized resource modules
 * for a unified API while maintaining backward compatibility.
 */

import { Module, forwardRef } from '@nestjs/common';
import { ResourceMatchingModule } from '../resource-matching/resource-matching.module';
import { ResourceOptimizationModule } from '../resource-optimization/resource-optimization.module';
import { UnifiedResourcesService } from './unified-resources.service';

@Module({
    imports: [
        forwardRef(() => ResourceMatchingModule),
        forwardRef(() => ResourceOptimizationModule),
    ],
    providers: [UnifiedResourcesService],
    exports: [
        UnifiedResourcesService,
        ResourceMatchingModule,
        ResourceOptimizationModule,
    ],
})
export class UnifiedResourcesModule {}
