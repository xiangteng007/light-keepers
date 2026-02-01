/**
 * Privacy Module
 * 隱私合規模組
 * 
 * P2 合規治理：
 * - 台灣個資法 (PDPA)
 * - AI 治理框架
 */

import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TaiwanPdpaService } from './taiwan-pdpa.service';
import { AiGovernanceService } from './ai-governance.service';

@Global()
@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [TaiwanPdpaService, AiGovernanceService],
    exports: [TaiwanPdpaService, AiGovernanceService],
})
export class PrivacyModule {}
