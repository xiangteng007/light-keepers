import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionSessionsController } from './mission-sessions.controller';
import { MissionSessionsService } from './mission-sessions.service';
import { MissionSession } from './entities/mission-session.entity';
import { MissionEvent } from './entities/event.entity';
import { Task } from './entities/task.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { OperationalPeriod } from './entities/operational-period.entity';
import { IAPDocument } from './entities/iap-document.entity';
import { SITREP } from './entities/sitrep.entity';
import { DecisionLog } from './entities/decision-log.entity';
import { AfterActionReview } from './entities/aar.entity';
import { CommandChain } from './entities/command-chain.entity';
import { IAPService } from './iap.service';
import { IAPController } from './iap.controller';
import { SITREPService } from './sitrep.service';
import { SITREPController } from './sitrep.controller';
import { AARService } from './aar.service';
import { AARController } from './aar.controller';
import { CommandChainService } from './command-chain.service';
import { CommandChainController } from './command-chain.controller';
import { MissionSessionGateway } from './mission-session.gateway';
import { MissionReportService } from './mission-report.service';
import { MissionReportController } from './mission-report.controller';
import { AuthModule } from '../auth/auth.module';
import { FieldReportsModule } from '../field-reports/field-reports.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MissionSession,
            MissionEvent,
            Task,
            InventoryTransaction,
            OperationalPeriod,
            IAPDocument,
            SITREP,
            DecisionLog,
            AfterActionReview,
            CommandChain,
        ]),
        forwardRef(() => AuthModule),
        forwardRef(() => FieldReportsModule),
        forwardRef(() => TasksModule),
    ],
    controllers: [
        MissionSessionsController,
        IAPController,
        SITREPController,
        AARController,
        CommandChainController,
        MissionReportController,
    ],
    providers: [
        MissionSessionsService,
        IAPService,
        SITREPService,
        AARService,
        CommandChainService,
        MissionSessionGateway,
        MissionReportService,
    ],
    exports: [
        TypeOrmModule, // Export for DecisionLog, Task, etc. repositories
        MissionSessionsService,
        IAPService,
        SITREPService,
        AARService,
        CommandChainService,
        MissionSessionGateway,
        MissionReportService,
    ],
})
export class MissionSessionsModule { }
