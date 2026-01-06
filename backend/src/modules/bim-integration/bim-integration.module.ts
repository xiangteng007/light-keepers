import { Module } from '@nestjs/common';
import { BimIntegrationService } from './bim-integration.service';

@Module({
    providers: [BimIntegrationService],
    exports: [BimIntegrationService],
})
export class BimIntegrationModule { }
