/**
 * Triage Module
 * Phase 5.1: 數位檢傷分類系統
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Victim, MedicalLog } from './entities';
import { TriageService } from './triage.service';
import { TriageController } from './triage.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Victim, MedicalLog]),
    ],
    controllers: [TriageController],
    providers: [TriageService],
    exports: [TriageService],
})
export class TriageModule { }
