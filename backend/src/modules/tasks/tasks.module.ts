import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Account } from '../accounts/entities';
import { LineBotModule } from '../line-bot/line-bot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Task, Account]),
        LineBotModule,
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TypeOrmModule, TasksService],
})
export class TasksModule { }
