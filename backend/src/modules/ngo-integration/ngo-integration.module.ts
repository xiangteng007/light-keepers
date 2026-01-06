import { Module } from '@nestjs/common';
import { NgoIntegrationService } from './ngo-integration.service';

@Module({
    providers: [NgoIntegrationService],
    exports: [NgoIntegrationService],
})
export class NgoIntegrationModule { }
