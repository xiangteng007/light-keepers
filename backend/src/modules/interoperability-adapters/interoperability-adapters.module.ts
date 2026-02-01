/**
 * Interoperability Adapters Module
 * 
 * Multi-Agency Data Exchange Standards:
 * - CAP 1.2  (Common Alerting Protocol - OASIS)
 * - EDXL-DE 2.0 (Emergency Data Exchange Language - OASIS)
 * - NIEM (National Information Exchange Model)
 */

import { Module } from '@nestjs/common';
import { CapAdapterService } from './cap-adapter.service';
import { EdxlDeAdapterService } from './edxl-de-adapter.service';
import { NiemMappingService } from './niem-mapping.service';
import { InteroperabilityController } from './interoperability.controller';

@Module({
    providers: [CapAdapterService, EdxlDeAdapterService, NiemMappingService],
    controllers: [InteroperabilityController],
    exports: [CapAdapterService, EdxlDeAdapterService, NiemMappingService],
})
export class InteroperabilityAdaptersModule {}
