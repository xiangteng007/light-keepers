import { Module } from '@nestjs/common';
import { RobotRescueService } from './robot-rescue.service';

@Module({
    providers: [RobotRescueService],
    exports: [RobotRescueService],
})
export class RobotRescueModule { }
