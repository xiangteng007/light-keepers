import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DispatchTask, TaskAssignment } from './entities';
import { TaskDispatchService } from './task-dispatch.service';
import { TaskDispatchController } from './task-dispatch.controller';
import { TaskDispatchGateway } from './task-dispatch.gateway';
import { GeofenceService } from './geofence.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([DispatchTask, TaskAssignment]),
        EventEmitterModule.forRoot(),
    ],
    controllers: [TaskDispatchController],
    providers: [TaskDispatchService, TaskDispatchGateway, GeofenceService],
    exports: [TaskDispatchService, TaskDispatchGateway, GeofenceService],
})
export class TaskDispatchModule { }

