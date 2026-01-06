/**
 * Scheduler Module
 * Scheduled task management
 */

import { Module, Global } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

@Global()
@Module({
    providers: [SchedulerService],
    controllers: [SchedulerController],
    exports: [SchedulerService],
})
export class SchedulerModule { }
