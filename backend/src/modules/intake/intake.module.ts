import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';
import { IntakeReport } from './entities/intake-report.entity';
import { MissionSession } from '../mission-sessions/entities/mission-session.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([IntakeReport, MissionSession]),
    ],
    controllers: [IntakeController],
    providers: [IntakeService],
    exports: [IntakeService],
})
export class IntakeModule { }
