import { Module } from '@nestjs/common';
import { SlackIntegrationService } from './slack-integration.service';

@Module({
    providers: [SlackIntegrationService],
    exports: [SlackIntegrationService],
})
export class SlackIntegrationModule { }
