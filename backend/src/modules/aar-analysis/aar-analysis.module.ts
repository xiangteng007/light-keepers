import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AarAnalysisService } from './aar-analysis.service';
import { MissionSession } from '../mission-sessions/entities/mission-session.entity';
import { MissionEvent } from '../mission-sessions/entities/event.entity';
import { Task } from '../mission-sessions/entities/task.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([MissionSession, MissionEvent, Task]),
    ],
    providers: [AarAnalysisService],
    exports: [AarAnalysisService],
})
export class AarAnalysisModule { }
