import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DispatchTask, TaskAssignment } from './entities';
import { TaskDispatchService } from './task-dispatch.service';
import { TaskDispatchController } from './task-dispatch.controller';
import { TaskDispatchGateway } from './task-dispatch.gateway';
import { GeofenceService } from './geofence.service';
import { TaskEventListeners } from './task-event.listeners';
import { AuthModule } from '../auth/auth.module';
import { LineBotModule } from '../line-bot/line-bot.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DispatchTask, TaskAssignment]),
        EventEmitterModule.forRoot(),
        forwardRef(() => AuthModule), // For JwtAuthGuard
        forwardRef(() => LineBotModule), // For LINE notifications
        forwardRef(() => NotificationsModule), // For push notifications
        forwardRef(() => AccountsModule), // For Account repository
    ],
    controllers: [TaskDispatchController],
    providers: [
        TaskDispatchService,
        TaskDispatchGateway,
        GeofenceService,
        TaskEventListeners,
    ],
    exports: [TaskDispatchService, TaskDispatchGateway, GeofenceService],
})
export class TaskDispatchModule { }

