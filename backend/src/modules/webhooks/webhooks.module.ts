/**
 * Webhooks Module
 * Outbound webhook management
 */

import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';

@Global()
@Module({
    imports: [HttpModule],
    providers: [WebhookService],
    controllers: [WebhookController],
    exports: [WebhookService],
})
export class WebhooksModule { }
