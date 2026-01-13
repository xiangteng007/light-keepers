/**
 * Webhooks Module
 * 
 * Outbound webhook management with subscription, dispatch, and retry
 * v2.0
 */

import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDeliveryLog } from './entities/webhook-delivery-log.entity';
import { WebhookSubscriptionService } from './services/webhook-subscription.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { WebhooksController } from './webhooks-admin.controller';

@Global()
@Module({
    imports: [
        HttpModule,
        TypeOrmModule.forFeature([WebhookSubscription, WebhookDeliveryLog]),
        ScheduleModule.forRoot(),
    ],
    providers: [
        WebhookService,
        WebhookSubscriptionService,
        WebhookDispatcherService,
    ],
    controllers: [WebhookController, WebhooksController],
    exports: [
        WebhookService,
        WebhookSubscriptionService,
        WebhookDispatcherService,
    ],
})
export class WebhooksModule { }

