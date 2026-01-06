/**
 * Spectrum Analysis Module
 * Phase 6.3: 頻譜情報
 */

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SpectrumAnalysisService } from './spectrum-analysis.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    providers: [SpectrumAnalysisService],
    exports: [SpectrumAnalysisService],
})
export class SpectrumAnalysisModule { }
