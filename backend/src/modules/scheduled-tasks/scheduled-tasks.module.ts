import { Module } from '@nestjs/common';
import { ScheduledTasksService } from './scheduled-tasks.service';

@Module({
    providers: [ScheduledTasksService],
    exports: [ScheduledTasksService],
})
export class ScheduledTasksModule { }
