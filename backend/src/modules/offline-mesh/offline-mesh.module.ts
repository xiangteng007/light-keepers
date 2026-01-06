/**
 * 離線網狀模組 (Offline Mesh Module)
 * 模組 B: NestJS 模組註冊
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MeshMessage, MeshNode } from './entities/mesh-message.entity';
import { MeshSyncService } from './mesh-sync.service';
import { MeshGateway } from './mesh.gateway';
import { MeshController } from './mesh.controller';
import { MeshtasticService } from './meshtastic.service';
import { AtakCotService } from './atak-cot.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([MeshMessage, MeshNode]),
        EventEmitterModule.forRoot(),
        ConfigModule,
    ],
    controllers: [MeshController],
    providers: [MeshSyncService, MeshGateway, MeshtasticService, AtakCotService],
    exports: [MeshSyncService, MeshtasticService, AtakCotService],
})
export class OfflineMeshModule { }

