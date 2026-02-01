import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Fire119Service } from './fire-119.service';
import { Fire119DeepIntegrationService } from './fire-119-deep.service';

/**
 * Fire 119 Module
 * 消防署整合模組
 * 
 * Phase 4 深度整合：
 * - CAD 雙向同步
 * - 消防車位置追蹤
 * - 水源管理
 * - 火場態勢
 */
@Module({
    imports: [
        ConfigModule,
        EventEmitterModule.forRoot(),
    ],
    providers: [
        Fire119Service,
        Fire119DeepIntegrationService,
    ],
    exports: [
        Fire119Service,
        Fire119DeepIntegrationService,
    ],
})
export class Fire119Module { }

