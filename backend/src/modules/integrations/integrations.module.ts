import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationsController } from './integrations.controller';
import { ExternalApiService } from './external-api.service';

@Module({
    imports: [HttpModule],
    controllers: [IntegrationsController],
    providers: [ExternalApiService],
    exports: [ExternalApiService],
})
export class IntegrationsModule { }
