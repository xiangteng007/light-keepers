import { Module } from '@nestjs/common';
import { MicroTaskService } from './micro-task.service';

@Module({
    providers: [MicroTaskService],
    exports: [MicroTaskService],
})
export class MicroTaskModule { }
