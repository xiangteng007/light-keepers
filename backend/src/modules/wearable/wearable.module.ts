import { Module } from '@nestjs/common';
import { WearableIntegrationService } from './wearable-integration.service';

@Module({
    providers: [WearableIntegrationService],
    exports: [WearableIntegrationService],
})
export class WearableModule { }
