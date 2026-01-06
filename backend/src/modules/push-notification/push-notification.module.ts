/**
 * Push Notification Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PushNotificationService } from './push-notification.service';

@Module({
    imports: [ConfigModule, EventEmitterModule.forRoot()],
    providers: [PushNotificationService],
    exports: [PushNotificationService],
})
export class PushNotificationModule { }
