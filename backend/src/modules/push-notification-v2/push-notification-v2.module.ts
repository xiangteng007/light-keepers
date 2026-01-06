import { Module } from '@nestjs/common';
import { PushNotificationV2Service } from './push-notification-v2.service';

@Module({
    providers: [PushNotificationV2Service],
    exports: [PushNotificationV2Service],
})
export class PushNotificationV2Module { }
