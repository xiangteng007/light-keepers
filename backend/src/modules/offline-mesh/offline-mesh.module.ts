/**
 * 離線網狀模組 (Offline Mesh Module)
 * 
 * P0 災時韌性核心模組
 * - 離線認證 (72h Token)
 * - 優先同步佇列
 * - 衝突解決
 * - Mesh 通訊
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MeshMessage, MeshNode } from './entities/mesh-message.entity';
import { MeshSyncService } from './mesh-sync.service';
import { MeshGateway } from './mesh.gateway';
import { MeshController } from './mesh.controller';
import { MeshtasticService } from './meshtastic.service';
import { AtakCotService } from './atak-cot.service';

// P0 災時韌性服務
import { OfflineAuthService } from './offline-auth.service';
import { PrioritySyncService } from './priority-sync.service';
import { ConflictResolverService } from './conflict-resolver.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([MeshMessage, MeshNode]),
        EventEmitterModule.forRoot(),
        ConfigModule,
        JwtModule.register({}),
    ],
    controllers: [MeshController],
    providers: [
        // Core Mesh Services
        MeshSyncService,
        MeshGateway,
        MeshtasticService,
        AtakCotService,
        // P0 Disaster Resilience
        OfflineAuthService,
        PrioritySyncService,
        ConflictResolverService,
    ],
    exports: [
        MeshSyncService,
        MeshtasticService,
        AtakCotService,
        OfflineAuthService,
        PrioritySyncService,
        ConflictResolverService,
    ],
})
export class OfflineMeshModule { }


