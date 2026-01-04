import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionSessionsController } from './mission-sessions.controller';
import { MissionSessionsService } from './mission-sessions.service';
import { MissionSession } from './entities/mission-session.entity';
import { Event } from './entities/event.entity';
import { Task } from './entities/task.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MissionSession,
            Event,
            Task,
            InventoryTransaction,
        ]),
    ],
    controllers: [MissionSessionsController],
    providers: [MissionSessionsService],
    exports: [MissionSessionsService],
})
export class MissionSessionsModule { }
