import { Module } from '@nestjs/common';
import { ResourceOptimizationService } from './resource-optimization.service';

@Module({
    providers: [ResourceOptimizationService],
    exports: [ResourceOptimizationService],
})
export class ResourceOptimizationModule { }
