/**
 * cluster-coordination.module.ts
 * 
 * v5.1: OCHA Cluster Coordination System
 * 
 * Implements UN OCHA Cluster approach for humanitarian coordination:
 * - Cluster membership management
 * - Inter-cluster coordination
 * - 4W reporting (Who-What-Where-When)
 * - Cluster meetings and action tracking
 */
import { Module, Global } from '@nestjs/common';
import { ClusterCoordinationService } from './cluster-coordination.service';
import { ClusterCoordinationController } from './cluster-coordination.controller';

@Global()
@Module({
    controllers: [ClusterCoordinationController],
    providers: [ClusterCoordinationService],
    exports: [ClusterCoordinationService],
})
export class ClusterCoordinationModule { }
