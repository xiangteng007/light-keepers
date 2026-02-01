/**
 * humanitarian-standards.module.ts
 * 
 * P0: OCHA/IASC International Humanitarian Standards
 * 
 * Implements:
 * - HXL (Humanitarian Exchange Language) data export
 * - IATI (International Aid Transparency Initiative) reporting
 * - 3W Matrix (Who-What-Where) integration
 * - HDX (Humanitarian Data Exchange) synchronization
 * - Sphere Standards compliance checking
 */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HxlExportService } from './services/hxl-export.service';
import { IatiReportingService } from './services/iati-reporting.service';
import { ThreeWMatrixService } from './services/three-w-matrix.service';
import { SphereStandardsService } from './services/sphere-standards.service';
import { HumanitarianStandardsController } from './humanitarian-standards.controller';

@Global()
@Module({
    imports: [],
    controllers: [HumanitarianStandardsController],
    providers: [
        HxlExportService,
        IatiReportingService,
        ThreeWMatrixService,
        SphereStandardsService,
    ],
    exports: [
        HxlExportService,
        IatiReportingService,
        ThreeWMatrixService,
        SphereStandardsService,
    ],
})
export class HumanitarianStandardsModule { }
