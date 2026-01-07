/**
 * Air Operations Module - 空中與自主作業領域
 * 
 * 整合模組：
 * - drone-ops (單機控制)
 * - drone-swarm (群集控制)
 * - robot-rescue (救援機器人)
 * - aerial-image-analysis (空拍影像分析)
 * - spectrum-analysis (頻譜分析/抗干擾)
 * - offline-mesh (空中中繼節點)
 * 
 * AI Agent: Scout Agent (偵蒐飛控官)
 * - 自動監控影像串流
 * - 辨識受困者
 * - 規劃航路
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { DroneFleet } from './entities/drone-fleet.entity';

// AI Agent
import { ScoutAgentService } from './agents/scout-agent.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DroneFleet,
        ]),
    ],
    controllers: [
        // Controllers to be implemented
    ],
    providers: [
        // AI Agent
        ScoutAgentService,

        // TODO: Add these services when implemented
        // DroneOpsService,
        // DroneSwarmService,
        // RobotRescueService,
        // AerialImageAnalysisService,
        // SpectrumAnalysisService,
        // OfflineMeshService,
    ],
    exports: [
        ScoutAgentService,
    ],
})
export class AirOpsModule { }
