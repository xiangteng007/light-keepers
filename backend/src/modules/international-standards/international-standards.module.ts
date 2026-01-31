import { Module, Global } from '@nestjs/common';

// ICS Services
import { IcsFormsService } from './services/ics-forms.service';
import { HxlExportService } from './services/hxl-export.service';
import { OchaIntegrationService } from './services/ocha-integration.service';
import { SphereStandardsService } from './services/sphere-standards.service';

// Unified Service
import { InternationalStandardsService } from './international-standards.service';

// Controller
import { InternationalStandardsController } from './international-standards.controller';

/**
 * International Standards Module
 * 
 * 整合國際人道主義標準：
 * - ICS (Incident Command System) 表單
 * - HXL (Humanitarian Exchange Language) 資料匯出
 * - OCHA 3W (Who-What-Where) Matrix
 * - Sphere Standards 合規檢核
 */
@Global()
@Module({
    controllers: [InternationalStandardsController],
    providers: [
        IcsFormsService,
        HxlExportService,
        OchaIntegrationService,
        SphereStandardsService,
        InternationalStandardsService,
    ],
    exports: [InternationalStandardsService],
})
export class InternationalStandardsModule {}
